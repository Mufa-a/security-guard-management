import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Pencil, Wallet } from 'lucide-react';
import { getInvoice, recordInvoicePayment } from '../../api/invoicesApi';
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

function displayStatus(invoice: Invoice): string {
  // is_overdue is computed server-side and always accurate; it overrides
  // the stored status for display without requiring anyone to manually
  // flip the invoice to OVERDUE first.
  if (invoice.is_overdue) return 'OVERDUE';
  return invoice.status;
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    load(id);
  }, [id]);

  function load(invoiceId: string) {
    getInvoice(invoiceId)
      .then(setInvoice)
      .catch(() => setError('Failed to load invoice.'))
      .finally(() => setIsLoading(false));
  }

  async function handleRecordPayment() {
    if (!id || !paymentAmount) return;
    setPaymentError(null);
    setIsRecording(true);
    try {
      const updated = await recordInvoicePayment(id, Number(paymentAmount));
      setInvoice(updated);
      setPaymentAmount('');
    } catch {
      setPaymentError('Failed to record payment.');
    } finally {
      setIsRecording(false);
    }
  }

  if (isLoading) return <p className="text-slate-500">Loading...</p>;
  if (error || !invoice) return <p className="text-red-600">{error ?? 'Invoice not found.'}</p>;

  const status = displayStatus(invoice);
  const balance = Number(invoice.balance_due);
  const canRecordPayment = invoice.status !== 'CANCELLED' && balance > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 print:hidden">
        <Link to="/invoices" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={14} /> Back to Invoices
        </Link>
        <div className="flex gap-3">
          <Link
            to={`/invoices/${id}/edit`}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-blue-700 hover:underline text-sm border border-blue-200 sm:border-none rounded-lg px-3 py-2 sm:p-0"
          >
            <Pencil size={14} /> Edit
          </Link>
          <button
            onClick={() => window.print()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Printer size={14} /> <span className="hidden xs:inline sm:inline">Print / Save as PDF</span>
            <span className="xs:hidden sm:hidden">Print</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none p-5 sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logo} alt="Crimecurb" className="h-10 w-10 sm:h-12 sm:w-12 object-contain shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-base sm:text-lg leading-tight truncate">Crimecurb Security Services</p>
              <p className="text-xs text-slate-500">Invoice</p>
            </div>
          </div>
          <span className={`shrink-0 px-3 py-1.5 rounded text-xs font-semibold ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'}`}>
            {status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
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

        <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
          <table className="w-full text-sm mb-2 min-w-[420px]">
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
        </div>

        <div className="flex flex-col items-end gap-2 mt-4">
          <div className="w-full sm:w-56 flex justify-between items-center text-sm px-1">
            <p className="text-slate-500">Subtotal</p>
            <p className="text-slate-700">{formatKES(Number(invoice.subtotal))}</p>
          </div>
          {Number(invoice.amount_paid) > 0 && (
            <div className="w-full sm:w-56 flex justify-between items-center text-sm px-1">
              <p className="text-slate-500">Amount Paid</p>
              <p className="text-emerald-600">{formatKES(Number(invoice.amount_paid))}</p>
            </div>
          )}
          <div className="w-full sm:w-56 flex justify-between items-center bg-blue-50 rounded-lg px-3 py-3">
            <p className="font-bold text-slate-800">Balance Due</p>
            <p className="font-bold text-blue-900">{formatKES(balance)}</p>
          </div>
        </div>

        {canRecordPayment && (
          <div className="mt-6 pt-4 border-t border-slate-200 print:hidden">
            <p className="text-xs text-slate-400 uppercase mb-2">Record a Payment</p>
            {paymentError && <p className="text-red-600 text-sm mb-2">{paymentError}</p>}
            <div className="flex gap-2">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={`Up to ${formatKES(balance)}`}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
              <button
                onClick={handleRecordPayment}
                disabled={isRecording || !paymentAmount}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors shrink-0"
              >
                <Wallet size={14} /> {isRecording ? 'Recording...' : 'Record'}
              </button>
            </div>
            {balance <= 0 && (
              <p className="text-xs text-emerald-600 mt-2">
                Balance is fully covered — consider marking this invoice as Paid via Edit.
              </p>
            )}
          </div>
        )}

        {invoice.notes && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-400 uppercase mb-1">Notes</p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">{invoice.notes}</p>
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