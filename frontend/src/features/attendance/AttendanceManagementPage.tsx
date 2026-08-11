import { useEffect, useMemo, useState } from 'react';
import { getAttendanceRecords, updateAttendance, reviewLateArrival } from '../../api/attendanceApi';
import type { Attendance, LateArrivalRequest } from '../../types/attendance';
import ResponsiveTable from '../../components/ResponsiveTable';
import type { Column } from '../../components/ResponsiveTable';
import StatusBadge from './StatusBadge';
import AttendanceKpiCards from './AttendanceKpiCards';
import AttendanceFilters from './AttendanceFilters';
import type { AttendanceFilterState } from './AttendanceFilters';
import AttendanceDetailDrawer from './AttendanceDetailDrawer';

// Manual override is for edge cases only (backdating, correcting a mistake).
// ABSENT and PRESENT_LATE_APPROVED are deliberately excluded here — those
// should only ever be reached through mark_absences / the late-arrival
// approval flow below, which also set minutes_late, auto_marked_absent,
// and the LateArrivalRequest audit trail. A raw dropdown write would skip
// all of that.
const MANUAL_STATUSES = ['SCHEDULED', 'PRESENT', 'ON_LEAVE', 'OFF_DUTY'];

function durationLabel(r: Attendance) {
  if (!r.check_in_time || !r.check_out_time) return '—';
  const mins = Math.round((new Date(r.check_out_time).getTime() - new Date(r.check_in_time).getTime()) / 60000);
  if (mins < 0) return '—';
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function PendingRequestCard({
  record,
  request,
  onReviewed,
}: {
  record: Attendance;
  request: LateArrivalRequest;
  onReviewed: () => void;
}) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleReview(approved: boolean) {
    setIsSubmitting(true);
    try {
      await reviewLateArrival(record.id, approved, note.trim() || undefined);
      onReviewed();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-sm p-4 border border-white/60 border-l-4 border-l-amber-400">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <p className="font-medium text-[#0F1B3D]">{record.employee_name}</p>
        <p className="text-xs font-mono text-slate-500">
          {record.site_name} · {record.shift_date} · {request.minutes_late_at_submission}m late
        </p>
      </div>
      <p className="text-sm text-slate-700">
        <span className="font-medium">Reason:</span> {request.reason}
      </p>
      {request.explanation && <p className="text-sm text-slate-600 mt-1">{request.explanation}</p>}
      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
        <span>Submitted {new Date(request.submitted_at).toLocaleString()}</span>
        {request.latitude && request.longitude && (
          <a
            href={`https://www.google.com/maps?q=${request.latitude},${request.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-700 hover:underline"
          >
            View location
          </a>
        )}
        {request.attachment && (
          <a href={request.attachment} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
            View attachment
          </a>
        )}
      </div>

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note"
        className="w-full mt-3 mb-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1B3D]/20"
      />
      <div className="flex gap-2">
        <button
          onClick={() => handleReview(true)}
          disabled={isSubmitting}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm py-1.5 rounded-lg disabled:opacity-50 transition"
        >
          Approve
        </button>
        <button
          onClick={() => handleReview(false)}
          disabled={isSubmitting}
          className="flex-1 bg-[#C81E3A] hover:bg-[#a5182f] text-white text-sm py-1.5 rounded-lg disabled:opacity-50 transition"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}

export default function AttendanceManagementPage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailRecord, setDetailRecord] = useState<Attendance | null>(null);
  const [filters, setFilters] = useState<AttendanceFilterState>({ search: '', status: '', site: '' });

  function load() {
    setIsLoading(true);
    setError(null);
    getAttendanceRecords()
      .then(setRecords)
      .catch(() => setError('Failed to load attendance.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

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

  const pending = records
    .filter((r) => r.late_request_status === 'PENDING')
    .map((r) => ({
      record: r,
      request: r.late_arrival_requests.find((req) => req.status === 'PENDING'),
    }))
    .filter((x): x is { record: Attendance; request: LateArrivalRequest } => !!x.request);

  const siteOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.site_name))).sort(),
    [records]
  );

  const activeFilterCount = [filters.search, filters.status, filters.site].filter(Boolean).length;

  const filteredRecords = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return records.filter((r) => {
      if (filters.status && r.status !== filters.status) return false;
      if (filters.site && r.site_name !== filters.site) return false;
      if (q && !`${r.employee_name} ${r.site_name}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [records, filters]);

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
      key: 'duration',
      label: 'Duration',
      render: (r) => <span className="text-slate-500">{durationLabel(r)}</span>,
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
            onClick={(e) => e.stopPropagation()}
            className="px-2 py-1 rounded border border-slate-300 text-xs"
          >
            {MANUAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingId(r.id);
            }}
            className="hover:opacity-80"
          >
            <StatusBadge status={r.status as any} minutesLate={r.minutes_late} size="sm" />
          </button>
        ),
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDetailRecord(r);
          }}
          className="text-xs font-medium text-[#0F1B3D] hover:underline"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]" style={{ fontFamily: 'Oswald, sans-serif' }}>
            Attendance
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor guard attendance, check-ins, absences, lateness and shift compliance.
          </p>
        </div>
        <button
          onClick={load}
          className="text-sm font-medium text-[#0F1B3D] bg-white/70 backdrop-blur border border-white/60 rounded-lg px-3 py-2 hover:bg-white transition"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 text-[#C81E3A] text-sm px-3 py-2 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="font-medium hover:underline">
            Retry
          </button>
        </div>
      )}

      <AttendanceKpiCards records={records} />

      {!isLoading && pending.length > 0 && (
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">
            Requires Attention — Pending Late Arrival Requests ({pending.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pending.map(({ record, request }) => (
              <PendingRequestCard key={request.id} record={record} request={request} onReviewed={load} />
            ))}
          </div>
        </div>
      )}

      <AttendanceFilters
        value={filters}
        onChange={setFilters}
        siteOptions={siteOptions}
        activeCount={activeFilterCount}
      />

      {isLoading && <TableSkeleton />}

      {!isLoading && !error && filteredRecords.length === 0 && (
        <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-10 text-center">
          <p className="font-medium text-[#0F1B3D]">No attendance records</p>
          <p className="text-sm text-slate-500 mt-1">
            {records.length === 0 ? 'No attendance records yet.' : 'No records match your current filters.'}
          </p>
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters({ search: '', status: '', site: '' })}
              className="mt-3 text-sm font-medium text-[#0F1B3D] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {!isLoading && !error && filteredRecords.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
          <ResponsiveTable
            columns={columns}
            data={filteredRecords}
            keyExtractor={(r) => r.id}
            emptyMessage="No attendance records yet."
          />
        </div>
      )}

      <AttendanceDetailDrawer record={detailRecord} onClose={() => setDetailRecord(null)} />
    </div>
  );
}