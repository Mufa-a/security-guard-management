import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getEmployeeProfile } from '../../api/staffApi';
import {
  getSalaryStructures,
  createSalaryStructure,
  getAllowances,
  createAllowance,
  deleteAllowance,
  getDeductions,
  createDeduction,
  deleteDeduction,
} from '../../api/payrollApi';
import type { EmployeeProfile } from '../../types/staff';
import type {
  SalaryStructure,
  PaymentFrequency,
  Allowance,
  Deduction,
} from '../../types/payroll';

function formatKES(value: string): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(parseFloat(value));
}

const FREQUENCIES: PaymentFrequency[] = ['MONTHLY', 'WEEKLY', 'BI_WEEKLY'];
const ALLOWANCE_TYPES = ['HOUSING', 'TRANSPORT', 'MEDICAL', 'COMMISSION', 'OTHER'];
const DEDUCTION_TYPES = ['LOAN', 'UNIFORM', 'DISCIPLINARY', 'OTHER'];

type Tab = 'overview' | 'allowances' | 'deductions';

export default function EmployeeSalaryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isAdmin = user?.role === 'ADMIN';

  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [current, setCurrent] = useState<SalaryStructure | null>(null);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  function reload() {
    if (!id) return;
    Promise.allSettled([
      getEmployeeProfile(id),
      getSalaryStructures(id),
      getAllowances(id),
      getDeductions(id),
    ]).then(([empR, structR, allowR, dedR]) => {
      if (empR.status === 'fulfilled') setEmployee(empR.value);
      if (structR.status === 'fulfilled') setCurrent(structR.value[0] ?? null);
      if (allowR.status === 'fulfilled') setAllowances(allowR.value);
      if (dedR.status === 'fulfilled') setDeductions(dedR.value);

      if ([empR, structR, allowR, dedR].every((r) => r.status === 'rejected')) {
        setError('Failed to load salary data.');
        console.error(empR, structR, allowR, dedR);
      }
    }).finally(() => setIsLoading(false));
  }

  useEffect(() => {
    setIsLoading(true);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!canEdit) {
    return (
      <div className="max-w-xl">
        <p className="bg-red-50 text-red-700 text-sm rounded p-4 border border-red-200">
          You don't have access to salary information.
        </p>
      </div>
    );
  }

  if (isLoading) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate(`/staff/${id}`)}
        className="text-blue-700 hover:underline text-sm mb-4"
      >
        &larr; Back to Employee Profile
      </button>

      <h1 className="text-2xl font-bold text-slate-800 mb-1">
        Salary — {employee?.user.first_name} {employee?.user.last_name}
      </h1>
      <p className="text-slate-500 mb-6">{employee?.employee_number}</p>

      {error && (
        <p className="bg-amber-50 text-amber-800 text-sm rounded p-3 mb-4 border border-amber-200">
          {error}
        </p>
      )}

      {/* Profile sub-tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
        <Link
          to={`/staff/${id}`}
          className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 whitespace-nowrap"
        >
          Details
        </Link>
        <span className="px-4 py-2 text-sm font-medium text-blue-900 border-b-2 border-blue-900 whitespace-nowrap">
          Salary
        </span>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(['overview', 'allowances', 'deductions'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === tab
                ? 'bg-blue-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewSection
          employeeId={id!}
          current={current}
          onSaved={reload}
        />
      )}
      {activeTab === 'allowances' && (
        <AllowanceDeductionSection
          kind="allowance"
          items={allowances}
          typeOptions={ALLOWANCE_TYPES}
          employeeId={id!}
          onSaved={reload}
          isAdmin={isAdmin}
        />
      )}
      {activeTab === 'deductions' && (
        <AllowanceDeductionSection
          kind="deduction"
          items={deductions}
          typeOptions={DEDUCTION_TYPES}
          employeeId={id!}
          onSaved={reload}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

function OverviewSection({
  employeeId,
  current,
  onSaved,
}: {
  employeeId: string;
  current: SalaryStructure | null;
  onSaved: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    basic_salary: current?.basic_salary ?? '',
    payment_frequency: (current?.payment_frequency ?? 'MONTHLY') as PaymentFrequency,
    overtime_rate: current?.overtime_rate ?? '',
  });

  useEffect(() => {
    setForm({
      basic_salary: current?.basic_salary ?? '',
      payment_frequency: (current?.payment_frequency ?? 'MONTHLY') as PaymentFrequency,
      overtime_rate: current?.overtime_rate ?? '',
    });
  }, [current]);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await createSalaryStructure({
        employee: employeeId,
        basic_salary: form.basic_salary,
        payment_frequency: form.payment_frequency,
        overtime_rate: form.overtime_rate || undefined,
      });
      setIsEditing(false);
      onSaved();
    } catch (err) {
      console.error(err);
      setError('Failed to save salary.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      {!isEditing && (
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          {current ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase mb-1">Basic Salary</p>
                <p className="text-2xl font-bold text-blue-900">{formatKES(current.basic_salary)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase mb-1">Payment Frequency</p>
                <p className="font-medium text-slate-800">{current.payment_frequency}</p>
              </div>
              {current.overtime_rate && (
                <div>
                  <p className="text-xs text-slate-400 uppercase mb-1">Overtime Rate</p>
                  <p className="font-medium text-slate-800">{formatKES(current.overtime_rate)}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-400">No salary set for this employee.</p>
          )}
        </div>
      )}

      {error && (
        <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">
          {error}
        </p>
      )}

      {!isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
        >
          {current ? 'Edit Salary' : 'Set Salary'}
        </button>
      )}

      {isEditing && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-700 mb-1">Basic Salary (KES)</label>
              <input
                type="number"
                value={form.basic_salary}
                onChange={(e) => handleChange('basic_salary', e.target.value)}
                required
                className="w-full px-3 py-2 rounded border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">Payment Frequency</label>
              <select
                value={form.payment_frequency}
                onChange={(e) => handleChange('payment_frequency', e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Overtime Rate (optional)</label>
            <input
              type="number"
              value={form.overtime_rate}
              onChange={(e) => handleChange('overtime_rate', e.target.value)}
              className="w-full sm:w-1/2 px-3 py-2 rounded border border-slate-300"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-slate-600 hover:text-slate-800 px-5 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function AllowanceDeductionSection({
  kind,
  items,
  typeOptions,
  employeeId,
  onSaved,
  isAdmin,
}: {
  kind: 'allowance' | 'deduction';
  items: (Allowance | Deduction)[];
  typeOptions: string[];
  employeeId: string;
  onSaved: () => void;
  isAdmin: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: typeOptions[0],
    amount: '',
    is_recurring: true,
    is_taxable: true,
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (kind === 'allowance') {
        await createAllowance({
          employee: employeeId,
          allowance_type: form.type,
          amount: form.amount,
          is_recurring: form.is_recurring,
          is_taxable: form.is_taxable,
        });
      } else {
        await createDeduction({
          employee: employeeId,
          deduction_type: form.type,
          amount: form.amount,
          is_recurring: form.is_recurring,
        });
      }
      setShowForm(false);
      setForm({ type: typeOptions[0], amount: '', is_recurring: true, is_taxable: true });
      onSaved();
    } catch (err) {
      console.error(err);
      setError(`Failed to save ${kind}.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(itemId: string, label: string) {
    if (!confirm(`Delete this ${kind} (${label})? This cannot be undone.`)) return;
    setError(null);
    try {
      if (kind === 'allowance') {
        await deleteAllowance(itemId);
      } else {
        await deleteDeduction(itemId);
      }
      onSaved();
    } catch {
      setError(`Failed to delete ${kind}.`);
    }
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow overflow-x-auto mb-4">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Recurring</th>
              {kind === 'allowance' && <th className="px-4 py-3">Taxable</th>}
              <th className="px-4 py-3">Active</th>
              {isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const typeLabel = 'allowance_type' in item ? item.allowance_type : item.deduction_type;
              return (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{typeLabel}</td>
                  <td className="px-4 py-3">{formatKES(item.amount)}</td>
                  <td className="px-4 py-3 text-slate-500">{item.is_recurring ? 'Yes' : 'No'}</td>
                  {kind === 'allowance' && (
                    <td className="px-4 py-3 text-slate-500">
                      {'is_taxable' in item && item.is_taxable ? 'Yes' : 'No'}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        item.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(item.id, typeLabel)}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1 ml-auto"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-4 py-6 text-center text-slate-400">
                  No {kind}s recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">
          {error}
        </p>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
        >
          + Add {kind === 'allowance' ? 'Allowance' : 'Deduction'}
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 rounded border border-slate-300"
              >
                {typeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">Amount (KES)</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                required
                className="w-full px-3 py-2 rounded border border-slate-300"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_recurring}
                onChange={(e) => setForm((prev) => ({ ...prev, is_recurring: e.target.checked }))}
              />
              Recurring
            </label>
            {kind === 'allowance' && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_taxable}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_taxable: e.target.checked }))}
                />
                Taxable
              </label>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-600 hover:text-slate-800 px-5 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}