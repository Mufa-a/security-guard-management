// Presentation-only helpers. No business logic, no calculations —
// purely formatting values that already come from the API.

export function formatKES(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(num);
}

export function formatKESCompact(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency', currency: 'KES', maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString('en-KE', { day: 'numeric', month: sameMonth ? undefined : 'short' });
  const endLabel = end.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startLabel} — ${endLabel}`;
}

export function periodMonthLabel(startIso: string): string {
  return new Date(startIso).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
}