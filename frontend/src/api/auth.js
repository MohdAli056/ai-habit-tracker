/**
 * Auth API helpers — thin wrappers around the Axios client
 * so page components never import the client directly.
 */

import client from './client.js';

export const authApi = {
  register: (data) => client.post('/auth/register', data),
  login: (data) => client.post('/auth/login', data),
  me: () => client.get('/auth/me'),
  updateProfile: (data) => client.put('/auth/profile', data),
};
