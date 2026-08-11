import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  Phone, Mail, Calendar, MapPin, Users, Ruler, FileText, ShieldCheck,
  AlertTriangle, KeyRound, CalendarCheck2, Briefcase,
} from 'lucide-react';
import { getMe } from '../../api/accountsApi';
import { getMyEmployeeProfile, changeMyPin } from '../../api/staffApi';
import { getMyShiftAssignments } from '../../api/shiftsApi';
import { getMyAttendance } from '../../api/attendanceApi';
import type { User, EmployeeProfile } from '../../types/staff';

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

function yearsOfService(dateEmployed: string): string {
  const years = (Date.now() - new Date(dateEmployed).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return years < 1 ? `${Math.max(1, Math.round(years * 12))} mo` : `${years.toFixed(1)} yr`;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ON_LEAVE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  SUSPENDED: 'bg-red-500/10 text-red-400 border-red-500/20',
};

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon size={15} className="text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-mono uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-sm text-slate-700 truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5"
    >
      <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">{title}</p>
      <div className="divide-y divide-slate-50">{children}</div>
    </motion.div>
  );
}

export default function ProfilePage() {
  const [me, setMe] = useState<User | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [attendancePercent, setAttendancePercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [isChangingPin, setIsChangingPin] = useState(false);

  useEffect(() => {
    getMe()
      .then((user) => {
        setMe(user);
        return getMyEmployeeProfile();
      })
      .then((profile) => setEmployeeProfile(profile))
      .catch(() => setError('Failed to load profile.'));

    // Personal 30-day attendance %, same honest derivation used on the
    // Active Guards drawer: assignments in the window vs. those with an
    // actual check-in. Kept separate from the profile fetch above so a
    // failure here doesn't block the rest of the page from rendering.
    Promise.all([getMyShiftAssignments(), getMyAttendance()])
      .then(([assignments, attendance]) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        const inWindow = assignments.filter((a) => a.shift_date >= cutoffStr && a.status !== 'CANCELLED');
        if (inWindow.length === 0) {
          setAttendancePercent(null);
          return;
        }
        const byAssignmentId = new Map(attendance.map((a) => [a.shift_assignment, a]));
        const attended = inWindow.filter((a) => byAssignmentId.get(a.id)?.check_in_time).length;
        setAttendancePercent(Math.round((attended / inWindow.length) * 100));
      })
      .catch(() => setAttendancePercent(null));
  }, []);

  const upcomingExpiringDocs = useMemo(() => {
    if (!employeeProfile) return [];
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    return employeeProfile.documents.filter((d) => d.expiry_date && new Date(d.expiry_date) <= soon);
  }, [employeeProfile]);

  async function handleChangePin(e: FormEvent) {
    e.preventDefault();
    setPinError(null);
    setPinMessage(null);

    if (!/^\d{6}$/.test(newPin)) {
      setPinError('New PIN must be exactly 6 digits.');
      return;
    }

    setIsChangingPin(true);
    try {
      await changeMyPin(currentPin, newPin);
      setPinMessage('PIN changed successfully.');
      setCurrentPin('');
      setNewPin('');
    } catch {
      setPinError('Current PIN is incorrect, or something went wrong.');
    } finally {
      setIsChangingPin(false);
    }
  }

  return (
    <div>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {me && (
        <div className="space-y-4">
          {/* hero */}
          <div className="relative bg-gradient-to-b from-slate-950 to-black rounded-2xl px-6 pt-8 pb-8 text-center overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-crimecurb-red/10 blur-2xl" />

            <div className="relative mx-auto h-20 w-20 rounded-2xl overflow-hidden bg-slate-800 border border-white/10 flex items-center justify-center mb-4">
              {employeeProfile?.photo ? (
                <img src={employeeProfile.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-display font-bold text-xl">{getInitials(me.first_name, me.last_name)}</span>
              )}
            </div>

            <p className="text-white font-display font-bold text-2xl mb-1">{me.first_name} {me.last_name}</p>

            {employeeProfile && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-white font-mono text-lg font-bold tracking-wide">{employeeProfile.employee_number}</span>
                <span className={`text-[10px] font-mono font-semibold uppercase tracking-widest px-2 py-1 rounded-full border ${STATUS_STYLES[employeeProfile.employment_status] ?? 'bg-white/5 text-white/60 border-white/10'}`}>
                  {employeeProfile.employment_status.replace('_', ' ')}
                </span>
              </div>
            )}

            <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">{me.role}</p>
          </div>

          {/* quick stats */}
          {employeeProfile && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-slate-200/70 p-3 text-center">
                <Briefcase size={14} className="mx-auto text-slate-400 mb-1" />
                <p className="text-sm font-display font-bold text-slate-800">{yearsOfService(employeeProfile.date_employed)}</p>
                <p className="text-[10px] font-mono uppercase text-slate-400">Service</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200/70 p-3 text-center">
                <CalendarCheck2 size={14} className="mx-auto text-slate-400 mb-1" />
                <p className="text-sm font-display font-bold text-slate-800">{attendancePercent !== null ? `${attendancePercent}%` : '—'}</p>
                <p className="text-[10px] font-mono uppercase text-slate-400">Attendance (30d)</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200/70 p-3 text-center">
                <FileText size={14} className="mx-auto text-slate-400 mb-1" />
                <p className="text-sm font-display font-bold text-slate-800">{employeeProfile.documents.length}</p>
                <p className="text-[10px] font-mono uppercase text-slate-400">Documents</p>
              </div>
            </div>
          )}

          {upcomingExpiringDocs.length > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-3">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>
                {upcomingExpiringDocs.length} document{upcomingExpiringDocs.length > 1 ? 's' : ''} expiring within 30 days:{' '}
                {upcomingExpiringDocs.map((d) => d.document_type).join(', ')}
              </span>
            </div>
          )}

          <SectionCard title="Contact">
            <InfoRow icon={Mail} label="Email" value={me.email} />
            <InfoRow icon={Phone} label="Phone" value={me.phone_number} />
          </SectionCard>

          {employeeProfile && (
            <>
              <SectionCard title="Employment">
                <InfoRow icon={Calendar} label="Date Employed" value={employeeProfile.date_employed} />
                <InfoRow icon={ShieldCheck} label="National ID" value={employeeProfile.national_id} />
              </SectionCard>

              <SectionCard title="Personal">
                <InfoRow icon={Calendar} label="Date of Birth" value={employeeProfile.date_of_birth ?? ''} />
                <InfoRow icon={Users} label="Gender" value={employeeProfile.gender} />
                <InfoRow icon={MapPin} label="Address" value={employeeProfile.physical_address} />
                {employeeProfile.height_cm != null && (
                  <InfoRow icon={Ruler} label="Height" value={`${employeeProfile.height_cm} cm`} />
                )}
              </SectionCard>

              <SectionCard title="Next of Kin">
                <InfoRow icon={Users} label="Name" value={employeeProfile.next_of_kin_name} />
                <InfoRow icon={Phone} label="Phone" value={employeeProfile.next_of_kin_phone} />
              </SectionCard>

              {employeeProfile.documents.length > 0 && (
                <SectionCard title="Documents on File">
                  {employeeProfile.documents.map((doc) => (
                    <InfoRow
                      key={doc.id}
                      icon={FileText}
                      label={doc.document_type}
                      value={doc.expiry_date ? `Expires ${doc.expiry_date}` : 'No expiry'}
                    />
                  ))}
                </SectionCard>
              )}
            </>
          )}

          {/* PIN change — guards only, since PIN login is guard-specific */}
          {me.role === 'GUARD' && (
            <div className="bg-white border border-slate-200/70 rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound size={15} className="text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-700">Change Login PIN</h2>
              </div>

              {pinError && (
                <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-3 border border-red-200">{pinError}</p>
              )}
              {pinMessage && (
                <p className="bg-green-50 text-green-700 text-sm rounded p-2 mb-3 border border-green-200">{pinMessage}</p>
              )}

              <form onSubmit={handleChangePin} className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Current PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 tracking-[0.3em] text-center"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">New 6-Digit PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 tracking-[0.3em] text-center"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isChangingPin}
                  className="w-full bg-crimecurb-navy hover:bg-crimecurb-navy/90 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isChangingPin ? 'Saving...' : 'Change PIN'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}