import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, MapPin, Navigation, Phone, ArrowLeft } from 'lucide-react';
import { getClients } from '../../api/sitesApi';
import { createSite, getSite, updateSite } from '../../api/sitesApi';
import type { Client } from '../../types/sites';
import { useAuth } from '../auth/AuthContext'; // adjust path to match your project

export default function SiteFormPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id) && id !== 'new';
  const navigate = useNavigate();
  const { user } = useAuth();
  const isReadOnly = user?.role === 'SUPERVISOR';

  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    client: '',
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    site_manager_contact: '',
  });

  useEffect(() => {
    getClients().then(setClients).catch(() => setError('Failed to load clients.'));

    if (isEditMode && id) {
      getSite(id).then((s) => {
        setForm({
          client: s.client,
          name: s.name,
          address: s.address,
          latitude: s.latitude?.toString() ?? '',
          longitude: s.longitude?.toString() ?? '',
          site_manager_contact: s.site_manager_contact ?? '',
        });
      });
    }
  }, [id, isEditMode]);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload = {
      ...form,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
    };

    try {
      if (isEditMode && id) {
        await updateSite(id, payload);
      } else {
        await createSite(payload);
      }
      navigate('/sites');
    } catch {
      setError('Failed to save site.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5';
  const fieldClass =
    'w-full pl-10 pr-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-crimecurb-navy focus:ring-2 focus:ring-crimecurb-navy/20 disabled:bg-slate-50 disabled:text-slate-500';
  const iconClass = 'absolute left-3 top-1/2 -translate-y-1/2 text-slate-400';

  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="max-w-xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/sites')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-crimecurb-navy transition-colors"
        >
          <ArrowLeft size={15} /> Back to sites
        </button>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
            <h1 className="text-lg font-semibold text-slate-900">
              {isReadOnly ? 'View site' : isEditMode ? 'Edit site' : 'Add site'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isReadOnly
                ? 'Site details are read-only for your role.'
                : isEditMode
                ? 'Update this site\u2019s details.'
                : 'Register a new site under a client.'}
            </p>
          </div>

          {error && (
            <p className="mx-6 mt-5 bg-red-50 text-red-700 text-sm rounded-md p-3 border border-red-200">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
            <div>
              <label className={labelClass}>Client</label>
              <div className="relative">
                <Building2 size={16} className={iconClass} />
                <select
                  value={form.client}
                  onChange={(e) => handleChange('client', e.target.value)}
                  required
                  className={`${fieldClass} appearance-none`}
                >
                  <option value="">Select a client\u2026</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Site name</label>
              <div className="relative">
                <MapPin size={16} className={iconClass} />
                <input
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  placeholder="e.g. Westlands Business Park"
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Address</label>
              <div className="relative">
                <MapPin size={16} className={iconClass} />
                <input
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  required
                  placeholder="Street, building, city"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Latitude</label>
                <div className="relative">
                  <Navigation size={16} className={iconClass} />
                  <input
                    value={form.latitude}
                    onChange={(e) => handleChange('latitude', e.target.value)}
                      placeholder="-1.2921"
                    className={fieldClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Longitude</label>
                <div className="relative">
                  <Navigation size={16} className={iconClass} />
                  <input
                    value={form.longitude}
                    onChange={(e) => handleChange('longitude', e.target.value)}
                      placeholder="36.8219"
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Site manager contact</label>
              <div className="relative">
                <Phone size={16} className={iconClass} />
                <input
                  value={form.site_manager_contact}
                  onChange={(e) => handleChange('site_manager_contact', e.target.value)}
                  placeholder="+254 7XX XXX XXX"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-5 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-crimecurb-navy hover:bg-crimecurb-navy/90 text-white font-medium text-sm px-5 py-2.5 rounded-md transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving\u2026' : 'Save site'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/sites')}
                className="border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-sm px-5 py-2.5 rounded-md transition-colors"
              >
                {isReadOnly ? 'Back' : 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}