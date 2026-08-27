import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Search, RefreshCw, Download, ShieldCheck, ShieldOff, AlertCircle, CalendarCheck2 } from 'lucide-react';
import { getEmployeeProfiles, updateEmployeeProfile, deleteEmployeeProfile } from '../../api/staffApi';
import { getSiteAssignments, getSites } from '../../api/sitesApi';
import { getAttendanceRecords } from '../../api/attendanceApi';
import { getShiftAssignments } from '../../api/shiftsApi';
import { getMyIncidents } from '../../api/incidentsApi';
import type { EmployeeProfile } from '../../types/staff';
import type { ShiftAssignment } from '../../types/shifts';
import type { Attendance } from '../../types/attendance';
import type { Incident } from '../../types/incidents';
import type { Site } from '../../types/sites';
import KpiCard from './KpiCard';
import GuardCard from './GuardCard';
import GuardDrawer from './GuardDrawer';
import GuardLocationMap, { type LastKnownLocation, type SiteLocation } from './GuardLocationMap';
import { useAuth } from '../auth/AuthContext';

type SortKey = 'name' | 'service' | 'last_checkin';

export default function ActiveGuardsPage() {
  const [guards, setGuards] = useState<EmployeeProfile[]>([]);
  const [allShiftAssignments, setAllShiftAssignments] = useState<ShiftAssignment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [siteByEmployee, setSiteByEmployee] = useState<Record<string, string>>({});
  const [sites, setSites] = useState<Site[]>([]);
  const [onDutyEmployees, setOnDutyEmployees] = useState<Set<string>>(new Set());
  const [shiftTimeByEmployee, setShiftTimeByEmployee] = useState<Record<string, { start: string; end: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ON_DUTY' | 'OFF_DUTY'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [selectedGuard, setSelectedGuard] = useState<EmployeeProfile | null>(null);
  const [mapGuard, setMapGuard] = useState<EmployeeProfile | null>(null);
  const { user } = useAuth();
  const canAddGuard = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  function load() {
    const today = new Date().toISOString().slice(0, 10);
    setIsLoading(true);
    Promise.all([
      getEmployeeProfiles(),
      getSiteAssignments(),
      getAttendanceRecords(),
      getShiftAssignments(),
      getMyIncidents(),
      getSites(),
    ])
      .then(([profiles, assignments, attendanceRecords, shiftAssignments, incidentRecords, siteRecords]) => {
        setSites(siteRecords);
        const activeGuards = profiles.filter((p) => p.user.role === 'GUARD' && p.employment_status === 'ACTIVE');
        setGuards(activeGuards);
        setAllShiftAssignments(shiftAssignments);
        setAttendance(attendanceRecords);
        setIncidents(incidentRecords);

        const siteMap: Record<string, string> = {};
        assignments.filter((a) => !a.end_date).forEach((a) => { siteMap[a.employee] = a.site_name; });

        const shiftTimeMap: Record<string, { start: string; end: string }> = {};
        const todaysAssignments = shiftAssignments.filter((sa) => sa.shift_date === today && sa.status !== 'CANCELLED');
        todaysAssignments.forEach((sa) => {
          siteMap[sa.employee] = sa.site_name;
          shiftTimeMap[sa.employee] = { start: sa.shift_start_time, end: sa.shift_end_time };
        });
        setSiteByEmployee(siteMap);
        setShiftTimeByEmployee(shiftTimeMap);

        // On-duty detection joins through the ShiftAssignment id (not by
        // matching employee_name against email, which was the previous
        // bug — employee_name is a display name, not an identifier, so
        // that comparison rarely matched anything real).
        const attendanceByAssignmentId = new Map(attendanceRecords.map((a) => [a.shift_assignment, a]));
        const onDuty = new Set<string>();
        todaysAssignments.forEach((sa) => {
          const record = attendanceByAssignmentId.get(sa.id);
          if (record?.check_in_time && !record.check_out_time) {
            onDuty.add(sa.employee);
          }
        });
        setOnDutyEmployees(onDuty);
      })
      .catch(() => setError('Failed to load active guards.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleSetStatus(id: string, status: string) {
    setActionError(null);
    try {
      await updateEmployeeProfile(id, { employment_status: status });
      setSelectedGuard(null);
      load();
    } catch {
      setActionError('Failed to update status.');
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    setActionError(null);
    try {
      await deleteEmployeeProfile(id);
      setSelectedGuard(null);
      load();
    } catch {
      setActionError('Failed to delete guard.');
    }
  }

  // Open incidents at a given site — real, derived from actual incident data.
  function openIncidentsAt(siteName: string | undefined): number {
    if (!siteName) return 0;
    return incidents.filter((i) => i.site_name === siteName && (i.status === 'OPEN' || i.status === 'UNDER_REVIEW')).length;
  }

  // 30-day attendance % per guard: assignments in the window vs. those
  // with an actual check-in. Returns null when there's no data to divide by,
  // rather than showing a misleading 0%.
  function attendancePercentFor(guardId: string): number | null {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const assignmentsInWindow = allShiftAssignments.filter((sa) => sa.employee === guardId && sa.shift_date >= cutoffStr && sa.status !== 'CANCELLED');
    if (assignmentsInWindow.length === 0) return null;
    const attendanceByAssignmentId = new Map(attendance.map((a) => [a.shift_assignment, a]));
    const attended = assignmentsInWindow.filter((sa) => attendanceByAssignmentId.get(sa.id)?.check_in_time).length;
    return Math.round((attended / assignmentsInWindow.length) * 100);
  }

  // Site coordinates keyed by name — same key space as siteByEmployee, so
  // no extra id-matching plumbing is needed to go from a guard to their
  // site's pin on the map.
  const siteCoordsByName = useMemo(() => {
    const map: Record<string, SiteLocation> = {};
    sites.forEach((s) => {
      if (s.latitude != null && s.longitude != null) {
        map[s.name] = { name: s.name, latitude: Number(s.latitude), longitude: Number(s.longitude) };
      }
    });
    return map;
  }, [sites]);

  // A guard's last known GPS fix — the most recent GPS-tagged check-in or
  // check-out across their shift assignments. This is a point-in-time
  // snapshot, not continuous tracking (the backend has no location-ping
  // model), so it's surfaced with a timestamp rather than as "live".
  function lastKnownLocationFor(guardId: string): LastKnownLocation | null {
    const sas = allShiftAssignments.filter((sa) => sa.employee === guardId);
    const attendanceByAssignmentId = new Map(attendance.map((a) => [a.shift_assignment, a]));
    let best: LastKnownLocation | null = null;
    sas.forEach((sa) => {
      const record = attendanceByAssignmentId.get(sa.id);
      if (!record) return;
      const candidates: { time: string | null; lat: string | null; lng: string | null; source: 'check_in' | 'check_out' }[] = [
        { time: record.check_out_time, lat: record.check_out_latitude, lng: record.check_out_longitude, source: 'check_out' },
        { time: record.check_in_time, lat: record.check_in_latitude, lng: record.check_in_longitude, source: 'check_in' },
      ];
      candidates.forEach((c) => {
        if (!c.time || c.lat == null || c.lng == null) return;
        if (!best || new Date(c.time).getTime() > new Date(best.capturedAt).getTime()) {
          best = { latitude: Number(c.lat), longitude: Number(c.lng), capturedAt: c.time, source: c.source };
        }
      });
    });
    return best;
  }

  const uniqueSites = useMemo(() => Array.from(new Set(Object.values(siteByEmployee))).sort(), [siteByEmployee]);

  const filteredGuards = useMemo(() => {
    let list = guards.filter((g) => {
      const fullName = `${g.user.first_name} ${g.user.last_name}`.toLowerCase();
      const matchesSearch = !search || fullName.includes(search.toLowerCase()) || g.employee_number?.toLowerCase().includes(search.toLowerCase());
      const matchesSite = !siteFilter || siteByEmployee[g.id] === siteFilter;
      const isOnDuty = onDutyEmployees.has(g.id);
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ON_DUTY' ? isOnDuty : !isOnDuty);
      return matchesSearch && matchesSite && matchesStatus;
    });

    list = [...list].sort((a, b) => {
      if (sortKey === 'name') {
        return `${a.user.first_name} ${a.user.last_name}`.localeCompare(`${b.user.first_name} ${b.user.last_name}`);
      }
      if (sortKey === 'service') {
        return new Date(a.date_employed).getTime() - new Date(b.date_employed).getTime();
      }
      // last_checkin
      const attendanceByAssignmentId = new Map(attendance.map((att) => [att.shift_assignment, att]));
      const lastCheckIn = (guardId: string) => {
        const sas = allShiftAssignments.filter((sa) => sa.employee === guardId);
        const times = sas.map((sa) => attendanceByAssignmentId.get(sa.id)?.check_in_time).filter(Boolean) as string[];
        return times.sort().reverse()[0] ?? '';
      };
      return lastCheckIn(b.id).localeCompare(lastCheckIn(a.id));
    });

    return list;
  }, [guards, search, siteFilter, statusFilter, sortKey, siteByEmployee, onDutyEmployees, attendance, allShiftAssignments]);

  const kpis = useMemo(() => {
    const onDutyCount = guards.filter((g) => onDutyEmployees.has(g.id)).length;
    const openIncidentsTotal = incidents.filter((i) => i.status === 'OPEN' || i.status === 'UNDER_REVIEW').length;
    const today = new Date().toISOString().slice(0, 10);
    const todaysAssignments = allShiftAssignments.filter((sa) => sa.shift_date === today && sa.status !== 'CANCELLED');
    const attendanceByAssignmentId = new Map(attendance.map((a) => [a.shift_assignment, a]));
    const checkedInToday = todaysAssignments.filter((sa) => attendanceByAssignmentId.get(sa.id)?.check_in_time).length;
    const attendanceTodayPct = todaysAssignments.length > 0 ? Math.round((checkedInToday / todaysAssignments.length) * 100) : 0;

    return {
      active: guards.length,
      onDuty: onDutyCount,
      offDuty: guards.length - onDutyCount,
      openIncidents: openIncidentsTotal,
      attendanceToday: attendanceTodayPct,
    };
  }, [guards, onDutyEmployees, incidents, allShiftAssignments, attendance]);

  const selectedGuardMeta = selectedGuard
    ? {
        site: siteByEmployee[selectedGuard.id],
        shiftTime: shiftTimeByEmployee[selectedGuard.id],
        isOnDuty: onDutyEmployees.has(selectedGuard.id),
        openIncidentsAtSite: openIncidentsAt(siteByEmployee[selectedGuard.id]),
        attendancePercent: attendancePercentFor(selectedGuard.id),
      }
    : null;

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Active Guards</h1>
          <p className="text-sm text-slate-400 mt-0.5">Monitor all deployed security personnel in real time.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg border border-slate-200">
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg border border-slate-200">
            <Download size={14} /> Export
          </button>
          <Link to="/active-guards/inactive" className="text-slate-500 hover:text-slate-700 text-sm px-2">View Inactive</Link>
          {canAddGuard && (
            <Link to="/staff/new?role=GUARD" className="bg-crimecurb-navy hover:bg-crimecurb-navy/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              + Add Guard
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <KpiCard icon={ShieldCheck} label="Active Guards" value={kpis.active} isLoading={isLoading} gradient="from-crimecurb-navy to-slate-700" />
        <KpiCard icon={ShieldCheck} label="On Duty" value={kpis.onDuty} isLoading={isLoading} gradient="from-emerald-500 to-emerald-600" />
        <KpiCard icon={ShieldOff} label="Off Duty" value={kpis.offDuty} isLoading={isLoading} gradient="from-slate-400 to-slate-500" />
        <KpiCard icon={AlertCircle} label="Open Incidents" value={kpis.openIncidents} isLoading={isLoading} gradient="from-crimecurb-red to-red-600" />
        <KpiCard icon={CalendarCheck2} label="Attendance Today" value={kpis.attendanceToday} isLoading={isLoading} gradient="from-sky-500 to-sky-600" suffix="%" />
      </div>

      {actionError && <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">{actionError}</p>}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or employee #"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-crimecurb-navy/20"
          />
        </div>
        <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          <option value="">All sites</option>
          {uniqueSites.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          <option value="ALL">All statuses</option>
          <option value="ON_DUTY">On Duty</option>
          <option value="OFF_DUTY">Off Duty</option>
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          <option value="name">Sort: Name</option>
          <option value="service">Sort: Years of Service</option>
          <option value="last_checkin">Sort: Last Check-in</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading guards...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filteredGuards.map((g) => (
              <GuardCard
                key={g.id}
                guard={g}
                isOnDuty={onDutyEmployees.has(g.id)}
                site={siteByEmployee[g.id]}
                shiftTime={shiftTimeByEmployee[g.id]}
                openIncidentsAtSite={openIncidentsAt(siteByEmployee[g.id])}
                onOpenProfile={setSelectedGuard}
                onOpenMap={setMapGuard}
                onSetStatus={handleSetStatus}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
          {filteredGuards.length === 0 && (
            <p className="text-slate-400 col-span-full text-center py-10">No guards match your filters.</p>
          )}
        </div>
      )}

      <GuardDrawer
        guard={selectedGuard}
        isOnDuty={selectedGuardMeta?.isOnDuty ?? false}
        site={selectedGuardMeta?.site}
        shiftTime={selectedGuardMeta?.shiftTime}
        openIncidentsAtSite={selectedGuardMeta?.openIncidentsAtSite ?? 0}
        attendancePercent={selectedGuardMeta?.attendancePercent ?? null}
        onClose={() => setSelectedGuard(null)}
        onSetStatus={handleSetStatus}
        onDelete={handleDelete}
      />

      <GuardLocationMap
        guard={mapGuard}
        site={mapGuard ? siteCoordsByName[siteByEmployee[mapGuard.id]] ?? null : null}
        lastKnownLocation={mapGuard ? lastKnownLocationFor(mapGuard.id) : null}
        onClose={() => setMapGuard(null)}
      />
    </div>
  );
}