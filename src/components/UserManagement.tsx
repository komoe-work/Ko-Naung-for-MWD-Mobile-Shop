import React, { useState, useEffect } from 'react';
import { db, createAuthUserServer, deleteAuthUserServer, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { UserPlus, ShieldCheck, Mail, Key, ShieldAlert, CheckCircle2, XCircle, Trash2, Shield, User, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface Employee {
  id: string;
  name: string;
  role: string;
  email?: string;
  authUid?: string;
  hasAuth?: boolean;
}

interface UserManagementProps {
  lang: 'en' | 'mm';
}

export default function UserManagement({ lang }: UserManagementProps) {
  const translations = {
    en: {
      title: 'User Account Control',
      subtitle: 'Manage employee login credentials and system access',
      assign_creds: 'Assign Credentials',
      select_emp: 'Select Employee',
      choose_emp: 'Choose an employee...',
      gen_id: 'Generated Email/ID',
      assign_pw: 'Assign Password',
      min_chars: 'Min 6 characters',
      creating: 'Provisioning...',
      create: 'Create Account',
      user_list: 'System User List',
      employee: 'Employee',
      login_id: 'Login Identity',
      security: 'Security Level',
      status: 'Status',
      admin: 'System Admin',
      staff: 'Staff',
      authorized: 'Authorized',
      pending: 'Pending',
      no_emp: 'No employees found. Add them in the Team tab first.',
      no_creds: 'No Credentials',
      confirm_revoke: 'Are you sure you want to permanently delete the login account for ',
      revoked: 'Revoked Admin rights from ',
      promoted: ' is now an Admin',
      access_revoke_success: 'Access revoked for ',
      account_created: 'Account created for '
    },
    mm: {
      title: 'အသုံးပြုသူ အကောင့်စီမံခန့်ခွဲမှု',
      subtitle: 'ဝန်ထမ်းများ၏ ဝင်ရောက်ခွင့် အထောက်အထားများနှင့် စနစ်သုံးစွဲခွင့်ကို စီမံရန်',
      assign_creds: 'ဝင်ရောက်ခွင့် သတ်မှတ်ရန်',
      select_emp: 'ဝန်ထမ်းရွေးချယ်ပါ',
      choose_emp: 'ဝန်ထမ်းတစ်ဦးကို ရွေးချယ်ပါ...',
      gen_id: 'ထုတ်ပေးထားသော အီးမေးလ်/အိုင်ဒီ',
      assign_pw: 'စကားဝှက် သတ်မှတ်ပါ',
      min_chars: 'အနည်းဆုံး ၆ လုံး',
      creating: 'လုပ်ဆောင်နေပါသည်...',
      create: 'အကောင့်ဖွင့်မည်',
      user_list: 'စနစ်အသုံးပြုသူ စာရင်း',
      employee: 'ဝန်ထမ်း',
      login_id: 'ဝင်ရောက်ခွင့် အိုင်ဒီ',
      security: 'လုံခြုံရေးအဆင့်',
      status: 'အခြေအနေ',
      admin: 'စီမံခန့်ခွဲသူ',
      staff: 'ဝန်ထမ်း',
      authorized: 'ခွင့်ပြုပြီး',
      pending: 'စောင့်ဆိုင်းဆဲ',
      no_emp: 'ဝန်ထမ်းစာရင်း မရှိသေးပါ။ ဦးစွာ ဝန်ထမ်းအဖွဲ့သို့ သွားရောက်ပေါင်းထည့်ပါ။',
      no_creds: 'အထောက်အထား မရှိသေးပါ',
      confirm_revoke: 'ဝင်ရောက်ခွင့် အကောင့်ကို အပြီးတိုင် ဖျက်ရန် သေချာပါသလား - ',
      revoked: 'စီမံခန့်ခွဲသူ အခွင့်အရေးကို ရုပ်သိမ်းလိုက်ပြီ - ',
      promoted: ' ကို စီမံခန့်ခွဲသူအဖြစ် သတ်မှတ်လိုက်ပြီ',
      access_revoke_success: 'ဝင်ရောက်ခွင့်ကို ရုပ်သိမ်းလိုက်ပြီ - ',
      account_created: 'အကောင့်ဖွင့်လှစ်ပြီးပြီ - '
    }
  };

  const t = translations[lang];

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [admins, setAdmins] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state for creating user
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    // Sync Employees
    const q = query(collection(db, 'employees'));
    const unsubEmp = onSnapshot(q, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'employees'));

    // Sync Admins
    const aq = query(collection(db, 'admins'));
    const unsubAdmin = onSnapshot(aq, (snapshot) => {
      setAdmins(snapshot.docs.map(doc => doc.id));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'admins'));

    return () => { unsubEmp(); unsubAdmin(); };
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !newPassword) return;

    setCreating(selectedEmp.id);
    setError('');
    setSuccess('');

    try {
      const email = selectedEmp.email || `${selectedEmp.name.toLowerCase().replace(/\s+/g, '')}@mobileshop.local`;
      const result = await createAuthUserServer(email, newPassword, selectedEmp.name);
      
      await updateDoc(doc(db, 'employees', selectedEmp.id), {
        authUid: result.uid,
        hasAuth: true,
        loginEmail: email
      });

      setSuccess(`${t.account_created} ${selectedEmp.name}`);
      setSelectedEmp(null);
      setNewPassword('');
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setCreating(null);
    }
  };

  const toggleAdmin = async (emp: Employee) => {
    if (!emp.authUid) return;
    setProcessingId(emp.id);
    try {
      const isAdmin = admins.includes(emp.authUid);
      if (isAdmin) {
        await deleteDoc(doc(db, 'admins', emp.authUid));
        setSuccess(`${t.revoked}${emp.name}`);
      } else {
        await setDoc(doc(db, 'admins', emp.authUid), { 
          email: (emp as any).loginEmail || emp.email || '',
          promotedAt: new Date().toISOString()
        });
        setSuccess(`${emp.name}${t.promoted}`);
      }
    } catch (err: any) {
      setError("Failed to update status");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevokeAccess = async (emp: Employee) => {
    if (!emp.authUid || !window.confirm(`${t.confirm_revoke}${emp.name}?`)) return;
    
    setProcessingId(emp.id);
    try {
      // 1. Delete from Firebase Auth via server
      await deleteAuthUserServer(emp.authUid);
      
      // 2. Remove from admins collection if present
      await deleteDoc(doc(db, 'admins', emp.authUid));

      // 3. Update employee doc
      await updateDoc(doc(db, 'employees', emp.id), {
        authUid: null,
        hasAuth: false,
        loginEmail: null
      });

      setSuccess(`${t.access_revoke_success} ${emp.name}`);
    } catch (err: any) {
      setError(err.message || "Failed to revoke access");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 mb-1">{t.title}</h2>
          <p className="text-slate-500 font-medium tracking-tight text-sm">{t.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Creation Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 sticky top-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <UserPlus size={20} />
              </div>
              <h3 className="font-bold text-slate-800">{t.assign_creds}</h3>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.select_emp}</label>
                <select
                  required
                  value={selectedEmp?.id || ''}
                  onChange={(e) => setSelectedEmp(employees.find(emp => emp.id === e.target.value) || null)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-slate-900"
                >
                  <option value="">{t.choose_emp}</option>
                  {employees.filter(emp => !emp.hasAuth).map(emp => (
                    <option key={emp.id} value={emp.id}>{(emp as any).nameMm || emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              {selectedEmp && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.gen_id}</label>
                    <div className="px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-mono text-xs text-slate-600">
                      {selectedEmp.email || `${selectedEmp.name.toLowerCase().replace(/\s+/g, '')}@mobileshop.local`}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.assign_pw}</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t.min_chars}
                        minLength={6}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-slate-900 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!!creating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-95 disabled:bg-slate-400"
                  >
                    {creating ? t.creating : t.create}
                  </button>
                </motion.div>
              )}
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600">
                <XCircle size={16} />
                <span className="text-[10px] font-bold">{error}</span>
              </div>
            )}

            {success && (
              <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2 text-green-600">
                <CheckCircle2 size={16} />
                <span className="text-[10px] font-bold">{success}</span>
              </div>
            )}
          </div>
        </div>

        {/* User Accounts List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="text-green-500" size={18} />
                {t.user_list}
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 tracking-widest uppercase">{t.employee}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 tracking-widest uppercase">{t.login_id}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 tracking-widest uppercase">{t.security}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 tracking-widest uppercase">{t.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {employees.map((emp) => {
                    const isSystemAdmin = emp.authUid && admins.includes(emp.authUid);
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            {(emp as any).nameMm || emp.name}
                            {isSystemAdmin && <Shield size={12} className="text-purple-500" />}
                          </div>
                          <div className="text-[10px] text-slate-400 font-black uppercase tracking-tight">{emp.role}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-mono text-xs text-slate-500 flex items-center gap-2">
                            <Mail size={12} className="text-slate-300" />
                            {emp.hasAuth ? (emp as any).loginEmail : t.no_creds}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <span className={`
                              px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight
                              ${isSystemAdmin ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}
                            `}>
                              {isSystemAdmin ? t.admin : t.staff}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            {emp.hasAuth ? (
                              <div className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                {t.authorized}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                {t.pending}
                              </div>
                            )}

                            {emp.hasAuth && (
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => toggleAdmin(emp)}
                                  disabled={processingId === emp.id}
                                  className={`p-1.5 rounded-lg transition-all ${isSystemAdmin ? 'text-purple-600 bg-purple-50 hover:bg-purple-100' : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'}`}
                                  title={isSystemAdmin ? "Demote to Staff" : "Promote to Admin"}
                                >
                                  {processingId === emp.id ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                                </button>
                                <button
                                  onClick={() => handleRevokeAccess(emp)}
                                  disabled={processingId === emp.id}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Revoke All Access"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {employees.length === 0 && !loading && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
                        {t.no_emp}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
