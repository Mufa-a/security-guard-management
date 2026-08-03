import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { getClients } from '../../api/sitesApi';
import { createInvoice, getInvoice, updateInvoice } from '../../api/invoicesApi';
import type { Client } from '../../types/sites';
import type { Invoice } from '../../types/invoices';

const STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

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
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {isEditMode ? 'Edit Invoice' : 'Add Invoice'}
        </h1>
        {isEditMode && id && (
          <Link
            to={`/invoices/${id}/line-items`}
            className="flex items-center gap-1.5 text-sm text-blue-700 hover:underline"
          >
            <Receipt size={15} /> Manage Line Items
          </Link>
        )}
      </div>

      {error && <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">{error}</p>}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm text-slate-700 mb-1">Client</label>
          <select
            value={form.client}
            onChange={(e) => handleChange('client', e.target.value)}
            required
            className="w-full px-3 py-2 rounded border border-slate-300"
          >
            <option value="">Select a client...</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {isEditMode && invoice && (
            <div>
              <label className="block text-sm text-slate-700 mb-1">Invoice Number</label>
              <input
                value={invoice.invoice_number}
                disabled
                className="w-full px-3 py-2 rounded border border-slate-300 bg-slate-50 text-slate-500"
              />
            </div>
          )}
          <div className={isEditMode ? '' : 'col-span-2'}>
            <label className="block text-sm text-slate-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Issue Date</label>
            <input
              type="date"
              value={form.issue_date}
              onChange={(e) => handleChange('issue_date', e.target.value)}
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
              required
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
          <button type="submit" disabled={isSubmitting} className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50">
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={() => navigate('/invoices')} className="text-slate-600 hover:text-slate-800 px-5 py-2">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}