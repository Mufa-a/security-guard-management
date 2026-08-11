import { motion } from 'framer-motion';
import { MapPin, Clock, ShieldCheck, ShieldOff, User, MessageSquare, Phone, Navigation } from 'lucide-react';
import type { EmployeeProfile } from '../../types/staff';

export interface GuardCardProps {
  guard: EmployeeProfile;
  isOnDuty: boolean;
  site: string | undefined;
  shiftTime: { start: string; end: string } | undefined;
  openIncidentsAtSite: number;
  onOpenProfile: (guard: EmployeeProfile) => void;
  onOpenMap: (guard: EmployeeProfile) => void;
  onSetStatus: (id: string, status: string) => void;
  onDelete: (id: string, name: string) => void;
}

function yearsOfService(dateEmployed: string): string {
  const years = (Date.now() - new Date(dateEmployed).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return years < 1 ? `${Math.max(1, Math.round(years * 12))}mo` : `${years.toFixed(1)}yr`;
}

export default function GuardCard({
  guard, isOnDuty, site, shiftTime, openIncidentsAtSite, onOpenProfile, onOpenMap, onSetStatus, onDelete,
}: GuardCardProps) {
  const fullName = `${guard.user.first_name} ${guard.user.last_name}`;
  const initials = `${guard.user.first_name?.[0] ?? ''}${guard.user.last_name?.[0] ?? ''}`.toUpperCase();
  // onSetStatus / onDelete are still accepted as props (used by the parent's
  // state handlers) but the quick-menu that triggered them from the card
  // has been removed — those actions now live in the profile drawer only.
  void onSetStatus;
  void onDelete;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 20px 40px -12px rgba(15,23,42,0.18)' }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="relative group bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden"
    >
      <div className={`absolute inset-x-0 top-0 h-0.5 ${isOnDuty ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-slate-200'}`} />

      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="relative shrink-0">
            {guard.photo ? (
              <motion.img
                whileHover={{ scale: 1.05 }}
                src={guard.photo}
                alt=""
                className="w-12 h-12 rounded-xl object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-crimecurb-navy/5 flex items-center justify-center font-display font-bold text-sm text-crimecurb-navy">
                {initials}
              </div>
            )}
            {isOnDuty && (
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-slate-800 truncate">{fullName}</p>
            <p className="text-xs font-mono text-slate-400">{guard.employee_number}</p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase tracking-widest px-2 py-1 rounded-full mb-4 ${
            isOnDuty ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {isOnDuty ? <ShieldCheck size={11} /> : <ShieldOff size={11} />}
          {isOnDuty ? 'On Duty' : 'Off Duty'}
        </span>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin size={13} className="text-crimecurb-red shrink-0" />
            <span className="truncate">{site ?? 'Not currently posted'}</span>
          </div>
          {shiftTime && (
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Clock size={12} className="shrink-0" />
              {shiftTime.start}–{shiftTime.end}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4 pt-3 border-t border-slate-50">
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-400">Service</p>
            <p className="text-sm font-semibold text-slate-700">{yearsOfService(guard.date_employed)}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-400">Open Incidents</p>
            <p className={`text-sm font-semibold ${openIncidentsAtSite > 0 ? 'text-crimecurb-red' : 'text-slate-700'}`}>{openIncidentsAtSite}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <button onClick={() => onOpenProfile(guard)} title="View Profile" className="flex items-center justify-center py-2 rounded-lg bg-crimecurb-navy/5 text-crimecurb-navy hover:bg-crimecurb-navy hover:text-white transition-colors">
            <User size={14} />
          </button>
          <button onClick={() => onOpenMap(guard)} title="View last known location" className="flex items-center justify-center py-2 rounded-lg bg-crimecurb-navy/5 text-crimecurb-navy hover:bg-crimecurb-navy hover:text-white transition-colors">
            <Navigation size={14} />
          </button>
          <a href={`tel:${guard.user.phone_number}`} title="Call" className="flex items-center justify-center py-2 rounded-lg bg-crimecurb-navy/5 text-crimecurb-navy hover:bg-crimecurb-navy hover:text-white transition-colors">
            <Phone size={14} />
          </a>
          <a href={`mailto:${guard.user.email}`} title="Message" className="flex items-center justify-center py-2 rounded-lg bg-crimecurb-navy/5 text-crimecurb-navy hover:bg-crimecurb-navy hover:text-white transition-colors">
            <MessageSquare size={14} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}