import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Printer, Users, MapPin, Building2, AlertCircle, Clock, Wallet, Receipt, TrendingUp } from 'lucide-react';
import { getEmployeeProfiles } from '../../api/staffApi';
import { getSites, getClients, getSiteAssignments } from '../../api/sitesApi';
import { getMyIncidents } from '../../api/incidentsApi';
import { getAttendanceRecords } from '../../api/attendanceApi';
import { getInvoices } from '../../api/invoicesApi';
import { getPayslips, getPayrollPeriods } from '../../api/payrollApi';

function formatKES(value: number): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
}

const thisMonthKey = new Date().toISOString().slice(0, 7);

export default function KpiDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getEmployeeProfiles(),
      getSites(),
      getClients(),
      getSiteAssignments(),
      getMyIncidents(),
      getAttendanceRecords(),
      getInvoices(),
      getPayslips(),
      getPayrollPeriods(),
    ])
      .then(([employees, sites, clients, assignments, incidents, attendance, invoices, payslips, periods]) => {
        setData({ employees, sites, clients, assignments, incidents, attendance, invoices, payslips, periods });
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load KPI data.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const kpis = useMemo(() => {
    if (!data) return null;
    const { employees, sites, clients, assignments, incidents, attendance, invoices, payslips, periods } = data;

    const activeGuards = employees.filter((e: any) => e.user.role === 'GUARD' && e.employment_status === 'ACTIVE');
    const activeSites = sites.filter((s: any) => s.is_active).length;
    const activeClients = clients.filter((c: any) => c.is_active).length;
    const openIncidents = incidents.filter((i: any) => i.status === 'OPEN' || i.status === 'UNDER_REVIEW').length;

    const currentlyPosted = new Set(
      assignments.filter((a: any) => !a.end_date).map((a: any) => a.employee)
    );
    const guardUtilization =
      activeGuards.length > 0
        ? Math.round((activeGuards.filter((g: any) => currentlyPosted.has(g.id)).length / activeGuards.length) * 100)
        : 0;

    const monthAttendance = attendance.filter((a: any) => a.shift_date?.startsWith(thisMonthKey));
    const present = monthAttendance.filter((a: any) => a.check_in_time).length;
    const attendanceRate = monthAttendance.length > 0 ? Math.round((present / monthAttendance.length) * 100) : 0;

    const periodById: Record<string, any> = {};
    periods.forEach((p: any) => (periodById[p.id] = p));

    const monthRevenue = invoices
      .filter((inv: any) => inv.issue_date?.startsWith(thisMonthKey))
      .reduce((sum: number, inv: any) => sum + parseFloat(inv.subtotal), 0);

    const monthPayroll = payslips
      .filter((p: any) => periodById[p.period]?.period_start?.startsWith(thisMonthKey))
      .reduce((sum: number, p: any) => sum + parseFloat(p.net_pay), 0);

    const outstandingInvoices = invoices
      .filter((inv: any) => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
      .reduce((sum: number, inv: any) => sum + parseFloat(inv.subtotal), 0);

    return {
      activeGuards: activeGuards.length,
      activeSites,
      activeClients,
      openIncidents,
      guardUtilization,
      attendanceRate,
      monthRevenue,
      monthPayroll,
      outstandingInvoices,
    };
  }, [data]);

  const tiles = kpis
    ? [
        { label: 'Active Guards', value: kpis.activeGuards, icon: Users },
        { label: 'Active Sites', value: kpis.activeSites, icon: MapPin },
        { label: 'Active Clients', value: kpis.activeClients, icon: Building2 },
        { label: 'Open Incidents', value: kpis.openIncidents, icon: AlertCircle, warn: kpis.openIncidents > 0 },
        { label: 'Guard Utilization', value: `${kpis.guardUtilization}%`, icon: Users },
        { label: 'Attendance Rate (MTD)', value: `${kpis.attendanceRate}%`, icon: Clock },
        { label: 'Revenue Billed (Month)', value: formatKES(kpis.monthRevenue), icon: TrendingUp },
        { label: 'Payroll Net (Month)', value: formatKES(kpis.monthPayroll), icon: Wallet },
        { label: 'Outstanding Invoices', value: formatKES(kpis.outstandingInvoices), icon: Receipt, warn: kpis.outstandingInvoices > 0 },
      ]
    : [];

  return (
    <div>
      <Link to="/reports" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 print:hidden">
        <ArrowLeft size={14} /> Back to Reports
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <p className="text-[11px] font-mono font-semibold uppercase tracking-[2px] text-crimecurb-red mb-1">
            Executive · Reports
          </p>
          <h1 className="font-display text-2xl font-bold text-slate-800">KPI Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Every key metric across the business, in one view.</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 bg-crimecurb-navy hover:opacity-90 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors print:hidden"
        >
          <Printer size={14} /> Print
        </button>
      </div>

      {isLoading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 mb-6">
            {tiles.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.label} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-1 text-slate-400">
                    <Icon size={14} />
                    <p className="text-[10.5px] font-semibold uppercase tracking-wide">{t.label}</p>
                  </div>
                  <p className={`font-mono text-2xl font-bold ${t.warn ? 'text-red-600' : 'text-slate-800'}`}>
                    {t.value}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="text-center text-xs text-slate-400 mt-8 pt-4 border-t border-slate-200">
            <p>Generated by Erip <span className="text-crimecurb-red font-semibold">⚡</span> Technologies</p>
            <p>0710951879</p>
          </div>
        </>
      )}
    </div>
  );
}