import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Printer, Users, MapPin, AlertCircle, Clock, Wallet, Receipt, TrendingUp } from 'lucide-react';
import { getEmployeeProfiles } from '../../api/staffApi';
import { getSites } from '../../api/sitesApi';
import { getMyIncidents } from '../../api/incidentsApi';
import { getAttendanceRecords } from '../../api/attendanceApi';
import { getInvoices } from '../../api/invoicesApi';
import { getPayslips, getPayrollPeriods } from '../../api/payrollApi';
import type { EmployeeProfile } from '../../types/staff';
import type { Site } from '../../types/sites';
import type { Incident } from '../../types/incidents';
import type { Attendance } from '../../types/attendance';
import type { Invoice } from '../../types/invoices';
import type { Payslip, PayrollPeriod } from '../../types/payroll';

function formatKES(value: number): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
}

const thisMonthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
}

export default function ExecutiveDashboardPage() {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getEmployeeProfiles(),
      getSites(),
      getMyIncidents(),
      getAttendanceRecords(),
      getInvoices(),
      getPayslips(),
      getPayrollPeriods(),
    ])
      .then(([e, s, i, a, inv, p, per]) => {
        setEmployees(e);
        setSites(s);
        setIncidents(i);
        setAttendance(a);
        setInvoices(inv);
        setPayslips(p);
        setPeriods(per);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load executive dashboard data.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const periodById = useMemo(() => {
    const map: Record<string, PayrollPeriod> = {};
    periods.forEach((p) => (map[p.id] = p));
    return map;
  }, [periods]);

  const kpis = useMemo(() => {
    const activeGuards = employees.filter(
      (e) => e.user.role === 'GUARD' && e.employment_status === 'ACTIVE'
    ).length;
    const activeSites = sites.filter((s) => s.is_active).length;
    const openIncidents = incidents.filter((i) => i.status === 'OPEN' || i.status === 'UNDER_REVIEW').length;

    const thisMonthAttendance = attendance.filter((a) => a.shift_date.startsWith(thisMonthKey));
    const present = thisMonthAttendance.filter((a) => a.check_in_time).length;
    const attendanceRate =
      thisMonthAttendance.length > 0 ? Math.round((present / thisMonthAttendance.length) * 100) : 0;

    const monthRevenue = invoices
      .filter((inv) => inv.issue_date.startsWith(thisMonthKey))
      .reduce((sum, inv) => sum + parseFloat(inv.subtotal), 0);

    const outstandingInvoices = invoices
      .filter((inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
      .reduce((sum, inv) => sum + parseFloat(inv.subtotal), 0);

    const monthPayroll = payslips
      .filter((p) => periodById[p.period]?.period_start.startsWith(thisMonthKey))
      .reduce((sum, p) => sum + parseFloat(p.net_pay), 0);

    return { activeGuards, activeSites, openIncidents, attendanceRate, monthRevenue, outstandingInvoices, monthPayroll };
  }, [employees, sites, incidents, attendance, invoices, payslips, periodById]);

  const trendData = useMemo(() => {
    const byMonth: Record<string, { revenue: number; payroll: number }> = {};

    invoices.forEach((inv) => {
      const key = inv.issue_date.slice(0, 7);
      byMonth[key] = byMonth[key] ?? { revenue: 0, payroll: 0 };
      byMonth[key].revenue += parseFloat(inv.subtotal);
    });

    payslips.forEach((p) => {
      const period = periodById[p.period];
      if (!period) return;
      const key = period.period_start.slice(0, 7);
      byMonth[key] = byMonth[key] ?? { revenue: 0, payroll: 0 };
      byMonth[key].payroll += parseFloat(p.net_pay);
    });

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);
  }, [invoices, payslips, periodById]);

  const maxTrendValue = Math.max(1, ...trendData.flatMap(([, v]) => [v.revenue, v.payroll]));

  const recentOpenIncidents = useMemo(
    () =>
      incidents
        .filter((i) => i.status === 'OPEN' || i.status === 'UNDER_REVIEW')
        .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
        .slice(0, 5),
    [incidents]
  );

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
          <h1 className="font-display text-2xl font-bold text-slate-800">Executive Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Snapshot as of {new Date().toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
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
          {/* Operational KPIs */}
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Operations</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-1 text-slate-400">
                <Users size={14} />
                <p className="text-[10.5px] font-semibold uppercase tracking-wide">Active Guards</p>
              </div>
              <p className="font-mono text-2xl font-bold text-slate-800">{kpis.activeGuards}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-1 text-slate-400">
                <MapPin size={14} />
                <p className="text-[10.5px] font-semibold uppercase tracking-wide">Active Sites</p>
              </div>
              <p className="font-mono text-2xl font-bold text-slate-800">{kpis.activeSites}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-1 text-slate-400">
                <AlertCircle size={14} />
                <p className="text-[10.5px] font-semibold uppercase tracking-wide">Open Incidents</p>
              </div>
              <p className={`font-mono text-2xl font-bold ${kpis.openIncidents > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {kpis.openIncidents}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-1 text-slate-400">
                <Clock size={14} />
                <p className="text-[10.5px] font-semibold uppercase tracking-wide">Attendance Rate (MTD)</p>
              </div>
              <p className="font-mono text-2xl font-bold text-slate-800">{kpis.attendanceRate}%</p>
            </div>
          </div>

          {/* Financial KPIs */}
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Financial (This Month)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-1 text-slate-400">
                <TrendingUp size={14} />
                <p className="text-[10.5px] font-semibold uppercase tracking-wide">Revenue Billed</p>
              </div>
              <p className="font-mono text-2xl font-bold text-slate-800">{formatKES(kpis.monthRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-1 text-slate-400">
                <Wallet size={14} />
                <p className="text-[10.5px] font-semibold uppercase tracking-wide">Payroll (Net)</p>
              </div>
              <p className="font-mono text-2xl font-bold text-slate-800">{formatKES(kpis.monthPayroll)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-1 text-slate-400">
                <Receipt size={14} />
                <p className="text-[10.5px] font-semibold uppercase tracking-wide">Outstanding Invoices</p>
              </div>
              <p className="font-mono text-2xl font-bold text-slate-800">{formatKES(kpis.outstandingInvoices)}</p>
            </div>
          </div>

          {/* Trend chart */}
          {trendData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">
                Revenue vs. Payroll — Last 6 Months
              </p>
              <div className="flex items-end gap-4 h-40">
                {trendData.map(([month, v]) => (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center gap-1 h-32">
                      <div
                        className="w-1/2 bg-crimecurb-navy rounded-t"
                        style={{ height: `${(v.revenue / maxTrendValue) * 100}%`, minHeight: '2px' }}
                        title={`Revenue: ${formatKES(v.revenue)}`}
                      />
                      <div
                        className="w-1/2 bg-crimecurb-red rounded-t"
                        style={{ height: `${(v.payroll / maxTrendValue) * 100}%`, minHeight: '2px' }}
                        title={`Payroll: ${formatKES(v.payroll)}`}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">{monthLabel(month)}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-crimecurb-navy" /> Revenue
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-crimecurb-red" /> Payroll
                </span>
              </div>
            </div>
          )}

          {/* Recent open incidents */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 pt-4 pb-2">
              Recent Open Incidents
            </p>
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Occurred</th>
                </tr>
              </thead>
              <tbody>
                {recentOpenIncidents.map((i) => (
                  <tr key={i.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-600">{i.site_name}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{i.title}</td>
                    <td className="px-4 py-3 text-slate-600">{i.severity}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(i.occurred_at).toLocaleDateString('en-KE')}</td>
                  </tr>
                ))}
                {recentOpenIncidents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                      No open incidents — all clear.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-center text-xs text-slate-400 mt-8 pt-4 border-t border-slate-200">
            <p>
              Generated by Erip <span className="text-crimecurb-red font-semibold">⚡</span> Technologies
            </p>
            <p>0710951879</p>
          </div>
        </>
      )}
    </div>
  );
}