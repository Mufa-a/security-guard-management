import { Link } from 'react-router-dom';
import logo from '../../assets/crimecurb-logo.png';
export default function PolicyLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-200">
          <img src={logo} alt="Crimecurb" className="h-12 w-12 object-contain" />
          <div>
            <p className="font-display font-bold text-slate-800 leading-tight">
              Crimecurb Security Services
            </p>
            <p className="text-xs text-slate-400">Security Guard Management System</p>
          </div>
        </div>
        <h1 className="font-display text-2xl font-bold text-slate-800 mb-1">{title}</h1>
        <p className="text-xs text-slate-400 mb-8">Last updated: {lastUpdated}</p>
        <div className="prose prose-slate prose-sm max-w-none space-y-4 text-slate-700 leading-relaxed">
          {children}
        </div>
        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-wrap gap-4 text-sm">
          <Link to="/policies/privacy-policy" className="text-blue-700 hover:underline">Privacy Policy</Link>
          <Link to="/policies/data-protection-policy" className="text-blue-700 hover:underline">Data Protection Policy</Link>
          <Link to="/policies/access-control-policy" className="text-blue-700 hover:underline">Access Control Policy</Link>
        </div>
      </div>
    </div>
  );
}
