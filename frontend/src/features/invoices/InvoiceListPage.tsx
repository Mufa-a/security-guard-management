import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { getInvoices, deleteInvoice } from '../../api/invoicesApi';
import { useAuth } from '../auth/AuthContext';
import type { Invoice } from '../../types/invoices';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-200 text-slate-500',
};

export default function InvoiceListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    getInvoices().then(setInvoices).catch(() => setError('Failed to load invoices.')).finally(() => setIsLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, number: string) {
    if (!confirm(`Delete invoice ${number}? This cannot be undone.`)) return;
    try {
      await deleteInvoice(id);
      load();
    } catch {
      setError('Failed to delete invoice.');
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
        <Link to="/invoices/new" className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded transition-colors inline-block text-center">
          + Add Invoice
        </Link>
      </div>

      {isLoading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {!isLoading && !error && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Issue Date</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Subtotal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-slate-500">{inv.client_name}</td>
                  <td className="px-4 py-3 text-slate-500">{inv.issue_date}</td>
                  <td className="px-4 py-3 text-slate-500">{inv.due_date}</td>
                  <td className="px-4 py-3 text-slate-500">{Number(inv.subtotal).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[inv.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end items-center gap-3">
                      <Link to={`/invoices/${inv.id}`} className="text-blue-700 hover:underline flex items-center gap-1">
                        <Pencil size={14} /> Edit
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(inv.id, inv.invoice_number)}
                          className="text-red-600 hover:text-red-800 flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No invoices yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}