import { useEffect, useState } from 'react';
import { getMyIncidents, updateIncidentStatus } from '../../api/incidentsApi';
import type { Incident } from '../../types/incidents';

const STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'];

const SEVERITY_STYLES: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export default function IncidentManagementPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function load() {
    getMyIncidents().then(setIncidents).catch(() => setError('Failed to load incidents.')).finally(() => setIsLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleStatusChange(id: string, status: string) {
    try {
      await updateIncidentStatus(id, status);
      load();
    } catch {
      setError('Failed to update status.');
    } finally {
      setEditingId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Incidents</h1>
      {isLoading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {!isLoading && !error && (
        <div className="space-y-3">
          {incidents.map((i) => (
            <div key={i.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{i.title}</p>
                  <p className="text-sm text-slate-500">{i.site_name} · Reported by {i.reported_by_name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium self-start ${SEVERITY_STYLES[i.severity] ?? 'bg-slate-100 text-slate-600'}`}>
                  {i.severity}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-2">{i.description}</p>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3">
                <span className="text-xs text-slate-400">{i.category} · {new Date(i.occurred_at).toLocaleString()}</span>
                {editingId === i.id ? (
                  <select
                    autoFocus
                    defaultValue={i.status}
                    onChange={(e) => handleStatusChange(i.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                    className="px-2 py-1 rounded border border-slate-300 text-xs self-start sm:self-auto"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <button
                    onClick={() => setEditingId(i.id)}
                    className="px-2 py-1 rounded bg-slate-100 text-xs hover:bg-slate-200 self-start sm:self-auto"
                  >
                    {i.status}
                  </button>
                )}
              </div>
            </div>
          ))}
          {incidents.length === 0 && <p className="text-slate-400">No incidents reported yet.</p>}
        </div>
      )}
    </div>
  );
}