import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://security-guard-management-1.onrender.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

// Endpoints where a 401 means "bad credentials", not "session expired" —
// these should never trigger the refresh-token flow or a redirect.
const AUTH_ENDPOINTS = ['/accounts/login/', '/accounts/pin-login/', '/accounts/login/refresh/'];

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Wait for the in-flight refresh to finish, then retry.
        return new Promise((resolve) => {
          refreshQueue.push(() => resolve(apiClient(originalRequest)));
        });
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post(`${API_BASE_URL}/accounts/login/refresh/`, {
          refresh: refreshToken,
        });
        localStorage.setItem('access_token', data.access);
        isRefreshing = false;
        refreshQueue.forEach((cb) => cb());
        refreshQueue = [];
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        refreshQueue = [];
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;