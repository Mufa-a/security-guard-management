import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ShieldCheck } from 'lucide-react';
import { getEmployeeProfiles } from '../../api/staffApi';
import { getSiteAssignments } from '../../api/sitesApi';
import { getAttendanceRecords } from '../../api/attendanceApi';
import type { EmployeeProfile } from '../../types/staff';

export default function ActiveGuardsPage() {
  const [guards, setGuards] = useState<EmployeeProfile[]>([]);
  const [siteByEmployee, setSiteByEmployee] = useState<Record<string, string>>({});
  const [onDutyEmployees, setOnDutyEmployees] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);

    Promise.all([getEmployeeProfiles(), getSiteAssignments(), getAttendanceRecords()])
      .then(([profiles, assignments, attendance]) => {
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
        setSiteByEmployee(siteMap);

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
  }, []);

  if (isLoading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Active Guards</h1>
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <span className="text-sm text-slate-500">{guards.length} active</span>
          <Link
            to="/staff/new?role=GUARD"
            className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            + Add Guard
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {guards.map((g) => {
          const isOnDuty = onDutyEmployees.has(g.id);
          const site = siteByEmployee[g.id];
          return (
            <div
              key={g.id}
              className="bg-white rounded-tl-[32px] rounded-tr-2xl rounded-bl-2xl rounded-br-2xl shadow-sm border border-slate-100 p-5"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">
                    {g.user.first_name} {g.user.last_name}
                  </p>
                  <p className="text-xs text-slate-400">{g.employee_number}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 flex-shrink-0 ${
                    isOnDuty ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <ShieldCheck size={12} /> {isOnDuty ? 'On Duty' : 'Off Duty'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin size={14} className="flex-shrink-0" />
                <span className="truncate">{site ?? 'Not currently posted'}</span>
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