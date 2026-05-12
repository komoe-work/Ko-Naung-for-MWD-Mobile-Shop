import React, { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Users, Plus, Trash2, UserCircle2, Briefcase, Banknote, RefreshCcw, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Employee {
  id: string;
  name: string;
  baseSalary: number;
  role: string;
  email?: string;
  hasAuth?: boolean;
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        role: role || 'General Staff',
        email: email || '',
        baseSalary: parseFloat(baseSalary),
        hasAuth: false,
      });
      setName('');
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
          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Human Resources</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Manage staff roles, compensation, and access</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`
            flex items-center gap-2 py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm
            ${showAddForm ? 'bg-slate-100 text-slate-600' : 'bg-[#0F172A] text-white hover:bg-slate-800 shadow-slate-200'}
          `}
        >
          {showAddForm ? 'Cancel Operation' : <><Plus size={16} /> New Employee</>}
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="mb-10"
          >
            <form onSubmit={handleAddEmployee} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl shadow-slate-100/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Legal Name</label>
                <div className="relative">
                  <UserCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-slate-900 shadow-sm"
                    placeholder="Full name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Role</label>
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Work Email (Optional)</label>
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Salary</label>
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
                {submitting ? <RefreshCcw className="animate-spin" size={18} /> : 'Add Member'}
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
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Employee Directory Empty</p>
          </div>
        ) : (
          employees.map((employee) => (
            <motion.div
              layout
              key={employee.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all group border-l-4 border-l-blue-600"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                  <UserCircle2 size={32} />
                </div>
                <button
                  onClick={() => handleDelete(employee.id, employee.name)}
                  className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={20} />
                </button>
              </div>
              
              <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tight flex items-center gap-2">
                {employee.name}
                {employee.hasAuth && <ShieldCheck size={16} className="text-blue-500" title="System User" />}
              </h3>
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">{employee.role}</p>
              {employee.email && <p className="text-[10px] text-slate-400 font-medium mb-6 italic">{employee.email}</p>}
              {!employee.email && <div className="mb-6"></div>}
              
              <div className="pt-6 border-t border-slate-50 flex items-center justify-between font-mono">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Rate</span>
                <span className="text-xl font-black text-slate-900 tracking-tighter">${employee.baseSalary.toLocaleString()}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
