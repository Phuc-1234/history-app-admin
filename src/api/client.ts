// src/api/client.ts
import axios from 'axios';

const LOCAL_URL = import.meta.env.VITE_API_URL_LOCAL || 'http://localhost:5000';
const PROD_URL = import.meta.env.VITE_API_URL_PRODUCTION || 'https://history-app-dev-branch.onrender.com';
const API_ENV = import.meta.env.VITE_API_ENV || 'local';

export const BASE_URL = API_ENV === 'production' ? PROD_URL : LOCAL_URL;

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const raw = localStorage.getItem('auth-storage');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore
    }
  }
  return config;
});

export default client;
