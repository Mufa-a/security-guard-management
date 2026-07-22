import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getPayslips, updatePayslipStatus } from '../../api/payrollApi';
import { useAuth } from '../auth/AuthContext';
import type { Payslip, PayslipStatus } from '../../types/payroll';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
};

const STATUS_OPTIONS: PayslipStatus[] = ['DRAFT', 'APPROVED', 'PAID'];

function formatKES(value: string): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(parseFloat(value));
}

export default function PayslipListPage() {
  const [searchParams] = useSearchParams();
  const periodFilter = searchParams.get('period');
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    getPayslips()
      .then(setPayslips)
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

  const visiblePayslips = periodFilter ? payslips.filter((p) => p.period === periodFilter) : payslips;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Payslips</h1>

      {isLoading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {!isLoading && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Net Pay</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visiblePayslips.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.employee_name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.period_detail}</td>
                  <td className="px-4 py-3 text-slate-700">{formatKES(p.net_pay)}</td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <select
                        value={p.status}
                        disabled={updatingId === p.id}
                        onChange={(e) => handleStatusChange(p.id, e.target.value as PayslipStatus)}
                        className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer disabled:opacity-50 ${
                          STATUS_STYLES[p.status] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[p.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {p.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/payroll/payslips/${p.id}`} className="text-blue-700 hover:underline">
                      View / Print
                    </Link>
                  </td>
                </tr>
              ))}
              {visiblePayslips.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No payslips found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}