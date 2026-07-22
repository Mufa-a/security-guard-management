import { Link } from 'react-router-dom';
import { ChevronRight, Lock } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getVisibleCategories } from './reportRegistry';

export default function ReportsHub() {
  const { user } = useAuth();
  const categories = getVisibleCategories(user?.role);

  return (
    <div>
      <div className="mb-8">
        <p className="text-[11px] font-mono font-semibold uppercase tracking-[2px] text-crimecurb-red mb-2">
          Operations · Reports
        </p>
        <h1 className="font-display text-[28px] font-bold text-slate-800 mb-1.5">Reports</h1>
        <p className="text-sm text-slate-500 max-w-xl">
          Executive, operational, financial, and HR reporting across your operation.
        </p>
      </div>

      {categories.length === 0 && (
        <p className="text-slate-400">You don't have access to any reports.</p>
      )}

      <div className="space-y-8">
        {categories.map((cat) => (
          <div key={cat.key}>
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-slate-400 mb-3">
              {cat.label}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {cat.reports.map((r) => {
                const Icon = r.icon;
                const card = (
                  <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4.5 h-full hover:shadow-md hover:border-crimecurb-navy/20 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg bg-crimecurb-navy/5 text-crimecurb-navy flex items-center justify-center">
                        <Icon size={17} />
                      </div>
                      {r.isBuilt ? (
                        <ChevronRight size={16} className="text-slate-300" />
                      ) : (
                        <Lock size={13} className="text-slate-300" />
                      )}
                    </div>
                    <p className="font-medium text-sm text-slate-800 mb-1">{r.label}</p>
                    <p className="text-xs text-slate-500 leading-snug">{r.description}</p>
                    {!r.isBuilt && (
                      <span className="inline-block mt-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        Coming soon
                      </span>
                    )}
                  </div>
                );
                return r.isBuilt ? (
                  <Link key={r.key} to={r.path}>{card}</Link>
                ) : (
                  <div key={r.key} className="cursor-not-allowed opacity-70">{card}</div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}