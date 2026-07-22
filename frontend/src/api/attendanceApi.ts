import apiClient from './client';
import type { Attendance } from '../types/attendance';

export async function getMyAttendance(): Promise<Attendance[]> {
  const { data } = await apiClient.get('/attendance/records/');
  return data.results ?? data;
}

export async function getAttendanceRecords(): Promise<Attendance[]> {
  return getMyAttendance();
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