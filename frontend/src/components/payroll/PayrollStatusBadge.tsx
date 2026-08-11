import type { PayrollPeriodStatus } from '../../types/payroll';
import type { PayslipStatus } from '../../types/payroll';

type AnyStatus = PayrollPeriodStatus | PayslipStatus;

const STYLES: Record<AnyStatus, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-amber-50 text-amber-700 ring-amber-600/15' },
  CLOSED: { label: 'Closed', className: 'bg-slate-100 text-slate-500 ring-slate-500/10' },
  DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-600 ring-slate-500/10' },
  APPROVED: { label: 'Approved', className: 'bg-blue-50 text-blue-700 ring-blue-600/15' },
  PAID: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' },
};

export default function PayrollStatusBadge({ status }: { status: AnyStatus }) {
  const style = STYLES[status] ?? { label: status, className: 'bg-slate-100 text-slate-600 ring-slate-500/10' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${style.className}`}>
      {style.label}
    </span>
  );
}