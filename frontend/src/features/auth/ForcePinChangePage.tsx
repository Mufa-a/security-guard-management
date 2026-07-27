import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { changeMyPin } from '../../api/staffApi';
import logo from '../../assets/crimecurb-logo.png';

export default function ForcePinChangePage() {
  const { clearPinMustChange, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(newPin)) {
      setError('New PIN must be exactly 6 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('New PIN and confirmation do not match.');
      return;
    }
    if (newPin === currentPin) {
      setError('New PIN must be different from your current PIN.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changeMyPin(currentPin, newPin);
      clearPinMustChange();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to change PIN. Check your current PIN.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-100">
      <div className="flex-1 flex items-center justify-center px-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm border-t-4 border-red-600"
        >
          <div className="flex flex-col items-center mb-6">
            <img src={logo} alt="Crimecurb Security Services" className="h-16 w-16 object-contain mb-3" />
            <h1 className="text-lg font-bold text-blue-900 text-center leading-tight">
              Set Your PIN
            </h1>
            <p className="text-xs text-slate-500 mt-1 text-center">
              For your security, you must set a new 6-digit PIN before continuing.
            </p>
          </div>

          {error && (
            <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">
              {error}
            </p>
          )}

          <label className="block text-sm text-slate-700 mb-1">Current (Default) PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
            required
            className="w-full mb-4 px-3 py-2 rounded border border-slate-300 tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-blue-800"
          />

          <label className="block text-sm text-slate-700 mb-1">New 6-Digit PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            required
            className="w-full mb-4 px-3 py-2 rounded border border-slate-300 tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-blue-800"
          />

          <label className="block text-sm text-slate-700 mb-1">Confirm New PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            required
            className="w-full mb-6 px-3 py-2 rounded border border-slate-300 tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-blue-800"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-2 rounded transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Set PIN & Continue'}
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full text-slate-500 hover:text-slate-700 text-xs mt-4"
          >
            Log out instead
          </button>
        </form>
      </div>
    </div>
  );
}