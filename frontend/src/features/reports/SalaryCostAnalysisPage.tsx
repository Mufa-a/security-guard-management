import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getEmployeeProfiles } from '../../api/staffApi';
import { getSalaryStructures } from '../../api/payrollApi';
import { getSiteAssignments, getSites } from '../../api/sitesApi';
import type { EmployeeProfile } from '../../types/staff';
import type { SalaryStructure } from '../../types/payroll';
import type { Site } from '../../types/sites';

function formatKES(value: number): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
}

function getCurrentStructure(structures: SalaryStructure[]): SalaryStructure | null {
  const today = new Date().toISOString().slice(0, 10);
  const active = structures.filter(
    (s) => s.is_active && s.effective_from <= today && (!s.effective_to || s.effective_to >= today)
  );
  if (active.length === 0) return null;
  return active.reduce((latest, s) => (s.effective_from > latest.effective_from ? s : latest));
}

interface Row {
  employee: EmployeeProfile;
  basicSalary: number;
  siteName: string | null;
}

export default function SalaryCostAnalysisPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');

  useEffect(() => {
    Promise.all([getEmployeeProfiles(), getSiteAssignments(), getSites()])
      .then(async ([employees, assignments, siteList]) => {
        setSites(siteList);

        const siteByEmployee: Record<string, string> = {};
        assignments.filter((a) => !a.end_date).forEach((a) => {
          siteByEmployee[a.employee] = a.site_name;
        });

        const results = await Promise.allSettled(
          employees.map((e) => getSalaryStructures(e.id))
        );

        const built: Row[] = employees
          .map((e, i) => {
            const result = results[i];
            const structures = result.status === 'fulfilled' ? result.value : [];
            const current = getCurrentStructure(structures);
            return {
              employee: e,
              basicSalary: current ? parseFloat(current.basic_salary) : 0,
              siteName: siteByEmployee[e.id] ?? null,
            };
          })
          .filter((r) => r.basicSalary > 0);

        setRows(built);
      })
      .catch(() => setError('Failed to load salary cost data.'))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (roleFilter && r.employee.user.role !== roleFilter) return false;
      if (siteFilter && r.siteName !== siteFilter) return false;
      return true;
    });
  }, [rows, roleFilter, siteFilter]);

  const summary = useMemo(() => {
    const totalCost = filtered.reduce((sum, r) => sum + r.basicSalary, 0);
    const avgCost = filtered.length > 0 ? totalCost / filtered.length : 0;
    const highestPaidRole = (() => {
      const byRole: Record<string, number[]> = {};
      filtered.forEach((r) => {
        const role = r.employee.user.role ?? 'Unknown';
        byRole[role] = byRole[role] ?? [];
        byRole[role].push(r.basicSalary);
      });
      let best = { role: '—', avg: 0 };
      Object.entries(byRole).forEach(([role, salaries]) => {
        const avg = salaries.reduce((s, v) => s + v, 0) / salaries.length;
        if (avg > best.avg) best = { role, avg };
      });
      return best.role;
    })();
    return { totalCost, avgCost, employeeCount: filtered.length, highestPaidRole };
  }, [filtered]);

  const chartByRole = useMemo(() => {
    const byRole: Record<string, number> = {};
    filtered.forEach((r) => {
      const role = r.employee.user.role ?? 'Unknown';
      byRole[role] = (byRole[role] ?? 0) + r.basicSalary;
    });
    return Object.entries(byRole).sort(([, a], [, b]) => b - a);
  }, [filtered]);

  const maxRoleCost = Math.max(1, ...chartByRole.map(([, c]) => c));

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Salary Cost Analysis', 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-KE')}`, 14, 23);

    autoTable(doc, {
      startY: 32,
      head: [['Employee #', 'Name', 'Role', 'Site', 'Basic Salary']],
      body: filtered.map((r) => [
        r.employee.employee_number ?? '—',
        `${r.employee.user.first_name} ${r.employee.user.last_name}`,
        r.employee.user.role ?? '—',
        r.siteName ?? 'Unassigned',
        formatKES(r.basicSalary),
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [27, 42, 110] },
    });
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Generated by Erip Technologies · 0710951879', 14, pageHeight - 10);

    doc.save(`salary-cost-analysis-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      filtered.map((r) => ({
        'Employee #': r.employee.employee_number ?? '—',
        Name: `${r.employee.user.first_name} ${r.employee.user.last_name}`,
        Role: r.employee.user.role ?? '—',
        Site: r.siteName ?? 'Unassigned',
        'Basic Salary': formatKES(r.basicSalary),
      }))
    );
    const workbook = XLSX.utils.book_new();
    workbook.Props = { Author: 'Erip Technologies', Company: 'Crimecurb Security Services' };
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Cost');
    XLSX.writeFile(workbook, `salary-cost-analysis-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div>
      <Link to="/reports" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 print:hidden">
        <ArrowLeft size={14} /> Back to Reports
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <p className="text-[11px] font-mono font-semibold uppercase tracking-[2px] text-crimecurb-red mb-1">
            Financial · Reports
          </p>
          <h1 className="font-display text-2xl font-bold text-slate-800">Salary Cost Analysis</h1>
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={exportPDF} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <Download size={14} /> PDF
          </button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-crimecurb-navy hover:opacity-90 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Role</label>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 text-sm">
            <option value="">All Roles</option>
            <option value="GUARD">Guard</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Site</label>
          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 text-sm">
            <option value="">All Sites</option>
            {sites.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {isLoading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Total Salary Cost</p>
              <p className="font-mono text-2xl font-bold text-slate-800">{formatKES(summary.totalCost)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Average Cost</p>
              <p className="font-mono text-2xl font-bold text-slate-800">{formatKES(summary.avgCost)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Employees Counted</p>
              <p className="font-mono text-2xl font-bold text-slate-800">{summary.employeeCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Highest Avg Role</p>
              <p className="font-mono text-lg font-bold text-slate-800">{summary.highestPaidRole}</p>
            </div>
          </div>

          {chartByRole.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">Salary Cost by Role</p>
              <div className="flex items-end gap-3 h-32">
                {chartByRole.map(([role, cost]) => (
                  <div key={role} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-crimecurb-navy rounded-t" style={{ height: `${(cost / maxRoleCost) * 100}%`, minHeight: '4px' }} title={`${role}: ${formatKES(cost)}`} />
                    <p className="text-[9px] text-slate-400 whitespace-nowrap mt-1">{role}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Employee #</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Basic Salary</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.employee.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.employee.employee_number ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.employee.user.first_name} {r.employee.user.last_name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.employee.user.role ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.siteName ?? 'Unassigned'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatKES(r.basicSalary)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No salary cost data matches these filters.</td></tr>
                )}
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