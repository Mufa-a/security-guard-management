import { useEffect, useState } from 'react';
import { getSites, getClients } from '../../api/sitesApi';
import { getMyIncidents } from '../../api/incidentsApi';
import { getInvoices } from '../../api/invoicesApi';
import { getEmployeeProfiles } from '../../api/staffApi';

export default function ReportsPage() {
  const [counts, setCounts] = useState({
    clients: 0, sites: 0, staff: 0, openIncidents: 0, unpaidInvoiceTotal: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getClients(), getSites(), getEmployeeProfiles(), getMyIncidents(), getInvoices(),
    ])
      .then(([clients, sites, staff, incidents, invoices]) => {
        const openIncidents = incidents.filter((i) => i.status === 'OPEN' || i.status === 'UNDER_REVIEW').length;
        const unpaidInvoiceTotal = invoices
          .filter((inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
          .reduce((sum, inv) => sum + Number(inv.subtotal), 0);
        setCounts({ clients: clients.length, sites: sites.length, staff: staff.length, openIncidents, unpaidInvoiceTotal });
      })
      .catch(() => setError('Failed to load report data.'))
      .finally(() => setIsLoading(false));
  }, []);

  const cards = [
    {
      label: 'Clients',
      value: counts.clients,
      accent: 'bg-slate-300',
      icon: (
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      ),
    },
    {
      label: 'Sites',
      value: counts.sites,
      accent: 'bg-slate-300',
      icon: (
        <>
          <path d="M12 22s-8-6-8-12a8 8 0 0 1 16 0c0 6-8 12-8 12Z" />
          <circle cx="12" cy="10" r="2.6" />
        </>
      ),
    },
    {
      label: 'Staff',
      value: counts.staff,
      accent: 'bg-slate-300',
      icon: (
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      ),
    },
    {
      label: 'Open Incidents',
      value: counts.openIncidents,
      accent: counts.openIncidents > 0 ? 'bg-[#A8433A]' : 'bg-emerald-400',
      status:
        counts.openIncidents > 0
          ? { text: 'Needs review', tone: 'warn' as const }
          : { text: 'All clear', tone: 'ok' as const },
      icon: (
        <>
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </>
      ),
    },
    {
      label: 'Outstanding Invoices (KES)',
      value: counts.unpaidInvoiceTotal.toLocaleString(),
      accent: counts.unpaidInvoiceTotal > 0 ? 'bg-[#A9822F]' : 'bg-emerald-400',
      status:
        counts.unpaidInvoiceTotal > 0
          ? { text: 'Outstanding', tone: 'warn' as const }
          : { text: 'Fully collected', tone: 'ok' as const },
      icon: (
        <path d="M3 10h18M7 15h2M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
      ),
    },
  ];

  return (
    <div className="px-2">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#A9822F] mb-2">
          Operations · Reports
        </p>
        <h1 className="font-['Fraunces',_serif] text-[32px] font-semibold text-[#0B1A32] mb-1.5">
          Reports
        </h1>
        <p className="text-sm text-[#5C6A82] max-w-md">
          A consolidated view of clients, sites, staffing and billing across your operation.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-[#5C6A82]">Loading report data…</p>
      )}

      {error && (
        <div className="rounded-lg border border-[#F5E6E4] bg-[#FBF1F0] px-4 py-3 text-sm text-[#A8433A]">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {cards.map((c) => (
            <div
              key={c.label}
              className="relative overflow-hidden rounded-xl border border-[#E3E7EE] bg-white p-4.5 pt-5"
            >
              <span className={`absolute top-0 left-0 right-0 h-[3px] ${c.accent}`} />

              <div className="flex items-start justify-between mb-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[#5C6A82]">
                  {c.label}
                </p>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#16294A"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 opacity-60 shrink-0"
                >
                  {c.icon}
                </svg>
              </div>

              <p className="font-mono text-[26px] font-semibold text-[#0B1A32] leading-none truncate">
                {c.value}
              </p>

              {c.status && (
                <span
                  className={`inline-block mt-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    c.status.tone === 'warn'
                      ? 'bg-[#F5E6E4] text-[#A8433A]'
                      : 'bg-[#E4EFE9] text-[#2F6E52]'
                  }`}
                >
                  {c.status.text}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}