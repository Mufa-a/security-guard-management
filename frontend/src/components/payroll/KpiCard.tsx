import type { LucideIcon } from 'lucide-react';

export default function KpiCard({
  icon: Icon,
  label,
  value,
  tone = 'default',
  isLoading = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: 'default' | 'accent' | 'success' | 'warning';
  isLoading?: boolean;
}) {
  const iconTone = {
    default: 'bg-slate-50 text-slate-500',
    accent: 'bg-crimecurb-navy/[0.06] text-crimecurb-navy',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
  }[tone];

  return (
    <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-4 flex items-center gap-3 min-w-0">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconTone}`}>
        <Icon size={17} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 truncate">{label}</p>
        {isLoading ? (
          <span className="inline-block w-16 h-5 mt-0.5 bg-slate-100 rounded animate-pulse" />
        ) : (
          <p className="text-lg font-display font-bold text-slate-800 tabular-nums truncate">{value}</p>
        )}
      </div>
    </div>
  );
}