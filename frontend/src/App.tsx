import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './features/dashboard/DashboardHome';
import StaffListPage from './features/staff/StaffListPage';
import StaffFormPage from './features/staff/StaffFormPage';
import ClientListPage from './features/sites/ClientListPage';
import ClientFormPage from './features/sites/ClientFormPage';
import SiteListPage from './features/sites/SiteListPage';
import SiteFormPage from './features/sites/SiteFormPage';
import ProtectedRoute from './routes/ProtectedRoute';
import MyShiftsPage from './features/shifts/MyShiftsPage';
import MyAttendancePage from './features/attendance/MyAttendancePage';
import MyIncidentsPage from './features/incidents/MyIncidentsPage';
import ProfilePage from './features/auth/ProfilePage';
import ShiftListPage from './features/shifts/ShiftListPage';
import ShiftFormPage from './features/shifts/ShiftFormPage';
import ShiftAssignGuardsPage from './features/shifts/ShiftAssignGuardsPage';
import AttendanceManagementPage from './features/attendance/AttendanceManagementPage';
import IncidentManagementPage from './features/incidents/IncidentManagementPage';
import IncidentDetailPage from './features/incidents/IncidentDetailPage';
import InvoiceListPage from './features/invoices/InvoiceListPage';
import InvoiceFormPage from './features/invoices/InvoiceFormPage';
import InvoiceLineItemsPage from './features/invoices/InvoiceLineItemsPage';
import InvoiceDetailPage from './features/invoices/InvoiceDetailPage';
import ReportsHub from './features/reports/ReportsHub';
import AttendanceReportPage from './features/reports/AttendanceReportPage';
import PayrollPeriodListPage from './features/payroll/PayrollPeriodListPage';
import PayslipListPage from './features/payroll/PayslipListPage';
import GeneratePayslipsPage from './features/payroll/GeneratePayslipsPage';
import PayslipDetailPage from './features/payroll/PayslipDetailPage';
import EmployeeSalaryPage from './features/payroll/EmployeeSalaryPage';
import ActiveGuardsPage from './features/staff/ActiveGuardsPage';
import InactiveGuardsPage from './features/staff/InactiveGuardsPage';
import ShiftReportPage from './features/reports/ShiftReportPage';
import GuardDeploymentReportPage from './features/reports/GuardDeploymentReportPage';
import IncidentReportPage from './features/reports/IncidentReportPage';
import IncidentResolutionReportPage from './features/reports/IncidentResolutionReportPage';
import SitePerformanceReportPage from './features/reports/SitePerformanceReportPage';
import EmployeeReportPage from './features/reports/EmployeeReportPage';
import StaffDeploymentReportPage from './features/reports/StaffDeploymentReportPage';
import SalaryStructureReportPage from './features/reports/SalaryStructureReportPage';
import PayslipReportPage from './features/reports/PayslipReportPage';
import ExecutiveDashboardPage from './features/reports/ExecutiveDashboardPage';
import MonthlyOperationsSummaryPage from './features/reports/MonthlyOperationsSummaryPage';
import KpiDashboardPage from './features/reports/KpiDashboardPage';
import ComplianceReportPage from './features/reports/ComplianceReportPage';
import PayrollSummaryPage from './features/reports/PayrollSummaryPage';
import AccountsReceivableReportPage from './features/reports/AccountsReceivableReportPage';
import ExpenseReportPage from './features/reports/ExpenseReportPage';
import AccountsPayableReportPage from './features/reports/AccountsPayableReportPage';
import RevenueReportPage from './features/reports/RevenueReportPage';
import InvoiceReportPage from './features/reports/InvoiceReportPage';
import SalaryCostAnalysisPage from './features/reports/SalaryCostAnalysisPage';
import ForcePinChangePage from './features/auth/ForcePinChangePage';
import AcceptPolicyPage from './features/auth/AcceptPolicyPage';
import PrivacyPolicyPage from './features/policies/PrivacyPolicyPage';
import DataProtectionPolicyPage from './features/policies/DataProtectionPolicyPage';
import AccessControlPolicyPage from './features/policies/AccessControlPolicyPage';
import ExpenseListPage from './features/expenses/ExpenseListPage';
import ExpenseFormPage from './features/expenses/ExpenseFormPage';
function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/set-pin" element={<ForcePinChangePage />} />
      <Route path="/accept-policy" element={<AcceptPolicyPage />} />
      <Route path="/policies/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/policies/data-protection-policy" element={<DataProtectionPolicyPage />} />
      <Route path="/policies/access-control-policy" element={<AccessControlPolicyPage />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardHome />} />

        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <StaffListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/new"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <StaffFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <StaffFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <ClientListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/new"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <ClientFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <ClientFormPage />
            </ProtectedRoute>
          }
        />

      <Route
  path="/sites"
  element={
    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SUPERVISOR']}>
      <SiteListPage />
    </ProtectedRoute>
  }
