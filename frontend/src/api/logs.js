/**
 * Logs API helpers — thin wrappers around the Axios client.
 */

import client from './client.js';

export const logsApi = {
  /** POST /logs — mark habit complete. completedDate defaults to today on server. */
  completeHabit: (habitId, completedDate, notes = '') =>
    client.post('/logs', { habitId, completedDate, notes }),

  /** DELETE /logs/:habitId?date=YYYY-MM-DD */
  uncompleteHabit: (habitId, date) =>
    client.delete(`/logs/${habitId}`, { params: date ? { date } : {} }),

  /** GET /logs/today */
  getTodayLogs: () => client.get('/logs/today'),

  /** GET /logs/range?start=...&end=... */
  getLogsRange: (start, end) => client.get('/logs/range', { params: { start, end } }),

  /** GET /logs/heatmap?days=N */
  getHeatmap: (days = 90) => client.get('/logs/heatmap', { params: { days } }),

  /** GET /logs/stats/habit/:id */
  getHabitStats: (habitId) => client.get(`/logs/stats/habit/${habitId}`),

  /** GET /logs/stats */
  getAllStats: () => client.get('/logs/stats'),

  /** GET /logs/insights?days=N */
  getInsights: (days = 30) => client.get('/logs/insights', { params: { days } }),

  /** GET /logs/statistics */
  getStatistics: () => client.get('/logs/statistics'),
};

export default logsApi;

