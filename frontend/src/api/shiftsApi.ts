import apiClient from './client';
import type { Shift, ShiftCreatePayload, ShiftAssignment, ShiftAssignmentCreatePayload } from '../types/shifts';

export async function getShifts(): Promise<Shift[]> {
  const { data } = await apiClient.get('/shifts/shifts/');
  return data.results ?? data;
}

export async function getShift(id: string): Promise<Shift> {
  const { data } = await apiClient.get(`/shifts/shifts/${id}/`);
  return data;
}

export async function createShift(payload: ShiftCreatePayload): Promise<Shift> {
  const { data } = await apiClient.post('/shifts/shifts/', payload);
  return data;
}

export async function updateShift(id: string, payload: Partial<ShiftCreatePayload>): Promise<Shift> {
  const { data } = await apiClient.patch(`/shifts/shifts/${id}/`, payload);
  return data;
}

export async function deleteShift(id: string): Promise<void> {
  await apiClient.delete(`/shifts/shifts/${id}/`);
}

export async function getShiftAssignments(): Promise<ShiftAssignment[]> {
  const { data } = await apiClient.get('/shifts/assignments/');
  return data.results ?? data;
}

// Kept for MyShiftsPage.tsx, which already imports this name.
export async function getMyShiftAssignments(): Promise<ShiftAssignment[]> {
  return getShiftAssignments();
}

// --- Smart shift planning ---------------------------------------------

export interface ConflictingShift {
  shift_id: string;
  date: string;
  site: string;
}

export interface SuggestedGuard {
  employee_id: string;
  employee_name: string;
  available: boolean;
  posted_to_site: boolean;
  has_conflict: boolean;
  conflicting_shifts: ConflictingShift[];
  exceeds_daily_cap: boolean;
  exceeds_weekly_cap: boolean;
  current_weekly_hours: number;
}

export interface HourWarning {
  daily_hours: number;
  daily_cap: number;
  exceeds_daily_cap: boolean;
  weekly_hours: number;
  weekly_cap: number;
  exceeds_weekly_cap: boolean;
}

export interface SkippedShift {
  site: string;
  date: string;
  reason: string;
}

export interface SkippedAssignment {
  employee: string;
  date: string;
  reason: string;
}

export interface CopyWeekResult {
  created_shifts: number;
  shift_ids: string[];
  skipped_shifts: SkippedShift[];
  skipped_assignments: SkippedAssignment[];
}

// Thrown when the backend returns 409 — the guard has a real time conflict
// and the assignment was NOT created. Distinguish this from a generic
// AxiosError in the UI so the message can be shown inline rather than as
// a generic "failed to save" toast.
export class ShiftConflictError extends Error {
  conflicts: ConflictingShift[];
  constructor(message: string, conflicts: ConflictingShift[]) {
    super(message);
    this.name = 'ShiftConflictError';
    this.conflicts = conflicts;
  }
}

export async function suggestGuards(shiftId: string, limit = 10): Promise<SuggestedGuard[]> {
  const { data } = await apiClient.get(`/shifts/shifts/${shiftId}/suggest_guards/`, {
    params: { limit },
  });
  return data;
}

export async function copyWeek(
  sourceWeekStart: string,
  targetWeekStart: string,
  options?: { site?: string; includeAssignments?: boolean },
): Promise<CopyWeekResult> {
  const { data } = await apiClient.post('/shifts/shifts/copy_week/', {
    source_week_start: sourceWeekStart,
    target_week_start: targetWeekStart,
    site: options?.site,
    include_assignments: options?.includeAssignments ?? true,
  });
  return data;
}

export async function repeatWeekly(
  shiftIds: string[],
  weeks: number,
  options?: { includeAssignments?: boolean },
): Promise<CopyWeekResult> {
  const { data } = await apiClient.post('/shifts/shifts/repeat_weekly/', {
    shift_ids: shiftIds,
    weeks,
    include_assignments: options?.includeAssignments ?? true,
  });
  return data;
}

// createShiftAssignment now surfaces two backend behaviors that plain
// axios errors don't distinguish on their own:
// - 409 Conflict: the guard has an overlapping shift. The assignment was
//   NOT created. We throw ShiftConflictError so callers can show a
//   specific inline message instead of a generic failure toast.
// - 201 with hour_warning !== null: the assignment WAS created, but it
//   puts the guard over the daily/weekly hour cap. Caller decides whether
//   to surface a non-blocking warning.
export interface CreateAssignmentResult {
  assignment: ShiftAssignment;
  hourWarning: HourWarning | null;
}

export async function createShiftAssignment(payload: ShiftAssignmentCreatePayload): Promise<CreateAssignmentResult> {
  try {
    const { data } = await apiClient.post('/shifts/assignments/', payload);
    const { hour_warning, ...assignment } = data;
    return { assignment: assignment as ShiftAssignment, hourWarning: hour_warning ?? null };
  } catch (err: any) {
    if (err?.response?.status === 409) {
      const detail = err.response.data?.detail ?? 'This guard is already scheduled for an overlapping shift.';
      throw new ShiftConflictError(detail, err.response.data?.conflicts ?? []);
    }
    throw err;
  }
}

export async function updateShiftAssignment(id: string, payload: Partial<ShiftAssignmentCreatePayload>): Promise<ShiftAssignment> {
  const { data } = await apiClient.patch(`/shifts/assignments/${id}/`, payload);
  return data;
}

export async function deleteShiftAssignment(id: string): Promise<void> {
  await apiClient.delete(`/shifts/assignments/${id}/`);
}