import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getEmployeeProfiles } from '../../api/staffApi';
import { getShift, getShiftAssignments, createShiftAssignment, deleteShiftAssignment } from '../../api/shiftsApi';
import type { EmployeeProfile } from '../../types/staff';
import type { ShiftAssignment } from '../../types/shifts';
import type { Shift } from '../../types/shifts';

export default function ShiftAssignGuardsPage() {
  const { id } = useParams();
  const [shift, setShift] = useState<Shift | null>(null);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [guards, setGuards] = useState<EmployeeProfile[]>([]);
  const [selectedGuard, setSelectedGuard] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getShift(id), getEmployeeProfiles()])
      .then(([s, employees]) => {
        setShift(s);
        // Only guards should be assignable to a shift — supervisors/managers/admins excluded.
        setGuards(employees.filter((e) => e.user.role === 'GUARD'));
      })
      .catch(() => setError('Failed to load shift or staff data.'))
      .finally(() => setIsLoading(false));
    loadAssignments(id);
  }, [id]);

  function loadAssignments(shiftId: string) {
    getShiftAssignments()
      .then((all) => setAssignments(all.filter((a) => a.shift === shiftId)))
      .catch(() => setError('Failed to load assignments.'));
  }

  async function handleAssign() {
    if (!id || !selectedGuard) return;
    setError(null);
    try {
      await createShiftAssignment({ shift: id, employee: selectedGuard });
      setSelectedGuard('');
      loadAssignments(id);
    } catch {
      setError('Failed to assign guard. They may already be assigned.');
    }
  }

  async function handleRemove(assignmentId: string) {
    if (!id) return;
    try {
      await deleteShiftAssignment(assignmentId);
      loadAssignments(id);
    } catch {
      setError('Failed to remove assignment.');
    }
  }

  if (isLoading) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="max-w-xl">
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

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-3">
        <select
          value={selectedGuard}
          onChange={(e) => setSelectedGuard(e.target.value)}
          className="flex-1 px-3 py-2 rounded border border-slate-300"
        >
          <option value="">Select a guard...</option>
          {guards.map((g) => (
            <option key={g.id} value={g.id}>
              {g.user.first_name} {g.user.last_name} ({g.employee_number})
            </option>
          ))}
        </select>
        <button
          onClick={handleAssign}
          disabled={!selectedGuard}
          className="bg-blue-900 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
        >
          Assign
        </button>
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