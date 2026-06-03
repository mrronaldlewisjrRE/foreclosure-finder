// Configurable API base URL for deployment environments
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('ff_auth_token');
  const headers = {
    'ngrok-skip-browser-warning': 'true',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}
