import { useEffect, useState } from 'react';
import { getMyShiftAssignments } from '../../api/shiftsApi';
import type { ShiftAssignment } from '../../types/shifts';

export default function MyShiftsPage() {
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyShiftAssignments()
      .then(setAssignments)
      .catch(() => setError('Failed to load your shifts.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">My Shifts</h1>
      {isLoading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!isLoading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Shift</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{a.shift_detail}</td>
                  <td className="px-4 py-3 text-slate-500">{a.status}</td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-400">No shifts assigned yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}