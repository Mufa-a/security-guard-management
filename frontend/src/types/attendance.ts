export interface Attendance {
  id: string;
  shift_assignment: string;
  employee_name: string;
  site_name: string;
  shift_date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_latitude: string | null;
  check_in_longitude: string | null;
  check_out_latitude: string | null;
  check_out_longitude: string | null;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}