import apiClient from '../../api/client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface PinLoginPayload {
  employee_number: string;
  pin: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/accounts/login/', payload);
  return response.data;
}

export async function pinLogin(payload: PinLoginPayload): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/accounts/pin-login/', payload);
  return response.data;
}