import { useState } from 'react';
import { submitLateArrivalRequest } from '../../api/attendanceApi';
import type { Attendance } from '../../types/attendance';

const REASON_OPTIONS = [
  'Traffic / Transport delay',
  'Medical emergency',
  'Family emergency',
  'Public transport failure',
  'Vehicle breakdown',
  'Other',
];

type GeoState = 'idle' | 'locating' | 'ok' | 'denied' | 'unavailable';

export default function LateArrivalRequestModal({
  attendance,
  onClose,
  onSubmitted,
}: {
  attendance: Attendance;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [reason, setReason] = useState(REASON_OPTIONS[0]);
  const [explanation, setExplanation] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [geo, setGeo] = useState<{ lat?: number; lng?: number; state: GeoState }>({ state: 'idle' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function captureLocation() {
    if (!navigator.geolocation) {
      setGeo({ state: 'unavailable' });
      return;
    }
    setGeo({ state: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({
        // toFixed (not Math.round/1e6) — floating point can still print
        // extra trailing digits after a round-trip multiply/divide, which
        // blows past the backend's 9-total-digit DecimalField limit.
        lat: Number(pos.coords.latitude.toFixed(6)),
        lng: Number(pos.coords.longitude.toFixed(6)),
        state: 'ok',
      }),
      () => setGeo({ state: 'denied' }),
      { timeout: 8000 }
    );
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setAttachment(file);
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachmentPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit() {
    if (!explanation.trim()) {
      setError('Please add a short explanation.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await submitLateArrivalRequest(attendance.id, {
        reason,
        explanation: explanation.trim(),
        attachment,
        latitude: geo.lat,
        longitude: geo.lng,
      });
      onSubmitted();
    } catch {
      setError('Could not submit your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0F1B3D]/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-[#0F1B3D]" style={{ fontFamily: 'Oswald, sans-serif' }}>
              Submit Late Arrival Request
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {attendance.site_name} · {attendance.shift_date}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none px-1">
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="bg-red-50 text-[#C81E3A] text-sm rounded-lg px-3 py-2">
            You were marked absent for this shift. A supervisor needs to approve this
            request before you can check in.
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1B3D]/20"
            >
              {REASON_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Explain what happened <span className="text-[#C81E3A]">*</span>
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={4}
              placeholder="e.g. Matatu broke down on Thika Road, waited 40 minutes for another one..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0F1B3D]/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Attach a photo <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            {attachmentPreview ? (
              <div className="relative w-full h-36 rounded-lg overflow-hidden border border-slate-200">
                <img src={attachmentPreview} alt="Attachment preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setAttachment(null); setAttachmentPreview(null); }}
                  className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1 w-full h-24 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 text-sm cursor-pointer hover:border-slate-400 hover:text-slate-500">
                <span>Tap to add a photo</span>
                <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
              </label>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Location</label>
            {geo.state === 'idle' && (
              <button
                onClick={captureLocation}
                className="w-full text-sm text-[#0F1B3D] bg-slate-50 hover:bg-slate-100 rounded-lg py-2"
              >
                Share my current location
              </button>
            )}
            {geo.state === 'locating' && (
              <p className="text-sm text-slate-500">Getting your location…</p>
            )}
            {geo.state === 'ok' && (
              <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                Location captured ({geo.lat?.toFixed(4)}, {geo.lng?.toFixed(4)})
              </p>
            )}
            {geo.state === 'denied' && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Location permission denied — you can still submit without it.
              </p>
            )}
            {geo.state === 'unavailable' && (
              <p className="text-sm text-slate-500">Location isn't available on this device.</p>
            )}
          </div>

          {error && <p className="text-sm text-[#C81E3A]">{error}</p>}
        </div>

        <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-slate-100 px-5 py-4 flex gap-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-lg bg-[#0F1B3D] hover:bg-[#16255a] text-white text-sm font-medium disabled:opacity-50 transition"
          >
            {isSubmitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}