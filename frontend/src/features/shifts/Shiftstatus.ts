// shiftStatus.ts
// Client-side derivation of shift status + schedule conflicts.
//
// Deliberately NOT here: attendance state (check-in/out), guard "late"
// detection, per-site staffing targets distinct from Shift.required_guards.
// None of those fields exist on Shift/ShiftAssignment as returned by the
// backend today — adding them here would mean fabricating data. If/when
// those fields or endpoints exist, this file is the place to wire them in.

import type { Shift, ShiftAssignment } from '../../types/shifts';

export const ACTIVE_ASSIGNMENT_STATUSES = ['ASSIGNED', 'CONFIRMED', 'COMPLETED'];

// Guards need at least this long between the end of one shift and the
// start of the next. Not backend-configurable today — flagged as a
// reasonable default, not a business rule pulled from the API.
export const MIN_TURNAROUND_MINUTES = 30;

export type DerivedShiftStatus =
  | 'CANCELLED'
  | 'CONFLICT'
  | 'UNASSIGNED'
  | 'ACTIVE'
  | 'UPCOMING'
  | 'COMPLETED';

export interface ShiftTimeRange {
  start: Date;
  end: Date;
}

/** Resolves a shift's start/end into real Date objects, rolling the end
 * time into the next day for overnight shifts (end <= start). */
export function shiftTimeRange(shift: Shift): ShiftTimeRange {
  const start = new Date(`${shift.date}T${shift.start_time}`);
  let end = new Date(`${shift.date}T${shift.end_time}`);
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function rangesOverlap(a: ShiftTimeRange, b: ShiftTimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

export function assignedCount(shiftId: string, assignments: ShiftAssignment[]): number {
  return assignments.filter(
    (a) => a.shift === shiftId && ACTIVE_ASSIGNMENT_STATUSES.includes(a.status),
  ).length;
}

export function assignedGuardsForShift(shiftId: string, assignments: ShiftAssignment[]): ShiftAssignment[] {
  return assignments.filter(
    (a) => a.shift === shiftId && ACTIVE_ASSIGNMENT_STATUSES.includes(a.status),
  );
}

// --- Conflicts -----------------------------------------------------------

export interface DoubleBookingConflict {
  type: 'DOUBLE_BOOKING';
  employeeId: string;
  employeeName: string;
  shiftA: Shift;
  shiftB: Shift;
}

export interface TightTurnaroundConflict {
  type: 'TIGHT_TURNAROUND';
  employeeId: string;
  employeeName: string;
  earlierShift: Shift;
  laterShift: Shift;
  gapMinutes: number;
}

export interface UnassignedConflict {
  type: 'UNASSIGNED';
  shift: Shift;
  assignedCount: number;
}

export type ScheduleConflict = DoubleBookingConflict | TightTurnaroundConflict | UnassignedConflict;

/** Detects double-bookings, tight turnarounds, and understaffed shifts
 * purely from the shifts/assignments already loaded — no extra API calls,
 * no invented fields. */
export function detectConflicts(shifts: Shift[], assignments: ShiftAssignment[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const shiftById = new Map(shifts.map((s) => [s.id, s]));

  const byEmployee = new Map<string, ShiftAssignment[]>();
  assignments.forEach((a) => {
    if (!ACTIVE_ASSIGNMENT_STATUSES.includes(a.status)) return;
    if (!shiftById.has(a.shift)) return;
    const list = byEmployee.get(a.employee) ?? [];
    list.push(a);
    byEmployee.set(a.employee, list);
  });

  byEmployee.forEach((employeeAssignments) => {
    const withShifts = employeeAssignments
      .map((a) => ({ a, shift: shiftById.get(a.shift)! }))
      .sort((x, y) => shiftTimeRange(x.shift).start.getTime() - shiftTimeRange(y.shift).start.getTime());

    for (let i = 0; i < withShifts.length; i++) {
      for (let j = i + 1; j < withShifts.length; j++) {
        const rangeA = shiftTimeRange(withShifts[i].shift);
        const rangeB = shiftTimeRange(withShifts[j].shift);

        if (rangesOverlap(rangeA, rangeB)) {
          conflicts.push({
            type: 'DOUBLE_BOOKING',
            employeeId: withShifts[i].a.employee,
            employeeName: withShifts[i].a.employee_name,
            shiftA: withShifts[i].shift,
            shiftB: withShifts[j].shift,
          });
        } else {
          const gapMinutes = (rangeB.start.getTime() - rangeA.end.getTime()) / 60000;
          if (gapMinutes >= 0 && gapMinutes < MIN_TURNAROUND_MINUTES) {
            conflicts.push({
              type: 'TIGHT_TURNAROUND',
              employeeId: withShifts[i].a.employee,
              employeeName: withShifts[i].a.employee_name,
              earlierShift: withShifts[i].shift,
              laterShift: withShifts[j].shift,
              gapMinutes: Math.round(gapMinutes),
            });
          }
        }
      }
    }
  });

  shifts.forEach((s) => {
    if (!s.is_active) return;
    const count = assignedCount(s.id, assignments);
    if (count < s.required_guards) {
      conflicts.push({ type: 'UNASSIGNED', shift: s, assignedCount: count });
    }
  });

  return conflicts;
}

/** Shift ids involved in a double-booking or tight-turnaround conflict —
 * used to badge those shifts CONFLICT ahead of their normal status. */
export function conflictedShiftIds(conflicts: ScheduleConflict[]): Set<string> {
  const ids = new Set<string>();
  conflicts.forEach((c) => {
    if (c.type === 'DOUBLE_BOOKING') {
      ids.add(c.shiftA.id);
      ids.add(c.shiftB.id);
    } else if (c.type === 'TIGHT_TURNAROUND') {
      ids.add(c.earlierShift.id);
      ids.add(c.laterShift.id);
    }
  });
  return ids;
}

export function deriveShiftStatus(
  shift: Shift,
  assignments: ShiftAssignment[],
  conflictIds: Set<string>,
  now: Date = new Date(),
): DerivedShiftStatus {
  if (!shift.is_active) return 'CANCELLED';
  if (conflictIds.has(shift.id)) return 'CONFLICT';

  const count = assignedCount(shift.id, assignments);
  if (count < shift.required_guards) return 'UNASSIGNED';

  const { start, end } = shiftTimeRange(shift);
  if (now < start) return 'UPCOMING';
  if (now >= start && now < end) return 'ACTIVE';
  return 'COMPLETED';
}

// Tailwind ~600-level shades — dark enough to read as text/badges on the
// module's white/slate-50 backgrounds (lighter 400-level shades read fine
// on dark surfaces but wash out on light ones).
export const STATUS_META: Record<DerivedShiftStatus, { label: string; color: string; dot: string }> = {
  CANCELLED: { label: 'Cancelled', color: '#64748B', dot: '#64748B' },
  CONFLICT: { label: 'Conflict', color: '#DC2626', dot: '#DC2626' },
  UNASSIGNED: { label: 'Unassigned', color: '#D97706', dot: '#D97706' },
  ACTIVE: { label: 'Active', color: '#16A34A', dot: '#16A34A' },
  UPCOMING: { label: 'Upcoming', color: '#1E3A8A', dot: '#1E3A8A' },
  COMPLETED: { label: 'Completed', color: '#64748B', dot: '#64748B' },
};