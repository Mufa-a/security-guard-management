import apiClient from './client';
import type {
  Client,
  ClientCreatePayload,
  Site,
  SiteCreatePayload,
  SiteAssignment,
} from '../types/sites';

export async function getClients(): Promise<Client[]> {
  const { data } = await apiClient.get('/sites/clients/');
  return data.results ?? data;
}

export async function getClient(id: string): Promise<Client> {
  const { data } = await apiClient.get(`/sites/clients/${id}/`);
  return data;
}

export async function createClient(payload: ClientCreatePayload): Promise<Client> {
  const { data } = await apiClient.post('/sites/clients/', payload);
  return data;
}

export async function updateClient(id: string, payload: Partial<ClientCreatePayload>): Promise<Client> {
  const { data } = await apiClient.patch(`/sites/clients/${id}/`, payload);
  return data;
}

export async function getSites(): Promise<Site[]> {
  const { data } = await apiClient.get('/sites/sites/');
  return data.results ?? data;
}

export async function getSite(id: string): Promise<Site> {
  const { data } = await apiClient.get(`/sites/sites/${id}/`);
  return data;
}

export async function createSite(payload: SiteCreatePayload): Promise<Site> {
  const { data } = await apiClient.post('/sites/sites/', payload);
  return data;
}

export async function updateSite(id: string, payload: Partial<SiteCreatePayload>): Promise<Site> {
  const { data } = await apiClient.patch(`/sites/sites/${id}/`, payload);
  return data;
}

export async function deleteClient(id: string): Promise<void> {
  await apiClient.delete(`/sites/clients/${id}/`);
}

export async function deleteSite(id: string): Promise<void> {
  await apiClient.delete(`/sites/sites/${id}/`);
}

export async function getSiteAssignments(): Promise<SiteAssignment[]> {
  const { data } = await apiClient.get('/sites/assignments/');
  return data.results ?? data;
}