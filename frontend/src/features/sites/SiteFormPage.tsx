import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getClients } from '../../api/sitesApi';
import { createSite, getSite, updateSite } from '../../api/sitesApi';
import type { Client } from '../../types/sites';

export default function SiteFormPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

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

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        {isEditMode ? 'Edit Site' : 'Add Site'}
      </h1>

      {error && (
        <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm text-slate-700 mb-1">Client</label>
          <select
            value={form.client}
            onChange={(e) => handleChange('client', e.target.value)}
            required
            className="w-full px-3 py-2 rounded border border-slate-300"
          >
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-700 mb-1">Site Name</label>
          <input
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            className="w-full px-3 py-2 rounded border border-slate-300"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-700 mb-1">Address</label>
          <input
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
            required
            className="w-full px-3 py-2 rounded border border-slate-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Latitude</label>
            <input
              value={form.latitude}
              onChange={(e) => handleChange('latitude', e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Longitude</label>
            <input
              value={form.longitude}
              onChange={(e) => handleChange('longitude', e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-700 mb-1">Site Manager Contact</label>
          <input
            value={form.site_manager_contact}
            onChange={(e) => handleChange('site_manager_contact', e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/sites')}
            className="text-slate-600 hover:text-slate-800 px-5 py-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}