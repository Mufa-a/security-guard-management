import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import logo from '../../assets/crimecurb-logo.png';

type LoginMode = 'password' | 'pin';

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('password');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [pin, setPin] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, pinLogin } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'password') {
        await login({ email, password });
      } else {
        await pinLogin({ employee_number: employeeNumber, pin });
      }
      navigate('/dashboard');
    } catch (err: any) {
      if (err?.response?.status === 423) {
        setError('Too many failed attempts. Try again in a few minutes.');
      } else if (mode === 'password') {
        setError('Invalid email or password.');
      } else {
        setError('Invalid employee number or PIN.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode(next: LoginMode) {
    setMode(next);
    setError(null);
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-100">
      <div className="flex-1 flex items-center justify-center px-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm border-t-4 border-red-600"
        >
          <div className="flex flex-col items-center mb-6">
            <img src={logo} alt="Crimecurb Security Services" className="h-20 w-20 object-contain mb-3" />
            <h1 className="text-xl font-bold text-blue-900 text-center leading-tight">
              Crimecurb Security Services
            </h1>
            <p className="text-xs text-slate-500 mt-1 tracking-wide">
              Impartiality, Honesty &amp; Accountability
            </p>
          </div>

          <div className="flex mb-6 bg-slate-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => switchMode('password')}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
                mode === 'password' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Email &amp; Password
            </button>
            <button
              type="button"
              onClick={() => switchMode('pin')}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
                mode === 'pin' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Guard PIN Login
            </button>
          </div>

          {error && (
            <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">
              {error}
            </p>
          )}

          {mode === 'password' ? (
            <>
              <label className="block text-sm text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full mb-4 px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
              <label className="block text-sm text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full mb-6 px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
            </>
          ) : (
            <>
              <label className="block text-sm text-slate-700 mb-1">Employee Number</label>
              <input
                type="text"
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                placeholder="e.g. EMP-0042"
                required
                className="w-full mb-4 px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
              <label className="block text-sm text-slate-700 mb-1">6-Digit PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full mb-6 px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-800 tracking-[0.3em] text-center"
              />
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-2 rounded transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}