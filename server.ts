import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { initializeApp, cert, getApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(readFileSync(configPath, "utf8"));

// Initialize Firebase Admin
let app;
try {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
    : null;

  if (getApps().length === 0) {
    if (serviceAccount) {
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: firebaseConfig.projectId
      });
      console.log(`Firebase Admin initialized for project ${firebaseConfig.projectId} with service account.`);
    } else {
      app = initializeApp({
        projectId: firebaseConfig.projectId
      });
      console.log(`Firebase Admin initialized for project ${firebaseConfig.projectId} (no service account).`);
    }
  } else {
    app = getApp();
  }
} catch (error) {
  console.error("Firebase Admin initialization failed:", error);
}

const db = getFirestore(firebaseConfig.firestoreDatabaseId);
const auth = getAuth();

async function startServer() {
  const serverApp = express();
  const PORT = 3000;

  serverApp.use(express.json());

  // API Route: Create User (Admin Only)
  serverApp.post("/api/create-user", async (req, res) => {
    const { idToken, email, password, displayName } = req.body;

    try {
      // 1. Verify Requesting User's Token
      const decodedToken = await auth.verifyIdToken(idToken);
      const adminUid = decodedToken.uid;

      // 2. Check if Admin in Firestore
      const isAdminDoc = await db.collection('admins').doc(adminUid).get();
      const isKomoe = decodedToken.email === "komoe.work@gmail.com";

      if (!isAdminDoc.exists && !isKomoe) {
        return res.status(403).json({ error: "Unauthorized. Admin access required." });
      }

      // 3. Create User in Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password,
        displayName,
      });

      res.json({ message: "User created successfully", uid: userRecord.uid });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: error.message || "Failed to create user." });
    }
  });

  // API Route: Delete User (Admin Only)
  serverApp.post("/api/delete-user", async (req, res) => {
    const { idToken, uidToDelete } = req.body;

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      const adminUid = decodedToken.uid;

      const isAdminDoc = await db.collection('admins').doc(adminUid).get();
      const isKomoe = decodedToken.email === "komoe.work@gmail.com";

      if (!isAdminDoc.exists && !isKomoe) {
        return res.status(403).json({ error: "Unauthorized. Admin access required." });
      }

      await auth.deleteUser(uidToDelete);
      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: error.message || "Failed to delete user." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    serverApp.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    serverApp.use(express.static(distPath));
    serverApp.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  serverApp.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
