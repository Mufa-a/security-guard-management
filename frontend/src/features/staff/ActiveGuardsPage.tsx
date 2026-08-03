import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ShieldCheck, Clock, ShieldOff, MoreVertical, UserMinus, AlertTriangle, Trash2, Wallet } from 'lucide-react';
import { getEmployeeProfiles, updateEmployeeProfile, deleteEmployeeProfile } from '../../api/staffApi';
import { getSiteAssignments } from '../../api/sitesApi';
import { getAttendanceRecords } from '../../api/attendanceApi';
import { getShiftAssignments } from '../../api/shiftsApi';
import type { EmployeeProfile } from '../../types/staff';

export default function ActiveGuardsPage() {
  const [guards, setGuards] = useState<EmployeeProfile[]>([]);
  const [siteByEmployee, setSiteByEmployee] = useState<Record<string, string>>({});
  const [onDutyEmployees, setOnDutyEmployees] = useState<Set<string>>(new Set());
  const [shiftTimeByEmployee, setShiftTimeByEmployee] = useState<Record<string, { start: string; end: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function load() {
    const today = new Date().toISOString().slice(0, 10);
    setIsLoading(true);
    Promise.all([
      getEmployeeProfiles(),
      getSiteAssignments(),
      getAttendanceRecords(),
      getShiftAssignments(),
    ])
      .then(([profiles, assignments, attendance, shiftAssignments]) => {
        const activeGuards = profiles.filter(
          (p) => p.user.role === 'GUARD' && p.employment_status === 'ACTIVE'
        );
        setGuards(activeGuards);

        const siteMap: Record<string, string> = {};
        assignments
          .filter((a) => !a.end_date)
          .forEach((a) => {
            siteMap[a.employee] = a.site_name;
          });

        const shiftTimeMap: Record<string, { start: string; end: string }> = {};
        shiftAssignments
          .filter((sa) => sa.shift_date === today && sa.status !== 'CANCELLED')
          .forEach((sa) => {
            siteMap[sa.employee] = sa.site_name;
            shiftTimeMap[sa.employee] = { start: sa.shift_start_time, end: sa.shift_end_time };
          });
        setSiteByEmployee(siteMap);
        setShiftTimeByEmployee(shiftTimeMap);

        const onDuty = new Set<string>();
        attendance
          .filter((a) => a.shift_date === today && a.check_in_time && !a.check_out_time)
          .forEach((a) => {
            const guard = activeGuards.find((g) => g.user.email === a.employee_name);
            if (guard) onDuty.add(guard.id);
          });
        setOnDutyEmployees(onDuty);
      })
      .catch(() => setError('Failed to load active guards.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSetStatus(id: string, status: string) {
    setActionError(null);
    setOpenMenuId(null);
    try {
      await updateEmployeeProfile(id, { employment_status: status });
      load();
    } catch {
      setActionError('Failed to update status.');
    }
  }

  async function handleDelete(id: string, name: string) {
    setOpenMenuId(null);
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    setActionError(null);
    try {
      await deleteEmployeeProfile(id);
      load();
    } catch {
      setActionError('Failed to delete guard.');
    }
  }

  if (isLoading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Active Guards</h1>
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <span className="text-sm text-slate-500">{guards.length} active</span>
          <Link to="/active-guards/inactive" className="text-slate-500 hover:text-slate-700 text-sm">
            View Inactive
          </Link>
          <Link
            to="/staff/new?role=GUARD"
            className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            + Add Guard
          </Link>
        </div>
      </div>

      {actionError && (
        <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">{actionError}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {guards.map((g) => {
          const isOnDuty = onDutyEmployees.has(g.id);
          const site = siteByEmployee[g.id];
          const shiftTime = shiftTimeByEmployee[g.id];
          const initials = `${g.user.first_name?.[0] ?? ''}${g.user.last_name?.[0] ?? ''}`.toUpperCase();
          const fullName = `${g.user.first_name} ${g.user.last_name}`;

          return (
            <div
              key={g.id}
              className="relative bg-white rounded-tl-[32px] rounded-tr-2xl rounded-bl-2xl rounded-br-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow"
              style={{ zIndex: openMenuId === g.id ? 20 : 'auto' }}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-[inherit] ${isOnDuty ? 'bg-emerald-500' : 'bg-slate-300'}`} />

              <div className="p-5 pl-6 overflow-hidden rounded-[inherit]">
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center font-display font-bold text-sm shrink-0 ${
                      isOnDuty ? 'bg-emerald-500/10 text-emerald-700' : 'bg-crimecurb-navy/5 text-crimecurb-navy'
                    }`}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-slate-800 truncate">{fullName}</p>
                    <p className="text-xs font-mono text-slate-400 tracking-wide">{g.employee_number}</p>
                  </div>
                  <span
                    className={`flex items-center gap-1 text-[10px] font-mono font-semibold uppercase tracking-widest px-2 py-1 rounded-full shrink-0 ${
                      isOnDuty ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isOnDuty ? <ShieldCheck size={11} /> : <ShieldOff size={11} />}
                    {isOnDuty ? 'On Duty' : 'Off Duty'}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin size={14} className="text-crimecurb-red shrink-0" />
                    <span className="truncate">{site ?? 'Not currently posted'}</span>
                  </div>
                  {shiftTime && (
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <Clock size={12} className="shrink-0" />
                      <span>{shiftTime.start}–{shiftTime.end}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Menu trigger + dropdown live outside the clipped content area */}
              <div className="absolute top-5 right-5" ref={openMenuId === g.id ? menuRef : undefined}>
                <button
                  onClick={() => setOpenMenuId(openMenuId === g.id ? null : g.id)}
                  className="text-slate-300 hover:text-slate-600 p-1 transition-colors"
                  aria-label="More actions"
                >
                  <MoreVertical size={16} />
                </button>
                {openMenuId === g.id && (
                  <div className="absolute right-0 top-7 z-30 bg-white rounded-lg shadow-lg border border-slate-200 py-1 w-44">
                    <Link
                      to={`/staff/${g.id}/salary`}
                      onClick={() => setOpenMenuId(null)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <Wallet size={14} /> Manage Salary
                    </Link>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={() => handleSetStatus(g.id, 'ON_LEAVE')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <UserMinus size={14} /> Set On Leave
                    </button>
                    <button
                      onClick={() => handleSetStatus(g.id, 'SUSPENDED')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 text-left"
                    >
                      <AlertTriangle size={14} /> Suspend
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={() => handleDelete(g.id, fullName)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {guards.length === 0 && (
          <p className="text-slate-400 col-span-full text-center py-6">No active guards found.</p>
        )}
      </div>
    </div>
  );
}