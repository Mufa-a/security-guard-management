import { useEffect, useState } from 'react';
import { getAttendanceRecords, updateAttendance } from '../../api/attendanceApi';
import type { Attendance } from '../../types/attendance';
import ResponsiveTable from '../../components/ResponsiveTable';
import type { Column } from '../../components/ResponsiveTable';

const STATUSES = ['PENDING', 'CHECKED_IN', 'CHECKED_OUT', 'ABSENT', 'LATE'];

export default function AttendanceManagementPage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function load() {
    getAttendanceRecords().then(setRecords).catch(() => setError('Failed to load attendance.')).finally(() => setIsLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleStatusChange(id: string, status: string) {
    try {
      await updateAttendance(id, { status });
      load();
    } catch {
      setError('Failed to update status.');
    } finally {
      setEditingId(null);
    }
  }

  const columns: Column<Attendance>[] = [
    { key: 'employee_name', label: 'Guard', isTitle: true },
    { key: 'site_name', label: 'Site' },
    { key: 'shift_date', label: 'Date' },
    {
      key: 'check_in_time',
      label: 'Check in',
      render: (r) => (r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '—'),
    },
    {
      key: 'check_out_time',
      label: 'Check out',
      render: (r) => (r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '—'),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) =>
        editingId === r.id ? (
          <select
            autoFocus
            defaultValue={r.status}
            onChange={(e) => handleStatusChange(r.id, e.target.value)}
            onBlur={() => setEditingId(null)}
            className="px-2 py-1 rounded border border-slate-300 text-xs"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        ) : (
          <button
            onClick={() => setEditingId(r.id)}
            className="px-2 py-1 rounded bg-slate-100 text-xs hover:bg-slate-200"
          >
            {r.status}
          </button>
        ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Attendance</h1>
      {isLoading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {!isLoading && !error && (
        <ResponsiveTable
          columns={columns}
          data={records}
          keyExtractor={(r) => r.id}
          emptyMessage="No attendance records yet."
        />
      )}
    </div>
  );
}