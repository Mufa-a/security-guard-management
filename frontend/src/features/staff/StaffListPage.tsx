import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Search, RefreshCw, Users, ShieldCheck, UserCog, Award } from 'lucide-react';
import { getEmployeeProfiles, updateEmployeeProfile, deleteEmployeeProfile } from '../../api/staffApi';
import type { EmployeeProfile } from '../../types/staff';
import KpiCard from './KpiCard';
import StaffCard from './StaffCard';
import StaffDrawer from './StaffDrawer';

type SortKey = 'name' | 'role' | 'tenure';

export default function StaffListPage() {
  const [staff, setStaff] = useState<EmployeeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [selectedStaff, setSelectedStaff] = useState<EmployeeProfile | null>(null);

  function load() {
    setIsLoading(true);
    getEmployeeProfiles()
      .then((profiles) => {
        const activeStaff = profiles.filter((p) => p.user.role !== 'GUARD' && p.employment_status === 'ACTIVE');
        setStaff(activeStaff);
      })
      .catch(() => setError('Failed to load staff records.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleSetStatus(id: string, status: string) {
    setActionError(null);
    try {
      await updateEmployeeProfile(id, { employment_status: status });
      setSelectedStaff(null);
      load();
    } catch {
      setActionError('Failed to update status.');
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete employee record for ${name}? This cannot be undone.`)) return;
    setActionError(null);
    try {
      await deleteEmployeeProfile(id);
      setSelectedStaff(null);
      load();
    } catch {
      setActionError('Failed to delete employee record.');
    }
  }

  const filteredStaff = useMemo(() => {
    let list = staff.filter((s) => {
      const fullName = `${s.user.first_name} ${s.user.last_name}`.toLowerCase();
      const matchesSearch =
        !search ||
        fullName.includes(search.toLowerCase()) ||
        s.employee_number?.toLowerCase().includes(search.toLowerCase()) ||
        s.user.email?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = !roleFilter || s.user.role === roleFilter;
      return matchesSearch && matchesRole;
    });

    list = [...list].sort((a, b) => {
      if (sortKey === 'name') {
        return `${a.user.first_name} ${a.user.last_name}`.localeCompare(`${b.user.first_name} ${b.user.last_name}`);
      }
      if (sortKey === 'role') {
        return a.user.role.localeCompare(b.user.role);
      }
      // tenure — most senior first
      return new Date(a.date_employed).getTime() - new Date(b.date_employed).getTime();
    });

    return list;
  }, [staff, search, roleFilter, sortKey]);

  const kpis = useMemo(() => ({
    total: staff.length,
    admins: staff.filter((s) => s.user.role === 'ADMIN').length,
    managers: staff.filter((s) => s.user.role === 'MANAGER').length,
    supervisors: staff.filter((s) => s.user.role === 'SUPERVISOR').length,
  }), [staff]);

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Staff</h1>
          <p className="text-sm text-slate-400 mt-0.5">Admins, managers, and supervisors on active duty.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg border border-slate-200">
            <RefreshCw size={14} /> Refresh
          </button>
          <Link to="/staff/inactive" className="text-slate-500 hover:text-slate-700 text-sm px-2">View Inactive</Link>
          <Link to="/staff/new" className="bg-crimecurb-navy hover:bg-crimecurb-navy/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Add Employee
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={Users} label="Active Staff" value={kpis.total} isLoading={isLoading} gradient="from-crimecurb-navy to-slate-700" />
        <KpiCard icon={ShieldCheck} label="Admins" value={kpis.admins} isLoading={isLoading} gradient="from-crimecurb-red to-red-600" />
        <KpiCard icon={UserCog} label="Managers" value={kpis.managers} isLoading={isLoading} gradient="from-crimecurb-navy to-slate-700" />
        <KpiCard icon={Award} label="Supervisors" value={kpis.supervisors} isLoading={isLoading} gradient="from-sky-500 to-sky-600" />
      </div>

      {actionError && <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">{actionError}</p>}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, employee # or email"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-crimecurb-navy/20"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          <option value="">All roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="SUPERVISOR">Supervisor</option>
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          <option value="name">Sort: Name</option>
          <option value="role">Sort: Role</option>
          <option value="tenure">Sort: Years of Service</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading staff...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filteredStaff.map((s) => (
              <StaffCard key={s.id} staff={s} onOpenProfile={setSelectedStaff} />
            ))}
          </AnimatePresence>
          {filteredStaff.length === 0 && (
            <p className="text-slate-400 col-span-full text-center py-10">No staff match your filters.</p>
          )}
        </div>
      )}

      <StaffDrawer
        staff={selectedStaff}
        onClose={() => setSelectedStaff(null)}
        onSetStatus={handleSetStatus}
        onDelete={handleDelete}
      />
    </div>
  );
}