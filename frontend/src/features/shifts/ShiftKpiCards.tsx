import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Users, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { Shift, ShiftAssignment } from '../../types/shifts';

interface ShiftKpiCardsProps {
  shifts: Shift[];
  assignments: ShiftAssignment[];
}

const ACTIVE_STATUSES = ['ASSIGNED', 'CONFIRMED', 'COMPLETED'];

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function KpiCard({
  icon: Icon, label, value, sublabel, tone, delay,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: string;
  sublabel: string;
  tone: 'neutral' | 'success' | 'warning' | 'critical';
  delay: number;
}) {
  const toneStyles: Record<string, string> = {
    neutral: 'text-blue-700 bg-blue-50',
    success: 'text-green-600 bg-green-50',
    warning: 'text-amber-600 bg-amber-50',
    critical: 'text-red-600 bg-red-50',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      className="relative rounded-lg bg-white border border-slate-200 shadow-sm p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
          <p className="text-2xl font-semibold text-slate-800 mt-2 font-mono">{value}</p>
          <p className="text-xs text-slate-400 mt-1">{sublabel}</p>
        </div>
        <div className={`shrink-0 rounded-md p-2 ${toneStyles[tone]}`}>
          <Icon size={16} strokeWidth={2} />
        </div>
      </div>
    </motion.div>
  );
}

export default function ShiftKpiCards({ shifts, assignments }: ShiftKpiCardsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekShifts = shifts.filter((s) => {
      const d = new Date(s.date + 'T00:00:00');
      return d >= weekStart && d <= weekEnd;
    });

    const assignedCountByShift = new Map<string, number>();
    assignments.forEach((a) => {
      if (!ACTIVE_STATUSES.includes(a.status)) return;
      assignedCountByShift.set(a.shift, (assignedCountByShift.get(a.shift) ?? 0) + 1);
    });

    let totalRequired = 0;
    let totalAssigned = 0;
    let understaffedCount = 0;
    let fullyStaffedCount = 0;

    weekShifts.forEach((s) => {
      const assignedCount = assignedCountByShift.get(s.id) ?? 0;
      totalRequired += s.required_guards;
      totalAssigned += Math.min(assignedCount, s.required_guards);
      if (assignedCount < s.required_guards) understaffedCount += 1;
      else fullyStaffedCount += 1;
    });

    const staffingPct = totalRequired > 0 ? Math.round((totalAssigned / totalRequired) * 100) : 100;

    return {
      totalShiftsThisWeek: weekShifts.length,
      staffingPct,
      understaffedCount,
      fullyStaffedCount,
    };
  }, [shifts, assignments]);

  const staffingTone: 'success' | 'warning' | 'critical' =
    stats.staffingPct >= 95 ? 'success' : stats.staffingPct >= 75 ? 'warning' : 'critical';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        icon={CalendarClock}
        label="Shifts this week"
        value={String(stats.totalShiftsThisWeek)}
        sublabel="Monday – Sunday"
        tone="neutral"
        delay={0}
      />
      <KpiCard
        icon={Users}
        label="Staffing level"
        value={`${stats.staffingPct}%`}
        sublabel="of required guard-hours filled"
        tone={staffingTone}
        delay={0.05}
      />
      <KpiCard
        icon={ShieldCheck}
        label="Fully staffed"
        value={String(stats.fullyStaffedCount)}
        sublabel="shifts at full strength"
        tone="success"
        delay={0.1}
      />
      <KpiCard
        icon={AlertTriangle}
        label="Understaffed"
        value={String(stats.understaffedCount)}
        sublabel="shifts need guards"
        tone={stats.understaffedCount > 0 ? 'critical' : 'success'}
        delay={0.15}
      />
    </div>
  );
}