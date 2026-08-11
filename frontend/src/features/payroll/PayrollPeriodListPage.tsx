import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, Users, Wallet, TrendingDown, TrendingUp, Clock3,
  Plus, ChevronRight, Trash2, Lock, MoreHorizontal,
} from 'lucide-react';
import { getPayrollPeriods, createPayrollPeriod, getPayslips, deletePayrollPeriod, closePayrollPeriod } from '../../api/payrollApi';
import { useAuth } from '../auth/AuthContext';
import type { PayrollPeriod, Payslip } from '../../types/payroll';
import { formatKESCompact, formatDateRange, periodMonthLabel } from '../../utils/payrollFormat';
import KpiCard from '../../components/payroll/KpiCard';
import PayrollStatusBadge from '../../components/payroll/PayrollStatusBadge';

export default function PayrollPeriodListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ period_start: '', period_end: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Local UI state only -- which period's numbers the KPI row reflects.
  // Doesn't touch the API; still fetches everything up front and filters
  // client-side, same as the original page did for its "current period".
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setIsLoading(true);
    Promise.all([getPayrollPeriods(), getPayslips()])
      .then(([p, s]) => {
        setPeriods(p);
        setPayslips(s);
        setSelectedPeriodId((prev) => prev ?? p[0]?.id ?? null);
      })
      .catch(() => setError('Failed to load payroll data.'))
      .finally(() => setIsLoading(false));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await createPayrollPeriod(form);
      setForm({ period_start: '', period_end: '' });
      setShowForm(false);
      load();
    } catch {
      setError('Failed to create payroll period.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeletePeriod(id: string, label: string) {
    if (!confirm(`Delete payroll period "${label}"? This cannot be undone.`)) return;
    try {
      await deletePayrollPeriod(id);
      load();
    } catch {
      setError('Failed to delete payroll period.');
    }
  }

  async function handleClosePeriod(id: string, label: string) {
    if (!confirm(`Close payroll period "${label}"? Once closed, no further payslips can be generated for it.`)) return;
    setError(null);
    setIsClosing(true);
    try {
      await closePayrollPeriod(id);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to close payroll period.');
    } finally {
      setIsClosing(false);
    }
  }

  if (isLoading) {
    return (
      <div>
        <div className="h-8 w-40 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[72px] bg-white rounded-xl border border-slate-200/70" />
          ))}
        </div>
        <div className="h-40 bg-white rounded-xl border border-slate-200/70" />
      </div>
    );
  }

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId) ?? periods[0] ?? null;
  const currentPeriod = periods[0];
  const olderPeriods = periods.slice(1);

  const selectedPeriodPayslips = selectedPeriod ? payslips.filter((s) => s.period === selectedPeriod.id) : [];
  const grossPayroll = selectedPeriodPayslips.reduce((sum, s) => sum + parseFloat(s.gross_pay), 0);
  const netPayroll = selectedPeriodPayslips.reduce((sum, s) => sum + parseFloat(s.net_pay), 0);
  const totalDeductions = grossPayroll - netPayroll;
  const guardsPaid = selectedPeriodPayslips.filter((s) => s.status === 'PAID').length;
  const pendingCount = selectedPeriodPayslips.filter((s) => s.status !== 'PAID').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Payroll</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage payroll periods, salaries, deductions and employee payments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {periods.length > 0 && (
            <>
              <select
                value={selectedPeriod?.id ?? ''}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    Payroll Period: {periodMonthLabel(p.period_start)}
                  </option>
                ))}
              </select>
              {selectedPeriod && <PayrollStatusBadge status={selectedPeriod.status} />}
            </>
          )}
          <Link to="/payroll/payslips" className="text-sm font-medium text-crimecurb-navy hover:underline whitespace-nowrap">
            View All Payslips
          </Link>
        </div>
      </div>

      {error && (
        <p className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 mb-4 border border-red-100">{error}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Hero metric — Net Payroll is the number a director actually
            opens this page for. Giving it real visual weight instead of
            sitting equal-weighted next to five other boxes is the point:
            hierarchy should reflect what actually matters most here. */}
        <div className="lg:col-span-1 bg-crimecurb-navy rounded-2xl shadow-sm p-5 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/[0.04]" />
          <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/[0.03]" />
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-3">
              <Wallet size={13} className="text-white/40" />
              <p className="text-[11px] font-mono uppercase tracking-widest text-white/40">Net Payroll</p>
            </div>
            <p className="font-display text-3xl font-bold tabular-nums leading-none">{formatKESCompact(netPayroll)}</p>
          </div>
          <p className="relative text-xs text-white/40 mt-4">
            {isLoading ? '' : `${selectedPeriodPayslips.length} payslip(s) in this period`}
          </p>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard icon={TrendingUp} label="Gross Payroll" value={formatKESCompact(grossPayroll)} tone="accent" />
          <KpiCard icon={TrendingDown} label="Deductions" value={formatKESCompact(totalDeductions)} />
          <KpiCard icon={Users} label="Guards Paid" value={guardsPaid} tone="success" />
          <KpiCard icon={Clock3} label="Pending" value={pendingCount} tone={pendingCount > 0 ? 'warning' : 'default'} />
        </div>
      </div>

      {selectedPeriod && selectedPeriodPayslips.length === 0 && (
        <p className="text-xs text-slate-400 -mt-3 mb-6">
          No payslips generated yet for {periodMonthLabel(selectedPeriod.period_start)} — figures above will populate once payslips are generated.
        </p>
      )}

      {currentPeriod ? (
        <div className="bg-crimecurb-navy rounded-2xl shadow-lg p-6 mb-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Calendar size={14} className="text-white/40" />
                <span className="text-[11px] font-mono uppercase tracking-widest text-white/50">Current period</span>
                <PayrollStatusBadge status={currentPeriod.status} />
              </div>
              <p className="font-display text-lg font-semibold">
                {formatDateRange(currentPeriod.period_start, currentPeriod.period_end)}
              </p>
              <p className="text-sm text-white/50 mt-1">
                {payslips.filter((s) => s.period === currentPeriod.id).length} payslip(s) generated so far
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                to={`/payroll/generate/${currentPeriod.id}`}
                className="bg-white text-crimecurb-navy hover:bg-slate-50 font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                Generate Payslips <ChevronRight size={16} />
              </Link>
              {isAdmin && currentPeriod.status === 'OPEN' && (
                <button
                  onClick={() => handleClosePeriod(currentPeriod.id, `${currentPeriod.period_start} - ${currentPeriod.period_end}`)}
                  disabled={isClosing}
                  className="bg-white/10 hover:bg-white/15 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50 border border-white/15"
                >
                  <Lock size={15} /> {isClosing ? 'Closing…' : 'Close Period'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-10 mb-6 text-center">
          <Calendar size={28} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No payroll periods yet</p>
          <p className="text-sm text-slate-400 mt-1">Create one below to start generating payslips.</p>
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-crimecurb-navy hover:underline mb-6"
        >
          <Plus size={16} /> New Payroll Period
        </button>
      ) : (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Period Start</label>
            <input
              type="date"
              value={form.period_start}
              onChange={(e) => setForm((p) => ({ ...p, period_start: e.target.value }))}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Period End</label>
            <input
              type="date"
              value={form.period_end}
              onChange={(e) => setForm((p) => ({ ...p, period_end: e.target.value }))}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-crimecurb-navy hover:bg-crimecurb-navy/90 text-white font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {isSubmitting ? 'Creating…' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="text-slate-500 hover:text-slate-700 px-3 py-2 text-sm"
          >
            Cancel
          </button>
        </form>
      )}

      {olderPeriods.length > 0 && (
        <>
          <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-2">Past Periods</p>
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm overflow-visible">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-400 text-[11px] font-mono uppercase tracking-widest rounded-t-xl">
                <tr>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Employees</th>
                  <th className="px-4 py-3 font-medium">Net Pay</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {olderPeriods.map((p) => {
                  const periodPayslips = payslips.filter((s) => s.period === p.id);
                  const periodNet = periodPayslips.reduce((sum, s) => sum + parseFloat(s.net_pay), 0);
                  const label = `${p.period_start} - ${p.period_end}`;
                  const menuOpen = openMenuId === p.id;
                  return (
                    <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{formatDateRange(p.period_start, p.period_end)}</td>
                      <td className="px-4 py-3 text-slate-500 tabular-nums">{periodPayslips.length}</td>
                      <td className="px-4 py-3 text-slate-700 tabular-nums">{formatKESCompact(periodNet)}</td>
                      <td className="px-4 py-3"><PayrollStatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-right relative">
                        <button
                          onClick={() => setOpenMenuId(menuOpen ? null : p.id)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                          aria-label="Actions"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {menuOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-4 top-9 z-20 w-44 bg-white rounded-lg shadow-lg border border-slate-100 py-1 text-left">
                              <Link
                                to={`/payroll/generate/${p.id}`}
                                className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => setOpenMenuId(null)}
                              >
                                Generate Payslips
                              </Link>
                              <Link
                                to={`/payroll/payslips?period=${p.id}`}
                                className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => setOpenMenuId(null)}
                              >
                                View Payslips
                              </Link>
                              {isAdmin && p.status === 'OPEN' && (
                                <button
                                  onClick={() => { setOpenMenuId(null); handleClosePeriod(p.id, label); }}
                                  disabled={isClosing}
                                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
                                >
                                  <Lock size={13} /> Close Period
                                </button>
                              )}
                              {isAdmin && periodPayslips.length === 0 && (
                                <button
                                  onClick={() => { setOpenMenuId(null); handleDeletePeriod(p.id, label); }}
                                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 size={13} /> Delete
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}