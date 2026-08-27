import { useState } from 'react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { NAV_ITEMS } from '../routes/navConfig';
import logo from '../assets/crimecurb-logo.png';
import NotificationBell from '../components/notifications/NotificationBell';
import Footer from '../components/Footer';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => user?.role && item.roles.includes(user.role)
  );

  return (
    <div className="h-screen flex bg-gradient-to-br from-sky-100 via-indigo-50 to-rose-100 overflow-hidden font-sans relative">
      {/* saturated color washes — what the glass diffuses */}
      <div className="pointer-events-none fixed -top-32 -left-20 h-[26rem] w-[26rem] rounded-full bg-sky-400/40 blur-3xl" />
      <div className="pointer-events-none fixed top-1/3 right-0 h-[22rem] w-[22rem] rounded-full bg-indigo-400/30 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 left-1/3 h-72 w-72 rounded-full bg-rose-300/40 blur-3xl" />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar — liquid-glass panel: dark rim, specular sheen at top, opaque enough to read */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 h-full w-64 flex flex-col print:hidden
          bg-crimecurb-navy/75 backdrop-blur-2xl backdrop-saturate-150
          ring-1 ring-inset ring-white/10 border-r border-black/20
          shadow-[inset_0_1px_0_rgba(255,255,255,0.15),8px_0_30px_rgba(15,23,42,0.25)]
          text-white
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
            className="md:hidden text-slate-300 hover:text-white flex-shrink-0"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `relative block px-4 py-2 text-sm rounded-full transition-all ${
                  isActive
                    ? 'bg-white/25 backdrop-blur-md text-white font-medium ring-1 ring-inset ring-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-200 truncate">{user?.email}</p>
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                {user?.role ?? 'No role'}
              </p>
            </div>
          </div>
          <Link
            to="/policies/privacy-policy"
            className="block text-center text-[10px] font-mono uppercase tracking-widest text-slate-400 hover:text-slate-200 mb-2 transition-colors"
          >
            Privacy & Data Policy
          </Link>
          <button
            onClick={logout}
            className="w-full bg-white/10 hover:bg-white/20 ring-1 ring-inset ring-white/20 text-slate-100 hover:text-white text-xs font-medium uppercase tracking-widest py-2 rounded-full backdrop-blur-sm transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 md:-ml-6 relative z-10">
        <header className="md:hidden flex items-center gap-3 bg-crimecurb-navy/75 backdrop-blur-2xl ring-1 ring-inset ring-white/10 text-white px-4 py-3 sticky top-0 z-20 print:hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_20px_rgba(15,23,42,0.2)]">
          <button
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
            className="text-white"
          >
            <Menu size={22} />
          </button>
          <img src={logo} alt="Crimecurb" className="h-7 w-7 object-contain" />
          <p className="font-semibold text-sm tracking-tight flex-1">Crimecurb</p>
          <NotificationBell />
        </header>

        <div className="hidden md:flex justify-end px-6 pt-4 print:hidden">
          <NotificationBell />
        </div>

        {/* Content shell — the signature liquid-glass surface: opaque enough to diffuse busy content behind it, dark rim, specular top edge */}
        <main
          className="relative z-10 flex-1 md:rounded-l-[28px] overflow-y-auto p-4 md:p-6 print:p-0 print:w-full print:ml-0 print:rounded-none md:-mt-2
          bg-white/55 backdrop-blur-2xl backdrop-saturate-150
          ring-1 ring-inset ring-white/60 border border-black/5
          shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_40px_rgba(30,41,59,0.15)]"
        >
          <Outlet />
          <Footer />
        </main>
      </div>
    </div>
  );
}