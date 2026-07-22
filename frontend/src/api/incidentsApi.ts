import apiClient from './client';
import type { Incident, IncidentCreatePayload } from '../types/incidents';

export async function getMyIncidents(): Promise<Incident[]> {
  const { data } = await apiClient.get('/incidents/incidents/');
  return data.results ?? data;
}

export async function createIncident(payload: IncidentCreatePayload): Promise<Incident> {
  const { data } = await apiClient.post('/incidents/incidents/', payload);
  return data;
}

export async function updateIncidentStatus(id: string, status: string): Promise<Incident> {
  const { data } = await apiClient.patch(`/incidents/incidents/${id}/`, { status });
  return data;
}