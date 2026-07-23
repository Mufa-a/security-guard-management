import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Wallet, Plus, ChevronRight, Clock, Trash2 } from 'lucide-react';
import { getPayrollPeriods, createPayrollPeriod, getPayslips, deletePayrollPeriod } from '../../api/payrollApi';
import { useAuth } from '../auth/AuthContext';
import type { PayrollPeriod, Payslip } from '../../types/payroll';

function formatKES(value: number): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-slate-100 text-slate-500',
};

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

  useEffect(() => {
    load();
  }, []);

  function load() {
    setIsLoading(true);
    Promise.all([getPayrollPeriods(), getPayslips()])
      .then(([p, s]) => {
        setPeriods(p);
        setPayslips(s);
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

  if (isLoading) return <p className="text-slate-500">Loading...</p>;

  const currentPeriod = periods[0];
  const olderPeriods = periods.slice(1);
  const totalPayslipsAllTime = payslips.length;
  const currentPeriodPayslips = currentPeriod ? payslips.filter((s) => s.period === currentPeriod.id) : [];
  const currentPeriodTotal = currentPeriodPayslips.reduce((sum, s) => sum + parseFloat(s.net_pay), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Payroll</h1>
        <Link to="/payroll/payslips" className="text-blue-700 hover:underline text-sm">
          View All Payslips
        </Link>
      </div>

      {error && (
        <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
          <div className="bg-blue-50 text-blue-700 p-2 rounded-lg flex-shrink-0">
            <Calendar size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 uppercase">Payroll Periods</p>
            <p className="text-xl font-bold text-slate-800">{periods.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
          <div className="bg-purple-50 text-purple-700 p-2 rounded-lg flex-shrink-0">
            <Users size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 uppercase">Payslips Generated</p>
            <p className="text-xl font-bold text-slate-800">{totalPayslipsAllTime}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
          <div className="bg-green-50 text-green-700 p-2 rounded-lg flex-shrink-0">
            <Wallet size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 uppercase">Current Period Payout</p>
            <p className="text-xl font-bold text-slate-800 truncate">{formatKES(currentPeriodTotal)}</p>
          </div>
        </div>
      </div>

      {currentPeriod ? (
        <div className="bg-blue-900 rounded-lg shadow p-6 mb-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Clock size={16} className="text-blue-300" />
                <span className="text-xs uppercase tracking-wide text-blue-300">Current period</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[currentPeriod.status] ?? ''}`}>
                  {currentPeriod.status}
                </span>
              </div>
              <p className="text-lg font-semibold">
                {currentPeriod.period_start} - {currentPeriod.period_end}
              </p>
              <p className="text-sm text-blue-200 mt-1">
                {currentPeriodPayslips.length} payslip(s) generated so far
              </p>
            </div>
            <Link
              to={`/payroll/generate/${currentPeriod.id}`}
              className="bg-white text-blue-900 hover:bg-blue-50 font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              Generate Payslips <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 mb-6 text-center text-slate-400">
          No payroll periods yet - create one below to get started.
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm text-blue-700 hover:underline mb-6"
        >
          <Plus size={16} /> New Payroll Period
        </button>
      ) : (
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Period Start</label>
            <input
              type="date"
              value={form.period_start}
              onChange={(e) => setForm((p) => ({ ...p, period_start: e.target.value }))}
              required
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Period End</label>
            <input
              type="date"
              value={form.period_end}
              onChange={(e) => setForm((p) => ({ ...p, period_end: e.target.value }))}
              required
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create'}
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
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-2">Past Periods</h2>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {olderPeriods.map((p) => {
                  const periodPayslipCount = payslips.filter((s) => s.period === p.id).length;
                  const label = `${p.period_start} - ${p.period_end}`;
                  return (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-800">{label}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[p.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end items-center gap-3">
                          <Link to={`/payroll/generate/${p.id}`} className="text-blue-700 hover:underline">
                            Generate
                          </Link>
                          <Link to={`/payroll/payslips?period=${p.id}`} className="text-blue-700 hover:underline">
                            View
                          </Link>
                          {isAdmin && periodPayslipCount === 0 && (
                            <button
                              onClick={() => handleDeletePeriod(p.id, label)}
                              className="text-red-600 hover:text-red-800 flex items-center gap-1"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          )}
                        </div>
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