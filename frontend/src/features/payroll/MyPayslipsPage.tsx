import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Inbox } from 'lucide-react';
import { getMyPayslips } from '../../api/payrollApi';
import type { Payslip } from '../../types/payroll';
import { formatKES } from '../../utils/payrollFormat';
import PayrollStatusBadge from '../../components/payroll/PayrollStatusBadge';

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

  if (isLoading) {
    return (
      <div>
        <div className="h-8 w-40 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="h-40 bg-white rounded-2xl border border-slate-200/70 mb-6" />
        <div className="h-32 bg-white rounded-xl border border-slate-200/70" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>;
  }

  const [latest, ...history] = payslips;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-800 mb-1">My Payslips</h1>
      <p className="text-sm text-slate-400 mb-6">How much you've earned, period by period.</p>

      {!latest && (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-10 text-center">
          <Inbox size={26} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No payslips yet</p>
          <p className="text-sm text-slate-400 mt-1">Your payslips will show up here once payroll is processed.</p>
        </div>
      )}

      {latest && (
        <div className="bg-crimecurb-navy rounded-2xl shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-white/50 mb-1">Latest Payslip</p>
              <p className="font-display text-lg font-semibold">{latest.period_detail}</p>
            </div>
            <PayrollStatusBadge status={latest.status} />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-white/40 mb-1">Net Pay</p>
              <p className="font-display text-xl font-bold tabular-nums">{formatKES(latest.net_pay)}</p>
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-white/40 mb-1">Gross Pay</p>
              <p className="text-base font-semibold tabular-nums text-white/80">{formatKES(latest.gross_pay)}</p>
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-white/40 mb-1">Deductions</p>
              <p className="text-base font-semibold tabular-nums text-white/80">
                {formatKES(parseFloat(latest.gross_pay) - parseFloat(latest.net_pay))}
              </p>
            </div>
          </div>

          <Link
            to={`/my-payslips/${latest.id}`}
            className="inline-flex items-center gap-1.5 bg-white text-crimecurb-navy hover:bg-slate-50 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <FileText size={15} /> View Payslip
          </Link>
        </div>
      )}

      {history.length > 0 && (
        <>
          <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-2">Payslip History</p>
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm divide-y divide-slate-100">
            {history.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{p.period_detail}</p>
                  <p className="text-sm text-slate-500 tabular-nums">{formatKES(p.net_pay)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <PayrollStatusBadge status={p.status} />
                  <Link
                    to={`/my-payslips/${p.id}`}
                    className="text-sm font-medium text-crimecurb-navy hover:underline"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}