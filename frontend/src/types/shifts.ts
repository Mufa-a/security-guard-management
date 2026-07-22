export interface Shift {
  id: string;
  site: string;
  site_name: string;
  shift_type: string;
  date: string;
  start_time: string;
  end_time: string;
  required_guards: number;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftCreatePayload {
  site: string;
  shift_type: string;
  date: string;
  start_time: string;
  end_time: string;
  required_guards?: number;
  notes?: string;
}

export interface ShiftAssignment {
  id: string;
  shift: string;
  shift_detail: string;
  site_name: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  employee: string;
  employee_name: string;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignmentCreatePayload {
  shift: string;
  employee: string;
  status?: string;
}