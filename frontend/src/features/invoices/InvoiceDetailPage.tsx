import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { getInvoice } from '../../api/invoicesApi';
import type { Invoice } from '../../types/invoices';
import logo from '../../assets/crimecurb-logo.png';

function formatKES(value: number): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(value);
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-400',
};

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getInvoice(id)
      .then(setInvoice)
      .catch(() => setError('Failed to load invoice.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <p className="text-slate-500">Loading...</p>;
  if (error || !invoice) return <p className="text-red-600">{error ?? 'Invoice not found.'}</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link to="/invoices" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={14} /> Back to Invoices
        </Link>
        <div className="flex gap-3">
          <Link to={`/invoices/${id}/edit`} className="text-blue-700 hover:underline text-sm self-center">
            Edit
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            <Printer size={14} /> Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow print:shadow-none p-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Crimecurb" className="h-12 w-12 object-contain" />
            <div>
              <p className="font-bold text-slate-800 text-lg leading-tight">Crimecurb Security Services</p>
              <p className="text-xs text-slate-500">Invoice</p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded text-xs font-semibold ${STATUS_STYLES[invoice.status] ?? 'bg-slate-100 text-slate-600'}`}>
            {invoice.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-slate-400 text-xs uppercase mb-1">Invoice Number</p>
            <p className="font-medium text-slate-800">{invoice.invoice_number}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase mb-1">Bill To</p>
            <p className="font-medium text-slate-800">{invoice.client_name}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase mb-1">Issue Date</p>
            <p className="font-medium text-slate-800">{invoice.issue_date}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase mb-1">Due Date</p>
            <p className="font-medium text-slate-800">{invoice.due_date}</p>
          </div>
        </div>

        <table className="w-full text-sm mb-2">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase">
              <th className="text-left py-2">Description</th>
              <th className="text-right py-2">Qty</th>
              <th className="text-right py-2">Unit Price</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.line_items.map((li) => (
              <tr key={li.id} className="border-b border-slate-100">
                <td className="py-2 text-slate-700">{li.description}</td>
                <td className="py-2 text-right text-slate-600">{li.quantity}</td>
                <td className="py-2 text-right text-slate-600">{formatKES(Number(li.unit_price))}</td>
                <td className="py-2 text-right font-medium text-slate-800">{formatKES(Number(li.total_price))}</td>
              </tr>
            ))}
            {invoice.line_items.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-400">No line items yet.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex justify-end mt-4">
          <div className="w-48 flex justify-between items-center bg-blue-50 rounded px-3 py-3">
            <p className="font-bold text-slate-800">Subtotal</p>
            <p className="font-bold text-blue-900">{formatKES(Number(invoice.subtotal))}</p>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-400 uppercase mb-1">Notes</p>
            <p className="text-sm text-slate-600">{invoice.notes}</p>
          </div>
        )}

        <div className="text-center text-xs text-slate-400 mt-8 pt-4 border-t border-slate-200">
          <p>Generated by Erip <span className="text-purple-600 font-semibold">⚡</span> Technologies</p>
          <p>0710951879</p>
        </div>
      </div>
    </div>
  );
}