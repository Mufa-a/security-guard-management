import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function AcceptPolicyPage() {
  const { acceptPolicy, logout } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await acceptPolicy();
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg bg-white rounded-lg shadow p-8">
        <h1 className="text-xl font-semibold mb-4">Before you continue</h1>

        <div className="border rounded-md p-4 mb-6 text-sm text-gray-700">
          <p className="mb-2">Please review the following before continuing:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><a href="/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">Privacy Policy</a></li>
            <li><a href="/policies/data-protection-policy" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">Data Protection Policy</a></li>
            <li><a href="/policies/access-control-policy" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">Access Control Policy</a></li>
          </ul>
        </div>

        <label className="flex items-start gap-2 mb-6 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1"
          />
          <span>I have read and accept the Privacy Policy and Data Protection Policy.</span>
        </label>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <div className="flex justify-between items-center">
          <button
            onClick={logout}
            type="button"
            className="text-sm text-gray-500 hover:underline"
          >
            Log out instead
          </button>
          <button
            onClick={handleSubmit}
            disabled={!checked || submitting}
            className="px-4 py-2 rounded-md bg-crimecurb-navy hover:bg-crimecurb-navy/90 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : 'Accept & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
