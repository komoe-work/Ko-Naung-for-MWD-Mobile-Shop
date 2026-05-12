import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Calculator, Download, Calendar, DollarSign, UserCheck, Search, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface Employee {
  id: string;
  name: string;
  baseSalary: number;
}

interface PayrollItem {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  daysPresent: number;
  calculatedSalary: number;
}

export default function Payroll() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [payrollData, setPayrollData] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    calculatePayroll();
  }, [selectedMonth]);

  const calculatePayroll = async () => {
    setLoading(true);
    try {
      // 1. Fetch Employees
      const empSnapshot = await getDocs(collection(db, 'employees'));
      const employees = empSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[];

      // 2. Fetch Attendance for selected month
      const startOfMonth = new Date(selectedMonth + '-01');
      const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59);

      const q = query(
        collection(db, 'attendance'),
        where('timestamp', '>=', Timestamp.fromDate(startOfMonth)),
        where('timestamp', '<=', Timestamp.fromDate(endOfMonth))
      );
      
      const attSnapshot = await getDocs(q);
      const attendance = attSnapshot.docs.map(doc => doc.data());

      // 3. Aggregate Attendance per employee
      const calculated = employees.map(emp => {
        // Count unique days (ignoring multiple check-ins in one day if any)
        const empAtt = attendance.filter(a => a.employeeName === emp.name);
        const uniqueDays = new Set(
          empAtt.map(a => (a.timestamp as Timestamp).toDate().toDateString())
        ).size;

        // Simple Calculation: Pro-rata based on 26 working days (assuming 4 Sundays off)
        // Or just Base Salary if worked full month? Let's use: (Base / 26) * Days
        const workingDaysInMonth = 26; 
        const salary = (emp.baseSalary / workingDaysInMonth) * Math.min(uniqueDays, workingDaysInMonth);

        return {
          employeeId: emp.id,
          employeeName: emp.name,
          baseSalary: emp.baseSalary,
          daysPresent: uniqueDays,
          calculatedSalary: Math.round(salary * 100) / 100
        };
      });

      setPayrollData(calculated);
    } catch (error) {
      console.error("Error calculating payroll:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Financial Overview</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Monthly payroll processing and staff compensation tracking</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
          <Calendar className="text-slate-400 ml-2" size={18} />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-none bg-transparent font-black text-slate-900 focus:ring-0 outline-none pr-4 text-sm"
          />
          <button 
            onClick={calculatePayroll}
            className="px-4 py-2 bg-[#0F172A] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            Refetch
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-600">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <DollarSign size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Projected Payout</p>
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter font-mono">
            ${payrollData.reduce((acc, curr) => acc + curr.calculatedSalary, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
        </div>
        
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-green-500">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
              <UserCheck size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Records</p>
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter font-mono">
            {payrollData.filter(i => i.daysPresent > 0).length} <span className="text-slate-300 font-medium text-lg">/ {payrollData.length}</span>
          </h3>
        </div>

        <div className="bg-[#0F172A] p-8 rounded-2xl shadow-2xl shadow-slate-200 flex flex-col justify-between text-white group cursor-pointer hover:bg-slate-900 transition-all border border-slate-800">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
              <Download size={20} />
            </div>
            <ChevronRight size={20} className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
          <div className="mt-6">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Accounting Export</p>
            <h3 className="text-lg font-black tracking-tight uppercase">Download Monthly PDF</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="bg-slate-50 border-b border-slate-200 py-5 px-8 grid grid-cols-[1.5fr_1fr_1fr_1fr] font-mono text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
          <div>Staff Identification</div>
          <div>Base Compensation</div>
          <div className="text-center">Active Cycles</div>
          <div className="text-right">Settlement Amount</div>
        </div>

        <div className="divide-y divide-slate-100 font-mono">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="py-6 px-8 animate-pulse"><div className="h-4 bg-slate-50 rounded w-full"></div></div>
            ))
          ) : payrollData.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
              Database contains no records for this period
            </div>
          ) : (
            payrollData.map((item) => (
              <div key={item.employeeId} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] py-6 px-8 items-center hover:bg-slate-50 transition-colors">
                <div className="font-black text-slate-900 tracking-tight">{item.employeeName}</div>
                <div className="text-slate-500 font-bold text-sm tracking-tighter">${item.baseSalary.toLocaleString()}</div>
                <div className="text-center">
                  <span className={`
                    px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border
                    ${item.daysPresent >= 20 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                    }
                  `}>
                    {item.daysPresent} Days
                  </span>
                </div>
                <div className="text-right font-black text-slate-900 text-lg tracking-tighter">
                  ${item.calculatedSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
