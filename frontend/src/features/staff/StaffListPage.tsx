import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { getEmployeeProfiles, deleteEmployeeProfile } from '../../api/staffApi';
import { useAuth } from '../auth/AuthContext';
import type { EmployeeProfile } from '../../types/staff';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  ON_LEAVE: 'bg-yellow-100 text-yellow-700',
  SUSPENDED: 'bg-orange-100 text-orange-700',
  TERMINATED: 'bg-red-100 text-red-700',
};

type StaffTab = 'GUARDS' | 'MANAGEMENT';

export default function StaffListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [profiles, setProfiles] = useState<EmployeeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StaffTab>('GUARDS');

  function load() {
    getEmployeeProfiles()
      .then((data) => setProfiles(data.filter((p) => p.user.role !== 'GUARD')))
      .catch(() => setError('Failed to load staff records.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete employee record for ${name}? This cannot be undone.`)) return;
    try {
      await deleteEmployeeProfile(id);
      load();
    } catch {
      setError('Failed to delete employee record.');
    }
  }

  const guards = profiles.filter((p) => p.user.role === 'GUARD');
  const management = profiles.filter((p) => p.user.role !== 'GUARD');
  const visibleProfiles = activeTab === 'GUARDS' ? guards : management;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Staff</h1>
        <Link
          to="/staff/new"
          className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded transition-colors inline-block text-center"
        >
          + Add Employee
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('GUARDS')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'GUARDS' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Guards ({guards.length})
        </button>
        <button
          onClick={() => setActiveTab('MANAGEMENT')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'MANAGEMENT' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Management ({management.length})
        </button>
      </div>

      {isLoading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {!isLoading && !error && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Employee #</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                {activeTab === 'MANAGEMENT' && <th className="px-4 py-3">Role</th>}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date Employed</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visibleProfiles.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.employee_number}</td>
                  <td className="px-4 py-3">
                    {p.user.first_name} {p.user.last_name}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.user.email}</td>
                  {activeTab === 'MANAGEMENT' && (
                    <td className="px-4 py-3 text-slate-500">{p.user.role}</td>
                  )}
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        STATUS_STYLES[p.employment_status] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.employment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.date_employed}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end items-center gap-3">
                      <Link
                        to={`/staff/${p.id}`}
                        className="text-blue-700 hover:underline flex items-center gap-1"
                      >
                        <Pencil size={14} /> Edit
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(p.id, `${p.user.first_name} ${p.user.last_name}`)}
                          className="text-red-600 hover:text-red-800 flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleProfiles.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'MANAGEMENT' ? 7 : 6} className="px-4 py-6 text-center text-slate-400">
                    No {activeTab === 'GUARDS' ? 'guards' : 'management staff'} yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}