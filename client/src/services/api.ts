import axios from 'axios';
import type { ApiResponse } from '../types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  timeout: 10_000,
  headers: { Accept: 'application/json' },
});

// Available for later screens; the Phase 1 public UI makes no API calls.
export async function getApiHealth(signal?: AbortSignal) {
  const response = await api.get<ApiResponse>('/health', { signal });
  return response.data;
}
