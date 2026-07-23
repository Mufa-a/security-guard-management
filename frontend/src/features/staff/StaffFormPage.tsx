import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
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
  isGuard: boolean
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
  if (!isGuard && !form.employee_number.trim()) return 'Employee number is required.';
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
      } else {
        const newUser = await registerUser({
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          phone_number: form.phone_number,
          role: form.role,
        });

        await createEmployeeProfile({
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
      }
      navigate(isCreatingGuard ? '/active-guards' : '/staff');
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
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">
        {isEditMode ? 'Edit Employee' : isCreatingGuard ? 'Add Guard' : 'Add Employee'}
      </h1>

      {isEditMode && (
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          <span className="px-4 py-2 text-sm font-medium text-blue-900 border-b-2 border-blue-900">
            Details
          </span>
          {canSeeSalaryTab && (
            <button
              type="button"
              onClick={() => navigate(`/staff/${id}/salary`)}
              className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Salary
            </button>
          )}
        </div>
      )}

      {!isEditMode && <div className="mb-6" />}

      {error && (
        <p className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4 border border-red-200">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        {!isEditMode && (
          <>
            <h2 className="text-sm font-semibold text-slate-500 uppercase">Account Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">First Name</label>
                <input
                  value={form.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Last Name</label>
                <input
                  value={form.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                className="w-full px-3 py-2 rounded border border-slate-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 pr-10 rounded border border-slate-300"
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
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 pr-10 rounded border border-slate-300"
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
              </div>
            </div>
            <p className="text-xs text-slate-500 -mt-2">
              Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, and 2 numbers.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">Phone Number</label>
                <input
                  value={form.phone_number}
                  onChange={(e) => handleDigitsChange('phone_number', e.target.value, 10)}
                  required
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10 digits"
                  className="w-full px-3 py-2 rounded border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Role</label>
                {isCreatingGuard ? (
                  <input
                    value="GUARD"
                    disabled
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-slate-50 text-slate-500"
                  />
                ) : (
                  <select
                    value={form.role}
                    onChange={(e) => handleChange('role', e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <hr className="my-4" />
            <h2 className="text-sm font-semibold text-slate-500 uppercase">Employee Details</h2>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          {!isCreatingGuard && (
            <div>
              <label className="block text-sm text-slate-700 mb-1">Employee Number</label>
              <input
                value={form.employee_number}
                onChange={(e) => handleChange('employee_number', e.target.value)}
                required
                className="w-full px-3 py-2 rounded border border-slate-300"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-slate-700 mb-1">National ID</label>
            <input
              value={form.national_id}
              onChange={(e) => handleDigitsChange('national_id', e.target.value, 9)}
              required
              inputMode="numeric"
              maxLength={9}
              placeholder="7-9 digits"
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
        </div>

        {isCreatingGuard && (
          <p className="text-xs text-slate-400 -mt-2">
            Employee number will be auto-assigned (e.g. GRD-004) once saved.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => handleChange('date_of_birth', e.target.value)}
              required
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Gender</label>
            <select
              value={form.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              required
              className="w-full px-3 py-2 rounded border border-slate-300"
            >
              <option value="">Select...</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-700 mb-1">Physical Address</label>
          <input
            value={form.physical_address}
            onChange={(e) => handleChange('physical_address', e.target.value)}
            required
            className="w-full px-3 py-2 rounded border border-slate-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Next of Kin Name</label>
            <input
              value={form.next_of_kin_name}
              onChange={(e) => handleChange('next_of_kin_name', e.target.value)}
              required
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Next of Kin Phone</label>
            <input
              value={form.next_of_kin_phone}
              onChange={(e) => handleDigitsChange('next_of_kin_phone', e.target.value, 10)}
              required
              inputMode="numeric"
              maxLength={10}
              placeholder="10 digits"
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Date Employed</label>
            <input
              type="date"
              value={form.date_employed}
              onChange={(e) => handleChange('date_employed', e.target.value)}
              required
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Status</label>
            <select
              value={form.employment_status}
              onChange={(e) => handleChange('employment_status', e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300"
            >
              {EMPLOYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Height (cm)</label>
            <input
              type="number"
              value={form.height_cm}
              onChange={(e) => handleChange('height_cm', e.target.value)}
              required
              className="w-full px-3 py-2 rounded border border-slate-300"
            />
          </div>
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
            onClick={() => navigate(isCreatingGuard ? '/active-guards' : '/staff')}
            className="text-slate-600 hover:text-slate-800 px-5 py-2"
          >
            Cancel
          </button>
        </div>
      </form>

      {isEditMode && employeeRole === 'GUARD' && user?.role === 'ADMIN' && (
        <div className="bg-white rounded-lg shadow p-6 mt-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-3">Guard PIN Login</h2>

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

          <form onSubmit={handleSetPin} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm text-slate-700 mb-1">Set / Reset 6-Digit PIN</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-3 py-2 rounded border border-slate-300 tracking-[0.3em] text-center"
              />
            </div>
            <button
              type="submit"
              disabled={isSettingPin}
              className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50"
            >
              {isSettingPin ? 'Saving...' : 'Set PIN'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}