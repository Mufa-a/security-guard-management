import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, User, Clock, Paperclip, MessageSquare, ChevronRight } from 'lucide-react';
import { getMyIncidents, updateIncidentStatus } from '../../api/incidentsApi';
import type { Incident } from '../../types/incidents';

const STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'];

const SEVERITY_STRIP: Record<string, string> = {
  LOW: '#16A34A',
  MEDIUM: '#D97706',
  HIGH: '#EA580C',
  CRITICAL: '#C81E3A',
};

const SEVERITY_BADGE: Record<string, string> = {
  LOW: 'bg-green-50 text-green-700',
  MEDIUM: 'bg-amber-50 text-amber-700',
  HIGH: 'bg-orange-50 text-orange-700',
  CRITICAL: 'bg-red-50 text-[#C81E3A]',
};

function labelize(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

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
    <div className="bg-[#F6F4EF] min-h-full -m-6 p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <p className="text-xs tracking-[0.2em] text-[#5B6472]" style={{ fontFamily: "'Oswald', sans-serif" }}>
        SUPERVISOR VIEW
      </p>
      <h1 className="text-2xl font-bold text-[#0F1B3D] mb-6" style={{ fontFamily: "'Oswald', sans-serif" }}>
        INCIDENTS
      </h1>

      {isLoading && <p className="text-slate-500 text-sm">Loading...</p>}
      {error && <p className="text-[#C81E3A] mb-4 text-sm">{error}</p>}

      {!isLoading && !error && (
        <div className="space-y-3">
          {incidents.map((i) => (
            <div key={i.id} className="relative bg-white shadow-sm rounded-sm overflow-hidden">
              <div
                className="absolute left-0 top-0 bottom-0 w-1.5"
                style={{ backgroundColor: SEVERITY_STRIP[i.severity] ?? '#9CA3AF' }}
              />
              <div className="pl-6 pr-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[#0F1B3D]">{i.title}</p>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-sm tracking-wide ${SEVERITY_BADGE[i.severity] ?? 'bg-slate-100 text-slate-600'}`}
                        style={{ fontFamily: "'Oswald', sans-serif" }}
                      >
                        {i.severity}
                      </span>
                    </div>
                    <p
                      className="text-xs text-slate-400 mt-1"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {i.incident_number}
                    </p>
                  </div>

                  {editingId === i.id ? (
                    <select
                      autoFocus
                      defaultValue={i.status}
                      onChange={(e) => handleStatusChange(i.id, e.target.value)}
                      onBlur={() => setEditingId(null)}
                      className="px-2 py-1 rounded-sm border border-slate-300 text-xs self-start"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingId(i.id)}
                      className="text-xs font-medium px-2.5 py-1 rounded-sm bg-slate-100 text-slate-700 hover:bg-slate-200 self-start tracking-wide"
                      style={{ fontFamily: "'Oswald', sans-serif" }}
                    >
                      {labelize(i.status).toUpperCase()}
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-[#5B6472]">
                  <span className="flex items-center gap-1"><MapPin size={13} /> {i.site_name}</span>
                  <span className="flex items-center gap-1"><User size={13} /> {i.reported_by_name}</span>
                  <span className="flex items-center gap-1"><Clock size={13} /> {timeAgo(i.occurred_at)}</span>
                  {i.assigned_to_name && (
                    <span className="text-slate-400">Assigned to {i.assigned_to_name}</span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Paperclip size={13} /> Evidence ({i.attachments.length})
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={13} />
                      Comments ({i.activities.filter((a) => a.activity_type === 'COMMENT').length})
                    </span>
                  </div>
                  <Link
                    to={`/incidents/${i.id}`}
                    className="flex items-center gap-1 text-xs font-semibold text-[#0F1B3D] hover:text-[#C81E3A]"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    VIEW DETAILS <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {incidents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400 text-sm">No incidents reported yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}