import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronUp, UserX, Clock, Users } from 'lucide-react';
import type { ScheduleConflict } from './shiftStatus';

interface ScheduleConflictPanelProps {
  conflicts: ScheduleConflict[];
}

function describeConflict(c: ScheduleConflict): { icon: typeof AlertTriangle; text: string; shiftId: string } {
  if (c.type === 'DOUBLE_BOOKING') {
    return {
      icon: Users,
      text: `${c.employeeName} — overlapping shifts (${c.shiftA.site_name} ${c.shiftA.date} & ${c.shiftB.site_name} ${c.shiftB.date})`,
      shiftId: c.shiftA.id,
    };
  }
  if (c.type === 'TIGHT_TURNAROUND') {
    return {
      icon: Clock,
      text: `${c.employeeName} — only ${c.gapMinutes} min between ${c.earlierShift.site_name} and ${c.laterShift.site_name}`,
      shiftId: c.laterShift.id,
    };
  }
  return {
    icon: UserX,
    text: `${c.shift.site_name} — ${c.shift.date}: ${c.assignedCount}/${c.shift.required_guards} guards assigned`,
    shiftId: c.shift.id,
  };
}

export default function ScheduleConflictPanel({ conflicts }: ScheduleConflictPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const items = useMemo(() => conflicts.map(describeConflict), [conflicts]);
  const visible = expanded ? items : items.slice(0, 3);

  if (conflicts.length === 0) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 overflow-hidden mb-6">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-600" />
          <span className="text-sm font-medium text-slate-800">
            {conflicts.length} scheduling {conflicts.length === 1 ? 'issue' : 'issues'} require attention
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-slate-400" />
        ) : (
          <ChevronDown size={16} className="text-slate-400" />
        )}
      </button>

      <div className="px-4 pb-3 space-y-1.5">
        {visible.map(({ icon: Icon, text, shiftId }, i) => (
          <Link
            key={i}
            to={`/shifts/${shiftId}`}
            className="flex items-center gap-2 text-xs text-slate-700 hover:text-red-700 transition-colors py-1"
          >
            <Icon size={13} className="text-red-500 shrink-0" />
            <span className="truncate">{text}</span>
          </Link>
        ))}
        {!expanded && items.length > 3 && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-red-700 hover:underline pt-1"
          >
            View all {items.length} issues
          </button>
        )}
      </div>
    </div>
  );
}