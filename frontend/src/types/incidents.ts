export interface Witness {
  id: string;
  incident: string;
  name: string;
  phone: string;
  statement: string;
  created_at: string;
}

export interface IncidentPerson {
  id: string;
  incident: string;
  role: 'VICTIM' | 'SUSPECT' | 'REPORTING_GUARD' | 'RESPONDING_OFFICER' | 'SUPERVISOR' | 'OTHER';
  name: string;
  notes: string;
  created_at: string;
}

export interface IncidentAttachment {
  id: string;
  incident: string;
  file: string;
  description: string;
  uploaded_by: string | null;
  uploaded_by_name: string;
  created_at: string;
}

export interface IncidentActivity {
  id: string;
  incident: string;
  actor: string | null;
  actor_name: string;
  activity_type: 'CREATED' | 'STATUS_CHANGED' | 'ASSIGNED' | 'COMMENT' | 'EVIDENCE_ADDED';
  note: string;
  created_at: string;
}

export interface Incident {
  id: string;
  incident_number: string;
  site: string;
  site_name: string;
  shift_assignment: string | null;
  reported_by: string;
  reported_by_name: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  category: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  occurred_at: string;
  latitude: string | null;
  longitude: string | null;
  attachments: IncidentAttachment[];
  activities: IncidentActivity[];
  witnesses: Witness[];
  people_involved: IncidentPerson[];
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
  latitude?: number | null;
  longitude?: number | null;
}