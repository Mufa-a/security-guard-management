import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Receipt, ArrowLeft } from 'lucide-react';
import { getClients } from '../../api/sitesApi';
import { createInvoice, getInvoice, updateInvoice } from '../../api/invoicesApi';
import type { Client } from '../../types/sites';
import type { Invoice } from '../../types/invoices';

const STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

const inputClasses =
  'w-full px-3 py-2.5 rounded-lg border border-slate-300 text-slate-800 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors';

export default function InvoiceFormPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    client: '', issue_date: '', due_date: '', status: 'DRAFT', notes: '',
  });

  useEffect(() => {
    getClients().then(setClients).catch(() => setError('Failed to load clients.'));
    if (isEditMode && id) loadInvoice(id);
  }, [id, isEditMode]);

  function loadInvoice(invoiceId: string) {
    getInvoice(invoiceId).then((inv) => {
      setInvoice(inv);
      setForm({
        client: inv.client, issue_date: inv.issue_date,
        due_date: inv.due_date, status: inv.status, notes: inv.notes,
      });
    });
  }

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (isEditMode && id) {
        await updateInvoice(id, form);
        navigate('/invoices');
      } else {
        const created = await createInvoice(form);
        // Redirect to the dedicated line-items page for this new invoice.
        navigate(`/invoices/${created.id}/line-items`);
      }
    } catch {
      setError('Failed to save invoice. Check required fields.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-24 sm:pb-0">
      <Link
        to="/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-4 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Invoices
      </Link>

      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold text-slate-800">
          {isEditMode ? 'Edit Invoice' : 'Add Invoice'}
        </h1>
        {isEditMode && id && (
          <Link
            to={`/invoices/${id}/line-items`}
            className="flex items-center gap-1.5 text-sm text-blue-700 hover:underline shrink-0"
          >
            <Receipt size={15} /> <span className="hidden sm:inline">Manage</span> Line Items
          </Link>
        )}
      </div>

      {error && (
        <p className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4 border border-red-200">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Client</label>
          <select
            value={form.client}
            onChange={(e) => handleChange('client', e.target.value)}
            required
            className={inputClasses}
          >
            <option value="">Select a client...</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isEditMode && invoice && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Invoice Number</label>
              <input
                value={invoice.invoice_number}
                disabled
                className={inputClasses + ' bg-slate-50 text-slate-500'}
              />
            </div>
          )}
          <div className={isEditMode ? '' : 'sm:col-span-2'}>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className={inputClasses}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Issue Date</label>
            <input
              type="date"
              value={form.issue_date}
              onChange={(e) => handleChange('issue_date', e.target.value)}
              required
              className={inputClasses}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => handleChange('due_date', e.target.value)}
              required
              min={form.issue_date || undefined}
              className={inputClasses}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            placeholder="Optional — shown on the printed invoice"
            className={inputClasses}
          />
        </div>

        {!isEditMode && (
          <p className="text-xs text-slate-400 -mt-1">
            After saving, you'll be taken straight to add line items for this invoice.
          </p>
        )}

        {/* Desktop actions */}
        <div className="hidden sm:flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="text-slate-500 hover:text-slate-800 px-5 py-2.5"
          >
            Cancel
          </button>
        </div>

        {/* Mobile sticky actions */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex gap-3 z-10">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="flex-1 text-slate-600 border border-slate-300 px-5 py-2.5 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}