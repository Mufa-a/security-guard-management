import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getExpenses, deleteExpense } from '../../api/expensesApi';
import { useAuth } from '../auth/AuthContext';
import type { Expense } from '../../types/expenses';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-red-100 text-red-700',
};

function formatKES(value: string): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(parseFloat(value));
}

export default function ExpenseListPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    getExpenses()
      .then(setExpenses)
      .catch(() => setError('Failed to load expenses.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, description: string) {
    if (!confirm(`Delete expense "${description}"? This cannot be undone.`)) return;
    try {
      await deleteExpense(id);
      load();
    } catch {
      setError('Failed to delete expense.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Expenses</h1>
        {canManage && (
          <Link
            to="/expenses/new"
            className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            + Add Expense
          </Link>
        )}
      </div>

      {isLoading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {!isLoading && !error && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Expense Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{exp.description}</td>
                  <td className="px-4 py-3 text-slate-600">{exp.category.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-slate-600">{exp.vendor_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-800">{formatKES(exp.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{exp.expense_date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[exp.status]}`}>
                      {exp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage && (
                      <div className="flex justify-end items-center gap-3">
                        <Link to={`/expenses/${exp.id}`} className="text-blue-700 hover:underline">Edit</Link>
                        <button
                          onClick={() => handleDelete(exp.id, exp.description)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No expenses recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}