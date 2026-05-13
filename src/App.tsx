/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, loginWithGoogle, logout, loginWithEmail, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { LogIn, LogOut, ClipboardCheck, Calculator, Users, ShieldAlert, Key, Mail, Lock, ExternalLink, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AttendanceForm from './components/AttendanceForm';
import AttendanceList from './components/AttendanceList';
import Payroll from './components/Payroll';
import EmployeeManagement from './components/EmployeeManagement';
import UserManagement from './components/UserManagement';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'attendance' | 'list' | 'payroll' | 'employees' | 'users'>('attendance');
  const [isAdmin, setIsAdmin] = useState(false);
  const [lang, setLang] = useState<'en' | 'mm'>('en');

  const translations = {
    en: {
      attendance: 'Attendance',
      logs: 'Logs',
      payroll: 'Payroll',
      team: 'Team',
      uac: 'UAC Control',
      sales: 'Sale Reports',
      core: 'CORE',
      management: 'MANAGEMENT',
      system: 'SYSTEM',
      signout: 'Sign Out',
      human_resources: 'Human Resources',
      manage_staff: 'Manage staff roles, compensation, and access',
      system_live: 'SYSTEM LIVE',
      monthly: 'Monthly',
      main_title: 'Mobile Shop HQ',
      auth_title: 'Mobile Shop',
      auth_subtitle: 'Enterprise Attendance & Payroll System',
      auth_username: 'Username',
      auth_password: 'Password',
      auth_secret: 'Secret Key',
      auth_forgot: 'Forgot password?',
      auth_signin: 'Auth Sign In',
      auth_google: 'Continue with Google',
      auth_or: 'or use identity provider',
      auth_full_name: 'Full Name',
      auth_your_name: 'Your Name',
      auth_create_account: 'Create Account',
      auth_processing: 'Processing...',
    },
    mm: {
      attendance: 'တက်ရောက်မှု',
      logs: 'မှတ်တမ်းများ',
      payroll: 'လစာစာရင်း',
      team: 'ဝန်ထမ်းများ',
      uac: 'အသုံးပြုသူထိန်းချုပ်မှု',
      sales: 'အရောင်းအစီရင်ခံစာ',
      core: 'အဓိက',
      management: 'စီမံခန့်ခွဲမှု',
      system: 'စနစ်',
      signout: 'ထွက်ရန်',
      human_resources: 'လူ့စွမ်းအားအရင်းအမြစ်',
      manage_staff: 'ဝန်ထမ်းကဏ္ဍများ၊ လစာနှင့် အသုံးပြုခွင့်များကို စီမံခန့်ခွဲရန်',
      system_live: 'စနစ်အဆင်သင့်ဖြစ်ပါသည်',
      monthly: 'လစဉ်',
      main_title: 'မိုဘိုင်းဆိုင် HQ',
      auth_title: 'မိုဘိုင်းဆိုင်',
      auth_subtitle: 'တက်ရောက်မှုနှင့် လစာစီမံခန့်ခွဲမှုစနစ်',
      auth_username: 'အသုံးပြုသူအမည်',
      auth_password: 'လျှို့ဝှက်နံပါတ်',
      auth_secret: 'လျှို့ဝှက်ကုဒ်',
      auth_forgot: 'လျှို့ဝှက်နံပါတ် မေ့နေပါသလား?',
      auth_signin: 'စနစ်ထဲသို့ဝင်ရန်',
      auth_google: 'Google နှင့်အတူဝင်ရန်',
      auth_or: 'သို့မဟုတ် အခြားနည်းလမ်းဖြင့်ဝင်ရန်',
      auth_full_name: 'အမည်အပြည့်အစုံ',
      auth_your_name: 'သင့်အမည်',
      auth_create_account: 'အကောင့်ဖွင့်မည်',
      auth_processing: 'လုပ်ဆောင်နေပါသည်...',
    }
  };

  const t = translations[lang];
  
  // Auth form state
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Master Admin Check
        if (u.email === "komoe.work@gmail.com") {
          setIsAdmin(true);
        } else {
          // Check if user has an admin role in employees collection
          // We search for a document where authUid matches or id matches (if we use id as uid)
          try {
            const userDoc = await getDoc(doc(db, 'employees', u.uid));
            if (userDoc.exists() && userDoc.data().role?.toLowerCase().includes('admin')) {
              setIsAdmin(true);
            } else {
              // Also check if admin exists in 'admins' collection used by server
              const adminDoc = await getDoc(doc(db, 'admins', u.uid));
              setIsAdmin(adminDoc.exists());
            }
          } catch (e) {
            console.error("Error checking admin status:", e);
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setLoginError('');
    try {
      const email = loginEmail.includes('@') ? loginEmail : `${loginEmail.toLowerCase()}@mobileshop.local`;
      
      if (isRegistering) {
        const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
        const userCred = await createUserWithEmailAndPassword(auth, email, loginPass);
        if (displayName) {
          await updateProfile(userCred.user, { displayName });
        }
      } else {
        await loginWithEmail(email, loginPass);
      }
    } catch (err: any) {
      setLoginError(err.message || "Authentication failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F1F5F9] p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-2xl shadow-2xl shadow-slate-200/50 max-w-md w-full border border-slate-100"
        >
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-blue-200">
              <ClipboardCheck size={40} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">{t.auth_title}</h1>
            <p className="text-slate-500 font-medium tracking-tight">{t.auth_subtitle}</p>
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-8">
            <button 
              onClick={() => { setIsRegistering(false); setLoginError(''); }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${!isRegistering ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {lang === 'mm' ? 'ဝင်ရန်' : 'Sign In'}
            </button>
            <button 
              onClick={() => { setIsRegistering(true); setLoginError(''); }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${isRegistering ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {lang === 'mm' ? 'မှတ်ပုံတင်ရန်' : 'Register'}
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 mb-8">
            {isRegistering && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t.auth_full_name}</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-slate-900"
                    placeholder={t.auth_your_name}
                  />
                </div>
              </motion.div>
            )}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t.auth_username}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-slate-900"
                  placeholder={t.auth_username}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{isRegistering ? t.auth_password : t.auth_secret}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-slate-900"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            {loginError && (
              <p className="text-xs text-red-500 font-bold bg-red-50 p-3 rounded-lg border border-red-100">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-[#0F172A] hover:bg-slate-800 text-white font-black py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-200 active:scale-[0.98]"
            >
              {processing ? t.auth_processing : isRegistering ? t.auth_create_account : t.auth_signin}
            </button>
          </form>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest"><span className="bg-white px-4 text-slate-400">{t.auth_or}</span></div>
          </div>

          <button
            onClick={async () => {
              setLoginError('');
              try {
                await loginWithGoogle();
              } catch (err: any) {
                if (err.code !== 'auth/popup-closed-by-user') {
                  setLoginError(err.message || "Google Sign In failed");
                }
              }
            }}
            className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.98]"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5" />
            {t.auth_google}
          </button>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'attendance', label: t.attendance, icon: ClipboardCheck, category: 'CORE' },
    { id: 'list', label: t.logs, icon: ClipboardCheck, category: 'CORE' },
    { id: 'payroll', label: t.payroll, icon: Calculator, category: 'MANAGEMENT' },
    { id: 'employees', label: t.team, icon: Users, category: 'MANAGEMENT' },
    ...(isAdmin ? [
      { id: 'users', label: t.uac, icon: ShieldAlert, category: 'SYSTEM' },
      { id: 'sales-report', label: t.sales, icon: ExternalLink, category: 'SYSTEM', href: 'https://gemini.google.com/gem/1VRXEZnnYhGQKyteyNzLYKgFp8XFO8hgc?usp=sharing' }
    ] : []),
  ];

  return (
    <div className="h-screen bg-[#F1F5F9] flex overflow-hidden font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#0F172A] text-slate-300 flex flex-col flex-shrink-0">
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold">MS</div>
            <span className="font-bold text-white text-lg tracking-tight">{t.main_title}</span>
          </div>
          <button 
            onClick={() => setLang(lang === 'en' ? 'mm' : 'en')}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Switch Language"
          >
            <Languages size={18} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col">
          {['CORE', 'MANAGEMENT', 'SYSTEM'].map((category) => (
            navItems.some(item => item.category === category) && (
              <div key={category} className="mb-6">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-4 ml-3">
                  {category === 'CORE' ? t.core : category === 'MANAGEMENT' ? t.management : t.system}
                </div>
                <div className="space-y-1">
                  {navItems.filter(item => item.category === category).map((item) => (
                    (item as any).href ? (
                      <a
                        key={item.id}
                        href={(item as any).href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm hover:bg-slate-800 text-slate-400 hover:text-slate-100"
                      >
                        <item.icon size={18} />
                        {item.label}
                      </a>
                    ) : (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm
                          ${activeTab === item.id 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                            : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'}
                        `}
                      >
                        <item.icon size={18} />
                        {item.label}
                      </button>
                    )
                  ))}
                </div>
              </div>
            )
          ))}
          
          <div className="mt-auto pt-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-3 py-4">
              <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center">
                {user.photoURL ? (
                  <img src={user.photoURL || undefined} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-black text-white uppercase">{user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
              <button
                onClick={logout}
                className="text-slate-500 hover:text-white transition-colors"
                title={t.signout}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800 capitalize">{navItems.find(i => i.id === activeTab)?.label || activeTab}</h2>
            <div className="h-4 w-[1px] bg-slate-200 mx-2"></div>
            <span className="text-slate-400 font-mono text-[10px] uppercase tracking-widest">
              {new Date().toLocaleDateString(lang === 'mm' ? 'my-MM' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.system_live}</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto"
            >
              {activeTab === 'attendance' && <AttendanceForm lang={lang} />}
              {activeTab === 'list' && <AttendanceList lang={lang} />}
              {activeTab === 'payroll' && <Payroll lang={lang} />}
              {activeTab === 'employees' && <EmployeeManagement isAdmin={isAdmin} lang={lang} />}
              {activeTab === 'users' && <UserManagement lang={lang} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
