import { useEffect, useState } from 'react';
import { getMyAttendance, checkIn, checkOut } from '../../api/attendanceApi';
import type { Attendance } from '../../types/attendance';
import StatusBadge from './StatusBadge';
import LateArrivalRequestModal from './LateArrivalRequestModal';

function canCheckIn(r: Attendance) {
  if (r.check_in_time) return false;
  if (r.status === 'PRESENT_LATE_APPROVED') return true;
  // Approved late request: backend still shows status=ABSENT until the
  // guard actually checks in (see views.py check_in()) — so gate on
  // late_request_status here too, not just status.
  if (r.status === 'ABSENT' && r.late_request_status === 'APPROVED') return true;
  if (r.auto_marked_absent) return false;
  return r.status === 'SCHEDULED';
}

function canSubmitLateRequest(r: Attendance) {
  return r.auto_marked_absent && !r.check_in_time && (r.late_request_status === '' || r.late_request_status === 'REJECTED');
}

function timeOnDuty(checkInIso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(checkInIso).getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// Signature motif for the module: a targeting-reticle / viewfinder corner
// frame, the same visual language as the guards' own equipment (CCTV,
// dispatch consoles) rather than a generic rounded card border.
function CornerBrackets({ tone }: { tone: 'idle' | 'active' }) {
  const color = tone === 'active' ? 'border-[#C81E3A]/70' : 'border-slate-300';
  const base = `absolute w-3.5 h-3.5 ${color} pointer-events-none`;
  return (
    <>
      <span className={`${base} top-3 left-3 border-t-2 border-l-2`} />
      <span className={`${base} top-3 right-3 border-t-2 border-r-2`} />
      <span className={`${base} bottom-3 left-3 border-b-2 border-l-2`} />
      <span className={`${base} bottom-3 right-3 border-b-2 border-r-2`} />
    </>
  );
}

function LivePulse() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C81E3A] opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C81E3A]" />
    </span>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-32 rounded-lg bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}

