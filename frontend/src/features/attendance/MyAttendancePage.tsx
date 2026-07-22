import { useEffect, useState } from 'react';
import { getMyAttendance, checkIn, checkOut } from '../../api/attendanceApi';
import type { Attendance } from '../../types/attendance';

export default function MyAttendancePage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    getMyAttendance()
      .then(setRecords)
      .catch(() => setError('Failed to load attendance.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { load(); }, []);

  function getLocation(): Promise<{ lat?: number; lng?: number }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({}),
      );
    });
  }

  async function handleCheckIn(id: string) {
    setBusyId(id);
    try {
      const { lat, lng } = await getLocation();
      await checkIn(id, lat, lng);
      load();
    } catch {
      setError('Check-in failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCheckOut(id: string) {
    setBusyId(id);
    try {
      const { lat, lng } = await getLocation();
      await checkOut(id, lat, lng);
      load();
    } catch {
      setError('Check-out failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">My Attendance</h1>
      {isLoading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {!isLoading && (
        <div className="space-y-4">
          {records.map((r) => (
            <div key={r.id} className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-800">{r.site_name} — {r.shift_date}</p>
                <p className="text-sm text-slate-500">
                  Status: {r.status} {r.check_in_time && `· In: ${new Date(r.check_in_time).toLocaleTimeString()}`}
                  {r.check_out_time && ` · Out: ${new Date(r.check_out_time).toLocaleTimeString()}`}
                </p>
              </div>
              <div className="flex gap-2">
                {!r.check_in_time && (
                  <button
                    onClick={() => handleCheckIn(r.id)}
                    disabled={busyId === r.id}
                    className="flex-1 sm:flex-none bg-blue-900 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
                  >
                    Check In
                  </button>
                )}
                {r.check_in_time && !r.check_out_time && (
                  <button
                    onClick={() => handleCheckOut(r.id)}
                    disabled={busyId === r.id}
                    className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
                  >
                    Check Out
                  </button>
                )}
              </div>
            </div>
          ))}
          {records.length === 0 && <p className="text-slate-400">No attendance records yet.</p>}
        </div>
      )}
    </div>
  );
}