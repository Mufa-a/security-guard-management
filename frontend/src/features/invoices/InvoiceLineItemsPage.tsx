import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getInvoice, createLineItem, deleteLineItem } from '../../api/invoicesApi';
import type { Invoice } from '../../types/invoices';

export default function InvoiceLineItemsPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  async function handleAdd() {
    if (!id || !lineItem.description || !lineItem.unit_price) return;
    setError(null);
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
    }
  }

  async function handleRemove(itemId: string) {
    if (!id) return;
    try {
      await deleteLineItem(itemId);
      load(id);
    } catch {
      setError('Failed to remove line item.');
    }
  }

  if (isLoading) return <p className="text-slate-500">Loading...</p>;
  if (!invoice) return <p className="text-red-600">Invoice not found.</p>;

  return (
    <div className="max-w-2xl">
      <Link to={`/invoices/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={14} /> Back to Invoice Details
      </Link>

      <h1 className="text-2xl font-bold text-slate-800 mb-1">Line Items</h1>
      <p className="text-sm text-slate-500 mb-6">Invoice {invoice.invoice_number} — {invoice.client_name}</p>

      {error && <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">{error}</p>}

      <div className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
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
        <button onClick={handleAdd} className="col-span-2 sm:col-span-4 bg-blue-900 hover:bg-blue-800 text-white text-sm py-2 rounded">
          + Add Line Item
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
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
                <td className="px-4 py-3">{Number(li.unit_price).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium">{Number(li.total_price).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleRemove(li.id)} className="text-red-600 hover:underline">Remove</button>
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
  );
}