export default function MyAttendancePage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lateRequestFor, setLateRequestFor] = useState<Attendance | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function load() {
    getMyAttendance()
      .then(setRecords)
      .catch(() => setError('Failed to load attendance.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function getLocation(): Promise<{ lat?: number; lng?: number }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          // toFixed, not Math.round/1e6 — avoids floating-point round-trip
          // artifacts that can still exceed the backend's 9-total-digit limit.
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        }),
        () => resolve({}),
        { timeout: 8000 }
      );
    });
  }

  async function handleCheckIn(r: Attendance) {
    setBusyId(r.id);
    setError(null);
    try {
      const { lat, lng } = await getLocation();
      const updated = await checkIn(r.id, lat, lng);
      setToast(
        updated.status === 'PRESENT_LATE'
          ? `Checked in — ${updated.minutes_late} min late.`
          : 'Checked in.'
      );
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? 'Check-in failed.';
      setError(msg);
      load(); // status may have flipped to ABSENT server-side even on failure
    } finally {
      setBusyId(null);
    }
  }

  async function handleCheckOut(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const { lat, lng } = await getLocation();
      await checkOut(id, lat, lng);
      setToast('Checked out. Have a good rest.');
      load();
    } catch {
      setError('Check-out failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="relative max-w-2xl">
      <h1 className="text-2xl font-bold text-[#0F1B3D] mb-1" style={{ fontFamily: 'Oswald, sans-serif' }}>
        My Attendance
      </h1>
      <p className="text-sm text-slate-500 mb-6">Your shifts, check-ins and attendance history.</p>

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0F1B3D] text-white text-sm font-mono px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}

      {isLoading && <CardSkeleton />}
      {error && (
        <div className="bg-red-50 border border-red-100 text-[#C81E3A] text-sm rounded-lg px-3 py-2 mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="font-medium hover:underline">Retry</button>
        </div>
      )}

      {!isLoading && (
        <div className="space-y-4">
          {records.map((r) => {
            const isBusy = busyId === r.id;
            const pendingRequest = r.late_arrival_requests.find((req) => req.status === 'PENDING');
            const lastRejected = r.late_arrival_requests
              .filter((req) => req.status === 'REJECTED')
              .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0];
            const isOnDuty = !!r.check_in_time && !r.check_out_time;

            return (
              <div
                key={r.id}
                className={`relative overflow-hidden rounded-lg border p-6 shadow-sm transition ${
                  isOnDuty
                    ? 'bg-[#0F1B3D] border-[#0F1B3D] text-white'
                    : 'bg-white border-slate-200 text-[#0F1B3D]'
                }`}
              >
                <CornerBrackets tone={isOnDuty ? 'active' : 'idle'} />

                {/* Faint rotated duty stamp — a watermark, not a control; purely decorative */}
                {isOnDuty && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-2 -right-4 rotate-[-14deg] text-white/[0.06] text-6xl font-black tracking-tight select-none pointer-events-none"
                    style={{ fontFamily: 'Oswald, sans-serif' }}
                  >
                    ON DUTY
                  </span>
                )}

                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-[10px] font-mono uppercase tracking-[0.2em] ${isOnDuty ? 'text-white/40' : 'text-slate-400'}`}>
                      Shift Record
                    </p>
                    <p className={`text-xs font-mono uppercase tracking-widest mt-0.5 ${isOnDuty ? 'text-white/60' : 'text-slate-500'}`}>
                      {r.site_name} // {r.shift_date}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {isOnDuty && <LivePulse />}
                      <p className="font-semibold text-lg" style={{ fontFamily: 'Oswald, sans-serif' }}>
                        {isOnDuty ? "You're On Duty" : 'Your Shift'}
                      </p>
                    </div>
                    <div className="mt-1.5">
                      <StatusBadge status={r.status} minutesLate={r.minutes_late} />
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {canCheckIn(r) && (
                      <button
                        onClick={() => handleCheckIn(r)}
                        disabled={isBusy}
                        className="flex-1 sm:flex-none bg-[#C81E3A] hover:bg-[#a5182f] text-white text-sm font-medium px-5 py-2.5 rounded disabled:opacity-50 transition"
                      >
                        {isBusy ? 'Checking in…' : 'Check In'}
                      </button>
                    )}

                    {r.check_in_time && !r.check_out_time && (
                      <button
                        onClick={() => handleCheckOut(r.id)}
                        disabled={isBusy}
                        className="flex-1 sm:flex-none bg-white text-[#0F1B3D] hover:bg-white/90 text-sm font-medium px-5 py-2.5 rounded disabled:opacity-50 transition"
                      >
                        {isBusy ? 'Checking out…' : 'Check Out'}
                      </button>
                    )}

                    {canSubmitLateRequest(r) && (
                      <button
                        onClick={() => setLateRequestFor(r)}
                        className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2.5 rounded transition"
                      >
                        Submit Late Arrival Request
                      </button>
                    )}
                  </div>
                </div>

                {isOnDuty && r.check_in_time && (
                  <div className="relative grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/10 max-w-xs">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Check-in</p>
                      <p className="text-lg font-mono font-semibold tabular-nums">
                        {new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">On Duty</p>
                      <p className="text-lg font-mono font-semibold tabular-nums">{timeOnDuty(r.check_in_time)}</p>
                    </div>
                  </div>
                )}

                {pendingRequest && (
                  <div className="relative mt-3 flex items-center gap-2 bg-amber-50 text-amber-700 text-xs rounded-lg px-3 py-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    Late arrival request submitted — waiting on your supervisor.
                  </div>
                )}

                {r.status === 'ABSENT' && r.late_request_status === 'APPROVED' && !r.check_in_time && (
                  <div className="relative mt-3 flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs rounded-lg px-3 py-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    Your late arrival was approved — you can check in now.
                  </div>
                )}

                {!pendingRequest && lastRejected && r.late_request_status === 'REJECTED' && (
                  <div className="relative mt-3 bg-red-50 text-[#C81E3A] text-xs rounded-lg px-3 py-2">
                    <p>Your last late arrival request was rejected{lastRejected.review_notes ? `: "${lastRejected.review_notes}"` : '.'}</p>
                    <p className="mt-1 opacity-80">You can submit a new request above.</p>
                  </div>
                )}

                {r.check_in_time && r.check_out_time && (
                  <p className="relative mt-3 text-xs font-mono text-slate-400">
                    IN {new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · OUT{' '}
                    {new Date(r.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            );
          })}

          {records.length === 0 && (
            <div className="relative rounded-lg border border-slate-200 bg-white p-10 text-center">
              <CornerBrackets tone="idle" />
              <p className="font-medium text-[#0F1B3D]">No attendance records</p>
              <p className="text-sm text-slate-500 mt-1">You have no shifts on record yet.</p>
            </div>
          )}
        </div>
      )}

      {lateRequestFor && (
        <LateArrivalRequestModal
          attendance={lateRequestFor}
          onClose={() => setLateRequestFor(null)}
          onSubmitted={() => {
            setLateRequestFor(null);
            setToast('Late arrival request submitted.');
            load();
          }}
        />
      )}
    </div>
  );
}