import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { NAV_ITEMS } from '../routes/navConfig';
import logo from '../assets/crimecurb-logo.png';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => user?.role && item.roles.includes(user.role)
  );

  return (
    <div className="h-screen flex bg-slate-100 overflow-hidden font-sans">
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 h-full w-64 bg-crimecurb-navy text-white flex flex-col print:hidden
          transform transition-transform duration-200 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logo} alt="Crimecurb" className="h-10 w-10 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-display font-bold leading-tight text-sm tracking-tight truncate">Crimecurb</p>
              <p className="text-[11px] font-mono uppercase tracking-widest text-crimecurb-red/90 truncate">
                Security Services
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white flex-shrink-0"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 min-h-0 px-0 py-3 space-y-0.5 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `relative block pl-4 pr-3 py-2 text-sm transition-colors border-l-2 ${
                  isActive
                    ? 'border-crimecurb-red bg-white/5 text-white font-medium'
                    : 'border-transparent text-slate-400 hover:border-slate-600 hover:bg-white/[0.03] hover:text-slate-200'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-300 truncate">{user?.email}</p>
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                {user?.role ?? 'No role'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full border border-white/15 hover:border-white/30 hover:bg-white/5 text-slate-300 hover:text-white text-xs font-medium uppercase tracking-widest py-2 transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 md:-ml-6">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 bg-crimecurb-navy text-white px-4 py-3 sticky top-0 z-20 print:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
            className="text-white"
          >
            <Menu size={22} />
          </button>
          <img src={logo} alt="Crimecurb" className="h-7 w-7 object-contain" />
          <p className="font-semibold text-sm tracking-tight">Crimecurb</p>
        </header>

        <main className="relative z-10 flex-1 md:rounded-l-[24px] bg-slate-100 overflow-y-auto p-4 md:p-6 print:p-0 print:w-full print:ml-0 print:rounded-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}