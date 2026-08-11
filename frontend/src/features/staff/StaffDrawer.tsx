import { AnimatePresence, motion } from 'framer-motion';
import { X, Phone, Mail, Calendar, FileText, Wallet, Pencil, UserMinus, AlertTriangle, RotateCcw, Trash2, MapPin, ShieldCheck, UserCog, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { EmployeeProfile } from '../../types/staff';
import { useAuth } from '../auth/AuthContext';

interface StaffDrawerProps {
  staff: EmployeeProfile | null;
  onClose: () => void;
  onSetStatus: (id: string, status: string) => void;
  onDelete: (id: string, name: string) => void;
}

const ROLE_STYLES: Record<string, { badge: string; icon: typeof ShieldCheck }> = {
  ADMIN: { badge: 'bg-crimecurb-red/10 text-crimecurb-red', icon: ShieldCheck },
  MANAGER: { badge: 'bg-crimecurb-navy/10 text-crimecurb-navy', icon: UserCog },
  SUPERVISOR: { badge: 'bg-sky-50 text-sky-700', icon: Award },
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  ON_LEAVE: 'bg-amber-50 text-amber-700',
  SUSPENDED: 'bg-orange-50 text-orange-700',
  TERMINATED: 'bg-red-50 text-red-700',
};

function yearsOfService(dateEmployed: string): string {
  const start = new Date(dateEmployed);
  const now = new Date();
  const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (years < 1) return `${Math.max(1, Math.round(years * 12))} mo`;
  return `${years.toFixed(1)} yr`;
}

export default function StaffDrawer({ staff, onClose, onSetStatus, onDelete }: StaffDrawerProps) {
  const { user } = useAuth();
  const canManageStatus = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canManageSalary = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isAdmin = user?.role === 'ADMIN';

  const roleStyle = staff ? (ROLE_STYLES[staff.user.role] ?? ROLE_STYLES.SUPERVISOR) : ROLE_STYLES.SUPERVISOR;
  const RoleIcon = roleStyle.icon;

  return (
    <AnimatePresence>
      {staff && (
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
              <p className="font-display font-bold text-slate-800">Staff Profile</p>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative shrink-0">
                  {staff.photo ? (
                    <img src={staff.photo} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-crimecurb-navy/5 flex items-center justify-center font-display font-bold text-crimecurb-navy text-lg">
                      {staff.user.first_name?.[0]}
                      {staff.user.last_name?.[0]}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-lg text-slate-800 truncate">
                    {staff.user.first_name} {staff.user.last_name}
                  </p>
                  <p className="text-xs font-mono text-slate-400">{staff.employee_number}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${roleStyle.badge}`}>
                      <RoleIcon size={10} />
                      {staff.user.role}
                    </span>
                    <span className={`inline-flex items-center text-[10px] font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_STYLES[staff.employment_status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {staff.employment_status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-mono uppercase text-slate-400 mb-0.5">Years of Service</p>
                  <p className="font-display font-bold text-slate-800">{yearsOfService(staff.date_employed)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-mono uppercase text-slate-400 mb-0.5">Documents on File</p>
                  <p className="font-display font-bold text-slate-800">{staff.documents.length}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Contact</p>
                <a href={`tel:${staff.user.phone_number}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-crimecurb-navy">
                  <Phone size={14} className="shrink-0" /> {staff.user.phone_number || 'No phone on file'}
                </a>
                <a href={`mailto:${staff.user.email}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-crimecurb-navy">
                  <Mail size={14} className="shrink-0" /> {staff.user.email}
                </a>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Personal</p>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar size={14} className="shrink-0" /> Employed {staff.date_employed}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText size={14} className="shrink-0" /> National ID {staff.national_id}
                </div>
                {staff.physical_address && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin size={14} className="shrink-0" /> {staff.physical_address}
                  </div>
                )}
              </div>

              <div className={canManageSalary ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1 gap-2'}>
                <Link
                  to={`/staff/${staff.id}`}
                  className="flex items-center justify-center gap-1.5 bg-crimecurb-navy text-white text-sm font-medium py-2.5 rounded-lg hover:bg-crimecurb-navy/90 transition-colors"
                >
                  <Pencil size={14} /> Edit Details
                </Link>
                {canManageSalary && (
                  <Link
                    to={`/staff/${staff.id}/salary`}
                    className="flex items-center justify-center gap-1.5 border border-slate-200 text-slate-700 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Wallet size={14} /> Manage Salary
                  </Link>
                )}

                {canManageStatus && staff.employment_status === 'ACTIVE' && (
                  <button
                    onClick={() => onSetStatus(staff.id, 'ON_LEAVE')}
                    className="flex items-center justify-center gap-1.5 border border-slate-200 text-slate-700 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <UserMinus size={14} /> Set On Leave
                  </button>
                )}
                {canManageStatus && staff.employment_status === 'ACTIVE' && (
                  <button
                    onClick={() => onSetStatus(staff.id, 'SUSPENDED')}
                    className="flex items-center justify-center gap-1.5 border border-amber-200 text-amber-700 text-sm font-medium py-2.5 rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    <AlertTriangle size={14} /> Suspend
                  </button>
                )}
                {canManageStatus && staff.employment_status !== 'ACTIVE' && staff.employment_status !== 'TERMINATED' && (
                  <button
                    onClick={() => onSetStatus(staff.id, 'ACTIVE')}
                    className="flex items-center justify-center gap-1.5 border border-emerald-200 text-emerald-700 text-sm font-medium py-2.5 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    <RotateCcw size={14} /> Reactivate
                  </button>
                )}
              </div>

              {isAdmin && (
                <button
                  onClick={() => onDelete(staff.id, `${staff.user.first_name} ${staff.user.last_name}`)}
                  className="w-full mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-red-600 py-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} /> Delete Employee
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}