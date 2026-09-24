/**
 * Habits API helpers — thin wrappers around the Axios client.
 */

import client from './client.js';

export const habitsApi = {
  /** GET /habits — supports { archived, category, search } query params */
  getHabits: (params = {}) => client.get('/habits', { params }),

  /** GET /habits/:id */
  getHabit: (id) => client.get(`/habits/${id}`),

  /** POST /habits */
  createHabit: (data) => client.post('/habits', data),

  /** PUT /habits/:id */
  updateHabit: (id, data) => client.put(`/habits/${id}`, data),

  /** DELETE /habits/:id */
  deleteHabit: (id) => client.delete(`/habits/${id}`),

  /** PUT /habits/reorder — { orderedIds: string[] } */
  reorderHabits: (orderedIds) => client.put('/habits/reorder', { orderedIds }),
};
