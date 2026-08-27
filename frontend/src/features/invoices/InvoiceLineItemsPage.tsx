import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { getInvoice, createLineItem, deleteLineItem } from '../../api/invoicesApi';
import type { Invoice } from '../../types/invoices';

const inputClasses =
  'w-full px-3 py-2.5 rounded-lg border border-slate-300 text-slate-800 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors';

function formatKES(value: number): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
}

export default function InvoiceLineItemsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [lineItem, setLineItem] = useState({ description: '', quantity: '1', unit_price: '' });

  useEffect(() => {
    if (id) load(id);
  }, [id]);

  function load(invoiceId: string) {
    getInvoice(invoiceId)
      .then(setInvoice)
      .catch(() => setError('Failed to load invoice.'))
      .finally(() => setIsLoading(false));
  }

  const previewTotal = useMemo(() => {
    const qty = Number(lineItem.quantity) || 0;
    const price = Number(lineItem.unit_price) || 0;
    return qty * price;
  }, [lineItem.quantity, lineItem.unit_price]);

  async function handleAdd() {
    if (!id || !lineItem.description || !lineItem.unit_price) return;
    setError(null);
    setIsAdding(true);
    try {
      await createLineItem({
        invoice: id,
        description: lineItem.description,
        quantity: Number(lineItem.quantity),
        unit_price: Number(lineItem.unit_price),
      });
      setLineItem({ description: '', quantity: '1', unit_price: '' });
      load(id);
    } catch {
      setError('Failed to add line item.');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove(itemId: string) {
    if (!id) return;
    setRemovingId(itemId);
    try {
      await deleteLineItem(itemId);
      load(id);
    } catch {
      setError('Failed to remove line item.');
    } finally {
      setRemovingId(null);
    }
  }

  if (isLoading) return <p className="text-slate-500">Loading...</p>;
  if (!invoice) return <p className="text-red-600">Invoice not found.</p>;

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <Link to={`/invoices/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-4">
        <ArrowLeft size={14} /> Back to Invoice Details
      </Link>

      <h1 className="text-2xl font-bold text-slate-800 mb-1">Line Items</h1>
      <p className="text-sm text-slate-500 mb-6">Invoice {invoice.invoice_number} — {invoice.client_name}</p>

      {error && (
        <p className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4 border border-red-200">{error}</p>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 mb-6">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Add a line item</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            placeholder="Description"
            value={lineItem.description}
            onChange={(e) => setLineItem({ ...lineItem, description: e.target.value })}
            className={inputClasses + ' sm:col-span-2'}
          />
          <input
            type="number"
            min="1"
            placeholder="Qty"
            value={lineItem.quantity}
            onChange={(e) => setLineItem({ ...lineItem, quantity: e.target.value })}
            className={inputClasses}
          />
          <input
            type="number"
            min="0"
            placeholder="Unit Price"
            value={lineItem.unit_price}
            onChange={(e) => setLineItem({ ...lineItem, unit_price: e.target.value })}
            className={inputClasses}
          />
        </div>
        <div className="flex items-center justify-between mt-3 gap-3">
          <p className="text-sm text-slate-500">
            Line total: <span className="font-semibold text-slate-800">{formatKES(previewTotal)}</span>
          </p>
          <button
            onClick={handleAdd}
            disabled={isAdding || !lineItem.description || !lineItem.unit_price}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors shrink-0"
          >
            <Plus size={15} /> {isAdding ? 'Adding...' : 'Add Item'}
          </button>
        </div>
      </div>

      {/* Desktop / tablet table */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
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
                <td className="px-4 py-3">{formatKES(Number(li.unit_price))}</td>
                <td className="px-4 py-3 font-medium">{formatKES(Number(li.total_price))}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleRemove(li.id)}
                    disabled={removingId === li.id}
                    className="text-red-600 hover:underline disabled:opacity-50"
                  >
                    {removingId === li.id ? 'Removing...' : 'Remove'}
                  </button>
                </td>
              </tr>
            ))}
            {invoice.line_items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No line items yet — add one above.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td colSpan={3} className="px-4 py-3 text-right font-semibold">Subtotal</td>
              <td colSpan={2} className="px-4 py-3 font-bold text-blue-900">{formatKES(Number(invoice.subtotal))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-3">
        {invoice.line_items.map((li) => (
          <div key={li.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-slate-800 font-medium min-w-0 break-words">{li.description}</p>
              <button
                onClick={() => handleRemove(li.id)}
                disabled={removingId === li.id}
                className="text-red-600 shrink-0 disabled:opacity-50"
                aria-label={`Remove ${li.description}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-500">
              <p>{li.quantity} × {formatKES(Number(li.unit_price))}</p>
              <p className="font-semibold text-slate-800">{formatKES(Number(li.total_price))}</p>
            </div>
          </div>
        ))}
        {invoice.line_items.length === 0 && (
          <p className="text-slate-400 text-center py-8">No line items yet — add one above.</p>
        )}
        {invoice.line_items.length > 0 && (
          <div className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3">
            <p className="font-semibold text-slate-800">Subtotal</p>
            <p className="font-bold text-blue-900">{formatKES(Number(invoice.subtotal))}</p>
          </div>
        )}
      </div>

      {invoice.line_items.length > 0 && (
        <button
          onClick={() => navigate(`/invoices/${id}`)}
          className="w-full sm:w-auto mt-6 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          <CheckCircle2 size={15} /> Done — View Invoice
        </button>
      )}
    </div>
  );
}