interface StatusBadgeProps {
  status:
    | 'SCHEDULED'
    | 'PRESENT'
    | 'PRESENT_LATE'
    | 'PRESENT_LATE_APPROVED'
    | 'ABSENT'
    | 'ON_LEAVE'
    | 'OFF_DUTY';
  minutesLate?: number | null;
  /** Optional — defaults to 'md'. 'sm' is used in dense table rows. */
  size?: 'sm' | 'md';
}

// Dot color doubles as the KPI-card / calendar accent color elsewhere in the
// module, so keep this map as the single source of truth for status color.
const STYLES: Record<
  StatusBadgeProps['status'],
  { label: string; className: string; dot: string }
> = {
  SCHEDULED: { label: 'Not Yet Due', className: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  PRESENT: { label: 'Present', className: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  PRESENT_LATE: { label: 'Late', className: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  PRESENT_LATE_APPROVED: { label: 'Late · Approved', className: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  ABSENT: { label: 'Absent', className: 'bg-red-50 text-[#C81E3A]', dot: 'bg-[#C81E3A]' },
  ON_LEAVE: { label: 'On Leave', className: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
  OFF_DUTY: { label: 'Off Duty', className: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
};

export default function StatusBadge({ status, minutesLate, size = 'md' }: StatusBadgeProps) {
  const style = STYLES[status];
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  if (!style) {
    console.warn(`StatusBadge: unrecognized status "${status}"`);
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-slate-100 text-slate-600 ${pad}`}>
        {status ?? 'Unknown'}
      </span>
    );
  }

  const showMinutes =
    minutesLate != null && (status === 'PRESENT_LATE' || status === 'PRESENT_LATE_APPROVED' || status === 'ABSENT');

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${style.className} ${pad}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.label}
      {showMinutes && <span className="opacity-70">· {minutesLate}m</span>}
    </span>
  );
}

// Exported so KPI cards / calendar / charts elsewhere in the module can stay
// in sync with badge colors instead of re-declaring their own palette.
export { STYLES as STATUS_STYLES };