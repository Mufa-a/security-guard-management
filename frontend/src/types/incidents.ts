export interface Incident {
  id: string;
  site: string;
  site_name: string;
  shift_assignment: string | null;
  reported_by: string;
  reported_by_name: string;
  category: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  occurred_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncidentCreatePayload {
  shift_assignment?: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  occurred_at: string;
}