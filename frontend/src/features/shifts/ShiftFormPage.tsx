import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Users, ArrowLeft } from 'lucide-react';
import { getSites } from '../../api/sitesApi';
import { createShift, getShift, updateShift } from '../../api/shiftsApi';
import type { Site } from '../../types/sites';

const SHIFT_TYPES = ['DAY', 'NIGHT', 'CUSTOM'];

const inputClass =
  'w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50';
const labelClass = 'block text-xs text-slate-500 mb-1 uppercase tracking-wide';

export default function ShiftFormPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [sites, setSites] = useState<Site[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    site: '', shift_type: 'DAY', date: '', start_time: '', end_time: '',
    required_guards: '1', notes: '',
  });

  useEffect(() => {
    getSites().then(setSites).catch(() => setError('Failed to load sites.'));

    if (isEditMode && id) {
      getShift(id).then((s) => {
        setForm({
          site: s.site, shift_type: s.shift_type, date: s.date,
          start_time: s.start_time, end_time: s.end_time,
          required_guards: s.required_guards.toString(), notes: s.notes,
        });
      });
    }
  }, [id, isEditMode]);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload = { ...form, required_guards: Number(form.required_guards) };

    try {
      if (isEditMode && id) {
        await updateShift(id, payload);
        navigate('/shifts');
      } else {
        const created = await createShift(payload);
        // Redirect to the dedicated "assign guards" page for this new shift —
        // clearly a new step, not more of the same form.
        navigate(`/shifts/${created.id}/assign`);
      }
    } catch {
      setError('Failed to save shift. Check required fields.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-full -m-6 p-6 bg-slate-50">
      <div className="max-w-2xl mx-auto">
        <Link to="/shifts" className="relative inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors">
  <ArrowLeft size={14} className="absolute -left-5" />
  Back to Shifts
</Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs tracking-[0.15em] text-blue-800 font-medium uppercase mb-1">Scheduling Center</p>
            <h1 className="text-2xl font-bold text-slate-800">
              {isEditMode ? 'Edit Shift' : 'Add Shift'}
            </h1>
          </div>
          {isEditMode && id && (
            <Link
              to={`/shifts/${id}/assign`}
              className="flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-800 transition-colors"
            >
              <Users size={15} /> Manage Assigned Guards
            </Link>
          )}
        </div>

        {error && (
          <p className="bg-red-50 text-red-700 text-sm rounded-md p-3 mb-4 border border-red-200">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 shadow-sm rounded-lg p-6 space-y-4">
          <div>
            <label className={labelClass}>Site</label>
            <select
              value={form.site}
              onChange={(e) => handleChange('site', e.target.value)}
              required
              className={inputClass}
            >
              <option value="">Select a site...</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Shift Type</label>
              <select
                value={form.shift_type}
                onChange={(e) => handleChange('shift_type', e.target.value)}
                className={inputClass}
              >
                {SHIFT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => handleChange('date', e.target.value)}
                required
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Start Time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => handleChange('start_time', e.target.value)}
                required
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className={labelClass}>End Time</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => handleChange('end_time', e.target.value)}
                required
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Guards Required</label>
            <input
              type="number"
              min="1"
              value={form.required_guards}
              onChange={(e) => handleChange('required_guards', e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className={inputClass}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/shifts')}
              className="text-slate-500 hover:text-slate-800 px-5 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}