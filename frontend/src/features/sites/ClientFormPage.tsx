import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, User, Phone, Mail, MapPin, ArrowLeft } from 'lucide-react';
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

  const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5';
  const fieldClass =
    'w-full pl-10 pr-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-crimecurb-navy focus:ring-2 focus:ring-crimecurb-navy/20';
  const iconClass = 'absolute left-3 top-1/2 -translate-y-1/2 text-slate-400';

  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="max-w-xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/clients')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-crimecurb-navy transition-colors"
        >
          <ArrowLeft size={15} /> Back to clients
        </button>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
            <h1 className="text-lg font-semibold text-slate-900">
              {isEditMode ? 'Edit client' : 'Add client'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isEditMode
                ? 'Update this client\u2019s details.'
                : 'Register a new client to start assigning sites and guards.'}
            </p>
          </div>

          {error && (
            <p className="mx-6 mt-5 bg-red-50 text-red-700 text-sm rounded-md p-3 border border-red-200">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
            <div>
              <label className={labelClass}>Client name</label>
              <div className="relative">
                <Building2 size={16} className={iconClass} />
                <input
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  placeholder="e.g. Acme Holdings Ltd"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Contact person</label>
                <div className="relative">
                  <User size={16} className={iconClass} />
                  <input
                    value={form.contact_person}
                    onChange={(e) => handleChange('contact_person', e.target.value)}
                    placeholder="Full name"
                    className={fieldClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Contact phone</label>
                <div className="relative">
                  <Phone size={16} className={iconClass} />
                  <input
                    value={form.contact_phone}
                    onChange={(e) => handleChange('contact_phone', e.target.value)}
                    placeholder="+254 7XX XXX XXX"
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Contact email</label>
              <div className="relative">
                <Mail size={16} className={iconClass} />
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="name@company.com"
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
                  placeholder="Street, building, city"
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
                {isSubmitting ? 'Saving\u2026' : 'Save client'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/clients')}
                className="border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-sm px-5 py-2.5 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}