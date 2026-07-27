import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createExpense, getExpense, updateExpense } from '../../api/expensesApi';
import type { ExpenseCategory, ExpenseStatus } from '../../types/expenses';

const CATEGORIES: ExpenseCategory[] = [
  'FUEL', 'EQUIPMENT', 'VEHICLE_MAINTENANCE', 'RENT_UTILITIES', 'LICENSES', 'OTHER',
];
const STATUSES: ExpenseStatus[] = ['PENDING', 'PAID', 'OVERDUE'];

export default function ExpenseFormPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: 'OTHER' as ExpenseCategory,
    vendor_name: '',
    description: '',
    amount: '',
    expense_date: '',
    due_date: '',
    payment_date: '',
    status: 'PENDING' as ExpenseStatus,
    notes: '',
  });

  useEffect(() => {
    if (isEditMode && id) {
      getExpense(id).then((e) => {
        setForm({
          category: e.category,
          vendor_name: e.vendor_name,
          description: e.description,
          amount: e.amount,
          expense_date: e.expense_date,
          due_date: e.due_date ?? '',
          payment_date: e.payment_date ?? '',
          status: e.status,
          notes: e.notes,
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

    const payload = {
      ...form,
      due_date: form.due_date || undefined,
      payment_date: form.payment_date || undefined,
    };

    try {
      if (isEditMode && id) {
        await updateExpense(id, payload);
      } else {
        await createExpense(payload);
      }
      navigate('/expenses');
    } catch {
      setError('Failed to save expense. Check required fields.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        {isEditMode ? 'Edit Expense' : 'Add Expense'}
      </h1>

      {error && (
        <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm text-slate-700 mb-1">Description</label>
          <input
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            required
            className="w-full px-3 py-2 rounded border border-slate-300"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Vendor Name</label>
            <input
              value={form.vendor_name}
              onChange={(e) => handleChange('vendor_name', e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Amount (KES)</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              required
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Expense Date</label>
            <input
              type="date"
              value={form.expense_date}
              onChange={(e) => handleChange('expense_date', e.target.value)}
              required
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => handleChange('due_date', e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Payment Date</label>
            <input
              type="date"
              value={form.payment_date}
              onChange={(e) => handleChange('payment_date', e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded border border-slate-300"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/expenses')}
            className="text-slate-600 hover:text-slate-800 px-5 py-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}