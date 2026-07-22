import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getAttendanceRecords } from '../../api/attendanceApi';
import { getSites } from '../../api/sitesApi';
import { getEmployeeProfiles } from '../../api/staffApi';
import type { Attendance } from '../../types/attendance';
import type { Site } from '../../types/sites';
import type { EmployeeProfile } from '../../types/staff';

function parseDateTime(shiftDate: string, timeValue: string | null): Date | null {
  if (!timeValue) return null;
  // Handles both a full ISO timestamp and a bare "HH:MM:SS" time string.
  const direct = new Date(timeValue);
  if (!isNaN(direct.getTime()) && timeValue.includes('T')) return direct;
  const combined = new Date(`${shiftDate}T${timeValue}`);
  return isNaN(combined.getTime()) ? null : combined;
}

function hoursBetween(checkIn: Date | null, checkOut: Date | null): number {
  if (!checkIn || !checkOut) return 0;
  const diffMs = checkOut.getTime() - checkIn.getTime();
  return diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
}

export default function AttendanceReportPage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');

  useEffect(() => {
    Promise.all([getAttendanceRecords(), getSites(), getEmployeeProfiles()])
      .then(([a, s, e]) => {
        setRecords(a);
        setSites(s);
        setEmployees(e);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load attendance data.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (startDate && r.shift_date < startDate) return false;
      if (endDate && r.shift_date > endDate) return false;
      if (siteFilter && r.site_name !== siteFilter) return false;
      if (employeeFilter && r.employee_name !== employeeFilter) return false;
      return true;
    });
  }, [records, startDate, endDate, siteFilter, employeeFilter]);

  const rows = useMemo(
    () =>
      filtered.map((r) => {
        const checkIn = parseDateTime(r.shift_date, r.check_in_time);
        const checkOut = parseDateTime(r.shift_date, r.check_out_time);
        return {
          ...r,
          hours: hoursBetween(checkIn, checkOut),
          isAbsent: !r.check_in_time,
        };
      }),
    [filtered]
  );

  const summary = useMemo(() => {
    const totalRecords = rows.length;
    const totalHours = rows.reduce((sum, r) => sum + r.hours, 0);
    const absences = rows.filter((r) => r.isAbsent).length;
    const present = totalRecords - absences;
    return {
      totalRecords,
      totalHours: totalHours.toFixed(1),
      absences,
      attendanceRate: totalRecords > 0 ? Math.round((present / totalRecords) * 100) : 0,
    };
  }, [rows]);

  const chartData = useMemo(() => {
    const byDate: Record<string, number> = {};
    rows.forEach((r) => {
      byDate[r.shift_date] = (byDate[r.shift_date] ?? 0) + 1;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14); // last 14 days present in the filtered set
  }, [rows]);

  const maxCount = Math.max(1, ...chartData.map(([, c]) => c));

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Attendance Report', 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-KE')}`, 14, 23);
    if (startDate || endDate) {
      doc.text(`Period: ${startDate || 'Start'} to ${endDate || 'End'}`, 14, 29);
    }

    autoTable(doc, {
      startY: 35,
      head: [['Employee', 'Site', 'Date', 'Check In', 'Check Out', 'Hours', 'Status']],
      body: rows.map((r) => [
        r.employee_name,
        r.site_name,
        r.shift_date,
        formatTime(r.check_in_time),
        formatTime(r.check_out_time),
        r.hours.toFixed(1),
        r.isAbsent ? 'Absent' : r.status,
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [27, 42, 110] },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 40 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 20 },
        6: { cellWidth: 30 },
      },
    });
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Generated by Erip Technologies · 0710951879', 14, pageHeight - 10);

    doc.save(`attendance-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  }
  function formatTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : `2000-01-01T${value}`);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

  function exportExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        Employee: r.employee_name,
        Site: r.site_name,
        Date: r.shift_date,
        'Check In': formatTime(r.check_in_time),
        'Check Out': formatTime(r.check_out_time),
        Hours: r.hours.toFixed(1),
        Status: r.isAbsent ? 'Absent' : r.status,
      }))
    );
    const workbook = XLSX.utils.book_new();
    workbook.Props = { Author: 'Erip Technologies', Company: 'Crimecurb Security Services' };
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    XLSX.writeFile(workbook, `attendance-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div>
      <Link to="/reports" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 print:hidden">
        <ArrowLeft size={14} /> Back to Reports
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <p className="text-[11px] font-mono font-semibold uppercase tracking-[2px] text-crimecurb-red mb-1">
            Operational · Reports
          </p>
          <h1 className="font-display text-2xl font-bold text-slate-800">Attendance Report</h1>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Download size={14} /> PDF
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-crimecurb-navy hover:opacity-90 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 print:hidden">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Site</label>
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
          >
            <option value="">All Sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Employee</label>
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
          >
            <option value="">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.user.email}>
                {e.user.first_name} {e.user.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!isLoading && !error && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Total Records</p>
              <p className="font-mono text-2xl font-bold text-slate-800">{summary.totalRecords}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Total Hours</p>
              <p className="font-mono text-2xl font-bold text-slate-800">{summary.totalHours}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Attendance Rate</p>
              <p className="font-mono text-2xl font-bold text-slate-800">{summary.attendanceRate}%</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Absences</p>
              <p className="font-mono text-2xl font-bold text-slate-800">{summary.absences}</p>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">
                Records Per Day
              </p>
              <div className="flex items-end gap-2 h-32">
                {chartData.map(([date, count]) => (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-crimecurb-navy rounded-t"
                      style={{ height: `${(count / maxCount) * 100}%`, minHeight: '4px' }}
                      title={`${date}: ${count}`}
                    />
                    <p className="text-[9px] text-slate-400 rotate-45 origin-left whitespace-nowrap mt-1">
                      {date.slice(5)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Check In</th>
                  <th className="px-4 py-3">Check Out</th>
                  <th className="px-4 py-3">Hours</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.employee_name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.site_name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.shift_date}</td>
                    <td className="px-4 py-3 text-slate-600">{formatTime(r.check_in_time)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatTime(r.check_out_time)}</td>
                    <td className="px-4 py-3 text-slate-600">{r.hours.toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          r.isAbsent ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {r.isAbsent ? 'Absent' : r.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                      No attendance records match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
         </div>

          <div className="text-center text-xs text-slate-400 mt-8 pt-4 border-t border-slate-200">
            <p>
              Generated by Erip <span className="text-crimecurb-red font-semibold">⚡</span> Technologies
            </p>
            <p>0710951879</p>
          </div>
        </>
      )}
    </div>
  );
}