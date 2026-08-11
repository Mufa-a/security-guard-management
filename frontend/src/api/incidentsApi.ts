import apiClient from './client';
import type { Incident, IncidentCreatePayload, IncidentActivity } from '../types/incidents';
import type { Witness, IncidentPerson } from '../types/incidents';

export async function getMyIncidents(): Promise<Incident[]> {
  const { data } = await apiClient.get('/incidents/incidents/');
  return data.results ?? data;
}

export async function getIncident(id: string): Promise<Incident> {
  const { data } = await apiClient.get(`/incidents/incidents/${id}/`);
  return data;
}

export async function createIncident(payload: IncidentCreatePayload): Promise<Incident> {
  const { data } = await apiClient.post('/incidents/incidents/', payload);
  return data;
}

export async function updateIncidentStatus(id: string, status: string): Promise<Incident> {
  const { data } = await apiClient.patch(`/incidents/incidents/${id}/`, { status });
  return data;
}

export async function assignIncident(id: string, assigned_to: string): Promise<Incident> {
  const { data } = await apiClient.patch(`/incidents/incidents/${id}/`, { assigned_to });
  return data;
}

export async function addComment(id: string, note: string): Promise<IncidentActivity> {
  const { data } = await apiClient.post(`/incidents/incidents/${id}/add_comment/`, { note });
  return data;
}

export async function uploadAttachment(incidentId: string, file: File, description = ''): Promise<void> {
  const formData = new FormData();
  formData.append('incident', incidentId);
  formData.append('file', file);
  formData.append('description', description);
  await apiClient.post('/incidents/attachments/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// Evidence files are no longer served from a public /media/ URL — they're
// scoped by CanReportIncidentOrSupervisor the same way the rest of the
// incident data is. This fetches the file as an authenticated blob and
// opens it in a new tab, rather than linking directly to attachment.file.
export async function downloadAttachment(attachmentId: string, filename?: string): Promise<void> {
  const response = await apiClient.get(`/incidents/attachments/${attachmentId}/download/`, {
    responseType: 'blob',
  });
  const blobUrl = window.URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.target = '_blank';
  link.rel = 'noreferrer';
  if (filename) link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke after a short delay so the new tab/download has time to pick it up.
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
}

export async function addWitness(incidentId: string, name: string, phone: string, statement: string): Promise<Witness> {
  const { data } = await apiClient.post('/incidents/witnesses/', { incident: incidentId, name, phone, statement });
  return data;
}

export async function addPersonInvolved(incidentId: string, role: string, name: string, notes: string): Promise<IncidentPerson> {
  const { data } = await apiClient.post('/incidents/people-involved/', { incident: incidentId, role, name, notes });
  return data;
}