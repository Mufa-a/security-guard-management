import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldOff, RotateCcw } from 'lucide-react';
import { getEmployeeProfiles, updateEmployeeProfile } from '../../api/staffApi';
import type { EmployeeProfile } from '../../types/staff';

const STATUS_STYLES: Record<string, string> = {
  ON_LEAVE: 'bg-amber-50 text-amber-700',
  SUSPENDED: 'bg-orange-50 text-orange-700',
  TERMINATED: 'bg-red-50 text-red-700',
};

export default function InactiveGuardsPage() {
  const [guards, setGuards] = useState<EmployeeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    getEmployeeProfiles()
      .then((profiles) => {
        const inactiveGuards = profiles.filter(
          (p) => p.user.role === 'GUARD' && p.employment_status !== 'ACTIVE'
        );
        setGuards(inactiveGuards);
      })
      .catch(() => setError('Failed to load guards.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleReactivate(id: string) {
    setActionError(null);
    try {
      await updateEmployeeProfile(id, { employment_status: 'ACTIVE' });
      load();
    } catch {
      setActionError('Failed to reactivate guard.');
    }
  }

  if (isLoading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inactive Guards</h1>
          <p className="text-sm text-slate-400 mt-0.5">Guards on leave, suspended, or terminated.</p>
        </div>
        <Link to="/active-guards" className="text-blue-700 hover:underline text-sm">
          &larr; Back to Active Guards
        </Link>
      </div>

      {actionError && (
        <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">{actionError}</p>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Employee #</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {guards.map((g) => (
              <tr key={g.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{g.employee_number}</td>
                <td className="px-4 py-3">{g.user.first_name} {g.user.last_name}</td>
                <td className="px-4 py-3 text-slate-500">{g.user.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[g.employment_status] ?? 'bg-slate-100 text-slate-600'}`}>
                    <ShieldOff size={11} /> {g.employment_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {g.employment_status !== 'TERMINATED' && (
                    <button
                      onClick={() => handleReactivate(g.id)}
                      className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 ml-auto text-sm font-medium"
                    >
                      <RotateCcw size={14} /> Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {guards.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No inactive guards.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}