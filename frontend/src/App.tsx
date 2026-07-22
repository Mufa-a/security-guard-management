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
import AttendanceManagementPage from './features/attendance/AttendanceManagementPage';
import IncidentManagementPage from './features/incidents/IncidentManagementPage';
import InvoiceListPage from './features/invoices/InvoiceListPage';
import InvoiceFormPage from './features/invoices/InvoiceFormPage';
import ReportsHub from './features/reports/ReportsHub';
import AttendanceReportPage from './features/reports/AttendanceReportPage';
import PayrollPeriodListPage from './features/payroll/PayrollPeriodListPage';
import PayslipListPage from './features/payroll/PayslipListPage';
import GeneratePayslipsPage from './features/payroll/GeneratePayslipsPage';
import PayslipDetailPage from './features/payroll/PayslipDetailPage';
import MyPayslipsPage from './features/payroll/MyPayslipsPage';
import EmployeeSalaryPage from './features/payroll/EmployeeSalaryPage';
import ActiveGuardsPage from './features/staff/ActiveGuardsPage';
import ShiftReportPage from './features/reports/ShiftReportPage';
import GuardDeploymentReportPage from './features/reports/GuardDeploymentReportPage';
import IncidentReportPage from './features/reports/IncidentReportPage';
import IncidentResolutionReportPage from './features/reports/IncidentResolutionReportPage';
import SitePerformanceReportPage from './features/reports/SitePerformanceReportPage';
function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route path="/staff" element={<StaffListPage />} />
        <Route path="/staff/new" element={<StaffFormPage />} />
        <Route path="/staff/:id" element={<StaffFormPage />} />
        <Route path="/clients" element={<ClientListPage />} />
        <Route path="/clients/new" element={<ClientFormPage />} />
        <Route path="/clients/:id" element={<ClientFormPage />} />
        <Route path="/sites" element={<SiteListPage />} />
        <Route path="/sites/new" element={<SiteFormPage />} />
        <Route path="/sites/:id" element={<SiteFormPage />} />
        <Route path="/my-shifts" element={<MyShiftsPage />} />
        <Route path="/my-attendance" element={<MyAttendancePage />} />
        <Route path="/my-incidents" element={<MyIncidentsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/shifts" element={<ShiftListPage />} />
        <Route path="/shifts/new" element={<ShiftFormPage />} />
        <Route path="/shifts/:id" element={<ShiftFormPage />} />
        <Route path="/attendance" element={<AttendanceManagementPage />} />
        <Route path="/incidents" element={<IncidentManagementPage />} />
        <Route path="/invoices" element={<InvoiceListPage />} />
        <Route path="/invoices/new" element={<InvoiceFormPage />} />
        <Route path="/invoices/:id" element={<InvoiceFormPage />} />
        
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
        <Route path="/payroll" element={<PayrollPeriodListPage />} />
        <Route path="/payroll/payslips" element={<PayslipListPage />} />
        <Route path="/payroll/payslips/:id" element={<PayslipDetailPage />} />
        <Route path="/my-payslips" element={<MyPayslipsPage />} />
        <Route path="/my-payslips/:id" element={<PayslipDetailPage />} />
        <Route path="/active-guards" element={<ActiveGuardsPage />} />
        <Route
  path="/staff/:id/salary"
  element={
    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
      <EmployeeSalaryPage />
    </ProtectedRoute>
  }
/>
        <Route path="/payroll/generate/:periodId" element={<GeneratePayslipsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;