export interface AttendanceFilterState {
  search: string;
  status: string; // '' = all
  site: string; // '' = all
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'SCHEDULED', label: 'Not yet due' },
  { value: 'PRESENT', label: 'Present' },
  { value: 'PRESENT_LATE', label: 'Late' },
  { value: 'PRESENT_LATE_APPROVED', label: 'Late (approved)' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'ON_LEAVE', label: 'On leave' },
  { value: 'OFF_DUTY', label: 'Off duty' },
];

export default function AttendanceFilters({
  value,
  onChange,
  siteOptions,
  activeCount,
}: {
  value: AttendanceFilterState;
  onChange: (next: AttendanceFilterState) => void;
  siteOptions: string[];
  activeCount: number;
}) {
  return (
    <div className="sticky top-0 z-10 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_1px_2px_rgba(15,27,61,0.06)] p-3 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
          />
        </svg>
        <input
          type="text"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="Search guard or site…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1B3D]/20 focus:border-[#0F1B3D]/40"
        />
      </div>

      <select
        value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value })}
        className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1B3D]/20"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={value.site}
        onChange={(e) => onChange({ ...value, site: e.target.value })}
        className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1B3D]/20"
      >
        <option value="">All sites</option>
        {siteOptions.map((site) => (
          <option key={site} value={site}>
            {site}
          </option>
        ))}
      </select>

      {activeCount > 0 && (
        <button
          onClick={() => onChange({ search: '', status: '', site: '' })}
          className="text-xs font-medium text-[#C81E3A] hover:underline px-2 py-2"
        >
          Clear filters ({activeCount})
        </button>
      )}
    </div>
  );
}