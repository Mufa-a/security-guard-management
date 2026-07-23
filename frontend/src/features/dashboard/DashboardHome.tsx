import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock, Calendar, AlertCircle, Wallet, MapPin, Users, ShieldCheck,
  UserPlus, FileWarning, ClipboardList, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getDashboardStats } from '../../api/dashboardApi';
import type { DashboardStats } from '../../api/dashboardApi';
import { getMyShiftAssignments } from '../../api/shiftsApi';

type Tone = 'default' | 'success' | 'warning' | 'critical';

const TONE_DOT: Record<Tone, string> = {
  default: 'bg-white/25',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  critical: 'bg-crimecurb-red',
};

const ROLE_ACCENT: Record<string, { label: string; dot: string }> = {
  ADMIN: { label: 'Director Overview', dot: 'bg-crimecurb-red' },
  MANAGER: { label: 'Secretary Overview', dot: 'bg-sky-400' },
  SUPERVISOR: { label: 'Supervisor Overview', dot: 'bg-amber-400' },
};

function OverviewPanel({
  role,
  children,
}: {
  role?: string;
  children: React.ReactNode;
}) {
  const accent = ROLE_ACCENT[role ?? ''] ?? { label: 'Duty Overview', dot: 'bg-emerald-400' };
  const today = new Date().toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="lg:col-span-2 bg-crimecurb-navy rounded-2xl border border-white/5 shadow-xl shadow-black/20 overflow-hidden">
      <div className="flex items-start justify-between px-6 pt-6 pb-5">
        <div>
          <p className="flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.22em] text-crimecurb-red font-semibold">
            <ShieldCheck size={11} strokeWidth={2.25} />
            Operations Overview
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-1.5 h-1.5 rounded-full ${accent.dot}`} />
            <h2 className="font-display text-base font-bold text-white">{accent.label}</h2>
          </div>
        </div>
        <p className="text-[11px] font-mono text-white/35 text-right mt-0.5">{today}</p>
      </div>
      <div className="border-t border-white/8">{children}</div>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value,
  to,
  isLoading,
  tone = 'default',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | undefined;
  to: string;
  isLoading: boolean;
  tone?: Tone;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between px-6 py-4 border-b border-white/8 last:border-b-0 hover:bg-white/[0.04] transition-colors group"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-white/[0.06] text-white/70 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
          <Icon size={16} strokeWidth={1.75} />
        </div>
        <span className="text-sm text-white/65 truncate">{label}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {isLoading ? (
          <span className="inline-block w-12 h-4 bg-white/10 rounded animate-pulse" />
        ) : (
          <span className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${TONE_DOT[tone]}`} />
            <span className="font-display text-[15px] font-semibold text-white tabular-nums">
              {value ?? '—'}
            </span>
          </span>
        )}
        <ChevronRight
          size={14}
          className="text-white/25 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all"
        />
      </div>
    </Link>
  );
}

