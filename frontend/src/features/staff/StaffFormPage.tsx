import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  UserCircle2,
  Fingerprint,
  MapPin,
  Briefcase,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { registerUser } from '../../api/accountsApi';
import {
  createEmployeeProfile,
  getEmployeeProfile,
  updateEmployeeProfile,
  setEmployeePin,
} from '../../api/staffApi';

const EMPLOYMENT_STATUSES = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
// GUARD intentionally excluded — guards are created via the "Add Guard"
// entry point on the Active Guards page (?role=GUARD), not here.
const ROLES = ['SUPERVISOR', 'MANAGER', 'ADMIN'];

type EmployeeFormState = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  employee_number: string;
  national_id: string;
  date_of_birth: string;
  gender: string;
  physical_address: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
  date_employed: string;
  employment_status: string;
  height_cm: string;
};

function validatePassword(password: string, confirm: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  const digitCount = (password.match(/\d/g) || []).length;
  if (digitCount < 2) return 'Password must contain at least 2 numbers.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

function validateEmployeeForm(
  form: EmployeeFormState,
  confirmPassword: string,
  isEditMode: boolean,
  _isGuard: boolean
): string | null {
  if (!isEditMode) {
    const pwError = validatePassword(form.password, confirmPassword);
    if (pwError) return pwError;

    if (!form.first_name.trim()) return 'First name is required.';
    if (!form.last_name.trim()) return 'Last name is required.';
    if (!form.email.trim()) return 'Email is required.';

    if (!/^\d{10}$/.test(form.phone_number)) {
      return 'Phone number must be exactly 10 digits.';
    }
  }

  if (!/^\d{7,9}$/.test(form.national_id)) {
    return 'National ID must be between 7 and 9 digits.';
  }
  // Employee number is auto-assigned for guards — only required for everyone else.
  if (!form.gender) return 'Gender is required.';
  if (!form.physical_address.trim()) return 'Physical address is required.';
  if (!form.next_of_kin_name.trim()) return 'Next of kin name is required.';
  if (!/^\d{10}$/.test(form.next_of_kin_phone)) {
    return 'Next of kin phone must be exactly 10 digits.';
  }
  if (!form.date_of_birth) return 'Date of birth is required.';
  if (!form.date_employed) return 'Date employed is required.';
  if (!form.height_cm) return 'Height is required.';

  return null;
}

/* ---------- shared light-panel building blocks ---------- */

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C81E3A]/10 text-[#C81E3A] ring-1 ring-[#C81E3A]/20">
          <Icon size={18} strokeWidth={2} />
        </span>
        <div>
          <h2 className="font-['Oswald'] text-sm tracking-[0.14em] uppercase text-slate-800">
            {title}
          </h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </header>
      <div className="p-6 space-y-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  hint,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-500 mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1.5">{hint}</p>}
    </div>
  );
}

const inputClasses =
  'w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#C81E3A]/40 focus:border-[#C81E3A] transition-colors';

const monoInputClasses = inputClasses + ' font-mono tracking-wider';

