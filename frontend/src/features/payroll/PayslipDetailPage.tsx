import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPayslip, updatePayslipStatus } from '../../api/payrollApi';
import { useAuth } from '../auth/AuthContext';
import type { Payslip, PayslipStatus } from '../../types/payroll';
import logo from '../../assets/crimecurb-logo.png';

function formatKES(value: string): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(parseFloat(value));
}

export default function PayslipDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getPayslip(id)
      .then(setPayslip)
      .catch(() => setError('Failed to load payslip.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleStatusChange(status: PayslipStatus) {
    if (!id) return;
    try {
      const updated = await updatePayslipStatus(id, status);
      setPayslip(updated);
    } catch {
      setError('Failed to update payslip status.');
    }
  }

  if (isLoading) return <p className="text-slate-500">Loading...</p>;
  if (error || !payslip) return <p className="text-red-600">{error ?? 'Payslip not found.'}</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link to={-1 as unknown as string} className="text-blue-700 hover:underline text-sm">
          &larr; Back
        </Link>
        <button
          onClick={() => window.print()}
          className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
        >
          Print / Save as PDF
        </button>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Status:</span>
            <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
              {payslip.status}
            </span>
          </div>
          <div className="flex gap-2">
            {payslip.status === 'DRAFT' && (
              <button
                onClick={() => handleStatusChange('APPROVED')}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium px-4 py-2 rounded transition-colors"
              >
                Mark as Approved
              </button>
            )}
            {payslip.status !== 'PAID' && (
              <button
                onClick={() => handleStatusChange('PAID')}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
              >
                Mark as Paid
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow print:shadow-none p-8">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-6">
          <img src={logo} alt="Crimecurb" className="h-12 w-12 object-contain" />
          <div>
            <p className="font-bold text-slate-800 text-lg leading-tight">Crimecurb Security Services</p>
            <p className="text-xs text-slate-500">Official Payslip</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-slate-400 text-xs uppercase mb-1">Employee</p>
            <p className="font-medium text-slate-800">{payslip.employee_name}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase mb-1">Pay Period</p>
            <p className="font-medium text-slate-800">{payslip.period_detail}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase mb-1">Status</p>
            <p className="font-medium text-slate-800">{payslip.status}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase mb-1">Generated</p>
            <p className="font-medium text-slate-800">
              {new Date(payslip.generated_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <table className="w-full text-sm mb-2">
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="py-2 text-slate-600">Basic Salary</td>
              <td className="py-2 text-right font-medium">{formatKES(payslip.basic_salary)}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="py-2 text-slate-600">Allowances</td>
              <td className="py-2 text-right font-medium">{formatKES(payslip.total_allowances)}</td>
            </tr>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="py-2 px-2 font-semibold text-slate-800">Gross Pay</td>
              <td className="py-2 px-2 text-right font-semibold text-slate-800">
                {formatKES(payslip.gross_pay)}
              </td>
            </tr>

            <tr className="border-t border-slate-100">
              <td className="py-2 text-slate-600">NSSF</td>
              <td className="py-2 text-right text-red-700">− {formatKES(payslip.nssf_employee)}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="py-2 text-slate-600">SHIF</td>
              <td className="py-2 text-right text-red-700">− {formatKES(payslip.shif_contribution)}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="py-2 text-slate-600">Housing Levy</td>
              <td className="py-2 text-right text-red-700">− {formatKES(payslip.housing_levy)}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="py-2 text-slate-600">PAYE Tax</td>
              <td className="py-2 text-right text-red-700">− {formatKES(payslip.paye_tax)}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="py-2 text-slate-600">Other Deductions</td>
              <td className="py-2 text-right text-red-700">
                − {formatKES(payslip.total_other_deductions)}
              </td>
            </tr>

            <tr className="border-t-2 border-slate-300 bg-blue-50">
              <td className="py-3 px-2 font-bold text-slate-800">Net Pay</td>
              <td className="py-3 px-2 text-right font-bold text-blue-900">
                {formatKES(payslip.net_pay)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="text-center text-xs text-slate-400 mt-8 pt-4 border-t border-slate-200">
          <p>
            Generated by Erip <span className="text-purple-600 font-semibold">⚡</span> Technologies
          </p>
          <p>0710951879</p>
        </div>
      </div>
    </div>
  );
}