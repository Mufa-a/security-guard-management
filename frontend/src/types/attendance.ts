export interface Attendance {
  id: string;
  shift_assignment: string;
  employee_name: string;
  site_name: string;
  shift_date: string;
  status:
    | 'SCHEDULED'
    | 'PRESENT'
    | 'PRESENT_LATE'
    | 'PRESENT_LATE_APPROVED'
    | 'ABSENT'
    | 'ON_LEAVE'
    | 'OFF_DUTY';
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_latitude: string | null;
  check_in_longitude: string | null;
  check_out_latitude: string | null;
  check_out_longitude: string | null;
  minutes_late: number | null;
  auto_marked_absent: boolean;
  late_request_status: '' | 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  approval_notes: string;
  late_arrival_requests: LateArrivalRequest[];
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LateArrivalRequest {
  id: string;
  attendance: string;
  reason: string;
  explanation: string;
  attachment: string | null;
  latitude: string | null;
  longitude: string | null;
  submitted_at: string;
  minutes_late_at_submission: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_notes: string;
  guard_name: string;
  site_name: string;
  shift_date: string;
  shift_start_time: string;
}