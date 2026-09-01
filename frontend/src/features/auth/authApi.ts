import apiClient from '../../api/client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface PinLoginPayload {
  employee_number: string;
  pin: string;
}

// access/refresh no longer appear here — the backend sets them as httpOnly
// cookies directly, so the JSON body only carries non-sensitive flags.
export interface LoginResponse {
  pin_must_change?: boolean;
  policy_accepted: boolean;
}

export interface AcceptPolicyResponse {
  policy_accepted: boolean;
}

export interface MeResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string | null;
  is_verified: boolean;
  policy_accepted: boolean;
  pin_must_change: boolean;
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

export async function logout(): Promise<void> {
  await apiClient.post('/accounts/logout/', {});
}

// Since the JWT is httpOnly and no longer decodable in JS, this is now the
// source of truth for "who is logged in" — called on mount and after login.
export async function fetchMe(): Promise<MeResponse> {
  const response = await apiClient.get<MeResponse>('/accounts/me/');
  return response.data;
}
