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
  pin_must_change?: boolean;
  policy_accepted: boolean;
}

export interface AcceptPolicyResponse {
  policy_accepted: boolean;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/accounts/login/', payload);
  return response.data;
}

export async function pinLogin(payload: PinLoginPayload): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/accounts/pin-login/', payload);
  return response.data;
}

export async function acceptPolicy(): Promise<AcceptPolicyResponse> {
  const response = await apiClient.post<AcceptPolicyResponse>('/accounts/accept-policy/', {});
  return response.data;
}