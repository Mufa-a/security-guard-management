import { motion } from 'framer-motion';
import { Mail, Phone, User, Pencil, ShieldCheck, UserCog, Award, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { EmployeeProfile } from '../../types/staff';

export interface StaffCardProps {
  staff: EmployeeProfile;
  onOpenProfile: (staff: EmployeeProfile) => void;
}

const ROLE_STYLES: Record<string, { badge: string; bar: string; icon: typeof ShieldCheck }> = {
  ADMIN: { badge: 'bg-crimecurb-red/10 text-crimecurb-red', bar: 'from-crimecurb-red to-red-600', icon: ShieldCheck },
  MANAGER: { badge: 'bg-crimecurb-navy/10 text-crimecurb-navy', bar: 'from-crimecurb-navy to-slate-700', icon: UserCog },
  SUPERVISOR: { badge: 'bg-sky-50 text-sky-700', bar: 'from-sky-400 to-sky-500', icon: Award },
};

function yearsOfService(dateEmployed: string): string {
  const years = (Date.now() - new Date(dateEmployed).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return years < 1 ? `${Math.max(1, Math.round(years * 12))}mo` : `${years.toFixed(1)}yr`;
}

export default function StaffCard({ staff, onOpenProfile }: StaffCardProps) {
  const fullName = `${staff.user.first_name} ${staff.user.last_name}`;
  const initials = `${staff.user.first_name?.[0] ?? ''}${staff.user.last_name?.[0] ?? ''}`.toUpperCase();
  const roleStyle = ROLE_STYLES[staff.user.role ?? ''] ?? ROLE_STYLES.SUPERVISOR;
  const RoleIcon = roleStyle.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 20px 40px -12px rgba(15,23,42,0.18)' }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="relative group bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden"
    >
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${roleStyle.bar}`} />

      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="relative shrink-0">
            {staff.photo ? (
              <motion.img
                whileHover={{ scale: 1.05 }}
                src={staff.photo}
                alt=""
                className="w-12 h-12 rounded-xl object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-crimecurb-navy/5 flex items-center justify-center font-display font-bold text-sm text-crimecurb-navy">
                {initials}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-slate-800 truncate">{fullName}</p>
            <p className="text-xs font-mono text-slate-400">{staff.employee_number}</p>
          </div>
        </div>

        <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase tracking-widest px-2 py-1 rounded-full mb-4 ${roleStyle.badge}`}>
          <RoleIcon size={11} />
          {staff.user.role}
        </span>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone size={13} className="text-crimecurb-red shrink-0" />
            <span className="truncate">{staff.user.phone_number || 'No phone on file'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Mail size={13} className="shrink-0" />
            <span className="truncate">{staff.user.email}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4 pt-3 border-t border-slate-50">
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-400">Service</p>
            <p className="text-sm font-semibold text-slate-700">{yearsOfService(staff.date_employed)}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <FileText size={10} /> Documents
            </p>
            <p className="text-sm font-semibold text-slate-700">{staff.documents.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <button onClick={() => onOpenProfile(staff)} title="View Profile" className="flex items-center justify-center py-2 rounded-lg bg-crimecurb-navy/5 text-crimecurb-navy hover:bg-crimecurb-navy hover:text-white transition-colors">
            <User size={14} />
          </button>
          <Link to={`/staff/${staff.id}`} title="Edit" className="flex items-center justify-center py-2 rounded-lg bg-crimecurb-navy/5 text-crimecurb-navy hover:bg-crimecurb-navy hover:text-white transition-colors">
            <Pencil size={14} />
          </Link>
          <a href={`tel:${staff.user.phone_number}`} title="Call" className="flex items-center justify-center py-2 rounded-lg bg-crimecurb-navy/5 text-crimecurb-navy hover:bg-crimecurb-navy hover:text-white transition-colors">
            <Phone size={14} />
          </a>
          <a href={`mailto:${staff.user.email}`} title="Email" className="flex items-center justify-center py-2 rounded-lg bg-crimecurb-navy/5 text-crimecurb-navy hover:bg-crimecurb-navy hover:text-white transition-colors">
            <Mail size={14} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}