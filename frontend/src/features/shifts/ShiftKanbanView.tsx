import { useMemo } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { Shift, ShiftAssignment } from '../../types/shifts';
import {
  deriveShiftStatus, conflictedShiftIds, detectConflicts,
  assignedGuardsForShift, STATUS_META, type DerivedShiftStatus,
} from './shiftStatus';

interface ShiftKanbanViewProps {
  shifts: Shift[];
  assignments: ShiftAssignment[];
  onSelectShift: (shift: Shift) => void;
}

const COLUMN_ORDER: DerivedShiftStatus[] = ['CONFLICT', 'UNASSIGNED', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

export default function ShiftKanbanView({ shifts, assignments, onSelectShift }: ShiftKanbanViewProps) {
  const conflictIds = useMemo(() => conflictedShiftIds(detectConflicts(shifts, assignments)), [shifts, assignments]);

  const columns = useMemo(() => {
    const grouped = new Map<DerivedShiftStatus, Shift[]>(COLUMN_ORDER.map((s) => [s, []]));
    shifts.forEach((s) => {
      const status = deriveShiftStatus(s, assignments, conflictIds);
      grouped.get(status)!.push(s);
    });
    grouped.forEach((list) =>
      list.sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time)),
    );
    return grouped;
  }, [shifts, assignments, conflictIds]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {COLUMN_ORDER.map((status) => {
        const list = columns.get(status) ?? [];
        const meta = STATUS_META[status];
        return (
          <div key={status} className="flex-shrink-0 w-72">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
              <span className="text-xs font-medium tracking-wide uppercase text-slate-500">{meta.label}</span>
              <span className="text-xs text-slate-400">{list.length}</span>
            </div>

            <div className="space-y-2 min-h-[80px]">
              {list.map((s) => {
                const guards = assignedGuardsForShift(s.id, assignments);
                return (
                  <button
                    key={s.id}
                    onClick={() => onSelectShift(s)}
                    className="w-full text-left rounded-lg bg-white border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md p-3 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate">{s.site_name}</p>
                      {status === 'UNASSIGNED' && <ShieldAlert size={12} className="text-amber-500 shrink-0 mt-0.5" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      {s.date} · {s.start_time}–{s.end_time}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500">{s.shift_type}</span>
                      <span
                        className="text-xs font-medium font-mono"
                        style={{ color: guards.length >= s.required_guards ? '#16A34A' : '#D97706' }}
                      >
                        {guards.length}/{s.required_guards}
                      </span>
                    </div>
                    {guards.length > 0 && (
                      <p className="text-[11px] text-slate-400 mt-1.5 truncate">
                        {guards.map((g) => g.employee_name).join(', ')}
                      </p>
                    )}
                  </button>
                );
              })}
              {list.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center">
                  <p className="text-xs text-slate-400">None</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}