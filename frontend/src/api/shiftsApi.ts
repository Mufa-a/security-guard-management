import apiClient from './client';
import type { Shift, ShiftCreatePayload, ShiftAssignment, ShiftAssignmentCreatePayload } from '../types/shifts';

export async function getShifts(): Promise<Shift[]> {
  const { data } = await apiClient.get('/shifts/shifts/');
  return data.results ?? data;
}

export async function getShift(id: string): Promise<Shift> {
  const { data } = await apiClient.get(`/shifts/shifts/${id}/`);
  return data;
}

export async function createShift(payload: ShiftCreatePayload): Promise<Shift> {
  const { data } = await apiClient.post('/shifts/shifts/', payload);
  return data;
}

export async function updateShift(id: string, payload: Partial<ShiftCreatePayload>): Promise<Shift> {
  const { data } = await apiClient.patch(`/shifts/shifts/${id}/`, payload);
  return data;
}

export async function deleteShift(id: string): Promise<void> {
  await apiClient.delete(`/shifts/shifts/${id}/`);
}

export async function getShiftAssignments(): Promise<ShiftAssignment[]> {
  const { data } = await apiClient.get('/shifts/assignments/');
  return data.results ?? data;
}

// Kept for MyShiftsPage.tsx, which already imports this name.
export async function getMyShiftAssignments(): Promise<ShiftAssignment[]> {
  return getShiftAssignments();
}

export async function createShiftAssignment(payload: ShiftAssignmentCreatePayload): Promise<ShiftAssignment> {
  const { data } = await apiClient.post('/shifts/assignments/', payload);
  return data;
}

export async function updateShiftAssignment(id: string, payload: Partial<ShiftAssignmentCreatePayload>): Promise<ShiftAssignment> {
  const { data } = await apiClient.patch(`/shifts/assignments/${id}/`, payload);
  return data;
}

export async function deleteShiftAssignment(id: string): Promise<void> {
  await apiClient.delete(`/shifts/assignments/${id}/`);
}