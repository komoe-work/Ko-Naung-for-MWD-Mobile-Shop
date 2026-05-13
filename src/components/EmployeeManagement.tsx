import React, { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, query, orderBy, onSnapshot, updateDoc } from 'firebase/firestore';
import { Users, Plus, Trash2, UserCircle2, Briefcase, Banknote, RefreshCcw, ShieldCheck, Pencil, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Employee {
  id: string;
  name: string;
  nameMm?: string;
  baseSalary: number;
  role: string;
  email?: string;
  hasAuth?: boolean;
}

interface EmployeeManagementProps {
  isAdmin: boolean;
  lang: 'en' | 'mm';
}

export default function EmployeeManagement({ isAdmin, lang }: EmployeeManagementProps) {
  const translations = {
    en: {
      hr: 'Human Resources',
      manage_staff: 'Manage staff roles, compensation, and access',
      bulk_import: 'Bulk Import',
      new_employee: 'New Employee',
      cancel: 'Cancel Operation',
      editing_member: 'Editing Member',
      eng_name: 'Eng Name',
      burmese_name: 'Burmese Name',
      position: 'Position',
      email: 'Email',
      salary: 'Salary',
      base_rate: 'Base Rate',
      import_all: 'Import All',
      processing: 'Processing...',
      add_member: 'Add Member'
    },
    mm: {
      hr: 'လူ့စွမ်းအားအရင်းအမြစ်',
      manage_staff: 'ဝန်ထမ်းကဏ္ဍများ၊ လစာနှင့် အသုံးပြုခွင့်များကို စီမံခန့်ခွဲရန်',
      bulk_import: 'အစုလိုက်သွင်းရန်',
      new_employee: 'ဝန်ထမ်းသစ်',
      cancel: 'မလုပ်တော့ပါ',
      editing_member: 'ဝန်ထမ်းအချက်အလက်ပြင်ဆင်မှု',
      eng_name: 'အင်္ဂလိပ်အမည်',
      burmese_name: 'မြန်မာအမည်',
      position: 'ရာထူး',
      email: 'အီးမေးလ်',
      salary: 'လစာ',
      base_rate: 'အခြေခံလစာ',
      import_all: 'အားလုံးသွင်းရန်',
      processing: 'လုပ်ဆောင်နေဆဲ...',
      add_member: 'ဝန်ထမ်းထည့်သွင်းရန်'
    }
  };

  const t = translations[lang];

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state for new employee
  const [name, setName] = useState('');
  const [nameMm, setNameMm] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkData, setBulkData] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNameMm, setEditNameMm] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBaseSalary, setEditBaseSalary] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[];
      setEmployees(data);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to employees:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !baseSalary) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'employees'), {
        name,
        nameMm: nameMm || '',
        role: role || 'General Staff',
        email: email || '',
        baseSalary: parseFloat(baseSalary),
        hasAuth: false,
      });
      setName('');
      setNameMm('');
      setRole('');
      setEmail('');
      setBaseSalary('');
      setShowAddForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'employees');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkData) return;
    setSubmitting(true);
    try {
      const lines = bulkData.split('\n');
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 3) {
          const nameMm = parts[1].trim();
          const nameEn = parts[2].trim();
          if (nameEn && nameEn !== 'English Transliteration') {
            await addDoc(collection(db, 'employees'), {
              name: nameEn,
              nameMm: nameMm,
              role: 'Shop Staff',
              baseSalary: 300000, // Default for seed
              hasAuth: false,
            });
          }
        }
      }
      setBulkData('');
      setShowBulkAdd(false);
      alert('Employees added successfully!');
    } catch (error) {
      console.error("Bulk add error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName || !editBaseSalary) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'employees', id), {
        name: editName,
        nameMm: editNameMm,
        role: editRole,
        email: editEmail,
        baseSalary: parseFloat(editBaseSalary),
      });
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `employees/${id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (employee: Employee) => {
    setEditingId(employee.id);
    setEditName(employee.name);
    setEditNameMm(employee.nameMm || '');
    setEditRole(employee.role);
    setEditEmail(employee.email || '');
    setEditBaseSalary(employee.baseSalary.toString());
  };

  const handleDelete = async (id: string, employeeName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${employeeName}?`)) return;
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `employees/${id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{t.hr}</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">{t.manage_staff}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowBulkAdd(!showBulkAdd)}
              className="flex items-center gap-2 py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              {t.bulk_import}
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`
                flex items-center gap-2 py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm
                ${showAddForm ? 'bg-slate-100 text-slate-600' : 'bg-[#0F172A] text-white hover:bg-slate-800 shadow-slate-200'}
              `}
            >
              {showAddForm ? t.cancel : <><Plus size={16} /> {t.new_employee}</>}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showBulkAdd && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl mb-10"
          >
            <h3 className="text-lg font-black mb-4">{lang === 'mm' ? 'အစုလိုက်တင်သွင်းခြင်း (CSV ဖော်မတ်)' : 'Bulk Import (CSV format)'}</h3>
            <p className="text-slate-500 text-sm mb-4">{lang === 'mm' ? 'ပုံစံ: နံပါတ်၊ မြန်မာအမည်၊ အင်္ဂလိပ်အမည်' : 'Format: No.,Burmese Name,English Name'}</p>
            <textarea
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              className="w-full h-48 p-4 bg-slate-50 border border-slate-100 rounded-xl font-mono text-sm mb-4 outline-none focus:ring-4 focus:ring-blue-100"
              placeholder="1,ဆရာဆက်,Sayar Sat&#10;2,ရဲဝင်းထွန်း,Ye Win Tun"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowBulkAdd(false)} className="px-6 py-3 font-black text-xs uppercase text-slate-500 tracking-widest">{t.cancel}</button>
              <button 
                onClick={handleBulkAdd}
                disabled={submitting}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100"
              >
                {submitting ? t.processing : t.import_all}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="mb-10"
          >
            <form onSubmit={handleAddEmployee} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl shadow-slate-100/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{t.eng_name}</label>
                <div className="relative">
                  <UserCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-slate-900 shadow-sm"
                    placeholder="Full name (EN)"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{t.burmese_name}</label>
                <div className="relative">
                  <UserCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={nameMm}
                    onChange={(e) => setNameMm(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-slate-900 shadow-sm font-myanmar"
                    placeholder="Burmese Name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{t.position}</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-slate-900 shadow-sm"
                    placeholder="Position"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{t.email}</label>
                <div className="relative">
                  <RefreshCcw className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-slate-900 shadow-sm"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{t.salary}</label>
                <div className="relative font-mono">
                  <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="number"
                    required
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-slate-900 shadow-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <button
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-6 rounded-xl shadow-xl shadow-blue-100 flex items-center justify-center gap-2 h-[60px] text-xs uppercase tracking-widest transition-all active:scale-95 translate-y-[-1px]"
              >
                {submitting ? <RefreshCcw className="animate-spin" size={18} /> : t.add_member}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200 animate-pulse h-48 shadow-sm"></div>
          ))
        ) : employees.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Users size={64} className="text-slate-100 mx-auto mb-6" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{lang === 'mm' ? 'ဝန်ထမ်းစာရင်း မရှိသေးပါ' : 'Employee Directory Empty'}</p>
          </div>
        ) : (
          employees.map((employee) => (
            <motion.div
              layout
              key={employee.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="group bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all relative overflow-hidden"
            >
              {editingId === employee.id ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{t.editing_member}</span>
                    <div className="flex gap-2">
                       <button onClick={() => handleUpdate(employee.id)} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">{t.eng_name}</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">{t.burmese_name}</label>
                      <input
                        type="text"
                        value={editNameMm}
                        onChange={(e) => setEditNameMm(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold outline-none focus:border-blue-500 font-myanmar"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">{t.position}</label>
                      <input
                        type="text"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">{t.email}</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">{t.salary}</label>
                      <input
                        type="number"
                        value={editBaseSalary}
                        onChange={(e) => setEditBaseSalary(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                      <UserCircle2 size={32} />
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEditing(employee)}
                          className="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id, employee.name)}
                          className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tight flex items-center gap-2">
                    {employee.nameMm && <span className="font-myanmar text-lg">{employee.nameMm}</span>}
                    <span className="text-slate-400 font-medium text-sm">({employee.name})</span>
                    {employee.hasAuth && <ShieldCheck size={16} className="text-blue-500" title="System User" />}
                  </h3>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">{employee.role}</p>
                  {employee.email && <p className="text-[10px] text-slate-400 font-medium mb-6 italic">{employee.email}</p>}
                  {!employee.email && <div className="mb-6"></div>}
                  
                  <div className="pt-6 border-t border-slate-50 flex items-center justify-between font-mono">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.base_rate}</span>
                    <span className="text-xl font-black text-slate-900 tracking-tighter">{employee.baseSalary.toLocaleString()} MMK</span>
                  </div>
                </>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