export default function StaffFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const presetRole = searchParams.get('role'); // e.g. "GUARD" from Active Guards "Add Guard"
  const isEditMode = Boolean(id);
  const { user } = useAuth();
  const canSeeSalaryTab = isEditMode && (user?.role === 'ADMIN' || user?.role === 'MANAGER');
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [employeeRole, setEmployeeRole] = useState<string | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [isSettingPin, setIsSettingPin] = useState(false);

  const [form, setForm] = useState<EmployeeFormState>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    role: presetRole === 'GUARD' ? 'GUARD' : 'SUPERVISOR',
    employee_number: '',
    national_id: '',
    date_of_birth: '',
    gender: '',
    physical_address: '',
    next_of_kin_name: '',
    next_of_kin_phone: '',
    date_employed: '',
    employment_status: 'ACTIVE',
    height_cm: '',
  });

  const isCreatingGuard = !isEditMode && presetRole === 'GUARD';

  useEffect(() => {
    if (isEditMode && id) {
      getEmployeeProfile(id).then((p) => {
        setEmployeeRole(p.user.role);
        setForm((prev) => ({
          ...prev,
          email: p.user.email,
          first_name: p.user.first_name,
          last_name: p.user.last_name,
          phone_number: p.user.phone_number ?? '',
          employee_number: p.employee_number ?? '',
          national_id: p.national_id,
          date_of_birth: p.date_of_birth ?? '',
          gender: p.gender,
          physical_address: p.physical_address,
          next_of_kin_name: p.next_of_kin_name,
          next_of_kin_phone: p.next_of_kin_phone,
          date_employed: p.date_employed,
          employment_status: p.employment_status,
          height_cm: p.height_cm?.toString() ?? '',
        }));
      });
    }
  }, [id, isEditMode]);

  function handleChange(field: keyof EmployeeFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleDigitsChange(field: keyof EmployeeFormState, value: string, maxLen: number) {
    const digitsOnly = value.replace(/\D/g, '').slice(0, maxLen);
    setForm((prev) => ({ ...prev, [field]: digitsOnly }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validateEmployeeForm(form, confirmPassword, isEditMode, isCreatingGuard);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && id) {
        await updateEmployeeProfile(id, {
          employee_number: form.employee_number,
          national_id: form.national_id,
          date_of_birth: form.date_of_birth || undefined,
          gender: form.gender,
          physical_address: form.physical_address,
          next_of_kin_name: form.next_of_kin_name,
          next_of_kin_phone: form.next_of_kin_phone,
          date_employed: form.date_employed,
          employment_status: form.employment_status,
          height_cm: form.height_cm ? Number(form.height_cm) : undefined,
        });
        navigate(isCreatingGuard ? '/active-guards' : '/staff');
      } else {
        const newUser = await registerUser({
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          phone_number: form.phone_number,
          role: form.role,
        });

        const newProfile = await createEmployeeProfile({
          user: newUser.id,
          national_id: form.national_id,
          date_of_birth: form.date_of_birth || undefined,
          gender: form.gender,
          physical_address: form.physical_address,
          next_of_kin_name: form.next_of_kin_name,
          next_of_kin_phone: form.next_of_kin_phone,
          date_employed: form.date_employed,
          employment_status: form.employment_status,
          height_cm: form.height_cm ? Number(form.height_cm) : undefined,
        });

        // Only ADMIN/MANAGER can reach the salary page (see /staff/:id/salary
        // in App.tsx) — anyone else falls back to the old destination so
        // ProtectedRoute doesn't just bounce them straight back out.
        const canSeeSalary = user?.role === 'ADMIN' || user?.role === 'MANAGER';
        console.log('DEBUG newProfile:', newProfile);
        console.log('DEBUG user role:', user?.role);
        console.log('DEBUG canSeeSalary:', canSeeSalary);
        if (canSeeSalary && newProfile?.id) {
          navigate(`/staff/${newProfile.id}/salary`);
        } else {
          navigate(isCreatingGuard ? '/active-guards' : '/staff');
        }
      }
    } catch {
      setError('Failed to save employee record. Check required fields.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSetPin(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setPinError(null);
    setPinMessage(null);

    if (!/^\d{6}$/.test(pinValue)) {
      setPinError('PIN must be exactly 6 digits.');
      return;
    }

    setIsSettingPin(true);
    try {
      await setEmployeePin(id, pinValue);
      setPinMessage('PIN set successfully.');
      setPinValue('');
    } catch {
      setPinError('Failed to set PIN.');
    } finally {
      setIsSettingPin(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        {/* Back + heading */}
        <button
          type="button"
          onClick={() => navigate(isCreatingGuard ? '/active-guards' : '/staff')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors mb-5"
        >
          <ArrowLeft size={14} />
          Back to {isCreatingGuard ? 'Active Guards' : 'Staff'}
        </button>

        <div className="mb-8 text-center">
          <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-[#C81E3A]/80 mb-2">
            Crimecurb Security Services
          </p>
          <h1 className="font-['Oswald'] text-3xl tracking-wide uppercase text-slate-900">
            {isEditMode ? 'Edit Employee' : isCreatingGuard ? 'Add Guard' : 'Add Employee'}
          </h1>
        </div>

        {isEditMode && (
          <div className="flex justify-center gap-1 mb-6">
            <span className="px-4 py-2 text-xs font-medium tracking-wide uppercase text-slate-900 bg-slate-100 rounded-t-lg border-b-2 border-[#C81E3A]">
              Details
            </span>
            {canSeeSalaryTab && (
              <button
                type="button"
                onClick={() => navigate(`/staff/${id}/salary`)}
                className="px-4 py-2 text-xs font-medium tracking-wide uppercase text-slate-400 hover:text-slate-700 transition-colors"
              >
                Salary
              </button>
            )}
          </div>
        )}

        {error && (
          <p className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-6 border border-red-200">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isEditMode && (
            <SectionCard icon={UserCircle2} title="Account Details" subtitle="Login credentials and contact role">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name">
                  <input
                    value={form.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    required
                    className={inputClasses}
                  />
                </Field>
                <Field label="Last Name">
                  <input
                    value={form.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    required
                    className={inputClasses}
                  />
                </Field>
              </div>

              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  className={inputClasses}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Password">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      required
                      minLength={8}
                      className={inputClasses + ' pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirm Password">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className={inputClasses + ' pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>
              </div>
              <p className="text-[11px] text-slate-400 -mt-2">
                Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, and 2 numbers.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Phone Number">
                  <input
                    value={form.phone_number}
                    onChange={(e) => handleDigitsChange('phone_number', e.target.value, 10)}
                    required
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10 digits"
                    className={monoInputClasses}
                  />
                </Field>
                <Field label="Role">
                  {isCreatingGuard ? (
                    <input
                      value="GUARD"
                      disabled
                      className={inputClasses + ' opacity-60 cursor-not-allowed bg-slate-50'}
                    />
                  ) : (
                    <select
                      value={form.role}
                      onChange={(e) => handleChange('role', e.target.value)}
                      className={inputClasses}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>
            </SectionCard>
          )}

          <SectionCard
            icon={Fingerprint}
            title="Identification"
            subtitle="Official ID, date of birth and physical description"
          >
            <Field
              label="National ID"
              hint={
                !isEditMode
                  ? `Employee number will be auto-assigned (e.g. ${isCreatingGuard ? 'GRD-004' : 'STF-004'}) once saved.`
                  : undefined
              }
            >
              <input
                value={form.national_id}
                onChange={(e) => handleDigitsChange('national_id', e.target.value, 9)}
                required
                inputMode="numeric"
                maxLength={9}
                placeholder="7-9 digits"
                className={monoInputClasses}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Date of Birth" className="sm:col-span-1">
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  required
                  className={inputClasses}
                />
              </Field>
              <Field label="Gender">
                <select
                  value={form.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  required
                  className={inputClasses}
                >
                  <option value="">Select...</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Height (cm)">
                <input
                  type="number"
                  value={form.height_cm}
                  onChange={(e) => handleChange('height_cm', e.target.value)}
                  required
                  className={monoInputClasses}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard icon={MapPin} title="Contact & Next of Kin" subtitle="Address and emergency contact">
            <Field label="Physical Address">
              <input
                value={form.physical_address}
                onChange={(e) => handleChange('physical_address', e.target.value)}
                required
                className={inputClasses}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Next of Kin Name">
                <input
                  value={form.next_of_kin_name}
                  onChange={(e) => handleChange('next_of_kin_name', e.target.value)}
                  required
                  className={inputClasses}
                />
              </Field>
              <Field label="Next of Kin Phone">
                <input
                  value={form.next_of_kin_phone}
                  onChange={(e) => handleDigitsChange('next_of_kin_phone', e.target.value, 10)}
                  required
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10 digits"
                  className={monoInputClasses}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard icon={Briefcase} title="Employment" subtitle="Start date and current status">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date Employed">
                <input
                  type="date"
                  value={form.date_employed}
                  onChange={(e) => handleChange('date_employed', e.target.value)}
                  required
                  className={inputClasses}
                />
              </Field>
              <Field label="Status">
                <select
                  value={form.employment_status}
                  onChange={(e) => handleChange('employment_status', e.target.value)}
                  className={inputClasses}
                >
                  {EMPLOYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </SectionCard>

          <div className="flex gap-3 justify-center pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#C81E3A] hover:bg-[#a91830] text-white font-['Oswald'] tracking-wide uppercase text-sm px-8 py-3 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => navigate(isCreatingGuard ? '/active-guards' : '/staff')}
              className="text-slate-500 hover:text-slate-800 font-['Oswald'] tracking-wide uppercase text-sm px-8 py-3 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>

        {isEditMode && employeeRole === 'GUARD' && user?.role === 'ADMIN' && (
          <div className="mt-6">
            <SectionCard icon={ShieldCheck} title="Guard PIN Login" subtitle="Set or reset the 6-digit check-in PIN">
              {pinError && (
                <p className="bg-red-50 text-red-700 text-sm rounded-lg p-3 border border-red-200">
                  {pinError}
                </p>
              )}
              {pinMessage && (
                <p className="bg-emerald-50 text-emerald-700 text-sm rounded-lg p-3 border border-emerald-200">
                  {pinMessage}
                </p>
              )}

              <form onSubmit={handleSetPin} className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <Field label="Set / Reset 6-Digit PIN" className="flex-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinValue}
                    onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className={monoInputClasses + ' text-center text-lg tracking-[0.4em]'}
                  />
                </Field>
                <button
                  type="submit"
                  disabled={isSettingPin}
                  className="bg-[#C81E3A] hover:bg-[#a91830] text-white font-['Oswald'] tracking-wide uppercase text-sm px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 h-fit"
                >
                  {isSettingPin ? 'Saving...' : 'Set PIN'}
                </button>
              </form>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}