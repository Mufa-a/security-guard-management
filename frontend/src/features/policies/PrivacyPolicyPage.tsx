import PolicyLayout from './PolicyLayout';

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout title="Privacy Policy" lastUpdated="August 2026">
      <p>
        This Privacy Policy explains how Crimecurb Security Services Co. Limited ("Crimecurb,"
        "we," "us") collects, uses, stores, and protects personal data through our Security Guard
        Management System (the "System"). This policy complies with the Data Protection Act, 2019
        (Kenya) and Article 31 of the Constitution of Kenya.
      </p>
      <p>
        This policy applies to all users of the System: Directors, Secretaries, Supervisors,
        Guards, and any client whose information is stored for site or invoicing purposes.
      </p>

      <h2 className="font-display font-bold text-slate-800 text-lg mt-6">1. Data We Collect</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Identity data</strong> — full name, National ID number, date of birth, gender</li>
        <li><strong>Contact data</strong> — email address, phone number, physical address</li>
        <li><strong>Employment data</strong> — employee number, role, employment status, date employed, height, next of kin details</li>
        <li><strong>Payroll data</strong> — basic salary, allowances, deductions, payslip history, statutory deduction figures (NSSF, SHIF, Housing Levy, PAYE)</li>
        <li><strong>Attendance data</strong> — check-in/check-out timestamps, GPS coordinates, shift assignments</li>
        <li><strong>Incident data</strong> — incident reports, category, severity, description, attachments</li>
        <li><strong>Client and site data</strong> — client company name, contact details, site addresses and coordinates</li>
        <li><strong>Login credentials</strong> — email/password (management roles) or employee number/6-digit PIN (guards), always stored as irreversible hashes, never in plain text</li>
      </ul>
      <p>
        We only collect data necessary to operate the security guard service: staffing,
        scheduling, attendance verification, incident tracking, payroll, and client billing.
      </p>

      <h2 className="font-display font-bold text-slate-800 text-lg mt-6">2. Why We Collect This Data</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>To manage guard deployment, shifts, and site coverage</li>
        <li>To verify attendance and location at duty sites</li>
        <li>To process payroll and statutory deductions accurately</li>
        <li>To record and act on incident reports</li>
        <li>To invoice clients for services rendered</li>
        <li>To authenticate users and enforce role-based access</li>
        <li>To comply with Kenyan labour and tax record-keeping obligations</li>
      </ul>

      <h2 className="font-display font-bold text-slate-800 text-lg mt-6">3. Who Can Access Your Data</h2>
      <p>Access is restricted by role, enforced at the application level:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Director (Admin)</strong> — full access to all data</li>
        <li><strong>Secretary (Manager)</strong> — access to financial, HR, and payroll data relevant to their responsibilities</li>
        <li><strong>Supervisor</strong> — access to operational data (staff, sites, shifts, attendance, incidents) for assigned sites; no access to payroll or payslip data</li>
        <li><strong>Guard</strong> — access only to their own profile, attendance, shift assignments, incidents they reported, and their own payslips; no access to salary structures, allowances, or deductions</li>
      </ul>

      <h2 className="font-display font-bold text-slate-800 text-lg mt-6">4. Data Storage and Security</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Data is stored in a PostgreSQL database, accessed only through the application's authenticated API</li>
        <li>All data in transit is encrypted via HTTPS/TLS</li>
        <li>Passwords and guard PINs are hashed before storage, never stored in plain text</li>
        <li>Authentication uses signed JWT tokens with expiry and refresh mechanisms</li>
        <li>Guard PINs lock automatically after repeated failed attempts, and login attempts are additionally rate-limited by network origin</li>
        <li>System actions are recorded in an audit log for accountability</li>
      </ul>

      <h2 className="font-display font-bold text-slate-800 text-lg mt-6">5. Data Retention</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Attendance and payroll records are retained as required under Kenyan labour and tax law (generally 7 years)</li>
        <li>Incident reports are retained for 5 years unless a longer period is required for legal or insurance purposes</li>
        <li>Terminated employee records are retained for statutory purposes, but login access is revoked immediately upon termination</li>
      </ul>

      <h2 className="font-display font-bold text-slate-800 text-lg mt-6">6. Your Rights</h2>
      <p>Under the Data Protection Act, 2019, you have the right to:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Be informed about how your data is used</li>
        <li>Access the personal data we hold about you</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of your data, subject to legal retention obligations</li>
        <li>Object to certain processing of your data</li>
        <li>Lodge a complaint with the Office of the Data Protection Commissioner (ODPC), Kenya</li>
      </ul>

      <h2 className="font-display font-bold text-slate-800 text-lg mt-6">7. Data Sharing</h2>
      <p>
        We do not sell personal data. Data may be shared with statutory bodies (e.g., KRA, NSSF,
        SHA) as required for payroll compliance, and with our hosting providers solely for the
        purpose of running the System.
      </p>

      <h2 className="font-display font-bold text-slate-800 text-lg mt-6">8. Contact</h2>
      <p>
        Crimecurb Security Services Co. Limited<br />
        P.O. Box 72028-00200, Nairobi, Kenya<br />
        Email: crimecurb@gmail.com<br />
        Tel: 0722 400 886 / 0719 225 053
      </p>
    </PolicyLayout>
  );
}
