import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, FileX } from 'lucide-react';
import { getPayslips, updatePayslipStatus, getPayrollPeriods } from '../../api/payrollApi';
import { useAuth } from '../auth/AuthContext';
import type { Payslip, PayslipStatus, PayrollPeriod } from '../../types/payroll';
import { formatKES, periodMonthLabel } from '../../utils/payrollFormat';
import PayrollStatusBadge from '../../components/payroll/PayrollStatusBadge';

const STATUS_OPTIONS: PayslipStatus[] = ['DRAFT', 'APPROVED', 'PAID'];

export default function PayslipListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const periodFilter = searchParams.get('period');
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PayslipStatus | 'ALL'>('ALL');

  useEffect(() => {
    Promise.all([getPayslips(), getPayrollPeriods()])
      .then(([s, p]) => {
        setPayslips(s);
        setPeriods(p);
      })
      .catch(() => setError('Failed to load payslips.'))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleStatusChange(id: string, status: PayslipStatus) {
    setUpdatingId(id);
    setError(null);
    try {
      const updated = await updatePayslipStatus(id, status);
      setPayslips((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch {
      setError('Failed to update payslip status.');
    } finally {
      setUpdatingId(null);
    }
  }

  const visiblePayslips = useMemo(() => {
    return payslips.filter((p) => {
      if (periodFilter && p.period !== periodFilter) return false;
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (search.trim() && !p.employee_name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [payslips, periodFilter, statusFilter, search]);

  if (isLoading) {
    return (
      <div>
        <div className="h-8 w-32 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="h-64 bg-white rounded-xl border border-slate-200/70" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-800 mb-1">Payslips</h1>
      <p className="text-sm text-slate-400 mb-5">View and manage generated employee payslips.</p>

      {error && <p className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 mb-4 border border-red-100">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
          />
        </div>
        <select
          value={periodFilter ?? ''}
          onChange={(e) => setSearchParams(e.target.value ? { period: e.target.value } : {})}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
        >
          <option value="">All Periods</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{periodMonthLabel(p.period_start)}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PayslipStatus | 'ALL')}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
        >
          <option value="ALL">All Statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-400 text-[11px] font-mono uppercase tracking-widest sticky top-0">
            <tr>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium text-right">Gross Pay</th>
              <th className="px-4 py-3 font-medium text-right">Net Pay</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {visiblePayslips.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">{p.employee_name}</td>
                <td className="px-4 py-3 text-slate-500">{p.period_detail}</td>
                <td className="px-4 py-3 text-right text-slate-500 tabular-nums">{formatKES(p.gross_pay)}</td>
                <td className="px-4 py-3 text-right text-slate-700 font-medium tabular-nums">{formatKES(p.net_pay)}</td>
                <td className="px-4 py-3">
                  {isAdmin ? (
                    <select
                      value={p.status}
                      disabled={updatingId === p.id}
                      onChange={(e) => handleStatusChange(p.id, e.target.value as PayslipStatus)}
                      className="text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer disabled:opacity-50 bg-slate-100 text-slate-700"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <PayrollStatusBadge status={p.status} />
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/payroll/payslips/${p.id}`} className="text-crimecurb-navy hover:underline font-medium">
                    View / Print
                  </Link>
                </td>
              </tr>
            ))}
            {visiblePayslips.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <FileX size={22} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400 text-sm">
                    {payslips.length === 0 ? 'No payslips found.' : 'No payslips match your filters.'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}