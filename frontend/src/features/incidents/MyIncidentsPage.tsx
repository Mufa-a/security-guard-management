import { useEffect, useState, FormEvent } from 'react';
import { getMyIncidents, createIncident } from '../../api/incidentsApi';
import type { Incident } from '../../types/incidents';

const CATEGORIES = ['THEFT', 'TRESPASSING', 'VANDALISM', 'MEDICAL', 'FIRE', 'PROPERTY_DAMAGE', 'SUSPICIOUS_ACTIVITY', 'OTHER'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function MyIncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: 'OTHER', severity: 'LOW', title: '', description: '', occurred_at: '',
  });

  function load() {
    getMyIncidents().then(setIncidents).catch(() => setError('Failed to load incidents.'));
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createIncident(form);
      setShowForm(false);
      setForm({ category: 'OTHER', severity: 'LOW', title: '', description: '', occurred_at: '' });
      load();
    } catch {
      setError('Failed to report incident.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">My Incidents</h1>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded"
        >
          {showForm ? 'Cancel' : '+ Report Incident'}
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4 mb-6">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 rounded border border-slate-300"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">Severity</label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="w-full px-3 py-2 rounded border border-slate-300"
              >
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">When did this happen?</label>
            <input
              type="datetime-local"
              value={form.occurred_at}
              onChange={(e) => setForm({ ...form, occurred_at: e.target.value })}
              required
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              rows={3}
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-blue-900 hover:bg-blue-800 text-white font-semibold px-5 py-2 rounded disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {incidents.map((i) => (
          <div key={i.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <p className="font-medium text-slate-800">{i.title}</p>
              <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 self-start sm:self-auto">{i.status}</span>
            </div>
            <p className="text-sm text-slate-500">{i.category} · {i.severity} · {i.site_name}</p>
            <p className="text-sm text-slate-600 mt-1">{i.description}</p>
          </div>
        ))}
        {incidents.length === 0 && <p className="text-slate-400">You haven't reported any incidents.</p>}
      </div>
    </div>
  );
}