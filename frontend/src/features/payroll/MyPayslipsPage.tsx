import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyPayslips } from '../../api/payrollApi';
import type { Payslip } from '../../types/payroll';

function formatKES(value: string): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(parseFloat(value));
}

export default function MyPayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyPayslips()
      .then(setPayslips)
      .catch(() => setError('Failed to load your payslips.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">My Payslips</h1>

      {isLoading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!isLoading && !error && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Net Pay</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.period_detail}</td>
                  <td className="px-4 py-3 text-slate-700">{formatKES(p.net_pay)}</td>
                  <td className="px-4 py-3 text-slate-500">{p.status}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/my-payslips/${p.id}`} className="text-blue-700 hover:underline">
                      View / Print
                    </Link>
                  </td>
                </tr>
              ))}
              {payslips.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No payslips yet.
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