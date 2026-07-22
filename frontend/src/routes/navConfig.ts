export interface NavItem {
  label: string;
  path: string;
  roles: string[]; // roles allowed to see this link
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', roles: ['ADMIN', 'MANAGER', 'SUPERVISOR', 'GUARD'] },

  // Director + Secretary
  { label: 'Staff', path: '/staff', roles: ['ADMIN', 'MANAGER'] },
  { label: 'Clients', path: '/clients', roles: ['ADMIN', 'MANAGER'] },
  { label: 'Invoices', path: '/invoices', roles: ['ADMIN', 'MANAGER'] },
  { label: 'Reports', path: '/reports', roles: ['ADMIN', 'MANAGER'] },
   
  // Director + Secretary + Supervisor
  { label: 'Sites', path: '/sites', roles: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
  { label: 'Active Guards', path: '/active-guards', roles: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
  
  // Director + Supervisor (operational, hidden from Secretary per your spec)
  { label: 'Shifts', path: '/shifts', roles: ['ADMIN', 'SUPERVISOR'] },
  { label: 'Attendance', path: '/attendance', roles: ['ADMIN', 'SUPERVISOR'] },
  { label: 'Incidents', path: '/incidents', roles: ['ADMIN', 'SUPERVISOR'] },

  // Director only
  { label: 'Payroll', path: '/payroll', roles: ['ADMIN'] },

   // Secretary — view/export payslips only, no period or generation access
  { label: 'Payslips', path: '/payroll/payslips', roles: ['MANAGER'] },

  // Guard-only self-service views
  { label: 'My Shifts', path: '/my-shifts', roles: ['GUARD'] },
  { label: 'My Attendance', path: '/my-attendance', roles: ['GUARD'] },
  { label: 'My Incidents', path: '/my-incidents', roles: ['GUARD'] },
  { label: 'My Payslips', path: '/my-payslips', roles: ['GUARD'] },
  { label: 'Profile', path: '/profile', roles: ['GUARD'] },
];