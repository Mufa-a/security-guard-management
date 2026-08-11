import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getMyIncidents, createIncident } from '../../api/incidentsApi';
import { getMyShiftAssignments } from '../../api/shiftsApi';
import type { Incident } from '../../types/incidents';

const CATEGORIES = ['THEFT', 'TRESPASSING', 'VANDALISM', 'MEDICAL', 'FIRE', 'PROPERTY_DAMAGE', 'SUSPICIOUS_ACTIVITY', 'OTHER'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const SEVERITY_STRIP: Record<string, string> = {
  LOW: '#16A34A',
  MEDIUM: '#D97706',
  HIGH: '#EA580C',
  CRITICAL: '#C81E3A',
};

const SEVERITY_BADGE: Record<string, string> = {
  LOW: 'bg-green-50 text-green-700 border-green-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-50 text-[#C81E3A] border-red-200',
};

function labelize(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');
}

export default function MyIncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentShiftAssignment, setCurrentShiftAssignment] = useState<string | undefined>(undefined);
  const [form, setForm] = useState({
    category: 'OTHER', severity: 'LOW' as (typeof SEVERITIES)[number], title: '', description: '', occurred_at: '',
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  function load() {
    getMyIncidents().then(setIncidents).catch(() => setError('Failed to load incidents.'));
  }

  useEffect(() => {
    load();
    getMyShiftAssignments()
      .then((assignments) => {
        const today = new Date().toISOString().slice(0, 10);
        const activeShift = assignments.find((a) => a.shift_date === today);
        if (activeShift) setCurrentShiftAssignment(activeShift.id);
      })
      .catch(() => setError('Failed to load shift assignment.'));
  }, []);

  useEffect(() => {
    if (!showForm || coords) return;
    if (!navigator.geolocation) {
      setLocationError('Location not supported on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationError('Location unavailable — you can still submit without it.'),
    );
  }, [showForm, coords]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!currentShiftAssignment) {
        setError('You are not assigned to an active shift.');
        return;
      }
      await createIncident({
        ...form,
        shift_assignment: currentShiftAssignment,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      });
      setShowForm(false);
      setForm({ category: 'OTHER', severity: 'LOW', title: '', description: '', occurred_at: '' });
      setCoords(null);
      setLocationError(null);
      load();
    } catch {
      setError('Failed to report incident.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-[#F6F4EF] min-h-full -m-6 p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <p
            className="text-xs tracking-[0.2em] text-[#5B6472]"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            GUARD REPORTING
          </p>
          <h1 className="text-2xl font-bold text-[#0F1B3D]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            MY INCIDENTS
          </h1>
        </div>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="bg-[#0F1B3D] hover:bg-[#16224C] text-white text-sm font-semibold tracking-wide px-4 py-2 rounded-sm"
          style={{ fontFamily: "'Oswald', sans-serif" }}
        >
          {showForm ? 'CANCEL' : '+ REPORT INCIDENT'}
        </button>
      </div>

      {error && <p className="text-[#C81E3A] mb-4 text-sm">{error}</p>}

      {showForm && (
        <div className="relative bg-white shadow-sm mb-6 overflow-hidden rounded-sm">
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-300"
            style={{ backgroundColor: SEVERITY_STRIP[form.severity] }}
          />
          <div className="pl-7 pr-6 py-6">
            <div className="flex items-baseline justify-between mb-5 pb-4 border-b border-slate-200">
              <span
                className="text-xs tracking-[0.15em] text-[#5B6472]"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                NEW REPORT
              </span>
              <span
                className="text-xs text-slate-400"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                CASE-PENDING
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  className="block text-xs tracking-[0.1em] text-[#5B6472] mb-1.5"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  TITLE
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Brief summary of what happened"
                  className="w-full px-0 py-2 border-0 border-b border-slate-300 focus:border-[#0F1B3D] focus:outline-none focus:ring-0 text-slate-800 placeholder:text-slate-300"
                />
                <p
                  className="text-xs text-slate-400 mt-1.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {coords
                    ? `📍 ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                    : locationError ?? 'Getting location...'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label
                    className="block text-xs tracking-[0.1em] text-[#5B6472] mb-1.5"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    CATEGORY
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-0 py-2 border-0 border-b border-slate-300 focus:border-[#0F1B3D] focus:outline-none bg-transparent text-slate-800"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{labelize(c)}</option>)}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-xs tracking-[0.1em] text-[#5B6472] mb-1.5"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    SEVERITY
                  </label>
                  <div className="flex gap-1.5 pt-1">
                    {SEVERITIES.map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setForm({ ...form, severity: s })}
                        className={`flex-1 text-xs font-medium py-1.5 rounded-sm border transition-colors ${
                          form.severity === s
                            ? SEVERITY_BADGE[s]
                            : 'border-slate-200 text-slate-400 hover:border-slate-300'
                        }`}
                        style={{ fontFamily: "'Oswald', sans-serif" }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label
                  className="block text-xs tracking-[0.1em] text-[#5B6472] mb-1.5"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  WHEN DID THIS HAPPEN?
                </label>
                <input
                  type="datetime-local"
                  value={form.occurred_at}
                  onChange={(e) => setForm({ ...form, occurred_at: e.target.value })}
                  required
                  className="w-full px-0 py-2 border-0 border-b border-slate-300 focus:border-[#0F1B3D] focus:outline-none bg-transparent text-slate-800"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' }}
                />
              </div>

              <div>
                <label
                  className="block text-xs tracking-[0.1em] text-[#5B6472] mb-1.5"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  DESCRIPTION
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                  rows={4}
                  placeholder="What did you observe? Include relevant details."
                  className="w-full px-3 py-2.5 rounded-sm border border-slate-300 focus:border-[#0F1B3D] focus:outline-none focus:ring-1 focus:ring-[#0F1B3D] text-slate-800 placeholder:text-slate-300 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-[#C81E3A] hover:bg-[#a8172f] text-white text-sm font-semibold tracking-wide px-6 py-2.5 rounded-sm disabled:opacity-50 transition-colors"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                {isSubmitting ? 'SUBMITTING...' : 'SUBMIT REPORT'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {incidents.map((i) => (
          <Link
            key={i.id}
            to={`/incidents/${i.id}`}
            className="relative block bg-white shadow-sm rounded-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ backgroundColor: SEVERITY_STRIP[i.severity] ?? '#9CA3AF' }}
            />
            <div className="pl-5 pr-4 py-3.5">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <p className="font-medium text-[#0F1B3D]">{i.title}</p>
                <span
                  className="text-xs px-2 py-0.5 rounded-sm bg-slate-100 text-slate-600 self-start sm:self-auto tracking-wide"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  {labelize(i.status).toUpperCase()}
                </span>
              </div>
              <p
                className="text-xs text-[#5B6472] mt-0.5"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {labelize(i.category)} · {i.site_name}
              </p>
              <p className="text-sm text-slate-600 mt-1.5">{i.description}</p>
            </div>
          </Link>
        ))}
        {incidents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-sm">No incidents reported yet.</p>
            <p className="text-slate-300 text-xs mt-1">Reports you file will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}