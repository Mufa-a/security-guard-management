import apiClient from './client';
import type { Attendance, LateArrivalRequest } from '../types/attendance';

export async function getMyAttendance(): Promise<Attendance[]> {
  const { data } = await apiClient.get('/attendance/records/');
  return data.results ?? data;
}

export async function getAttendanceRecords(): Promise<Attendance[]> {
  return getMyAttendance();
}

export async function getAttendanceById(id: string): Promise<Attendance> {
  const { data } = await apiClient.get(`/attendance/records/${id}/`);
  return data;
}

export async function checkIn(id: string, lat?: number, lng?: number): Promise<Attendance> {
  const { data } = await apiClient.post(`/attendance/records/${id}/check-in/`, {
    latitude: lat, longitude: lng,
  });
  return data;
}

export async function checkOut(id: string, lat?: number, lng?: number): Promise<Attendance> {
  const { data } = await apiClient.post(`/attendance/records/${id}/check-out/`, {
    latitude: lat, longitude: lng,
  });
  return data;
}

export async function updateAttendance(id: string, payload: Partial<Pick<Attendance, 'status' | 'notes'>>): Promise<Attendance> {
  const { data } = await apiClient.patch(`/attendance/records/${id}/`, payload);
  return data;
}

export interface LateArrivalRequestPayload {
  reason: string;
  explanation?: string;
  attachment?: File | null;
  latitude?: number;
  longitude?: number;
}

export async function submitLateArrivalRequest(
  attendanceId: string,
  payload: LateArrivalRequestPayload
): Promise<LateArrivalRequest> {
  const form = new FormData();
  form.append('reason', payload.reason);
  if (payload.explanation) form.append('explanation', payload.explanation);
  if (payload.attachment) form.append('attachment', payload.attachment);
  if (payload.latitude !== undefined) form.append('latitude', String(payload.latitude));
  if (payload.longitude !== undefined) form.append('longitude', String(payload.longitude));

  const { data } = await apiClient.post(
    `/attendance/records/${attendanceId}/late-arrival-request/`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export async function reviewLateArrival(
  attendanceId: string,
  approved: boolean,
  notes?: string
): Promise<Attendance> {
  const { data } = await apiClient.post(`/attendance/records/${attendanceId}/late-arrival-review/`, {
    approved,
    notes: notes ?? '',
  });
  return data;
}