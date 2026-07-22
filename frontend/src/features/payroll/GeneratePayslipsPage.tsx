import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEmployeeProfiles } from '../../api/staffApi';
import { getSalaryStructures, generatePayslips } from '../../api/payrollApi';
import type { EmployeeProfile } from '../../types/staff';
import type { SalaryStructure } from '../../types/payroll';

function formatKES(value: string): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(parseFloat(value));
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

  if (isLoading) return <p className="text-slate-500">Loading...</p>;

  const eligible = employees.filter((e) => salaryByEmployee[e.id]);
  const ineligible = employees.filter((e) => !salaryByEmployee[e.id]);

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate('/payroll')}
        className="text-blue-700 hover:underline text-sm mb-4"
      >
        &larr; Back to Payroll Periods
      </button>

      <h1 className="text-2xl font-bold text-slate-800 mb-6">Generate Payslips</h1>

      {error && (
        <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">{error}</p>
      )}
      {message && (
        <p className="bg-green-50 text-green-700 text-sm rounded p-2 mb-4 border border-green-200">
          {message}
        </p>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.size === eligible.length && eligible.length > 0}
                  onChange={(e) =>
                    setSelectedIds(e.target.checked ? new Set(eligible.map((emp) => emp.id)) : new Set())
                  }
                />
              </th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Basic Salary</th>
            </tr>
          </thead>
          <tbody>
            {eligible.map((emp) => (
              <tr key={emp.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(emp.id)}
                    onChange={() => toggle(emp.id)}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {emp.user.first_name} {emp.user.last_name} ({emp.employee_number})
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatKES(salaryByEmployee[emp.id].basic_salary)}
                </td>
              </tr>
            ))}
            {eligible.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  No employees have an active salary structure yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {ineligible.length > 0 && (
        <p className="text-xs text-slate-400 mb-4">
          {ineligible.length} employee(s) excluded — no active salary structure: {' '}
          {ineligible.map((e) => `${e.user.first_name} ${e.user.last_name}`).join(', ')}
        </p>
      )}

      <button
        onClick={handleGenerate}
        disabled={isSubmitting || selectedIds.size === 0}
        className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50"
      >
        {isSubmitting ? 'Generating...' : `Generate for ${selectedIds.size} Employee(s)`}
      </button>
    </div>
  );
}