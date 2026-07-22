import apiClient from './client';
import type { EmployeeProfile, EmployeeProfileCreatePayload } from '../types/staff';

export async function getEmployeeProfiles(): Promise<EmployeeProfile[]> {
  const { data } = await apiClient.get('/staff/profiles/');
  return data.results ?? data;
}

export async function getEmployeeProfile(id: string): Promise<EmployeeProfile> {
  const { data } = await apiClient.get(`/staff/profiles/${id}/`);
  return data;
}

export async function createEmployeeProfile(
  payload: EmployeeProfileCreatePayload
): Promise<EmployeeProfile> {
  const { data } = await apiClient.post('/staff/profiles/', payload);
  return data;
}

export async function updateEmployeeProfile(
  id: string,
  payload: Partial<EmployeeProfileCreatePayload>
): Promise<EmployeeProfile> {
  const { data } = await apiClient.patch(`/staff/profiles/${id}/`, payload);
  return data;
}

export async function deleteEmployeeProfile(id: string): Promise<void> {
  await apiClient.delete(`/staff/profiles/${id}/`);
}

export async function getMyEmployeeProfile(): Promise<EmployeeProfile | null> {
  const { data } = await apiClient.get('/staff/profiles/me/');
  return data;
}

export async function terminateEmployee(id: string): Promise<EmployeeProfile> {
  const { data } = await apiClient.post(`/staff/profiles/${id}/terminate/`);
  return data;
}

export async function setEmployeePin(id: string, pin: string): Promise<{ detail: string }> {
  const { data } = await apiClient.post(`/staff/profiles/${id}/set-pin/`, { pin });
  return data;
}

export async function changeMyPin(currentPin: string, newPin: string): Promise<{ detail: string }> {
  const { data } = await apiClient.post('/staff/profiles/change-my-pin/', {
    current_pin: currentPin,
    new_pin: newPin,
  });
  return data;
}