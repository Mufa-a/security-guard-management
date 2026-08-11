import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Clock, UserX, AlertTriangle, LogIn, CalendarClock, MapPinned } from 'lucide-react';
import { getLiveMetrics } from '../../api/dashboardApi';
import type { LiveMetrics } from '../../api/dashboardApi';

const REFRESH_INTERVAL_MS = 60000;

function MetricCard({
  icon: Icon,
  label,
  value,
  isLoading,
  tone = 'default',
  to,
}: {
  icon: React.ElementType;
  label: string;
  value: number | undefined;
  isLoading: boolean;
  tone?: 'default' | 'success' | 'warning' | 'critical';
  to?: string;
}) {
  const toneClasses: Record<string, string> = {
    default: 'text-slate-700',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    critical: 'text-crimecurb-red',
  };

  const content = (
    <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 text-slate-400 mb-2">
        <Icon size={15} strokeWidth={1.75} />
        <span className="text-[11px] font-mono uppercase tracking-wide">{label}</span>
      </div>
      {isLoading ? (
        <span className="inline-block w-10 h-6 bg-slate-100 rounded animate-pulse" />
      ) : (
        <span className={`font-display text-2xl font-bold tabular-nums ${toneClasses[tone]}`}>{value ?? 0}</span>
      )}
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

export default function LiveMetricsPanel() {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load() {
    getLiveMetrics()
      .then(setMetrics)
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Live Metrics</p>
        <span className="text-[11px] text-slate-300">Refreshes every minute</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <MetricCard icon={ShieldCheck} label="On Duty" value={metrics?.onDuty} isLoading={isLoading} tone="success" />
        <MetricCard icon={Clock} label="Late" value={metrics?.late} isLoading={isLoading} tone={metrics && metrics.late > 0 ? 'warning' : 'default'} />
        <MetricCard icon={UserX} label="Absent" value={metrics?.absent} isLoading={isLoading} tone={metrics && metrics.absent > 0 ? 'critical' : 'default'} />
        <MetricCard
          icon={AlertTriangle}
          label="Active Incidents"
          value={metrics?.activeIncidents}
          isLoading={isLoading}
          tone={metrics && metrics.activeIncidents > 0 ? 'critical' : 'default'}
          to="/incidents"
        />
        <MetricCard icon={LogIn} label="Check-ins (1h)" value={metrics?.checkInsLastHour} isLoading={isLoading} />
        <MetricCard icon={CalendarClock} label="Upcoming (4h)" value={metrics?.upcomingShifts} isLoading={isLoading} to="/shifts" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <MapPinned size={15} className="text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Sites Requiring Attention</p>
          </div>
          {isLoading ? (
            <p className="px-4 py-4 text-sm text-slate-400">Loading...</p>
          ) : metrics && metrics.sitesRequiringAttention.length > 0 ? (
            <ul>
              {metrics.sitesRequiringAttention.map((s) => (
                <li key={s.site_name} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-b-0">
                  <span className="text-sm font-medium text-slate-700">{s.site_name}</span>
                  <span className="text-xs text-crimecurb-red">{s.reasons.join(', ')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-sm text-slate-400">All sites normal.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <CalendarClock size={15} className="text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Upcoming Shifts (next 4h)</p>
          </div>
          {isLoading ? (
            <p className="px-4 py-4 text-sm text-slate-400">Loading...</p>
          ) : metrics && metrics.upcomingShiftsList.length > 0 ? (
            <ul>
              {metrics.upcomingShiftsList.map((s, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-b-0">
                  <span className="text-sm text-slate-700">{s.employee_name} · {s.site_name}</span>
                  <span className="text-xs text-slate-400 font-mono">{s.start_time.slice(0, 5)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-sm text-slate-400">Nothing coming up.</p>
          )}
        </div>
      </div>
    </div>
  );
}