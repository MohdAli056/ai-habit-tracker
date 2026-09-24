/**
 * Axios API client.
 *
 * All requests go through this instance so:
 * - The base URL is read from VITE_API_URL (never hardcoded).
 * - The Authorization header is attached automatically when a token exists.
 * - 401 responses clear auth state and avoid redirect loops.
 */

import axios from 'axios';

export const TOKEN_KEY = 'habit_tracker_token';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token when available.
// ---------------------------------------------------------------------------
client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor — handle 401.
// Clears stored auth data; the AuthContext loading cycle will naturally
// redirect the user to /login on next render without an explicit push here,
// preventing redirect loops when already on /login or /register.
// ---------------------------------------------------------------------------
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('habit_tracker_user');
    }
    return Promise.reject(error);
  },
);

export default client;
