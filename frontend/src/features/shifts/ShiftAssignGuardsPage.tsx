import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  getShift, getShiftAssignments, createShiftAssignment, deleteShiftAssignment,
  suggestGuards, ShiftConflictError,
} from '../../api/shiftsApi';
import type { ShiftAssignment, Shift } from '../../types/shifts';
import type { SuggestedGuard, HourWarning } from '../../api/shiftsApi';

export default function ShiftAssignGuardsPage() {
  const { id } = useParams();
  const [shift, setShift] = useState<Shift | null>(null);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedGuard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<{ employeeName: string; details: HourWarning } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const loadAssignments = useCallback((shiftId: string) => {
    getShiftAssignments()
      .then((all) => setAssignments(all.filter((a) => a.shift === shiftId)))
      .catch(() => setError('Failed to load assignments.'));
  }, []);

  const loadSuggestions = useCallback((shiftId: string) => {
    suggestGuards(shiftId)
      .then(setSuggestions)
      .catch(() => setError('Failed to load suggested guards.'));
  }, []);

  useEffect(() => {
    if (!id) return;
    getShift(id)
      .then(setShift)
      .catch(() => setError('Failed to load shift data.'))
      .finally(() => setIsLoading(false));
    loadAssignments(id);
    loadSuggestions(id);
  }, [id, loadAssignments, loadSuggestions]);

  async function assignEmployee(employeeId: string, employeeName: string) {
    if (!id) return;
    setError(null);
    setWarning(null);
    setAssigningId(employeeId);
    try {
      const result = await createShiftAssignment({ shift: id, employee: employeeId });
      if (result.hourWarning) {
        setWarning({ employeeName, details: result.hourWarning });
      }
      loadAssignments(id);
      loadSuggestions(id);
    } catch (err) {
      if (err instanceof ShiftConflictError) {
        setError(`${employeeName}: ${err.message}`);
      } else {
        setError('Failed to assign guard. They may already be assigned.');
      }
    } finally {
      setAssigningId(null);
    }
  }

  async function handleRemove(assignmentId: string) {
    if (!id) return;
    try {
      await deleteShiftAssignment(assignmentId);
      loadAssignments(id);
      loadSuggestions(id);
    } catch {
      setError('Failed to remove assignment.');
    }
  }

  if (isLoading) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to={`/shifts/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={14} /> Back to Shift Details
      </Link>

      <h1 className="text-2xl font-bold text-slate-800 mb-1">Assign Guards</h1>
      {shift && (
        <p className="text-sm text-slate-500 mb-6">
          {shift.site_name} — {shift.date} ({shift.shift_type}), {shift.start_time}–{shift.end_time}
        </p>
      )}

      {error && <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">{error}</p>}

      {warning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded p-3 mb-4">
          <p className="font-medium">{warning.employeeName} was assigned, but this puts them over an hour cap:</p>
          <ul className="mt-1 list-disc list-inside">
            {warning.details.exceeds_daily_cap && (
              <li>{warning.details.daily_hours}h scheduled today (cap: {warning.details.daily_cap}h)</li>
            )}
            {warning.details.exceeds_weekly_cap && (
              <li>{warning.details.weekly_hours}h scheduled this week (cap: {warning.details.weekly_cap}h)</li>
            )}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold text-slate-800 mb-1">Available guards</h2>
        <p className="text-xs text-slate-400 mb-3">
          Ranked by availability for this site — conflict-free candidates first.
        </p>
        <div className="space-y-2">
          {suggestions.map((s) => (
            <div
              key={s.employee_id}
              className={`flex items-center justify-between text-sm border rounded p-3 ${
                s.has_conflict ? 'border-red-200 bg-red-50' : s.available ? 'border-slate-200' : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-700">{s.employee_name}</p>
                  {s.available && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                      Available
                    </span>
                  )}
                  {!s.posted_to_site && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      Not posted to this site
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{s.current_weekly_hours}h scheduled this week</p>
                {s.has_conflict && (
                  <p className="text-xs text-red-600 mt-0.5">
                    Conflict: {s.conflicting_shifts.map((c) => `${c.site} on ${c.date}`).join(', ')}
                  </p>
                )}
                {(s.exceeds_daily_cap || s.exceeds_weekly_cap) && !s.has_conflict && (
                  <p className="text-xs text-amber-700 mt-0.5">Would exceed an hour cap</p>
                )}
              </div>
              <button
                onClick={() => assignEmployee(s.employee_id, s.employee_name)}
                disabled={s.has_conflict || assigningId === s.employee_id}
                className="text-xs font-medium px-3 py-1.5 rounded bg-blue-900 hover:bg-blue-800 text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {assigningId === s.employee_id ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          ))}
          {suggestions.length === 0 && (
            <p className="text-slate-400 text-sm">No guards available to assign.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Guard</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{a.employee_name}</td>
                <td className="px-4 py-3 text-slate-500">{a.status}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleRemove(a.id)} className="text-red-600 hover:underline">Remove</button>
                </td>
              </tr>
            ))}
            {assignments.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">No guards assigned yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}