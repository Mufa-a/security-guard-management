import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getMe } from '../../api/accountsApi';
import { getMyEmployeeProfile, changeMyPin } from '../../api/staffApi';
import type { User, EmployeeProfile } from '../../types/staff';

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

export default function ProfilePage() {
  const [me, setMe] = useState<User | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [isChangingPin, setIsChangingPin] = useState(false);

  useEffect(() => {
    getMe()
      .then((user) => {
        setMe(user);
        return getMyEmployeeProfile();
      })
      .then((profile) => setEmployeeProfile(profile))
      .catch(() => setError('Failed to load profile.'));
  }, []);

  async function handleChangePin(e: FormEvent) {
    e.preventDefault();
    setPinError(null);
    setPinMessage(null);

    if (!/^\d{6}$/.test(newPin)) {
      setPinError('New PIN must be exactly 6 digits.');
      return;
    }

    setIsChangingPin(true);
    try {
      await changeMyPin(currentPin, newPin);
      setPinMessage('PIN changed successfully.');
      setCurrentPin('');
      setNewPin('');
    } catch {
      setPinError('Current PIN is incorrect, or something went wrong.');
    } finally {
      setIsChangingPin(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {me && (
        <div>
          {/* hero */}
          <div className="relative bg-gradient-to-b from-slate-950 to-black rounded-b-[32px] px-6 pt-6 pb-10 text-center">
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="absolute left-4 top-4 h-9 w-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="mx-auto h-20 w-20 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center mb-4">
              <span className="text-white font-semibold text-xl">
                {getInitials(me.first_name, me.last_name)}
              </span>
            </div>

            <p className="text-white font-bold text-2xl mb-1">
              {me.first_name} {me.last_name}
            </p>

            {employeeProfile && (
              <div className="mt-4 space-y-2">
                <p className="text-white font-mono text-3xl font-extrabold tracking-wide">
                  {employeeProfile.employee_number}
                </p>
                <p className="text-slate-400 font-mono text-base">
                  National ID: {employeeProfile.national_id}
                </p>
              </div>
            )}
          </div>

          {/* details */}
          <div className="bg-white border border-slate-200 mt-4 p-5 space-y-3">
            <div>
              <span className="text-slate-500 text-xs font-mono uppercase tracking-wide">Email</span>
              <p className="font-medium text-slate-800">{me.email}</p>
            </div>
            <div>
              <span className="text-slate-500 text-xs font-mono uppercase tracking-wide">Phone</span>
              <p className="font-medium text-slate-800">{me.phone_number || '—'}</p>
            </div>
            <div>
              <span className="text-slate-500 text-xs font-mono uppercase tracking-wide">Role</span>
              <p className="font-medium text-slate-800">{me.role}</p>
            </div>
          </div>

          {/* PIN change — guards only, since PIN login is guard-specific */}
          {me.role === 'GUARD' && (
            <div className="bg-white border border-slate-200 mt-4 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Change Login PIN</h2>

              {pinError && (
                <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-3 border border-red-200">
                  {pinError}
                </p>
              )}
              {pinMessage && (
                <p className="bg-green-50 text-green-700 text-sm rounded p-2 mb-3 border border-green-200">
                  {pinMessage}
                </p>
              )}

              <form onSubmit={handleChangePin} className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Current PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full px-3 py-2 rounded border border-slate-300 tracking-[0.3em] text-center"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">New 6-Digit PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full px-3 py-2 rounded border border-slate-300 tracking-[0.3em] text-center"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isChangingPin}
                  className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-2 rounded transition-colors disabled:opacity-50"
                >
                  {isChangingPin ? 'Saving...' : 'Change PIN'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}