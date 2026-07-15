// src/api/client.ts
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const BASE_URL = import.meta.env.VITE_API_ENV === 'local'
  ? (import.meta.env.VITE_API_URL_LOCAL || 'http://localhost:5000')
  : (import.meta.env.VITE_API_URL_PRODUCTION || 'https://history-app-dev-branch.onrender.com');
export const BASE_URL = import.meta.env.MODE === 'devlocal'
  ? (import.meta.env.VITE_API_URL_LOCAL || 'http://localhost:5000')
  : (import.meta.env.VITE_API_URL_PRODUCTION || 'https://history-app-dev-branch.onrender.com');

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor to attach bearer token
client.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Flag and queue to manage concurrent token refreshes
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Response interceptor to handle token refresh on 401 Unauthorized
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized, is not already a retry, and is not the login or refresh endpoint
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      originalRequest.url !== '/api/auth/login' &&
      originalRequest.url !== '/api/auth/refresh-token'
    ) {
      if (isRefreshing) {
        // If refreshing is already in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(client(originalRequest));
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, logout, updateTokens } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      try {
        // Call refresh token API using a clean axios instance to avoid interceptor recursion
        const res = await axios.post(`${BASE_URL}/api/auth/refresh-token`, {
          refreshToken,
        });

        const session = res.data?.session;
        if (res.data?.status === 'success' && session?.accessToken) {
          const newAccessToken = session.accessToken;
          const newRefreshToken = session.refreshToken || refreshToken;

          // Update tokens in the Zustand store
          updateTokens(newAccessToken, newRefreshToken);

          processQueue(null, newAccessToken);

          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return client(originalRequest);
        } else {
          logout();
          processQueue(new Error('Refresh failed'), null);
          return Promise.reject(error);
        }
      } catch (refreshError) {
        logout();
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default client;
