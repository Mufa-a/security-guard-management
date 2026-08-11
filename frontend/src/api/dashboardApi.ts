import apiClient from './client';
import { getShiftAssignments } from './shiftsApi';
import { getMyAttendance } from './attendanceApi';
import { getMyIncidents } from './incidentsApi';

export interface DashboardStats {
  activeGuards: number;
  activeSites: number;
  openIncidents: number;
  pendingInvoices: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [staffRes, sitesRes, incidentsRes, invoicesRes, assignmentsRes, shiftAssignmentsRes] = await Promise.all([
    apiClient.get('/staff/profiles/'),
    apiClient.get('/sites/sites/'),
    apiClient.get('/incidents/incidents/'),
    apiClient.get('/invoices/invoices/'),
    apiClient.get('/sites/assignments/'),
    apiClient.get('/shifts/assignments/'),
  ]);

  const staff = staffRes.data.results ?? staffRes.data;
  const sites = sitesRes.data.results ?? sitesRes.data;
  const incidents = incidentsRes.data.results ?? incidentsRes.data;
  const invoices = invoicesRes.data.results ?? invoicesRes.data;
  const assignments = assignmentsRes.data.results ?? assignmentsRes.data;
  const shiftAssignments = shiftAssignmentsRes.data.results ?? shiftAssignmentsRes.data;

  const today = new Date().toISOString().slice(0, 10);

  const deployedEmployeeIds = new Set(
    assignments
      .filter((a: any) => a.is_active && (!a.end_date || a.end_date >= today))
      .map((a: any) => a.employee)
  );

  shiftAssignments
    .filter((sa: any) => sa.shift_date === today && sa.status !== 'CANCELLED')
    .forEach((sa: any) => deployedEmployeeIds.add(sa.employee));

  const activeGuards = staff.filter(
    (s: any) =>
      s.employment_status === 'ACTIVE' &&
      s.user?.role === 'GUARD' &&
      deployedEmployeeIds.has(s.id)
  ).length;

  const activeSites = sites.filter((s: any) => s.is_active).length;

  const openIncidents = incidents.filter(
    (i: any) => i.status === 'OPEN' || i.status === 'UNDER_REVIEW'
  ).length;

  const pendingInvoices = invoices.filter(
    (inv: any) => inv.status === 'SENT' || inv.status === 'OVERDUE'
  ).length;

  return { activeGuards, activeSites, openIncidents, pendingInvoices };
}

// --- Live metrics --------------------------------------------------------
// CHANGED: on-duty/late/absent counts now come from Attendance.status
// (the backend's real state, driven by mark_absences + the check-in view)
// instead of being recomputed independently from raw timestamps here.
// The old version used its own LATE_GRACE_MINUTES/ABSENT_GRACE_MINUTES
// and compared "now" against the shift start on the client -- which
// could disagree with the backend (e.g. showing "absent" here while
// admin still showed SCHEDULED, because mark_absences hadn't run yet,
// or vice versa). Trusting attendance.status directly means this panel
// can only ever show what's actually true in the database.
const CHECK_IN_WINDOW_MINUTES = 60;
const UPCOMING_WINDOW_HOURS = 4;

export interface SiteAttention {
  site_name: string;
  reasons: string[];
}

export interface LiveMetrics {
  onDuty: number;
  late: number;
  absent: number;
  activeIncidents: number;
  checkInsLastHour: number;
  upcomingShifts: number;
  upcomingShiftsList: Array<{ site_name: string; employee_name: string; date: string; start_time: string }>;
  sitesRequiringAttention: SiteAttention[];
}

function minutesBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / 60000;
}

export async function getLiveMetrics(): Promise<LiveMetrics> {
  const [shiftAssignments, attendance, incidents] = await Promise.all([
    getShiftAssignments(),
    getMyAttendance(),
    getMyIncidents(),
  ]);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const attendanceByAssignment = new Map(attendance.map((a) => [a.shift_assignment, a]));

  const todaysAssignments = shiftAssignments.filter(
    (sa) => sa.shift_date === today && sa.status !== 'CANCELLED'
  );

  let onDuty = 0;
  let late = 0;
  let absent = 0;
  const siteIssues = new Map<string, Set<string>>();

  function flagSite(siteName: string, reason: string) {
    if (!siteIssues.has(siteName)) siteIssues.set(siteName, new Set());
    siteIssues.get(siteName)!.add(reason);
  }

  for (const sa of todaysAssignments) {
    const record = attendanceByAssignment.get(sa.id);
    if (!record) continue;

    const shiftStart = new Date(`${sa.shift_date}T${sa.shift_start_time}`);
    const shiftEnd = new Date(`${sa.shift_date}T${sa.shift_end_time}`);
    const withinShiftWindow = now >= shiftStart && now <= shiftEnd;

    // On duty: currently checked in, not checked out, shift window active.
    // Covers PRESENT, PRESENT_LATE, and PRESENT_LATE_APPROVED alike --
    // all three mean "the guard is actually there right now."
    if (record.check_in_time && !record.check_out_time && withinShiftWindow) {
      onDuty += 1;
      continue;
    }

    // Late: backend has already computed and stored this via the
    // check-in view -- no need to recompute grace/late windows here.
    if (record.status === 'PRESENT_LATE' && withinShiftWindow) {
      late += 1;
      flagSite(sa.site_name, 'guard late');
      continue;
    }

    // Absent: backend has already run mark_absences (or the check-in
    // race-condition branch) and set this -- trust it directly.
    if (record.status === 'ABSENT') {
      absent += 1;
      flagSite(sa.site_name, 'guard absent');
    }
  }

  const activeIncidentRecords = incidents.filter(
    (i) => i.status === 'OPEN' || i.status === 'UNDER_REVIEW'
  );
  activeIncidentRecords.forEach((i) => flagSite(i.site_name, 'active incident'));

  const checkInsLastHour = attendance.filter((a) => {
    if (!a.check_in_time) return false;
    const checkedInAt = new Date(a.check_in_time);
    const diff = minutesBetween(now, checkedInAt);
    return diff >= 0 && diff <= CHECK_IN_WINDOW_MINUTES;
  }).length;

  const upcomingCutoff = new Date(now.getTime() + UPCOMING_WINDOW_HOURS * 60 * 60000);
  const upcoming = shiftAssignments
    .filter((sa) => {
      if (sa.status === 'CANCELLED') return false;
      const shiftStart = new Date(`${sa.shift_date}T${sa.shift_start_time}`);
      return shiftStart > now && shiftStart <= upcomingCutoff;
    })
    .sort((a, b) => `${a.shift_date}${a.shift_start_time}`.localeCompare(`${b.shift_date}${b.shift_start_time}`));

  const sitesRequiringAttention: SiteAttention[] = Array.from(siteIssues.entries()).map(
    ([site_name, reasons]) => ({ site_name, reasons: Array.from(reasons) })
  );

  return {
    onDuty,
    late,
    absent,
    activeIncidents: activeIncidentRecords.length,
    checkInsLastHour,
    upcomingShifts: upcoming.length,
    upcomingShiftsList: upcoming.slice(0, 6).map((sa) => ({
      site_name: sa.site_name,
      employee_name: sa.employee_name,
      date: sa.shift_date,
      start_time: sa.shift_start_time,
    })),
    sitesRequiringAttention,
  };
}