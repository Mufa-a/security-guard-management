import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { getSites, deleteSite } from '../../api/sitesApi';
import { useAuth } from '../auth/AuthContext';
import type { Site } from '../../types/sites';

export default function SiteListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    getSites()
      .then(setSites)
      .catch(() => setError('Failed to load sites.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Sites</h1>
          <p className="text-sm text-slate-500 mt-0.5">Client locations covered by your guards.</p>
        </div>
        {canCreate && (
          <Link
            to="/sites/new"
            className="inline-flex items-center justify-center gap-1.5 bg-crimecurb-navy hover:bg-crimecurb-navy/90 text-white text-sm font-medium px-4 py-2.5 rounded-md transition-colors"
          >
            <Plus size={16} /> Add site
          </Link>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading\u2026</p>}
      {error && (
        <p className="bg-red-50 text-red-700 text-sm rounded-md p-3 border border-red-200 mb-4">{error}</p>
      )}

      {!isLoading && !error && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Site name</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Address</th>
                  <th className="px-5 py-3">Site manager contact</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sites.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{s.name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{s.client_name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{s.address}</td>
                    <td className="px-5 py-3.5 text-slate-600">{s.site_manager_contact || '\u2014'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end items-center gap-4">
                        <Link
                          to={`/sites/${s.id}`}
                          className="text-crimecurb-navy hover:text-crimecurb-navy/80 font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <Pencil size={14} /> Edit
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1.5 transition-colors"
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
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                      No sites yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}