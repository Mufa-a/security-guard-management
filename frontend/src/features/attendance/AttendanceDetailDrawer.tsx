import { useEffect } from 'react';
import type { Attendance } from '../../types/attendance';
import StatusBadge from './StatusBadge';

function fmtTime(iso?: string | null) {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
}

function durationWorked(record: Attendance) {
  if (!record.check_in_time || !record.check_out_time) return null;
  const mins = Math.round(
    (new Date(record.check_out_time).getTime() - new Date(record.check_in_time).getTime()) / 60000
  );
  if (mins < 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function TimelineStep({
  label,
  value,
  tone = 'default',
  isLast = false,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warn' | 'bad' | 'good';
  isLast?: boolean;
}) {
  const dot = {
    default: 'bg-slate-300',
    warn: 'bg-amber-500',
    bad: 'bg-[#C81E3A]',
    good: 'bg-emerald-500',
  }[tone];
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={`w-2.5 h-2.5 rounded-full ${dot} mt-1`} />
        {!isLast && <span className="w-px flex-1 bg-slate-200 mt-1" />}
      </div>
      <div className="pb-5">
        <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export default function AttendanceDetailDrawer({
  record,
  onClose,
}: {
  record: Attendance | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!record) return null;

  const duration = durationWorked(record);
  const latestRequest = record.late_arrival_requests
    .slice()
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#0F1B3D]/40 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Attendance detail for ${record.employee_name}`}
        className="relative w-full sm:max-w-md h-full bg-white/90 backdrop-blur-2xl border-l border-white/60 shadow-2xl overflow-y-auto"
      >
        <div className="sticky top-0 bg-white/85 backdrop-blur-xl border-b border-slate-100 px-5 py-4 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
              {record.site_name} · {record.shift_date}
            </p>
            <h2 className="text-lg font-bold text-[#0F1B3D]" style={{ fontFamily: 'Oswald, sans-serif' }}>
              {record.employee_name}
            </h2>
            <div className="mt-1.5">
              <StatusBadge status={record.status} minutesLate={record.minutes_late} />
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-3">Attendance Timeline</p>
          <div>
            <TimelineStep label="Shift Date" value={record.shift_date} />
            <TimelineStep
              label="Checked In"
              value={fmtTime(record.check_in_time)}
              tone={record.check_in_time ? 'good' : 'default'}
            />
            {record.minutes_late != null && record.minutes_late > 0 && (
              <TimelineStep label="Late By" value={`${record.minutes_late} minutes`} tone="warn" />
            )}
            <TimelineStep
              label="Checked Out"
              value={fmtTime(record.check_out_time)}
              tone={record.check_out_time ? 'good' : 'default'}
            />
            <TimelineStep
              label="Total Worked"
              value={duration ?? (record.check_in_time && !record.check_out_time ? 'In progress' : '—')}
              tone={duration ? 'good' : 'default'}
              isLast
            />
          </div>

          {latestRequest && (
            <div className="mt-2">
              <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-2">
                Late Arrival Request
              </p>
              <div
                className={`rounded-xl border p-3 text-sm ${
                  latestRequest.status === 'APPROVED'
                    ? 'border-emerald-100 bg-emerald-50/60'
                    : latestRequest.status === 'REJECTED'
                    ? 'border-red-100 bg-red-50/60'
                    : 'border-amber-100 bg-amber-50/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-800">{latestRequest.reason}</span>
                  <span className="text-xs text-slate-500">{latestRequest.status}</span>
                </div>
                {latestRequest.explanation && (
                  <p className="text-slate-600 text-sm">{latestRequest.explanation}</p>
                )}
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                  <span>Submitted {new Date(latestRequest.submitted_at).toLocaleString()}</span>
                  {latestRequest.latitude && latestRequest.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${latestRequest.latitude},${latestRequest.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:underline"
                    >
                      View location
                    </a>
                  )}
                  {latestRequest.attachment && (
                    <a href={latestRequest.attachment} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                      View attachment
                    </a>
                  )}
                </div>
                {latestRequest.review_notes && (
                  <p className="mt-2 text-xs text-slate-500">Reviewer note: "{latestRequest.review_notes}"</p>
                )}
              </div>
            </div>
          )}

          {record.auto_marked_absent && !latestRequest && (
            <div className="mt-2 rounded-xl border border-red-100 bg-red-50/60 p-3 text-sm text-[#C81E3A]">
              Auto-marked absent — no check-in and no late arrival request on file.
            </div>
          )}

          {/* Location verification for the check-in itself, guard photo, staff ID, and
             scheduled shift start/end time are all in the full spec but aren't on the
             Attendance type shown here — add them once the backend serializer exposes them. */}
        </div>
      </div>
    </div>
  );
}