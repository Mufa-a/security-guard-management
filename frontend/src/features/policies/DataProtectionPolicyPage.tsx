import PolicyLayout from './PolicyLayout';
export default function DataProtectionPolicyPage() {
  return (
    <PolicyLayout title="Data Protection Policy" lastUpdated="August 2026">
      <p>
        This policy sets out how Crimecurb Security Services Co. Limited protects personal data
        processed through the Security Guard Management System, in compliance with the Data
        Protection Act, 2019 (Kenya).
      </p>
      <h2 className="font-display font-bold text-slate-800 text-lg mt-6">1. Data Protection Principles</h2>
      <p>We process personal data:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Lawfully, fairly, and transparently</li>
        <li>For specified, legitimate purposes only</li>
        <li>Adequately, relevantly, and limited to what is necessary</li>
        <li>Accurately, with corrections made without undue delay</li>
        <li>No longer than necessary for the purpose collected</li>
        <li>Securely, protecting against unauthorized access, loss, or damage</li>
      </ul>
      <h2 className="font-display font-bold text-slate-800 text-lg mt-6">2. Technical Controls</h2>
      <p><strong>Encryption</strong> — data in transit encrypted via HTTPS/TLS; passwords and PINs hashed, never stored in plain text.</p>
      <p><strong>Authentication</strong> — management roles use email/password; guards use employee number and a 6-digit PIN via a separate, enforced login path. Newly issued or reset guard PINs must be changed before further access. Failed login attempts are rate-limited both per-account and per-network-origin.</p>
      <p><strong>Access control</strong> — role-based permissions enforced server-side on every request, not just hidden in the interface.</p>
      <p><strong>Audit logging</strong> — significant actions are recorded with user, action, and timestamp.</p>
      <p><strong>Infrastructure</strong> — data stored in PostgreSQL; backend and frontend hosted on providers offering managed TLS and infrastructure-level security; secrets stored as environment variables, never committed to source control.</p>
      <h2 className="font-display font-bold text-slate-800 text-lg mt-6">3. Data Minimization</h2>
      <p>
        Only data necessary for guard deployment, attendance verification, payroll, incident
        tracking, and client billing is collected.
      </p>
      <h2 className="font-display font-bold text-slate-800 text-lg mt-6">4. Backup and Recovery</h2>
      <p>
        Database backups are taken regularly by our hosting provider's managed database service,
        with recovery procedures tested periodically.
      </p>
      <h2 className="font-display font-bold text-slate-800 text-lg mt-6">5. Breach Response</h2>
      <p>
        In the event of a suspected or confirmed data breach, affected individuals and the Office
        of the Data Protection Commissioner (ODPC) will be notified where required by law.
      </p>
      <h2 className="font-display font-bold text-slate-800 text-lg mt-6">6. Responsibility</h2>
      <p>
        The Director (System Administrator) is responsible for overall data protection compliance.
      </p>
    </PolicyLayout>
  );
}
