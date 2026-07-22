import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, TrendingUp, BarChart3, ShieldCheck,
  Clock, CalendarClock, Users, MapPinned, FileWarning, CheckCircle2,
  DollarSign, Receipt, CreditCard, FileStack, Wallet, Calculator,
  UserCog, UserCheck2, FileSpreadsheet, FileText,
} from 'lucide-react';
export type ReportRole = 'ADMIN' | 'MANAGER';

export interface ReportDefinition {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  path: string;
  roles: ReportRole[];
  // Reports not yet built land on a "coming soon" placeholder automatically.
  isBuilt: boolean;
}

export interface ReportCategory {
  key: string;
  label: string;
  reports: ReportDefinition[];
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  {
    key: 'executive',
    label: 'Executive Reports',
    reports: [
      { key: 'executive-dashboard', label: 'Executive Dashboard', description: 'High-level operational and financial overview.', icon: LayoutDashboard, path: '/reports/executive-dashboard', roles: ['ADMIN'], isBuilt: false },
      { key: 'monthly-operations-summary', label: 'Monthly Operations Summary', description: 'Month-over-month operational performance.', icon: TrendingUp, path: '/reports/monthly-operations-summary', roles: ['ADMIN'], isBuilt: false },
      { key: 'kpi-dashboard', label: 'KPI Dashboard', description: 'Key performance indicators across the business.', icon: BarChart3, path: '/reports/kpi-dashboard', roles: ['ADMIN'], isBuilt: false },
      { key: 'compliance-report', label: 'Compliance Report', description: 'Regulatory and licensing compliance status.', icon: ShieldCheck, path: '/reports/compliance-report', roles: ['ADMIN'], isBuilt: false },
    ],
  },
  {
    key: 'operational',
    label: 'Operational Reports',
    reports: [
      { key: 'attendance-report', label: 'Attendance Report', description: 'Guard check-in/check-out records by period.', icon: Clock, path: '/reports/attendance-report', roles: ['ADMIN', 'MANAGER'], isBuilt: true },
      { key: 'shift-report', label: 'Shift Report', description: 'Scheduled shifts and coverage by site.', icon: CalendarClock, path: '/reports/shift-report', roles: ['ADMIN', 'MANAGER'], isBuilt: true},
      { key: 'guard-deployment-report', label: 'Guard Deployment Report', description: 'Current guard-to-site posting status.', icon: Users, path: '/reports/guard-deployment-report', roles: ['ADMIN', 'MANAGER'], isBuilt: true},
      { key: 'site-performance-report', label: 'Site Performance Report', description: 'Incident and coverage metrics by site.', icon: MapPinned, path: '/reports/site-performance-report', roles: ['ADMIN', 'MANAGER'], isBuilt: true},
      { key: 'incident-report', label: 'Incident Report', description: 'All reported incidents by category and severity.', icon: FileWarning, path: '/reports/incident-report', roles: ['ADMIN', 'MANAGER'], isBuilt: true },
      { key: 'incident-resolution-report', label: 'Incident Resolution Report', description: 'Time-to-resolution across incidents.', icon: CheckCircle2, path: '/reports/incident-resolution-report', roles: ['ADMIN', 'MANAGER'], isBuilt: true },
    ],
  },
  {
    key: 'financial',
    label: 'Financial Reports',
    reports: [
      { key: 'revenue-report', label: 'Revenue Report', description: 'Billed revenue by client and period.', icon: DollarSign, path: '/reports/revenue-report', roles: ['ADMIN', 'MANAGER'], isBuilt: false },
      { key: 'expense-report', label: 'Expense Report', description: 'Operating expenses by category.', icon: Receipt, path: '/reports/expense-report', roles: ['ADMIN', 'MANAGER'], isBuilt: false },
      { key: 'accounts-payable-report', label: 'Accounts Payable Report', description: 'Outstanding amounts owed by the company.', icon: CreditCard, path: '/reports/accounts-payable-report', roles: ['ADMIN', 'MANAGER'], isBuilt: false },
      { key: 'accounts-receivable-report', label: 'Accounts Receivable Report', description: 'Outstanding amounts owed to the company.', icon: FileStack, path: '/reports/accounts-receivable-report', roles: ['ADMIN', 'MANAGER'], isBuilt: false },
      { key: 'invoice-report', label: 'Invoice Report', description: 'All invoices by status and client.', icon: FileText, path: '/reports/invoice-report', roles: ['ADMIN', 'MANAGER'], isBuilt: false },
      { key: 'payroll-summary', label: 'Payroll Summary', description: 'Payroll totals by period.', icon: Wallet, path: '/reports/payroll-summary', roles: ['ADMIN', 'MANAGER'], isBuilt: false },
      { key: 'salary-cost-analysis', label: 'Salary Cost Analysis', description: 'Salary cost trends by role and site.', icon: Calculator, path: '/reports/salary-cost-analysis', roles: ['ADMIN', 'MANAGER'], isBuilt: false },
    ],
  },
  {
    key: 'hr',
    label: 'Human Resources Reports',
    reports: [
      { key: 'employee-report', label: 'Employee Report', description: 'Full employee roster and status.', icon: UserCog, path: '/reports/employee-report', roles: ['ADMIN', 'MANAGER'], isBuilt: false },
      { key: 'staff-deployment-report', label: 'Staff Deployment Report', description: 'Staff posting history across sites.', icon: UserCheck2, path: '/reports/staff-deployment-report', roles: ['ADMIN', 'MANAGER'], isBuilt: false },
      { key: 'salary-structure-report', label: 'Salary Structure Report', description: 'Active and historical salary structures.', icon: FileSpreadsheet, path: '/reports/salary-structure-report', roles: ['ADMIN', 'MANAGER'], isBuilt: false },
      { key: 'payslip-report', label: 'Payslip Report', description: 'Generated payslips by period.', icon: Receipt, path: '/reports/payslip-report', roles: ['ADMIN', 'MANAGER'], isBuilt: false },
    ],
  },
];

export function getVisibleCategories(role: string | undefined): ReportCategory[] {
  if (!role) return [];
  return REPORT_CATEGORIES
    .map((cat) => ({
      ...cat,
      reports: cat.reports.filter((r) => r.roles.includes(role as ReportRole)),
    }))
    .filter((cat) => cat.reports.length > 0);
}