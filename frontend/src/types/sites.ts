export interface Client {
  id: string;
  name: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientCreatePayload {
  name: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
}

export interface Site {
  id: string;
  client: string;
  client_name: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  site_manager_contact: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SiteCreatePayload {
  client: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  site_manager_contact?: string;
}
export interface SiteAssignment {
  id: string;
  site: string;
  site_name: string;
  employee: string;
  employee_name: string;
  start_date: string;
  end_date: string | null; // null = currently active
  is_active: boolean;
  created_at: string;
  updated_at: string;
}