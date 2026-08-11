import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Copy, Trash2, ArrowRight, ShieldAlert, List as ListIcon, CalendarDays, Kanban } from 'lucide-react';
import { getShifts, deleteShift, getShiftAssignments } from '../../api/shiftsApi';
import type { Shift, ShiftAssignment } from '../../types/shifts';
import ShiftKpiCards from './ShiftKpiCards';
import CopyWeekPanel from './CopyWeekPanel';
import ScheduleConflictPanel from './ScheduleConflictPanel';
import ShiftCalendarView from './ShiftCalendarView';
import ShiftKanbanView from './ShiftKanbanView';
import ShiftDetailDrawer from './ShiftDetailDrawer';
import { detectConflicts, conflictedShiftIds } from './shiftStatus';

const ACTIVE_STATUSES = ['ASSIGNED', 'CONFIRMED', 'COMPLETED'];

type ViewMode = 'list' | 'calendar' | 'kanban';

export default function ShiftListPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [view, setView] = useState<ViewMode>('list');
  const [detailShift, setDetailShift] = useState<Shift | null>(null);

  function load() {
    setIsLoading(true);
    Promise.all([getShifts(), getShiftAssignments()])
      .then(([s, a]) => {
        setShifts(s);
        setAssignments(a);
      })
      .catch(() => setError('Failed to load shifts.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { load(); }, []);

  const assignedCountByShift = useMemo(() => {
    const map = new Map<string, number>();
    assignments.forEach((a) => {
      if (!ACTIVE_STATUSES.includes(a.status)) return;
      map.set(a.shift, (map.get(a.shift) ?? 0) + 1);
    });
    return map;
  }, [assignments]);

  const conflicts = useMemo(() => detectConflicts(shifts, assignments), [shifts, assignments]);
  const conflictIds = useMemo(() => conflictedShiftIds(conflicts), [conflicts]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this shift?')) return;
    try {
      await deleteShift(id);
      load();
    } catch {
      setError('Failed to delete shift.');
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.length === shifts.length ? [] : shifts.map((s) => s.id)));
  }

  function handlePanelDone() {
    load();
    setSelectedIds([]);
  }

  const viewTabs: { id: ViewMode; label: string; icon: typeof ListIcon }[] = [
    { id: 'list', label: 'List', icon: ListIcon },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'kanban', label: 'Kanban', icon: Kanban },
  ];

  return (
    <div className="min-h-full -m-6 p-6 bg-slate-50">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs tracking-[0.15em] text-blue-800 font-medium uppercase mb-1">
            Scheduling Center
          </p>
          <h1 className="text-2xl font-bold text-slate-800">Shifts</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-white rounded-md p-0.5 border border-slate-200 shadow-sm">
            {viewTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded ${
                  view === id ? 'bg-blue-900 text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsPanelOpen(true)}
            className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            <Copy size={14} /> Copy / Repeat Week
          </button>
          <Link
            to="/shifts/new"
            className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            <Plus size={14} /> Add Shift
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <ShiftKpiCards shifts={shifts} assignments={assignments} />
      </div>

      {!isLoading && !error && <ScheduleConflictPanel conflicts={conflicts} />}

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
          Loading shifts...
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3 mb-4">
          {error}
        </div>
      )}

      {!isLoading && !error && view === 'calendar' && (
        <ShiftCalendarView shifts={shifts} assignments={assignments} onSelectShift={setDetailShift} />
      )}

      {!isLoading && !error && view === 'kanban' && (
        <ShiftKanbanView shifts={shifts} assignments={assignments} onSelectShift={setDetailShift} />
      )}

      {!isLoading && !error && view === 'list' && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-3 border-b border-slate-200 text-[10px] font-medium tracking-wider text-slate-500 uppercase bg-slate-50">
            <div>
              <input
                type="checkbox"
                checked={shifts.length > 0 && selectedIds.length === shifts.length}
                onChange={toggleSelectAll}
                className="accent-blue-900"
              />
            </div>
            <div>Site</div>
            <div>Date</div>
            <div>Type</div>
            <div>Time</div>
            <div>Staffing</div>
            <div></div>
          </div>

          <div>
            {shifts.map((s) => {
              const assignedCount = assignedCountByShift.get(s.id) ?? 0;
              const isFullyStaffed = assignedCount >= s.required_guards;
              const hasConflict = conflictIds.has(s.id);
              const stripColor = hasConflict
                ? '#DC2626'
                : isFullyStaffed ? '#16A34A' : assignedCount === 0 ? '#DC2626' : '#D97706';

              return (
                <div
                  key={s.id}
                  onClick={() => setDetailShift(s)}
                  className="relative grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-3.5 border-b border-slate-100 last:border-0 items-center hover:bg-slate-50 transition-colors group cursor-pointer"
                >
                  <span
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: stripColor }}
                  />
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(s.id)}
                      onChange={() => toggleSelected(s.id)}
                      className="accent-blue-900"
                    />
                  </div>
                  <div className="font-medium text-slate-800 text-sm truncate flex items-center gap-1.5">
                    {hasConflict && <ShieldAlert size={12} className="text-red-500 shrink-0" />}
                    {s.site_name}
                  </div>
                  <div className="text-xs text-slate-500 whitespace-nowrap font-mono">{s.date}</div>
                  <div className="text-xs text-slate-500">{s.shift_type}</div>
                  <div className="text-xs text-slate-500 whitespace-nowrap font-mono">
                    {s.start_time}–{s.end_time}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!isFullyStaffed && <ShieldAlert size={12} className="text-amber-500" />}
                    <span
                      className="text-xs font-medium font-mono"
                      style={{ color: isFullyStaffed ? '#16A34A' : assignedCount === 0 ? '#DC2626' : '#D97706' }}
                    >
                      {assignedCount}/{s.required_guards}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`/shifts/${s.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Manage <ArrowRight size={12} />
                    </Link>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {shifts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-500 text-sm">No shifts scheduled yet.</p>
              <p className="text-slate-400 text-xs mt-1">Shifts you create will appear here.</p>
            </div>
          )}
        </div>
      )}

      {isPanelOpen && (
        <CopyWeekPanel
          shifts={shifts}
          selectedShiftIds={selectedIds}
          onClose={() => setIsPanelOpen(false)}
          onDone={handlePanelDone}
        />
      )}

      <ShiftDetailDrawer
        shift={detailShift}
        assignments={assignments}
        conflictIds={conflictIds}
        conflicts={conflicts}
        onClose={() => setDetailShift(null)}
      />
    </div>
  );
}