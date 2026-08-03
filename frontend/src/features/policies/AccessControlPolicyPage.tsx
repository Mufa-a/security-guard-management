import PolicyLayout from './PolicyLayout';

export default function AccessControlPolicyPage() {
  return (
    <PolicyLayout title="Access Control Policy" lastUpdated="August 2026">
      <p>
        This policy defines what each role within the Security Guard Management
        System is permitted to access, in line with the principle of least
        privilege.
      </p>

      <h2 className="font-display font-bold text-slate-800 text-lg mt-6">1. Roles and Permissions</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Director (Admin)</strong> — full access to all data and system functions, including payroll, reports, and account management.</li>
        <li><strong>Secretary (Manager)</strong> — access to financial, HR, and payroll data relevant to their responsibilities; cannot manage system-level settings reserved for Admin.</li>
        <li><strong>Supervisor</strong> — access to operational data (staff, sites, shifts, attendance, incidents) for assigned sites; no access to payroll or payslip data.</li>
        <li><strong>Guard</strong> — access limited to their own profile, attendance, shift assignments,  and incidents they reported, ; no access to salary structures, allowances, or deductions, or to any other guard's data.</li>
      </ul>

      <h2 className="font-display font-bold text-slate-800 text-lg mt-6">2. Enforcement</h2>
      <p>
        Role-based permissions are enforced server-side on every request — not
        just hidden in the interface — so access restrictions cannot be
        bypassed by interacting with the API directly.
      </p>

      <h2 className="font-display font-bold text-slate-800 text-lg mt-6">3. Account Provisioning and Revocation</h2>
      <p>
        Accounts are created by an Admin or Manager. Access is revoked
        immediately upon an employee's termination or role change.
      </p>
    </PolicyLayout>
  );
}
