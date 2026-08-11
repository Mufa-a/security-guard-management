import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, ExternalLink } from 'lucide-react';
import type { Shift, ShiftAssignment } from '../../types/shifts';
import { deriveShiftStatus, assignedGuardsForShift, STATUS_META, type ScheduleConflict } from './shiftStatus';

interface ShiftDetailDrawerProps {
  shift: Shift | null;
  assignments: ShiftAssignment[];
  conflictIds: Set<string>;
  conflicts: ScheduleConflict[];
  onClose: () => void;
}

export default function ShiftDetailDrawer({ shift, assignments, conflictIds, conflicts, onClose }: ShiftDetailDrawerProps) {
  return (
    <AnimatePresence>
      {shift && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[420px] bg-white border-l border-slate-200 shadow-xl z-50 overflow-y-auto"
          >
            <DrawerContent
              shift={shift}
              assignments={assignments}
              conflictIds={conflictIds}
              conflicts={conflicts}
              onClose={onClose}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerContent({ shift, assignments, conflictIds, conflicts, onClose }: Omit<ShiftDetailDrawerProps, 'shift'> & { shift: Shift }) {
  const status = deriveShiftStatus(shift, assignments, conflictIds);
  const meta = STATUS_META[status];
  const guards = assignedGuardsForShift(shift.id, assignments);

  const relevantConflicts = conflicts.filter((c) => {
    if (c.type === 'DOUBLE_BOOKING') return c.shiftA.id === shift.id || c.shiftB.id === shift.id;
    if (c.type === 'TIGHT_TURNAROUND') return c.earlierShift.id === shift.id || c.laterShift.id === shift.id;
    return c.shift.id === shift.id;
  });

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full mb-2"
            style={{ backgroundColor: `${meta.color}14`, color: meta.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
            {meta.label}
          </span>
          <h2 className="text-lg font-semibold text-slate-800">{shift.site_name}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{shift.shift_type} shift</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
          <X size={18} />
        </button>
      </div>

      <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Date</p>
            <p className="text-slate-800 font-mono">{shift.date}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Time</p>
            <p className="text-slate-800 font-mono">{shift.start_time}–{shift.end_time}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Staffing</p>
            <p
              className="font-medium font-mono"
              style={{ color: guards.length >= shift.required_guards ? '#16A34A' : '#D97706' }}
            >
              {guards.length}/{shift.required_guards}
            </p>
          </div>
        </div>
        {shift.notes && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Notes</p>
            <p className="text-sm text-slate-700">{shift.notes}</p>
          </div>
        )}
      </div>

      {relevantConflicts.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
          <p className="text-xs font-medium text-red-700 mb-1.5">Scheduling issue</p>
          {relevantConflicts.map((c, i) => (
            <p key={i} className="text-xs text-slate-700">
              {c.type === 'DOUBLE_BOOKING' && `${c.employeeName} is double-booked with another shift.`}
              {c.type === 'TIGHT_TURNAROUND' && `${c.employeeName} has only ${c.gapMinutes} min before/after another shift.`}
              {c.type === 'UNASSIGNED' && `${c.assignedCount}/${c.shift.required_guards} guards assigned.`}
            </p>
          ))}
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-1.5 mb-2">
          <Users size={13} className="text-slate-400" />
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Assigned Guards</p>
        </div>
        {guards.length === 0 ? (
          <p className="text-sm text-slate-400">No guards assigned yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {guards.map((g) => (
              <li key={g.id} className="flex items-center justify-between text-sm bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                <span className="text-slate-800">{g.employee_name}</span>
                <span className="text-xs text-slate-500">{g.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Link
          to={`/shifts/${shift.id}/assign`}
          className="text-center bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          Manage Assigned Guards
        </Link>
        <Link
          to={`/shifts/${shift.id}/edit`}
          className="text-center border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm px-4 py-2 rounded-md transition-colors"
        >
          Edit Shift
        </Link>
        <Link
          to={`/shifts/${shift.id}`}
          className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-blue-700 px-4 py-2 transition-colors"
        >
          Open full page <ExternalLink size={12} />
        </Link>
      </div>
    </div>
  );
}