import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSites } from '../../api/sitesApi';
import { getEmployeeProfiles } from '../../api/staffApi';
import {
  createShift, getShift, updateShift,
  getShiftAssignments, createShiftAssignment, deleteShiftAssignment,
} from '../../api/shiftsApi';
import type { Site } from '../../types/sites';
import type { EmployeeProfile } from '../../types/staff';
import type { ShiftAssignment } from '../../types/shifts';

const SHIFT_TYPES = ['DAY', 'NIGHT', 'CUSTOM'];

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

  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);

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
      loadAssignments(id);
      getEmployeeProfiles().then(setEmployees).catch(() => {});
    }
  }, [id, isEditMode]);

  function loadAssignments(shiftId: string) {
    getShiftAssignments()
      .then((all) => setAssignments(all.filter((a) => a.shift === shiftId)))
      .catch(() => setAssignError('Failed to load assignments.'));
  }

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
        navigate(`/shifts/${created.id}`);
      }
    } catch {
      setError('Failed to save shift. Check required fields.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddAssignment() {
    if (!id || !selectedEmployee) return;
    setAssignError(null);
    try {
      await createShiftAssignment({ shift: id, employee: selectedEmployee });
      setSelectedEmployee('');
      loadAssignments(id);
    } catch {
      setAssignError('Failed to assign guard. They may already be assigned.');
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!id) return;
    try {
      await deleteShiftAssignment(assignmentId);
      loadAssignments(id);
    } catch {
      setAssignError('Failed to remove assignment.');
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        {isEditMode ? 'Edit Shift' : 'Add Shift'}
      </h1>

      {error && <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">{error}</p>}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm text-slate-700 mb-1">Site</label>
          <select
            value={form.site}
            onChange={(e) => handleChange('site', e.target.value)}
            required
            className="w-full px-3 py-2 rounded border border-slate-300"
          >
            <option value="">Select a site...</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Shift Type</label>
            <select
              value={form.shift_type}
              onChange={(e) => handleChange('shift_type', e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300"
            >
              {SHIFT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => handleChange('date', e.target.value)}
              required
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Start Time</label>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => handleChange('start_time', e.target.value)}
              required
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">End Time</label>
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => handleChange('end_time', e.target.value)}
              required
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-700 mb-1">Guards Required</label>
          <input
            type="number"
            min="1"
            value={form.required_guards}
            onChange={(e) => handleChange('required_guards', e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded border border-slate-300"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50">
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={() => navigate('/shifts')} className="text-slate-600 hover:text-slate-800 px-5 py-2">
            Cancel
          </button>
        </div>
      </form>

      {isEditMode && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-800 mb-3">Assigned Guards</h2>
          {assignError && <p className="text-red-600 text-sm mb-2">{assignError}</p>}

          <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-3">
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="flex-1 px-3 py-2 rounded border border-slate-300"
            >
              <option value="">Select a guard...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.user.email} ({emp.employee_number})</option>
              ))}
            </select>
            <button
              onClick={handleAddAssignment}
              disabled={!selectedEmployee}
              className="bg-blue-900 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
            >
              Assign
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm text-left">
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
                      <button onClick={() => handleRemoveAssignment(a.id)} className="text-red-600 hover:underline">Remove</button>
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
      )}
    </div>
  );
}