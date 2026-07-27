import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Printer, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { getShifts } from '../../api/shiftsApi';
import { getAttendanceRecords } from '../../api/attendanceApi';
import { getMyIncidents } from '../../api/incidentsApi';

const now = new Date();
const thisMonthKey = now.toISOString().slice(0, 7);
const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const lastMonthKey = lastMonthDate.toISOString().slice(0, 7);

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function DeltaBadge({ change }: { change: number | null }) {
  if (change === null) return <span className="text-xs text-slate-400">—</span>;
  if (change === 0) return (
    <span className="flex items-center gap-0.5 text-xs text-slate-500"><Minus size={12} /> 0%</span>
  );
  const isUp = change > 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
      {isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />} {Math.abs(change)}%
    </span>
  );
}

export default function MonthlyOperationsSummaryPage() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getShifts(), getAttendanceRecords(), getMyIncidents()])
      .then(([s, a, i]) => {
        setShifts(s);
        setAttendance(a);
        setIncidents(i);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load operations data.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const monthlyStats = useMemo(() => {
    const months: Record<string, { attendanceRate: number; shiftsScheduled: number; incidentsReported: number }> = {};

    // Build a rolling 6-month window ending this month, even for months with no data.
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      months[key] = { attendanceRate: 0, shiftsScheduled: 0, incidentsReported: 0 };
    }

    Object.keys(months).forEach((key) => {
      const monthAttendance = attendance.filter((a) => a.shift_date?.startsWith(key));
      const present = monthAttendance.filter((a) => a.check_in_time).length;
      months[key].attendanceRate = monthAttendance.length > 0 ? Math.round((present / monthAttendance.length) * 100) : 0;

      months[key].shiftsScheduled = shifts.filter((s) => s.date?.startsWith(key)).length;

      months[key].incidentsReported = incidents.filter((i) => i.occurred_at?.startsWith(key)).length;
    });

    return months;
  }, [attendance, shifts, incidents]);

  const thisMonth = monthlyStats[thisMonthKey] ?? { attendanceRate: 0, shiftsScheduled: 0, incidentsReported: 0 };
  const lastMonth = monthlyStats[lastMonthKey] ?? { attendanceRate: 0, shiftsScheduled: 0, incidentsReported: 0 };

  const cards = [
    {
      label: 'Attendance Rate',
      current: `${thisMonth.attendanceRate}%`,
      change: pctChange(thisMonth.attendanceRate, lastMonth.attendanceRate),
    },
    {
      label: 'Shifts Scheduled',
      current: thisMonth.shiftsScheduled,
      change: pctChange(thisMonth.shiftsScheduled, lastMonth.shiftsScheduled),
    },
    {
      label: 'Incidents Reported',
      current: thisMonth.incidentsReported,
      change: pctChange(thisMonth.incidentsReported, lastMonth.incidentsReported),
      invertColor: true, // fewer incidents is good — up arrow should read as concerning, not positive
    },
  ];

  const historyRows = Object.entries(monthlyStats).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      <Link to="/reports" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 print:hidden">
        <ArrowLeft size={14} /> Back to Reports
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <p className="text-[11px] font-mono font-semibold uppercase tracking-[2px] text-crimecurb-red mb-1">
            Executive · Reports
          </p>
          <h1 className="font-display text-2xl font-bold text-slate-800">Monthly Operations Summary</h1>
          <p className="text-sm text-slate-500 mt-1">
            {monthLabel(thisMonthKey)} vs. {monthLabel(lastMonthKey)}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 bg-crimecurb-navy hover:opacity-90 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors print:hidden"
        >
          <Printer size={14} /> Print
        </button>
      </div>

      {isLoading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
            {cards.map((c) => (
              <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{c.label}</p>
                <div className="flex items-end justify-between">
                  <p className="font-mono text-2xl font-bold text-slate-800">{c.current}</p>
                  <DeltaBadge change={c.invertColor && c.change !== null ? -c.change : c.change} />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 pt-4 pb-2">
              6-Month History
            </p>
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Attendance Rate</th>
                  <th className="px-4 py-3">Shifts Scheduled</th>
                  <th className="px-4 py-3">Incidents Reported</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map(([key, stats]) => (
                  <tr key={key} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{monthLabel(key)}</td>
                    <td className="px-4 py-3 text-slate-600">{stats.attendanceRate}%</td>
                    <td className="px-4 py-3 text-slate-600">{stats.shiftsScheduled}</td>
                    <td className="px-4 py-3 text-slate-600">{stats.incidentsReported}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-center text-xs text-slate-400 mt-8 pt-4 border-t border-slate-200">
            <p>Generated by Erip <span className="text-crimecurb-red font-semibold">⚡</span> Technologies</p>
            <p>0710951879</p>
          </div>
        </>
      )}
    </div>
  );
}