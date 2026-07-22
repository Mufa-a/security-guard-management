import apiClient from './client';

export interface DashboardStats {
  activeGuards: number;
  activeSites: number;
  openIncidents: number;
  pendingInvoices: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [staffRes, sitesRes, incidentsRes, invoicesRes, assignmentsRes] = await Promise.all([
    apiClient.get('/staff/profiles/'),
    apiClient.get('/sites/sites/'),
    apiClient.get('/incidents/incidents/'),
    apiClient.get('/invoices/invoices/'),
    apiClient.get('/sites/assignments/'),
  ]);

  const staff = staffRes.data.results ?? staffRes.data;
  const sites = sitesRes.data.results ?? sitesRes.data;
  const incidents = incidentsRes.data.results ?? incidentsRes.data;
  const invoices = invoicesRes.data.results ?? invoicesRes.data;
  const assignments = assignmentsRes.data.results ?? assignmentsRes.data;

  const today = new Date().toISOString().slice(0, 10);

  // An employee currently "deployed" — an active SiteAssignment with no
  // end_date, or an end_date that hasn't passed yet.
  const deployedEmployeeIds = new Set(
    assignments
      .filter((a: any) => a.is_active && (!a.end_date || a.end_date >= today))
      .map((a: any) => a.employee)
  );

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