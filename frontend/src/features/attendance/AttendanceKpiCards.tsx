import { useMemo } from 'react';
import type { Attendance } from '../../types/attendance';

interface Props {
  records: Attendance[];
}

/**
 * All numbers here are derived from fields that already exist on Attendance.
 * Two figures the full spec asks for — overtime hours and a period-over-period
 * trend arrow — need data this type doesn't carry (a per-shift expected-hours
 * value, and a prior-period snapshot to diff against), so they're left out
 * rather than faked. Wire them in once the backend exposes them.
 */
function useAttendanceStats(records: Attendance[]) {
  return useMemo(() => {
    const total = records.length;
    const late = records.filter((r) => r.status === 'PRESENT_LATE' || r.status === 'PRESENT_LATE_APPROVED');
    const absent = records.filter((r) => r.status === 'ABSENT');
    const checkedOut = records.filter((r) => r.check_in_time && r.check_out_time);
    const onDuty = records.filter((r) => r.check_in_time && !r.check_out_time);
    const present = records.filter(
      (r) => r.status === 'PRESENT' || r.status === 'PRESENT_LATE' || r.status === 'PRESENT_LATE_APPROVED'
    );
    const scheduled = records.filter((r) => r.status !== 'ON_LEAVE' && r.status !== 'OFF_DUTY');

    const avgLate =
      late.length > 0
        ? Math.round(late.reduce((sum, r) => sum + (r.minutes_late ?? 0), 0) / late.length)
        : 0;

    const attendanceRate = scheduled.length > 0 ? Math.round((present.length / scheduled.length) * 100) : 0;
    const presentPct = scheduled.length > 0 ? Math.round((present.length / scheduled.length) * 100) : 0;
    const absentPct = scheduled.length > 0 ? Math.round((absent.length / scheduled.length) * 100) : 0;

    return {
      total,
      presentCount: present.length,
      presentPct,
      lateCount: late.length,
      avgLate,
      absentCount: absent.length,
      absentPct,
      checkedOutCount: checkedOut.length,
      onDutyCount: onDuty.length,
      attendanceRate,
    };
  }, [records]);
}

function Card({
  label,
  value,
  sub,
  accent,
  emphasized = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/60 p-4 backdrop-blur-xl shadow-[0_1px_2px_rgba(15,27,61,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,27,61,0.12)] ${
        emphasized ? 'bg-[#0F1B3D] text-white' : 'bg-white/70 text-[#0F1B3D]'
      }`}
    >
      <span className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} />
      <p
        className={`text-[11px] font-mono uppercase tracking-widest ${
          emphasized ? 'text-white/60' : 'text-slate-400'
        }`}
      >
        {label}
      </p>
      <p className="text-3xl font-bold mt-1.5 leading-none" style={{ fontFamily: 'Oswald, sans-serif' }}>
        {value}
      </p>
      {sub && (
        <p className={`text-xs mt-1.5 ${emphasized ? 'text-white/70' : 'text-slate-500'}`}>{sub}</p>
      )}
    </div>
  );
}

export default function AttendanceKpiCards({ records }: Props) {
  const stats = useAttendanceStats(records);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card
        label="Present"
        value={stats.presentCount}
        sub={`${stats.presentPct}% of scheduled`}
        accent="bg-emerald-400"
      />
      <Card
        label="Late"
        value={stats.lateCount}
        sub={stats.lateCount > 0 ? `avg ${stats.avgLate}m late` : 'none today'}
        accent="bg-amber-400"
      />
      <Card
        label="Absent"
        value={stats.absentCount}
        sub={`${stats.absentPct}% of scheduled`}
        accent="bg-[#C81E3A]"
      />
      <Card label="On Duty" value={stats.onDutyCount} sub="checked in, no check-out" accent="bg-blue-400" />
      <Card label="Checked Out" value={stats.checkedOutCount} sub="completed shift" accent="bg-slate-400" />
      <Card
        label="Attendance Rate"
        value={`${stats.attendanceRate}%`}
        sub={`${stats.total} record${stats.total === 1 ? '' : 's'} in view`}
        accent="bg-white/40"
        emphasized
      />
    </div>
  );
}