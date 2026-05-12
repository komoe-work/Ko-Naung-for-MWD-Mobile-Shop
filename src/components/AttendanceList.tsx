import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { Calendar, User, Clock, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface AttendanceRecord {
  id: string;
  employeeName: string;
  timestamp: Timestamp;
  selfie: string;
}

export default function AttendanceList() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'attendance'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AttendanceRecord[];
      setRecords(docs.filter(d => d.timestamp)); // Filter out items being written
      setLoading(false);
    }, (error) => {
      console.error("Error listening to attendance:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 grayscale opacity-20">
        <Calendar size={48} className="animate-pulse mb-4" />
        <p className="text-sm font-medium">Crunching attendance data...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
          <Calendar size={32} />
        </div>
        <h3 className="text-lg font-bold text-gray-900">No records found</h3>
        <p className="text-gray-500 max-w-xs mx-auto mt-1">Daily attendance logs will appear here once employees check in.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recent Activity</h2>
          <p className="text-slate-500 text-sm font-medium">Biometric attendance log for all staff members</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200 shadow-sm">
          <Clock size={16} className="text-slate-400" />
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest text-nowrap">
            Real-time Feed
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="bg-slate-50 border-b border-slate-200 py-4 px-8 grid grid-cols-[1.5fr_1fr_1fr_0.8fr] font-mono text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
          <div>Employee</div>
          <div>Check-In Time</div>
          <div>Date</div>
          <div className="text-right">Status</div>
        </div>

        {/* Data Rows */}
        <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px] font-mono">
          {records.map((record) => (
            <motion.div
              layout
              key={record.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="group grid grid-cols-[1.5fr_1fr_1fr_0.8fr] py-5 px-8 border-b border-slate-100 items-center hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded shadow-sm border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0">
                  {record.selfie ? (
                    <img src={record.selfie || undefined} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon size={18} />
                    </div>
                  )}
                </div>
                <span className="text-slate-900 font-bold text-sm tracking-tight">{record.employeeName}</span>
              </div>
              
              <div className="text-slate-700 font-bold text-sm">
                {record.timestamp?.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
              
              <div className="text-slate-500 text-sm">
                {record.timestamp?.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </div>
              
              <div className="text-right">
                <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-widest border border-green-200">
                  VERIFIED
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 py-4 px-8 flex items-center justify-between">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">
            Showing latest {records.length} entries
          </span>
          <div className="flex gap-2">
            <button className="w-8 h-8 flex items-center justify-center border border-slate-300 bg-white rounded-lg text-slate-400 hover:bg-slate-50 transition-colors shadow-sm">&lt;</button>
            <button className="w-8 h-8 flex items-center justify-center border border-blue-600 bg-blue-600 text-white rounded-lg font-bold text-xs shadow-lg shadow-blue-200">1</button>
            <button className="w-8 h-8 flex items-center justify-center border border-slate-300 bg-white rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">&gt;</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to avoid build error if CheckCircle2 is missing from imports
import { CheckCircle2 } from 'lucide-react';
