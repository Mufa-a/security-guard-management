import apiClient from './client';
import type { User } from '../types/staff';

export async function getUsers(): Promise<User[]> {
  const { data } = await apiClient.get('/accounts/users/');
  return data.results ?? data;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get('/accounts/me/');
  return data;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role?: string;
}

export async function registerUser(payload: RegisterPayload): Promise<User> {
  const { data } = await apiClient.post('/accounts/register/', payload);
  return data;
}