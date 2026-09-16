import type { ApiSuccess } from '../types/api.js';

// Liveness only: this does not connect to or claim readiness of a database.
export function getHealthStatus(): ApiSuccess {
  return { success: true, message: 'Bharat Bazaar API is running' };
}
