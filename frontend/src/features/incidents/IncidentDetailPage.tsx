import { useEffect, useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import {
  getIncident, addComment, uploadAttachment, updateIncidentStatus,
  addWitness, addPersonInvolved, downloadAttachment,
} from '../../api/incidentsApi';
import type { Incident } from '../../types/incidents';
import { useAuth } from '../auth/AuthContext';

const STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'];
const PERSON_ROLES = ['VICTIM', 'SUSPECT', 'REPORTING_GUARD', 'RESPONDING_OFFICER', 'SUPERVISOR', 'OTHER'];

const SEVERITY_STYLES: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const ACTIVITY_LABELS: Record<string, string> = {
  CREATED: 'Reported',
  STATUS_CHANGED: 'Status changed',
  ASSIGNED: 'Assigned',
  COMMENT: 'Comment',
  EVIDENCE_ADDED: 'Evidence added',
};

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canChangeStatus = user?.role !== 'GUARD';
  const [incident, setIncident] = useState<Incident | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [showWitnessForm, setShowWitnessForm] = useState(false);
  const [witnessForm, setWitnessForm] = useState({ name: '', phone: '', statement: '' });
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [personForm, setPersonForm] = useState({ role: 'OTHER', name: '', notes: '' });

  function load() {
    if (!id) return;
    getIncident(id).then(setIncident).catch(() => setError('Failed to load incident.'));
  }

  useEffect(load, [id]);

  async function handleCommentSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id || !commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      await addComment(id, commentText.trim());
      setCommentText('');
      load();
    } catch {
      setError('Failed to add comment.');
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (!id || !e.target.files?.length) return;
    setIsUploading(true);
    try {
      await uploadAttachment(id, e.target.files[0]);
      load();
    } catch {
      setError('Failed to upload file.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }

  async function handleStatusChange(status: string) {
    if (!id) return;
    try {
      await updateIncidentStatus(id, status);
      load();
    } catch {
      setError('Failed to update status.');
    }
  }

  async function handleWitnessSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    try {
      await addWitness(id, witnessForm.name, witnessForm.phone, witnessForm.statement);
      setWitnessForm({ name: '', phone: '', statement: '' });
      setShowWitnessForm(false);
      load();
    } catch {
      setError('Failed to add witness.');
    }
  }

  async function handlePersonSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    try {
      await addPersonInvolved(id, personForm.role, personForm.name, personForm.notes);
      setPersonForm({ role: 'OTHER', name: '', notes: '' });
      setShowPersonForm(false);
      load();
    } catch {
      setError('Failed to add person.');
    }
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!incident) return <p className="text-slate-500">Loading...</p>;

  const timeline = [...incident.activities].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
          <div>
            <p className="text-xs text-slate-400 font-mono">{incident.incident_number}</p>
            <h1 className="text-xl font-bold text-slate-800">{incident.title}</h1>
            <p className="text-sm text-slate-500">
              {incident.site_name} · Reported by {incident.reported_by_name}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded font-medium ${SEVERITY_STYLES[incident.severity] ?? 'bg-slate-100 text-slate-600'}`}>
            {incident.severity}
          </span>
        </div>

        <p className="text-sm text-slate-600 mt-4">{incident.description}</p>

        <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-slate-400">
          <span>{incident.category}</span>
          <span>·</span>
          <span>{new Date(incident.occurred_at).toLocaleString()}</span>
          {incident.assigned_to_name && (
            <>
              <span>·</span>
              <span>Assigned to {incident.assigned_to_name}</span>
            </>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-xs text-slate-500 mb-1">Status</label>
          {canChangeStatus ? (
            <select
              value={incident.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-2 py-1 rounded border border-slate-300 text-sm"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-600 text-sm">
              {incident.status}
            </span>
          )}
        </div>
      </div>

      {incident.latitude && incident.longitude && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-slate-800 mb-2">Location</h2>
          <a
            href={`https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-900 hover:underline"
          >
            📍 View on Google Maps ({Number(incident.latitude).toFixed(5)}, {Number(incident.longitude).toFixed(5)})
          </a>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">Evidence ({incident.attachments.length})</h2>
          <label className="text-sm text-blue-900 cursor-pointer hover:underline">
            {isUploading ? 'Uploading...' : '+ Upload file'}
            <input type="file" className="hidden" onChange={handleFileChange} disabled={isUploading} />
          </label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {incident.attachments.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => downloadAttachment(a.id, a.file.split('/').pop())}
              className="block bg-slate-50 rounded p-2 text-xs text-slate-600 hover:bg-slate-100 truncate text-left"
            >
              {a.description || a.file.split('/').pop()}
            </button>
          ))}
          {incident.attachments.length === 0 && (
            <p className="text-slate-400 text-sm col-span-full">No evidence uploaded yet.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">Witnesses ({incident.witnesses.length})</h2>
          <button onClick={() => setShowWitnessForm((v) => !v)} className="text-sm text-blue-900 hover:underline">
            {showWitnessForm ? 'Cancel' : '+ Add witness'}
          </button>
        </div>
        {showWitnessForm && (
          <form onSubmit={handleWitnessSubmit} className="space-y-2 mb-4 bg-slate-50 p-3 rounded">
            <input
              value={witnessForm.name}
              onChange={(e) => setWitnessForm({ ...witnessForm, name: e.target.value })}
              placeholder="Name"
              required
              className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm"
            />
            <input
              value={witnessForm.phone}
              onChange={(e) => setWitnessForm({ ...witnessForm, phone: e.target.value })}
              placeholder="Phone (optional)"
              className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm"
            />
            <textarea
              value={witnessForm.statement}
              onChange={(e) => setWitnessForm({ ...witnessForm, statement: e.target.value })}
              placeholder="Statement (optional)"
              rows={2}
              className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm"
            />
            <button type="submit" className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-medium px-3 py-1.5 rounded">
              Save witness
            </button>
          </form>
        )}
        <div className="space-y-2">
          {incident.witnesses.map((w) => (
            <div key={w.id} className="text-sm border-b border-slate-100 pb-2 last:border-0">
              <p className="font-medium text-slate-700">
                {w.name} {w.phone && <span className="text-slate-400">· {w.phone}</span>}
              </p>
              {w.statement && <p className="text-slate-600 mt-0.5">{w.statement}</p>}
            </div>
          ))}
          {incident.witnesses.length === 0 && <p className="text-slate-400 text-sm">No witnesses recorded.</p>}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">People Involved ({incident.people_involved.length})</h2>
          <button onClick={() => setShowPersonForm((v) => !v)} className="text-sm text-blue-900 hover:underline">
            {showPersonForm ? 'Cancel' : '+ Add person'}
          </button>
        </div>
        {showPersonForm && (
          <form onSubmit={handlePersonSubmit} className="space-y-2 mb-4 bg-slate-50 p-3 rounded">
            <select
              value={personForm.role}
              onChange={(e) => setPersonForm({ ...personForm, role: e.target.value })}
              className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm"
            >
              {PERSON_ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
            <input
              value={personForm.name}
              onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })}
              placeholder="Name"
              required
              className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm"
            />
            <textarea
              value={personForm.notes}
              onChange={(e) => setPersonForm({ ...personForm, notes: e.target.value })}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm"
            />
            <button type="submit" className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-medium px-3 py-1.5 rounded">
              Save person
            </button>
          </form>
        )}
        <div className="space-y-2">
          {incident.people_involved.map((p) => (
            <div key={p.id} className="text-sm border-b border-slate-100 pb-2 last:border-0">
              <p className="font-medium text-slate-700">
                {p.name} <span className="text-slate-400">· {p.role.replace('_', ' ')}</span>
              </p>
              {p.notes && <p className="text-slate-600 mt-0.5">{p.notes}</p>}
            </div>
          ))}
          {incident.people_involved.length === 0 && <p className="text-slate-400 text-sm">No people recorded.</p>}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Timeline</h2>
        <div className="space-y-3">
          {timeline.map((a) => (
            <div key={a.id} className="flex gap-3 text-sm">
              <span className="text-xs text-slate-400 w-16 shrink-0 pt-0.5">
                {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div>
                <span className="font-medium text-slate-700">{ACTIVITY_LABELS[a.activity_type] ?? a.activity_type}</span>
                {a.actor_name && <span className="text-slate-500"> · {a.actor_name}</span>}
                {a.note && <p className="text-slate-600 mt-0.5">{a.note}</p>}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleCommentSubmit} className="flex gap-2 mt-4">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2 rounded border border-slate-300 text-sm"
          />
          <button
            type="submit"
            disabled={isSubmittingComment || !commentText.trim()}
            className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
}