import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Shift, ShiftAssignment } from '../../types/shifts';
import {
  deriveShiftStatus, conflictedShiftIds, detectConflicts,
  assignedGuardsForShift, shiftTimeRange, STATUS_META,
} from './shiftStatus';

interface ShiftCalendarViewProps {
  shifts: Shift[];
  assignments: ShiftAssignment[];
  onSelectShift: (shift: Shift) => void;
}

type CalendarMode = 'week' | 'month';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMELINE_START_HOUR = 6; // 06:00
const TIMELINE_END_HOUR = 30; // 06:00 next day — covers overnight shifts
const TIMELINE_SPAN_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR;

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function blockPosition(shift: Shift): { top: number; height: number } {
  const { start, end } = shiftTimeRange(shift);
  const startHour = start.getHours() + start.getMinutes() / 60;
  const durationHours = (end.getTime() - start.getTime()) / 3600000;

  const relativeStart = startHour < TIMELINE_START_HOUR ? startHour + 24 : startHour;
  const top = Math.max(0, ((relativeStart - TIMELINE_START_HOUR) / TIMELINE_SPAN_HOURS) * 100);
  const height = Math.min(100 - top, (durationHours / TIMELINE_SPAN_HOURS) * 100);
  return { top, height: Math.max(height, 4) };
}

export default function ShiftCalendarView({ shifts, assignments, onSelectShift }: ShiftCalendarViewProps) {
  const [mode, setMode] = useState<CalendarMode>('week');
  const [reference, setReference] = useState(new Date());

  const conflictIds = useMemo(() => conflictedShiftIds(detectConflicts(shifts, assignments)), [shifts, assignments]);

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    shifts.forEach((s) => {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    });
    map.forEach((list) => list.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return map;
  }, [shifts]);

  function navigate(delta: number) {
    const next = new Date(reference);
    if (mode === 'week') next.setDate(next.getDate() + delta * 7);
    else next.setMonth(next.getMonth() + delta);
    setReference(next);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setReference(new Date())}
            className="text-xs text-blue-700 hover:text-blue-800 ml-1 font-medium"
          >
            Today
          </button>
          <span className="text-sm text-slate-800 font-medium ml-2">
            {mode === 'week'
              ? `Week of ${toDateOnly(startOfWeek(reference))}`
              : reference.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-md p-0.5">
          {(['week', 'month'] as CalendarMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-xs font-medium px-3 py-1.5 rounded ${
                mode === m ? 'bg-blue-900 text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {m === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'week' ? (
        <WeekGrid
          weekStart={startOfWeek(reference)}
          shiftsByDate={shiftsByDate}
          assignments={assignments}
          conflictIds={conflictIds}
          onSelectShift={onSelectShift}
        />
      ) : (
        <MonthGrid
          monthStart={startOfMonth(reference)}
          shiftsByDate={shiftsByDate}
          assignments={assignments}
          conflictIds={conflictIds}
          onSelectShift={onSelectShift}
          onPickDay={(d) => { setReference(d); setMode('week'); }}
        />
      )}
    </div>
  );
}

