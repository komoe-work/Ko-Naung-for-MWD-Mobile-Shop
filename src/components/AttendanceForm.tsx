import React, { useState, useRef, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { Camera, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react';
import { motion } from 'motion/react';

interface AttendanceFormProps {
  lang: 'en' | 'mm';
}

export default function AttendanceForm({ lang }: AttendanceFormProps) {
  const translations = {
    en: {
      staff_checkin: 'Staff Check-In',
      biometric: 'Daily biometric verification via selfie',
      identity: 'Identity Selection',
      choose_name: 'Choose your name...',
      visual: 'Visual Verification',
      touch: 'Touch to capture selfie',
      submit: 'Submit Check-In',
      success: 'Successfully checked in:',
      fail: 'Failed to submit attendance. Please try again.'
    },
    mm: {
      staff_checkin: 'ဝန်ထမ်းတက်ရောက်မှု မှတ်တမ်းတင်ရန်',
      biometric: 'နေ့စဉ် မျက်နှာဓာတ်ပုံဖြင့် အတည်ပြုခြင်း',
      identity: 'လူပုဂ္ဂိုလ်ရွေးချယ်မှု',
      choose_name: 'သင့်အမည်ကို ရွေးချယ်ပါ...',
      visual: 'ဓာတ်ပုံအတည်ပြုချက်',
      touch: 'ဓာတ်ပုံရိုက်ရန် နှိပ်ပါ',
      submit: 'မှတ်တမ်းတင်ရန်',
      success: 'အောင်မြင်စွာ မှတ်တမ်းတင်ပြီးပါပြီ:',
      fail: 'မှတ်တမ်းတင်ရန် မအောင်မြင်ပါ။ နောက်တစ်ကြိမ် ထပ်စမ်းကြည့်ပါ။'
    }
  };

  const t = translations[lang];

  const [employees, setEmployees] = useState<{name: string, nameMm?: string}[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selfie, setSelfie] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const q = query(collection(db, 'employees'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      const employeeData = snapshot.docs.map(doc => ({
        name: doc.data().name,
        nameMm: doc.data().nameMm
      }));
      
      // If no employees in DB, use default ones
      if (employeeData.length === 0) {
        setEmployees([
          { name: 'Sayar Sat', nameMm: 'ဆရာဆက်' },
          { name: 'Ye Win Tun', nameMm: 'ရဲဝင်းထွန်း' },
          { name: 'Ko Kyaw Swar', nameMm: 'ကိုကျော်စွာ' },
          { name: 'Sithu', nameMm: 'စည်သူ' },
          { name: 'Zin Min', nameMm: 'ဇင်မင်း' },
          { name: 'Kyaw Thu', nameMm: 'ကျော်သူ' }
        ]);
      } else {
        setEmployees(employeeData);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([
        { name: 'Sayar Sat', nameMm: 'ဆရာဆက်' },
        { name: 'Ye Win Tun', nameMm: 'ရဲဝင်းထွန်း' }
      ]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelfie(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !selfie) return;

    setLoading(true);
    setMessage(null);

    try {
      const employee = employees.find(e => e.name === selectedEmployee);
      await addDoc(collection(db, 'attendance'), {
        employeeName: selectedEmployee,
        employeeNameMm: employee?.nameMm || '',
        selfie: selfie,
        timestamp: serverTimestamp(),
      });

      setMessage({ type: 'success', text: `${t.success} ${selectedEmployee}` });
      setSelectedEmployee('');
      setSelfie(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'attendance');
      setMessage({ type: 'error', text: t.fail });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200"
      >
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.staff_checkin}</h2>
          <p className="text-slate-500 text-sm font-medium mt-2">{t.biometric}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t.identity}</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              required
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all appearance-none font-bold text-slate-900"
              disabled={loadingEmployees}
            >
              <option value="" disabled>{t.choose_name}</option>
              {employees.map(emp => (
                <option key={emp.name} value={emp.name}>
                  {emp.nameMm ? `${emp.nameMm} (${emp.name})` : emp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t.visual}</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative w-full aspect-[4/3] rounded-2xl border border-slate-200 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden bg-slate-100
                ${selfie ? 'ring-2 ring-blue-500 ring-offset-4' : 'hover:bg-slate-50 hover:border-slate-300'}
              `}
            >
              {selfie ? (
                <>
                  <img src={selfie || undefined} alt="Selfie preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={32} />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-400">
                    <Camera size={28} />
                  </div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t.touch}</span>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="user"
              className="hidden"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !selectedEmployee || !selfie}
            className={`
              w-full py-5 px-6 rounded-xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2
              ${loading || !selectedEmployee || !selfie
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-200 active:scale-[0.97]'}
            `}
          >
            {loading ? (
              <RefreshCcw size={20} className="animate-spin" />
            ) : (
              t.submit
            )}
          </button>
        </form>

        {message && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
              mt-8 p-4 rounded-xl flex items-center gap-3 text-xs font-bold uppercase tracking-wider
              ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}
            `}
          >
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
