import { useEffect, useState } from 'react';
import {
  listPendingActions,
  approvePendingAction,
  rejectPendingAction,
} from './eripApi';
import type { PendingAction } from './eripApi';

const ACTION_LABELS: Record<PendingAction['action_type'], string> = {
  ASSIGN_SHIFT: 'Shift assignment',
  SEND_INVOICE: 'Invoice draft',
  SEND_EMAIL: 'Email',
};

export default function PendingActionsPage() {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listPendingActions();
      setActions(data);
    } catch {
      setError("Couldn't load the approval queue. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await approvePendingAction(id);
      await load();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Approval failed. The action has been left pending — nothing was done.');
    } finally {
      setBusyId(null);
    }
  }

  function startReject(id: string) {
    setRejectingId(id);
    setRejectReason('');
  }

  async function confirmReject(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await rejectPendingAction(id, rejectReason);
      setRejectingId(null);
      await load();
    } catch {
      setError('Rejection failed. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading approval queue…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Erip approval queue</h1>
        <p className="mt-1 text-sm text-slate-500">
          Requests Erip has drafted on your behalf or a colleague's. Nothing here has happened
          yet — approving is what actually assigns, drafts, or sends it.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {actions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
          Nothing waiting on your approval right now.
        </div>
      ) : (
        <ul className="space-y-3">
          {actions.map((action) => (
            <li key={action.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="font-mono text-xs uppercase tracking-wide text-blue-800">
                    {ACTION_LABELS[action.action_type]}
                  </span>
                  <p className="mt-1 text-sm font-medium text-slate-800">{action.summary}</p>
                  <p className="mt-1 font-mono text-xs text-slate-400">
                    Requested by {action.requested_by_email ?? 'unknown'} ·{' '}
                    {new Date(action.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {rejectingId === action.id ? (
                <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmReject(action.id)}
                      disabled={busyId === action.id}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                    >
                      Confirm reject
                    </button>
                    <button
                      onClick={() => setRejectingId(null)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => handleApprove(action.id)}
                    disabled={busyId === action.id}
                    className="rounded-md bg-blue-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                  >
                    {busyId === action.id ? 'Approving…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => startReject(action.id)}
                    disabled={busyId === action.id}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}