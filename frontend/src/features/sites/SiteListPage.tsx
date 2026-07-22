import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { getSites, deleteSite } from '../../api/sitesApi';
import { useAuth } from '../auth/AuthContext';
import type { Site } from '../../types/sites';

export default function SiteListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    getSites()
      .then(setSites)
      .catch(() => setError('Failed to load sites.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete site "${name}"? This cannot be undone.`)) return;
    try {
      await deleteSite(id);
      load();
    } catch {
      setError('Failed to delete site. It may have linked shifts or assignments.');
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Sites</h1>
        <Link
          to="/sites/new"
          className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded transition-colors inline-block text-center"
        >
          + Add Site
        </Link>
      </div>

      {isLoading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {!isLoading && !error && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Site Name</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Site Manager Contact</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 text-slate-500">{s.client_name}</td>
                  <td className="px-4 py-3 text-slate-500">{s.address}</td>
                  <td className="px-4 py-3 text-slate-500">{s.site_manager_contact || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end items-center gap-3">
                      <Link to={`/sites/${s.id}`} className="text-blue-700 hover:underline flex items-center gap-1">
                        <Pencil size={14} /> Edit
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
                          className="text-red-600 hover:text-red-800 flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {sites.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No sites yet.
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