function QuickAction({
  icon: Icon,
  label,
  to,
  tone = 'neutral',
}: {
  icon: React.ElementType;
  label: string;
  to: string;
  tone?: 'neutral' | 'accent';
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 bg-white rounded-xl border border-slate-200/70 shadow-sm p-4 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-150 group"
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
          tone === 'accent'
            ? 'bg-crimecurb-red/10 text-crimecurb-red group-hover:bg-crimecurb-red group-hover:text-white'
            : 'bg-crimecurb-navy/5 text-crimecurb-navy group-hover:bg-crimecurb-navy group-hover:text-white'
        }`}
      >
        <Icon size={16} strokeWidth={1.75} />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <ChevronRight
        size={14}
        className="ml-auto text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all"
      />
    </Link>
  );
}

export default function DashboardHome() {
  const { user } = useAuth();
  const isManagement = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'SUPERVISOR';

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">
            Welcome back, {user?.email?.split('@')[0]}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Here's what's happening across your operations today.</p>
        </div>
        {user?.role && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-widest text-crimecurb-navy bg-crimecurb-navy/[0.06] border border-crimecurb-navy/10 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-crimecurb-red" />
            {user.role}
          </span>
        )}
      </div>
      {isManagement ? <ManagementStats /> : <GuardDashboard />}
    </div>
  );
}

function ManagementStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then(setStats).finally(() => setIsLoading(false));
  }, []);

  const openIncidents = stats?.openIncidents ?? 0;
  const pendingInvoices = stats?.pendingInvoices ?? 0;

  const allRows: Array<{
    key: string;
    label: string;
    value: number | undefined;
    to: string;
    icon: React.ElementType;
    tone: Tone;
  }> = [
    { key: 'guards', label: 'Active Guards', value: stats?.activeGuards, to: '/staff', icon: Users, tone: 'default' },
    {
      key: 'incidents',
      label: 'Open Incidents',
      value: stats?.openIncidents,
      to: '/incidents',
      icon: AlertCircle,
      tone: openIncidents > 0 ? 'critical' : 'success',
    },
    {
      key: 'invoices',
      label: 'Pending Invoices',
      value: stats?.pendingInvoices,
      to: '/invoices',
      icon: Wallet,
      tone: pendingInvoices > 0 ? 'warning' : 'default',
    },
  ];

  const rows = user?.role === 'SUPERVISOR' ? allRows.filter((r) => r.key !== 'invoices') : allRows;

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <OverviewPanel role={user?.role ?? undefined}>
        {rows.map((row) => (
          <StatusRow
            key={row.key}
            icon={row.icon}
            label={row.label}
            value={row.value}
            to={row.to}
            isLoading={isLoading}
            tone={row.tone}
          />
        ))}
      </OverviewPanel>

      <div className="space-y-3">
        <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Quick Actions</p>
        <QuickAction icon={UserPlus} label="Add Employee" to="/staff/new" />
        <QuickAction icon={FileWarning} label="Review Incidents" to="/incidents" tone="accent" />
        {isAdmin && <QuickAction icon={ClipboardList} label="Manage Payroll" to="/payroll" />}
      </div>
    </div>
  );
}

function GuardDashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [nextShift, setNextShift] = useState<{ site_name: string; date: string; start_time: string; end_time: string } | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<{ check_in_time: string | null; check_out_time: string | null } | null>(null);
  const [openIncidentCount, setOpenIncidentCount] = useState(0);
  const [latestPayslip, setLatestPayslip] = useState<{ status: string; period_detail: string; id: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);

    Promise.all([
      getMyShiftAssignments(),
      import('../../api/attendanceApi').then((m) => m.getMyAttendance()),
      import('../../api/incidentsApi').then((m) => m.getMyIncidents()),
      import('../../api/payrollApi').then((m) => m.getMyPayslips()),
    ])
      .then(([assignments, attendance, incidents, payslips]) => {
        const upcoming = assignments
          .filter((a) => {
            if (a.shift_date < today) return false;
            // Exclude today's shift if attendance is already fully checked out.
            const record = attendance.find(
              (att) => att.employee_name === user.email && att.shift_date === a.shift_date
            );
            if (record?.check_out_time) return false;
            return true;
          })
          .sort((a, b) => a.shift_date.localeCompare(b.shift_date) || a.shift_start_time.localeCompare(b.shift_start_time));

        const next = upcoming[0];
        setNextShift(
          next
            ? { site_name: next.site_name, date: next.shift_date, start_time: next.shift_start_time, end_time: next.shift_end_time }
            : null
        );

        const todayRecord = attendance.find(
          (a) => a.employee_name === user.email && a.shift_date === today
        );
        setTodayAttendance(todayRecord ? { check_in_time: todayRecord.check_in_time, check_out_time: todayRecord.check_out_time } : null);

        const myOpenIncidents = incidents.filter(
          (i) => i.reported_by_name === user.email && (i.status === 'OPEN' || i.status === 'UNDER_REVIEW')
        );
        setOpenIncidentCount(myOpenIncidents.length);

        setLatestPayslip(payslips[0] ?? null);
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const attendanceLabel = !todayAttendance
    ? 'Not scheduled'
    : !todayAttendance.check_in_time
    ? 'Not checked in'
    : !todayAttendance.check_out_time
    ? 'Checked in'
    : 'Complete';

  const attendanceTone: Tone =
    attendanceLabel === 'Complete'
      ? 'success'
      : attendanceLabel === 'Checked in'
      ? 'warning'
      : attendanceLabel === 'Not checked in'
      ? 'critical'
      : 'default';

  const payslipTone: Tone = !latestPayslip
    ? 'default'
    : latestPayslip.status.toUpperCase().includes('PEND')
    ? 'warning'
    : 'success';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <OverviewPanel role={user?.role ?? undefined}>
        <StatusRow
          icon={Clock}
          label="Today's Status"
          value={attendanceLabel}
          to="/my-attendance"
          isLoading={isLoading}
          tone={attendanceTone}
        />
        <StatusRow
          icon={MapPin}
          label="Next Shift"
          value={nextShift ? `${nextShift.date} · ${nextShift.site_name}` : 'None scheduled'}
          to="/my-shifts"
          isLoading={isLoading}
        />
        <StatusRow
          icon={AlertCircle}
          label="Open Incidents"
          value={openIncidentCount}
          to="/my-incidents"
          isLoading={isLoading}
          tone={openIncidentCount > 0 ? 'critical' : 'success'}
        />
        <StatusRow
          icon={Wallet}
          label="Latest Payslip"
          value={latestPayslip ? latestPayslip.status : 'None yet'}
          to="/my-payslips"
          isLoading={isLoading}
          tone={payslipTone}
        />
      </OverviewPanel>

      <div className="space-y-3">
        <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Quick Actions</p>
        <QuickAction icon={Clock} label="Check In / Out" to="/my-attendance" />
        <QuickAction icon={FileWarning} label="Report Incident" to="/my-incidents" tone="accent" />
        <QuickAction icon={Calendar} label="View My Shifts" to="/my-shifts" />
      </div>
    </div>
  );
}