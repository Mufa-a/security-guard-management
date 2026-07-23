export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string | null; // e.g. "GUARD", "ADMIN" — not a numeric ID
  is_verified: boolean;
}

export interface EmployeeDocument {
  id: string;
  employee: string;
  document_type: string;
  file: string;
  issue_date: string | null;
  expiry_date: string | null;
  notes: string;
  created_at: string;
}

export interface EmployeeProfile {
  id: string;
  user: User;
  employee_number?: string;
  national_id: string;
  date_of_birth: string | null;
  gender: string;
  physical_address: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
  date_employed: string;
  employment_status: string;
  height_cm: number | null;
  photo: string | null;
  documents: EmployeeDocument[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeProfileCreatePayload {
  user: string; // user id
  employee_number?: string;
  national_id: string;
  date_of_birth?: string;
  gender?: string;
  physical_address?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  date_employed: string;
  employment_status?: string;
  height_cm?: number;
}