import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://security-guard-management-2elk.onrender.com/api';

// Tokens now live in httpOnly cookies set by the backend — never read or
// written from JS. The browser attaches them automatically as long as
// withCredentials is set on every request.

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// CSRF double-submit: the backend sets a JS-readable "csrftoken" cookie
// alongside the httpOnly auth cookies. Mirror it back as a header on every
// state-changing request so Django's CSRF check passes.
apiClient.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (!['get', 'head', 'options'].includes(method)) {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
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

      if (isRefreshing) {
        // Wait for the in-flight refresh to finish, then retry.
        return new Promise((resolve) => {
          refreshQueue.push(() => resolve(apiClient(originalRequest)));
        });
      }

      isRefreshing = true;
      try {
        // No body needed — the refresh token rides along as a cookie.
        await axios.post(`${API_BASE_URL}/accounts/login/refresh/`, {}, { withCredentials: true });
        isRefreshing = false;
        refreshQueue.forEach((cb) => cb());
        refreshQueue = [];
        return apiClient(originalRequest);
           } catch (refreshError) {
        isRefreshing = false;
        refreshQueue = [];
        // Guard against a reload loop: if we're already on /login (e.g. the
        // very first /me/ check on a logged-out visit also 401s here), a
        // hard reload would just repeat this exact cycle forever.
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