function WeekGrid({
  weekStart, shiftsByDate, assignments, conflictIds, onSelectShift,
}: {
  weekStart: Date;
  shiftsByDate: Map<string, Shift[]>;
  assignments: ShiftAssignment[];
  conflictIds: Set<string>;
  onSelectShift: (shift: Shift) => void;
}) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    }),
    [weekStart],
  );

  const hourMarks = useMemo(
    () => Array.from({ length: TIMELINE_SPAN_HOURS / 3 + 1 }, (_, i) => TIMELINE_START_HOUR + i * 3),
    [],
  );

  return (
    <div className="grid grid-cols-[48px_repeat(7,1fr)]">
      <div />
      {days.map((d, i) => (
        <div key={i} className="px-2 py-2 text-center border-l border-slate-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">{DAY_LABELS[i]}</p>
          <p className="text-sm text-slate-800 font-medium font-mono">{d.getDate()}</p>
        </div>
      ))}

      <div className="relative" style={{ height: `${TIMELINE_SPAN_HOURS * 32}px` }}>
        {hourMarks.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 text-[10px] text-slate-400 -translate-y-1/2"
            style={{ top: `${((h - TIMELINE_START_HOUR) / TIMELINE_SPAN_HOURS) * 100}%` }}
          >
            {String(h % 24).padStart(2, '0')}:00
          </div>
        ))}
      </div>

      {days.map((d, i) => {
        const dateStr = toDateOnly(d);
        const dayShifts = shiftsByDate.get(dateStr) ?? [];
        return (
          <div
            key={i}
            className="relative border-l border-slate-200"
            style={{ height: `${TIMELINE_SPAN_HOURS * 32}px` }}
          >
            {hourMarks.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-slate-100"
                style={{ top: `${((h - TIMELINE_START_HOUR) / TIMELINE_SPAN_HOURS) * 100}%` }}
              />
            ))}
            {dayShifts.map((s) => {
              const { top, height } = blockPosition(s);
              const status = deriveShiftStatus(s, assignments, conflictIds);
              const meta = STATUS_META[status];
              const guards = assignedGuardsForShift(s.id, assignments);
              return (
                <button
                  key={s.id}
                  onClick={() => onSelectShift(s)}
                  className="absolute left-1 right-1 rounded-md px-1.5 py-1 text-left overflow-hidden transition-transform hover:scale-[1.02] shadow-sm"
                  style={{
                    top: `${top}%`,
                    height: `${height}%`,
                    backgroundColor: `${meta.color}14`,
                    borderLeft: `2px solid ${meta.color}`,
                  }}
                >
                  <p className="text-[11px] font-medium text-slate-800 truncate">
                    {guards.length > 0 ? guards[0].employee_name : s.site_name}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate font-mono">
                    {s.start_time}–{s.end_time}
                  </p>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function MonthGrid({
  monthStart, shiftsByDate, assignments, conflictIds, onSelectShift, onPickDay,
}: {
  monthStart: Date;
  shiftsByDate: Map<string, Shift[]>;
  assignments: ShiftAssignment[];
  conflictIds: Set<string>;
  onSelectShift: (shift: Shift) => void;
  onPickDay: (d: Date) => void;
}) {
  const gridStart = startOfWeek(monthStart);
  const days = useMemo(
    () => Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    }),
    [gridStart],
  );

  return (
    <div>
      <div className="grid grid-cols-7">
        {DAY_LABELS.map((l) => (
          <div key={l} className="text-[10px] uppercase tracking-wide text-slate-400 text-center py-2 border-b border-slate-200">
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const dateStr = toDateOnly(d);
          const dayShifts = shiftsByDate.get(dateStr) ?? [];
          const inMonth = d.getMonth() === monthStart.getMonth();
          return (
            <div
              key={i}
              className={`min-h-[92px] border-b border-l border-slate-200 p-1.5 ${inMonth ? 'bg-white' : 'bg-slate-50 opacity-60'}`}
            >
              <button
                onClick={() => onPickDay(d)}
                className="text-xs text-slate-500 hover:text-blue-700 font-medium mb-1 font-mono"
              >
                {d.getDate()}
              </button>
              <div className="space-y-0.5">
                {dayShifts.slice(0, 3).map((s) => {
                  const status = deriveShiftStatus(s, assignments, conflictIds);
                  const meta = STATUS_META[status];
                  return (
                    <button
                      key={s.id}
                      onClick={() => onSelectShift(s)}
                      className="w-full text-left text-[10px] truncate rounded px-1 py-0.5"
                      style={{ backgroundColor: `${meta.color}14`, color: meta.color }}
                    >
                      {s.start_time} {s.site_name}
                    </button>
                  );
                })}
                {dayShifts.length > 3 && (
                  <p className="text-[10px] text-slate-400 px-1">+{dayShifts.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}