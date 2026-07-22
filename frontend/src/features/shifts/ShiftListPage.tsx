import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getShifts, deleteShift } from '../../api/shiftsApi';
import type { Shift } from '../../types/shifts';

export default function ShiftListPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    getShifts().then(setShifts).catch(() => setError('Failed to load shifts.')).finally(() => setIsLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm('Delete this shift?')) return;
    try {
      await deleteShift(id);
      load();
    } catch {
      setError('Failed to delete shift.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Shifts</h1>
        <Link to="/shifts/new" className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded transition-colors">
          + Add Shift
        </Link>
      </div>

      {isLoading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!isLoading && !error && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Guards Required</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.site_name}</td>
                  <td className="px-4 py-3 text-slate-500">{s.date}</td>
                  <td className="px-4 py-3 text-slate-500">{s.shift_type}</td>
                  <td className="px-4 py-3 text-slate-500">{s.start_time} - {s.end_time}</td>
                  <td className="px-4 py-3 text-slate-500">{s.required_guards}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Link to={`/shifts/${s.id}`} className="text-blue-700 hover:underline">Manage</Link>
                      <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {shifts.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No shifts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}