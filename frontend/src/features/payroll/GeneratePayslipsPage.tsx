import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { getEmployeeProfiles } from '../../api/staffApi';
import { getSalaryStructures, generatePayslips } from '../../api/payrollApi';
import type { EmployeeProfile } from '../../types/staff';
import type { SalaryStructure } from '../../types/payroll';
import { formatKES } from '../../utils/payrollFormat';

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

export default function GeneratePayslipsPage() {
  const { periodId } = useParams();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [salaryByEmployee, setSalaryByEmployee] = useState<Record<string, SalaryStructure>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getEmployeeProfiles(), getSalaryStructures()])
      .then(([emps, structures]) => {
        setEmployees(emps);
        const today = new Date().toISOString().slice(0, 10);
        const byEmployee: Record<string, SalaryStructure> = {};
        structures.forEach((s) => {
          if (!s.is_active) return;
          if (s.effective_from > today) return;
          if (s.effective_to && s.effective_to < today) return;
          const existing = byEmployee[s.employee];
          if (!existing || s.effective_from > existing.effective_from) {
            byEmployee[s.employee] = s;
          }
        });
        setSalaryByEmployee(byEmployee);
        setSelectedIds(new Set(emps.filter((e) => byEmployee[e.id]).map((e) => e.id)));
      })
      .catch(() => setError('Failed to load employees.'))
      .finally(() => setIsLoading(false));
  }, []);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleGenerate() {
    if (!periodId || selectedIds.size === 0) return;
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await generatePayslips(periodId, Array.from(selectedIds));
      const skipDetails = result.skipped.map((s) => `${s.employee}: ${s.reason}`).join(' | ');
      setMessage(
        `Generated ${result.created_count} payslip(s).` +
          (result.skipped.length ? ` Skipped ${result.skipped.length}. ${skipDetails}` : '')
      );
    } catch {
      setError('Failed to generate payslips.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl">
        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="h-64 bg-white rounded-xl border border-slate-200/70" />
      </div>
    );
  }

  const eligible = employees.filter((e) => salaryByEmployee[e.id]);
  const ineligible = employees.filter((e) => !salaryByEmployee[e.id]);
  const selectedTotal = eligible
    .filter((e) => selectedIds.has(e.id))
    .reduce((sum, e) => sum + parseFloat(salaryByEmployee[e.id].basic_salary), 0);

  return (
    <div className="max-w-2xl pb-24">
      <button
        onClick={() => navigate('/payroll')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-crimecurb-navy hover:underline mb-4"
      >
        <ArrowLeft size={15} /> Back to Payroll Periods
      </button>

      <h1 className="font-display text-2xl font-bold text-slate-800 mb-1">Generate Payslips</h1>
      <p className="text-sm text-slate-400 mb-6">Select which guards to generate payslips for this period.</p>

      {error && (
        <p className="flex items-center gap-2 bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-4 border border-red-100">
          <AlertCircle size={15} className="shrink-0" /> {error}
        </p>
      )}
      {message && (
        <p className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm rounded-lg px-3 py-2.5 mb-4 border border-emerald-100">
          <CheckCircle2 size={15} className="shrink-0" /> {message}
        </p>
      )}

      <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm overflow-hidden mb-4">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-400 text-[11px] font-mono uppercase tracking-widest">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === eligible.length && eligible.length > 0}
                  onChange={(e) =>
                    setSelectedIds(e.target.checked ? new Set(eligible.map((emp) => emp.id)) : new Set())
                  }
                  className="rounded border-slate-300"
                />
              </th>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium text-right">Basic Salary</th>
            </tr>
          </thead>
          <tbody>
            {eligible.map((emp) => (
              <tr
                key={emp.id}
                onClick={() => toggle(emp.id)}
                className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(emp.id)}
                    onChange={() => toggle(emp.id)}
                    className="rounded border-slate-300"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-crimecurb-navy/[0.08] text-crimecurb-navy text-[11px] font-semibold flex items-center justify-center shrink-0">
                      {initials(emp.user.first_name, emp.user.last_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">
                        {emp.user.first_name} {emp.user.last_name}
                      </p>
                      <p className="text-xs text-slate-400">{emp.employee_number}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                  {formatKES(salaryByEmployee[emp.id].basic_salary)}
                </td>
              </tr>
            ))}
            {eligible.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center">
                  <Users size={22} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400 text-sm">No employees have an active salary structure yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {ineligible.length > 0 && (
        <p className="text-xs text-slate-400 mb-4">
          {ineligible.length} employee(s) excluded — no active salary structure:{' '}
          {ineligible.map((e) => `${e.user.first_name} ${e.user.last_name}`).join(', ')}
        </p>
      )}

      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between gap-4 z-10">
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-800 tabular-nums">{selectedIds.size}</span> selected
          {selectedIds.size > 0 && (
            <span className="hidden sm:inline"> · <span className="tabular-nums">{formatKES(selectedTotal)}</span> total basic salary</span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={isSubmitting || selectedIds.size === 0}
          className="bg-crimecurb-navy hover:bg-crimecurb-navy/90 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
        >
          {isSubmitting ? 'Generating…' : `Generate for ${selectedIds.size} Employee(s)`}
        </button>
      </div>
    </div>
  );
}