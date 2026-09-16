import axios from 'axios';
import type { ApiResponse } from '../types';

export const tokenKey = 'bharat-bazaar-token';
let memoryToken: string | null = null;
try {
  memoryToken = localStorage.getItem(tokenKey);
} catch {
  /* Session works in memory when storage is unavailable. */
}
export function getToken() {
  return memoryToken;
}
export function setToken(value: string | null) {
  memoryToken = value;
  try {
    if (value) localStorage.setItem(tokenKey, value);
    else localStorage.removeItem(tokenKey);
  } catch {
    /* Storage is an MVP convenience, not a prerequisite for signing in. */
  }
}
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  timeout: 20_000,
  headers: { Accept: 'application/json' },
});
api.interceptors.request.use((config) => {
  if (memoryToken) config.headers.Authorization = 'Bearer ' + memoryToken;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config?.headers.Authorization === 'Bearer ' + memoryToken &&
      !error.config.url?.includes('/auth/login')
    ) {
      setToken(null);
      window.dispatchEvent(new Event('bharat-bazaar-session-ended'));
    }
    return Promise.reject(error);
  },
);
export async function getData<T>(path: string, signal?: AbortSignal): Promise<T> {
  return (await api.get<ApiResponse<T>>(path, { signal })).data.data;
}
export function errorCode(error: unknown) {
  if (axios.isAxiosError(error)) {
    return String(
      error.response?.data?.error?.code ?? (error.response ? 'REQUEST_FAILED' : 'NETWORK_ERROR'),
    );
  }
  return 'REQUEST_FAILED';
}
export function validationFields(error: unknown): string[] {
  if (!axios.isAxiosError(error)) return [];
  const details: unknown = error.response?.data?.error?.details;
  if (!Array.isArray(details)) return [];
  return [
    ...new Set(
      details.flatMap((item: unknown) => {
        if (
          typeof item !== 'object' ||
          item === null ||
          !('path' in item) ||
          typeof item.path !== 'string'
        )
          return [];
        const field = item.path.replace(/^body\./, '').split('.')[0];
        return field ? [field] : [];
      }),
    ),
  ];
}
export async function getApiHealth(signal?: AbortSignal) {
  return (await api.get<ApiResponse>('/health', { signal })).data;
}
