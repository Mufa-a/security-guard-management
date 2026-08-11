import { useState, useMemo } from 'react';
import { copyWeek, repeatWeekly } from '../../api/shiftsApi';
import type { CopyWeekResult } from '../../api/shiftsApi';
import type { Shift } from '../../types/shifts';

interface CopyWeekPanelProps {
  shifts: Shift[];
  selectedShiftIds: string[];
  onClose: () => void;
  onDone: () => void;
}

type Mode = 'copy_week' | 'repeat_weekly';

function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function CopyWeekPanel({ shifts, selectedShiftIds, onClose, onDone }: CopyWeekPanelProps) {
  const [mode, setMode] = useState<Mode>('copy_week');

  // Copy-week fields
  const [sourceWeekStart, setSourceWeekStart] = useState('');
  const [targetWeekStart, setTargetWeekStart] = useState('');
  const [siteFilter, setSiteFilter] = useState('');

  // Repeat-weekly fields
  const [weeks, setWeeks] = useState(4);

  const [includeAssignments, setIncludeAssignments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CopyWeekResult | null>(null);

  const sites = useMemo(() => {
    const map = new Map<string, string>();
    shifts.forEach((s) => map.set(s.site, s.site_name));
    return Array.from(map.entries());
  }, [shifts]);

  const selectedShifts = useMemo(
    () => shifts.filter((s) => selectedShiftIds.includes(s.id)),
    [shifts, selectedShiftIds],
  );

  async function handleCopyWeek() {
    if (!sourceWeekStart || !targetWeekStart) {
      setError('Pick both a source and target week.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await copyWeek(mondayOf(sourceWeekStart), mondayOf(targetWeekStart), {
        site: siteFilter || undefined,
        includeAssignments,
      });
      setResult(res);
    } catch {
      setError('Failed to copy week.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRepeatWeekly() {
    if (selectedShiftIds.length === 0) {
      setError('Select at least one shift in the table to repeat.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await repeatWeekly(selectedShiftIds, weeks, { includeAssignments });
      setResult(res);
    } catch {
      setError('Failed to repeat shifts.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDoneClick() {
    onDone();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Copy / Repeat Week</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setMode('copy_week'); setResult(null); setError(null); }}
              className={`flex-1 text-sm font-medium py-2 rounded border ${
                mode === 'copy_week' ? 'bg-blue-900 text-white border-blue-900' : 'border-slate-300 text-slate-600'
              }`}
            >
              Copy a week
            </button>
            <button
              onClick={() => { setMode('repeat_weekly'); setResult(null); setError(null); }}
              className={`flex-1 text-sm font-medium py-2 rounded border ${
                mode === 'repeat_weekly' ? 'bg-blue-900 text-white border-blue-900' : 'border-slate-300 text-slate-600'
              }`}
            >
              Repeat selected shifts
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {error && <p className="bg-red-50 text-red-700 text-sm rounded p-2 border border-red-200">{error}</p>}

          {!result && mode === 'copy_week' && (
            <>
              <p className="text-xs text-slate-500">
                Copies every shift in the source week to the target week. If a matching shift already exists
                on the target date it's skipped, and a guard with a conflicting shift on the new date won't be
                re-assigned — both are reported below.
              </p>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Any date in source week</label>
                <input
                  type="date"
                  value={sourceWeekStart}
                  onChange={(e) => setSourceWeekStart(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Any date in target week</label>
                <input
                  type="date"
                  value={targetWeekStart}
                  onChange={(e) => setTargetWeekStart(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Site (optional — leave blank for all sites)</label>
                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
                >
                  <option value="">All sites</option>
                  {sites.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
            </>
          )}

          {!result && mode === 'repeat_weekly' && (
            <>
              <p className="text-xs text-slate-500">
                Repeats the shifts you checked in the table, 7 days apart, for the number of weeks below.
              </p>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Selected shifts ({selectedShifts.length})</label>
                {selectedShifts.length === 0 ? (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    Check one or more shifts in the table behind this panel, then reopen.
                  </p>
                ) : (
                  <ul className="text-sm text-slate-600 max-h-32 overflow-y-auto border border-slate-200 rounded p-2 space-y-1">
                    {selectedShifts.map((s) => (
                      <li key={s.id}>{s.site_name} — {s.date} ({s.shift_type})</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Repeat for how many weeks?</label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={weeks}
                  onChange={(e) => setWeeks(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
                />
              </div>
            </>
          )}

          {!result && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={includeAssignments}
                onChange={(e) => setIncludeAssignments(e.target.checked)}
              />
              Also copy guard assignments
            </label>
          )}

          {result && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-green-700">
                Created {result.created_shifts} shift{result.created_shifts === 1 ? '' : 's'}.
              </p>
              {result.skipped_shifts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Shifts skipped (already existed):</p>
                  <ul className="text-xs text-slate-500 space-y-0.5">
                    {result.skipped_shifts.map((s, i) => (
                      <li key={i}>{s.site} — {s.date}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.skipped_assignments.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-700 mb-1">Guards not re-assigned (conflict on new date):</p>
                  <ul className="text-xs text-amber-700 space-y-0.5">
                    {result.skipped_assignments.map((a, i) => (
                      <li key={i}>{a.employee} — {a.date}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          {result ? (
            <button
              onClick={handleDoneClick}
              className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="text-sm text-slate-600 px-4 py-2 rounded border border-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={mode === 'copy_week' ? handleCopyWeek : handleRepeatWeekly}
                disabled={isSubmitting}
                className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
              >
                {isSubmitting ? 'Working...' : mode === 'copy_week' ? 'Copy week' : 'Repeat shifts'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}