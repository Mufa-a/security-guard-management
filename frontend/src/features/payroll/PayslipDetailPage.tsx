import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { getPayslip, updatePayslipStatus } from '../../api/payrollApi';
import { useAuth } from '../auth/AuthContext';
import type { Payslip, PayslipStatus } from '../../types/payroll';
import logo from '../../assets/crimecurb-logo.png';
import { formatKES, formatDate } from '../../utils/payrollFormat';
import PayrollStatusBadge from '../../components/payroll/PayrollStatusBadge';

function LineItem({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="py-2.5 text-slate-600">{label}</td>
      <td className={`py-2.5 text-right tabular-nums font-medium ${negative ? 'text-red-600' : 'text-slate-800'}`}>
        {negative && '− '}{value}
      </td>
    </tr>
  );
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

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-4 w-20 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="h-[520px] bg-white rounded-2xl border border-slate-200/70" />
      </div>
    );
  }
  if (error || !payslip) {
    return <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 max-w-2xl mx-auto">{error ?? 'Payslip not found.'}</p>;
  }

  const showStamp = payslip.status === 'PAID' || payslip.status === 'APPROVED';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5 print:hidden">
        <Link to={-1 as unknown as string} className="inline-flex items-center gap-1.5 text-sm font-medium text-crimecurb-navy hover:underline">
          <ArrowLeft size={15} /> Back
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 bg-crimecurb-navy hover:bg-crimecurb-navy/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Printer size={15} /> Print / Save as PDF
        </button>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-4 mb-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="text-sm text-slate-500">Status</span>
            <PayrollStatusBadge status={payslip.status} />
          </div>
          <div className="flex gap-2">
            {payslip.status === 'DRAFT' && (
              <button
                onClick={() => handleStatusChange('APPROVED')}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Mark as Approved
              </button>
            )}
            {payslip.status !== 'PAID' && (
              <button
                onClick={() => handleStatusChange('PAID')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Mark as Paid
              </button>
            )}
          </div>
        </div>
      )}

      {/* The document itself */}
      <div className="relative bg-white rounded-2xl border border-slate-200/70 shadow-sm print:shadow-none print:border-0 p-8 overflow-hidden">
        {showStamp && (
          <div
            className="absolute top-8 right-8 border-2 border-emerald-600/25 text-emerald-600/25 rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] select-none pointer-events-none"
            style={{ transform: 'rotate(8deg)' }}
            aria-hidden="true"
          >
            {payslip.status}
          </div>
        )}

        <div className="flex items-center gap-3 border-b border-slate-200 pb-5 mb-6">
          <img src={logo} alt="Crimecurb" className="h-12 w-12 object-contain shrink-0" />
          <div>
            <p className="font-display font-bold text-slate-800 text-lg leading-tight">Crimecurb Security Services</p>
            <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mt-0.5">Official Payslip</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-4 gap-x-4 mb-7 text-sm">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-1">Employee</p>
            <p className="font-medium text-slate-800">{payslip.employee_name}</p>
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-1">Pay Period</p>
            <p className="font-medium text-slate-800">{payslip.period_detail}</p>
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-1">Status</p>
            <p className="font-medium text-slate-800">{payslip.status}</p>
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-1">Generated</p>
            <p className="font-medium text-slate-800">{formatDate(payslip.generated_at)}</p>
          </div>
        </div>

        <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-1">Earnings</p>
        <table className="w-full text-sm mb-5">
          <tbody>
            <LineItem label="Basic Salary" value={formatKES(payslip.basic_salary)} />
            <LineItem label="Allowances" value={formatKES(payslip.total_allowances)} />
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="py-2.5 px-2 font-semibold text-slate-800 rounded-l-lg">Total Earnings</td>
              <td className="py-2.5 px-2 text-right font-semibold text-slate-800 tabular-nums rounded-r-lg">
                {formatKES(payslip.gross_pay)}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-1">Deductions</p>
        <table className="w-full text-sm mb-2">
          <tbody>
            <LineItem label="NSSF" value={formatKES(payslip.nssf_employee)} negative />
            <LineItem label="SHIF" value={formatKES(payslip.shif_contribution)} negative />
            <LineItem label="Housing Levy" value={formatKES(payslip.housing_levy)} negative />
            <LineItem label="PAYE Tax" value={formatKES(payslip.paye_tax)} negative />
            <LineItem label="Other Deductions" value={formatKES(payslip.total_other_deductions)} negative />
          </tbody>
        </table>

        <div className="border-t-2 border-crimecurb-navy/15 bg-crimecurb-navy/[0.03] rounded-lg px-4 py-4 mt-4 flex items-center justify-between">
          <p className="font-display font-bold text-slate-800">Net Pay</p>
          <p className="font-display text-2xl font-bold text-crimecurb-navy tabular-nums">{formatKES(payslip.net_pay)}</p>
        </div>

        <div className="text-center text-xs text-slate-400 mt-8 pt-4 border-t border-slate-200">
          <p>
            Generated by Erip <span className="text-crimecurb-red font-semibold">⚡</span> Technologies
          </p>
          <p>0710951879</p>
        </div>
      </div>
    </div>
  );
}