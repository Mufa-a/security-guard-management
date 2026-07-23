import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getClients } from '../../api/sitesApi';
import {
  createInvoice, getInvoice, updateInvoice, createLineItem, deleteLineItem,
} from '../../api/invoicesApi';
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
    client: '', invoice_number: '', issue_date: '', due_date: '', status: 'DRAFT', notes: '',
  });

  const [lineItem, setLineItem] = useState({ description: '', quantity: '1', unit_price: '' });
  const [lineItemError, setLineItemError] = useState<string | null>(null);

  useEffect(() => {
    getClients().then(setClients).catch(() => setError('Failed to load clients.'));
    if (isEditMode && id) loadInvoice(id);
  }, [id, isEditMode]);

  function loadInvoice(invoiceId: string) {
    getInvoice(invoiceId).then((inv) => {
      setInvoice(inv);
      setForm({
        client: inv.client, invoice_number: inv.invoice_number, issue_date: inv.issue_date,
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
        loadInvoice(id);
      } else {
        const created = await createInvoice(form);
        navigate(`/invoices/${created.id}`);
        return;
      }
    } catch {
      setError('Failed to save invoice. Check required fields.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddLineItem() {
    if (!id || !lineItem.description || !lineItem.unit_price) return;
    setLineItemError(null);
    try {
      await createLineItem({
        invoice: id,
        description: lineItem.description,
        quantity: Number(lineItem.quantity),
        unit_price: Number(lineItem.unit_price),
      });
      setLineItem({ description: '', quantity: '1', unit_price: '' });
      loadInvoice(id);
    } catch {
      setLineItemError('Failed to add line item.');
    }
  }

  async function handleRemoveLineItem(itemId: string) {
    if (!id) return;
    try {
      await deleteLineItem(itemId);
      loadInvoice(id);
    } catch {
      setLineItemError('Failed to remove line item.');
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        {isEditMode ? 'Edit Invoice' : 'Add Invoice'}
      </h1>

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
          <div>
            <label className="block text-sm text-slate-700 mb-1">Invoice Number</label>
            <input
              value={form.invoice_number}
              onChange={(e) => handleChange('invoice_number', e.target.value)}
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
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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

      {isEditMode && invoice && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-800 mb-3">Line Items</h2>
          {lineItemError && <p className="text-red-600 text-sm mb-2">{lineItemError}</p>}

          <div className="bg-white rounded-lg shadow p-4 mb-4 grid grid-cols-4 gap-3">
            <input
              placeholder="Description"
              value={lineItem.description}
              onChange={(e) => setLineItem({ ...lineItem, description: e.target.value })}
              className="col-span-2 px-3 py-2 rounded border border-slate-300"
            />
            <input
              type="number"
              placeholder="Qty"
              value={lineItem.quantity}
              onChange={(e) => setLineItem({ ...lineItem, quantity: e.target.value })}
              className="px-3 py-2 rounded border border-slate-300"
            />
            <input
              type="number"
              placeholder="Unit Price"
              value={lineItem.unit_price}
              onChange={(e) => setLineItem({ ...lineItem, unit_price: e.target.value })}
              className="px-3 py-2 rounded border border-slate-300"
            />
            <button
              onClick={handleAddLineItem}
              className="col-span-4 bg-blue-900 hover:bg-blue-800 text-white text-sm py-2 rounded"
            >
              + Add Line Item
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invoice.line_items.map((li) => (
                  <tr key={li.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{li.description}</td>
                    <td className="px-4 py-3">{li.quantity}</td>
                    <td className="px-4 py-3">{Number(li.unit_price).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium">{Number(li.total_price).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleRemoveLineItem(li.id)} className="text-red-600 hover:underline">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold">Subtotal</td>
                  <td colSpan={2} className="px-4 py-3 font-bold text-blue-900">{Number(invoice.subtotal).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}