/>
        <Route
          path="/sites/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SUPERVISOR']}>
              <SiteFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-shifts"
          element={
            <ProtectedRoute allowedRoles={['GUARD']}>
              <MyShiftsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-attendance"
          element={
            <ProtectedRoute allowedRoles={['GUARD']}>
              <MyAttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-incidents"
          element={
            <ProtectedRoute allowedRoles={['GUARD']}>
              <MyIncidentsPage />
            </ProtectedRoute>
          }
        />

        <Route path="/profile" element={<ProfilePage />} />

        <Route
          path="/shifts"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SUPERVISOR']}>
              <ShiftListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shifts/new"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SUPERVISOR']}>
              <ShiftFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shifts/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SUPERVISOR']}>
              <ShiftFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shifts/:id/assign"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SUPERVISOR']}>
              <ShiftAssignGuardsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SUPERVISOR']}>
              <AttendanceManagementPage />
            </ProtectedRoute>
          }
        />
       
        <Route
          path="/incidents"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SUPERVISOR']}>
              <IncidentManagementPage />
            </ProtectedRoute>
          }
        />

        <Route
  path="/incidents/:id"
  element={
    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SUPERVISOR', 'GUARD']}>
      <IncidentDetailPage />
    </ProtectedRoute>
  }
/>

        <Route
          path="/invoices"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <InvoiceListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/new"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <InvoiceFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <InvoiceDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <InvoiceFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/:id/line-items"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <InvoiceLineItemsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <ReportsHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/attendance-report"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <AttendanceReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/shift-report"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <ShiftReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/guard-deployment-report"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <GuardDeploymentReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/incident-report"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <IncidentReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/incident-resolution-report"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <IncidentResolutionReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/site-performance-report"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <SitePerformanceReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/employee-report"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <EmployeeReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/staff-deployment-report"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <StaffDeploymentReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/salary-structure-report"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <SalaryStructureReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/payslip-report"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <PayslipReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/executive-dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ExecutiveDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/monthly-operations-summary"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <MonthlyOperationsSummaryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/kpi-dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <KpiDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/compliance-report"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ComplianceReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/payroll-summary"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <PayrollSummaryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/accounts-receivable-report"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <AccountsReceivableReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/expense-report"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <ExpenseReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/accounts-payable-report"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <AccountsPayableReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/revenue-report"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <RevenueReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/invoice-report"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <InvoiceReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/salary-cost-analysis"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <SalaryCostAnalysisPage />
            </ProtectedRoute>
          }
        />

        <Route
  path="/payroll"
  element={
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <PayrollPeriodListPage />
    </ProtectedRoute>
  }
/>
        <Route
          path="/payroll/payslips"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <PayslipListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payroll/payslips/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <PayslipDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/active-guards"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SUPERVISOR']}>
              <ActiveGuardsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/active-guards/inactive"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SUPERVISOR']}>
              <InactiveGuardsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <ExpenseListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses/new"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <ExpenseFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <ExpenseFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/:id/salary"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <EmployeeSalaryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payroll/generate/:periodId"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <GeneratePayslipsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/:id/salary"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <EmployeeSalaryPage />
            </ProtectedRoute>
          }
        />
        
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
