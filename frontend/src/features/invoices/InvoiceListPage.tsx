import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  FileText,
  Wallet,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { getInvoices, deleteInvoice } from '../../api/invoicesApi';
import { useAuth } from '../auth/AuthContext';
import type { Invoice } from '../../types/invoices';

type SortKey = 'newest' | 'due_date' | 'client';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-200 text-slate-500',
};

function displayStatus(inv: Invoice): string {
  // is_overdue is computed server-side and always accurate, so it takes
  // precedence over the stored status for display and filtering without
  // requiring anyone to manually flip an invoice to OVERDUE.
  if (inv.is_overdue) return 'OVERDUE';
  return inv.status;
}

function formatKES(value: number): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3 shadow-sm">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 uppercase tracking-wide truncate">{label}</p>
        <p className="text-lg font-bold text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function InvoiceListPage() {
  const { user } = useAuth();
  const canDelete = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');

  function load() {
    setIsLoading(true);
    setError(null);
    getInvoices()
      .then(setInvoices)
      .catch(() => setError('Failed to load invoices.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, number: string) {
    if (!confirm(`Delete invoice ${number}? This cannot be undone.`)) return;
    setActionError(null);
    try {
      await deleteInvoice(id);
      load();
    } catch {
      setActionError('Failed to delete invoice.');
    }
  }

  const filtered = useMemo(() => {
    let list = invoices.filter((inv) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.client_name.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || displayStatus(inv) === statusFilter;
      return matchesSearch && matchesStatus;
    });

    list = [...list].sort((a, b) => {
      if (sortKey === 'client') return a.client_name.localeCompare(b.client_name);
      if (sortKey === 'due_date') return a.due_date.localeCompare(b.due_date);
      return b.issue_date.localeCompare(a.issue_date); // newest first
    });

    return list;
  }, [invoices, search, statusFilter, sortKey]);

  const kpis = useMemo(() => {
    const outstanding = invoices
      .filter((i) => {
        const s = displayStatus(i);
        return s === 'SENT' || s === 'OVERDUE';
      })
      .reduce((sum, i) => sum + Number(i.balance_due), 0);
    const overdueCount = invoices.filter((i) => displayStatus(i) === 'OVERDUE').length;
    const paidTotal = invoices
      .filter((i) => i.status === 'PAID')
      .reduce((sum, i) => sum + Number(i.amount_paid), 0);

    return { total: invoices.length, outstanding, overdueCount, paidTotal };
  }, [invoices]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
          <p className="text-sm text-slate-400 mt-0.5">Track billing across all clients.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg border border-slate-200 shrink-0"
          >
            <RefreshCw size={14} /> <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            to="/invoices/new"
            className="flex-1 sm:flex-none text-center bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add Invoice
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryCard icon={FileText} label="Total Invoices" value={String(kpis.total)} tone="bg-blue-900/10 text-blue-900" />
        <SummaryCard icon={Wallet} label="Outstanding" value={formatKES(kpis.outstanding)} tone="bg-amber-100 text-amber-700" />
        <SummaryCard icon={AlertTriangle} label="Overdue" value={String(kpis.overdueCount)} tone="bg-red-100 text-red-700" />
        <SummaryCard icon={CheckCircle2} label="Paid" value={formatKES(kpis.paidTotal)} tone="bg-emerald-100 text-emerald-700" />
      </div>

      {actionError && (
        <p className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4 border border-red-200">{actionError}</p>
      )}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice # or client"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="PAID">Paid</option>
          <option value="OVERDUE">Overdue</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2"
        >
          <option value="newest">Sort: Newest</option>
          <option value="due_date">Sort: Due Date</option>
          <option value="client">Sort: Client</option>
        </select>
      </div>

      {isLoading && <p className="text-slate-500 text-sm">Loading invoices...</p>}

      {!isLoading && !error && (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden sm:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Issue Date</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const status = displayStatus(inv);
                  return (
                    <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <Link to={`/invoices/${inv.id}`} className="hover:underline">{inv.invoice_number}</Link>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{inv.client_name}</td>
                      <td className="px-4 py-3 text-slate-500">{inv.issue_date}</td>
                      <td className="px-4 py-3 text-slate-500">{inv.due_date}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {formatKES(Number(inv.balance_due))}
                        {Number(inv.amount_paid) > 0 && (
                          <span className="block text-xs font-normal text-emerald-600">
                            {formatKES(Number(inv.amount_paid))} paid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end items-center gap-3">
                          <Link to={`/invoices/${inv.id}/edit`} className="text-blue-700 hover:underline flex items-center gap-1">
                            <Pencil size={14} /> Edit
                          </Link>
                          {canDelete && (
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
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No invoices match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden space-y-3">
            {filtered.map((inv) => {
              const status = displayStatus(inv);
              return (
                <div key={inv.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <Link to={`/invoices/${inv.id}`} className="font-semibold text-slate-800 hover:underline">
                        {inv.invoice_number}
                      </Link>
                      <p className="text-sm text-slate-500 truncate">{inv.client_name}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                    <div>
                      <p className="text-slate-400">Issued</p>
                      <p className="text-slate-700">{inv.issue_date}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Due</p>
                      <p className="text-slate-700">{inv.due_date}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div>
                      <p className="font-bold text-blue-900">{formatKES(Number(inv.balance_due))}</p>
                      {Number(inv.amount_paid) > 0 && (
                        <p className="text-xs text-emerald-600">{formatKES(Number(inv.amount_paid))} paid</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <Link to={`/invoices/${inv.id}/edit`} className="text-blue-700 text-sm flex items-center gap-1">
                        <Pencil size={14} /> Edit
                      </Link>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(inv.id, inv.invoice_number)}
                          className="text-red-600 text-sm flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-slate-400 text-center py-10">No invoices match your filters.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}