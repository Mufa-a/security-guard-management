import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createClient, getClient, updateClient } from '../../api/sitesApi';

export default function ClientFormPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    address: '',
  });

  useEffect(() => {
    if (isEditMode && id) {
      getClient(id).then((c) => {
        setForm({
          name: c.name,
          contact_person: c.contact_person,
          contact_phone: c.contact_phone,
          contact_email: c.contact_email,
          address: c.address,
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
    try {
      if (isEditMode && id) {
        await updateClient(id, form);
      } else {
        await createClient(form);
      }
      navigate('/clients');
    } catch {
      setError('Failed to save client.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        {isEditMode ? 'Edit Client' : 'Add Client'}
      </h1>

      {error && (
        <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm text-slate-700 mb-1">Client Name</label>
          <input
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            className="w-full px-3 py-2 rounded border border-slate-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Contact Person</label>
            <input
              value={form.contact_person}
              onChange={(e) => handleChange('contact_person', e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Contact Phone</label>
            <input
              value={form.contact_phone}
              onChange={(e) => handleChange('contact_phone', e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-700 mb-1">Contact Email</label>
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) => handleChange('contact_email', e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-700 mb-1">Address</label>
          <input
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
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
            onClick={() => navigate('/clients')}
            className="text-slate-600 hover:text-slate-800 px-5 py-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}