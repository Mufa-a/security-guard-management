import { AnimatePresence, motion } from 'framer-motion';
import { X, Phone, Mail, MapPin, Clock, Calendar, FileText, Wallet, ShieldCheck, ShieldOff, UserMinus, AlertTriangle, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { EmployeeProfile } from '../../types/staff';
import { useAuth } from '../auth/AuthContext';

interface GuardDrawerProps {
  guard: EmployeeProfile | null;
  isOnDuty: boolean;
  site: string | undefined;
  shiftTime: { start: string; end: string } | undefined;
  openIncidentsAtSite: number;
  attendancePercent: number | null; // null when not enough data yet
  onClose: () => void;
  onSetStatus: (id: string, status: string) => void;
  onDelete: (id: string, name: string) => void;
}

function yearsOfService(dateEmployed: string): string {
  const start = new Date(dateEmployed);
  const now = new Date();
  const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (years < 1) return `${Math.max(1, Math.round(years * 12))} mo`;
  return `${years.toFixed(1)} yr`;
}

export default function GuardDrawer({
  guard,
  isOnDuty,
  site,
  shiftTime,
  openIncidentsAtSite,
  attendancePercent,
  onClose,
  onSetStatus,
  onDelete,
}: GuardDrawerProps) {
  const { user } = useAuth();
  const canManageStatus = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canManageSalary = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <AnimatePresence>
      {guard && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl overflow-y-auto"
          >
            <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
              <p className="font-display font-bold text-slate-800">Guard Profile</p>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative shrink-0">
                  {guard.photo ? (
                    <img src={guard.photo} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-crimecurb-navy/5 flex items-center justify-center font-display font-bold text-crimecurb-navy text-lg">
                      {guard.user.first_name?.[0]}
                      {guard.user.last_name?.[0]}
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                      isOnDuty ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    {isOnDuty && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-lg text-slate-800 truncate">
                    {guard.user.first_name} {guard.user.last_name}
                  </p>
                  <p className="text-xs font-mono text-slate-400">{guard.employee_number}</p>
                  <span
                    className={`inline-flex items-center gap-1 mt-1.5 text-[10px] font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      isOnDuty ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isOnDuty ? <ShieldCheck size={10} /> : <ShieldOff size={10} />}
                    {isOnDuty ? 'On Duty' : 'Off Duty'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-mono uppercase text-slate-400 mb-0.5">Years of Service</p>
                  <p className="font-display font-bold text-slate-800">{yearsOfService(guard.date_employed)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-mono uppercase text-slate-400 mb-0.5">Open Incidents (Site)</p>
                  <p className={`font-display font-bold ${openIncidentsAtSite > 0 ? 'text-crimecurb-red' : 'text-slate-800'}`}>
                    {openIncidentsAtSite}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-mono uppercase text-slate-400 mb-0.5">Attendance (30d)</p>
                  <p className="font-display font-bold text-slate-800">{attendancePercent !== null ? `${attendancePercent}%` : '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-mono uppercase text-slate-400 mb-0.5">Documents on File</p>
                  <p className="font-display font-bold text-slate-800">{guard.documents.length}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Current Assignment</p>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <MapPin size={14} className="text-crimecurb-red shrink-0" />
                  {site ?? 'Not currently posted'}
                </div>
                {shiftTime && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock size={14} className="shrink-0" />
                    {shiftTime.start}–{shiftTime.end}
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Contact</p>
                <a href={`tel:${guard.user.phone_number}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-crimecurb-navy">
                  <Phone size={14} className="shrink-0" /> {guard.user.phone_number || 'No phone on file'}
                </a>
                <a href={`mailto:${guard.user.email}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-crimecurb-navy">
                  <Mail size={14} className="shrink-0" /> {guard.user.email}
                </a>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Personal</p>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar size={14} className="shrink-0" /> Employed {guard.date_employed}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText size={14} className="shrink-0" /> National ID {guard.national_id}
                </div>
              </div>

              <div className={canManageSalary ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1 gap-2'}>
                {canManageSalary && (
                  <Link
                    to={`/staff/${guard.id}/salary`}
                    className="flex items-center justify-center gap-1.5 bg-crimecurb-navy text-white text-sm font-medium py-2.5 rounded-lg hover:bg-crimecurb-navy/90 transition-colors"
                  >
                    <Wallet size={14} /> Manage Salary
                  </Link>
                )}
                <Link
                  to={`/shifts/new?employee=${guard.id}`}
                  className={
                    canManageSalary
                      ? 'flex items-center justify-center gap-1.5 border border-slate-200 text-slate-700 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors'
                      : 'flex items-center justify-center gap-2 bg-crimecurb-navy text-white text-base font-semibold py-3.5 rounded-lg hover:bg-crimecurb-navy/90 transition-colors'
                  }
                >
                  <Clock size={canManageSalary ? 14 : 18} /> Assign Shift
                </Link>

                {canManageStatus && (
                  <button
                    onClick={() => onSetStatus(guard.id, 'ON_LEAVE')}
                    className="flex items-center justify-center gap-1.5 border border-slate-200 text-slate-700 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <UserMinus size={14} /> Set On Leave
                  </button>
                )}
                {canManageStatus && (
                  <button
                    onClick={() => onSetStatus(guard.id, 'SUSPENDED')}
                    className="flex items-center justify-center gap-1.5 border border-amber-200 text-amber-700 text-sm font-medium py-2.5 rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    <AlertTriangle size={14} /> Suspend
                  </button>
                )}
              </div>

              {canManageStatus && (
                <button
                  onClick={() => onDelete(guard.id, `${guard.user.first_name} ${guard.user.last_name}`)}
                  className="w-full mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-red-600 py-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} /> Delete Guard
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}