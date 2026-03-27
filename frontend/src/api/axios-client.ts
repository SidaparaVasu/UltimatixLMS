/**
 * axios-client.ts
 *
 * Centralized Axios instance for all API communication.
 *
 * Rules:
 * - All API requests in the app must use this client.
 * - Never call axios or fetch() directly inside components or queries.
 * - Handles token injection and silent refresh on 401.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_VERSION}`;

// ---------------------------------------------------------------------------
// Axios Instance
// ---------------------------------------------------------------------------

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ---------------------------------------------------------------------------
// Token Storage Keys
// ---------------------------------------------------------------------------

export const TOKEN_KEYS = {
  ACCESS: 'lms_access_token',
  REFRESH: 'lms_refresh_token',
} as const;

export const getAccessToken = (): string | null =>
  localStorage.getItem(TOKEN_KEYS.ACCESS);

export const getRefreshToken = (): string | null =>
  localStorage.getItem(TOKEN_KEYS.REFRESH);

export const setTokens = (access: string, refresh: string): void => {
  localStorage.setItem(TOKEN_KEYS.ACCESS, access);
  localStorage.setItem(TOKEN_KEYS.REFRESH, refresh);
};

export const clearTokens = (): void => {
  localStorage.removeItem(TOKEN_KEYS.ACCESS);
  localStorage.removeItem(TOKEN_KEYS.REFRESH);
};

// ---------------------------------------------------------------------------
// Request Interceptor — Inject Access Token
// ---------------------------------------------------------------------------

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response Interceptor — Silent Token Refresh on 401
// ---------------------------------------------------------------------------

let isRefreshing = false;
// Queue of callbacks waiting for the new token
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh once per request and only on 401
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();

    // No refresh token available — hard logout
    if (!refreshToken) {
      clearTokens();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // If a refresh is already in progress, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Use a plain axios call to avoid circular interceptor triggering
      const { data } = await axios.post(
        `${BASE_URL}/auth/token/refresh/`,
        { refresh: refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const newAccessToken: string = data.access;

      // Persist new access token
      localStorage.setItem(TOKEN_KEYS.ACCESS, newAccessToken);

      // Also update Zustand store without importing it directly (avoids circular dep)
      // The store reads from localStorage on next usage
      apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      processQueue(null, newAccessToken);
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearTokens();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
