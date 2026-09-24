/**
 * AI API helpers — thin wrappers around the Axios client.
 *
 * Exposes application-level AI endpoints without leaking Gemini SDK
 * or provider internals to the frontend.
 */

import client from './client.js';

export const aiApi = {
  /**
   * Check for an existing cached weekly report without triggering generation.
   * GET /ai/weekly-report?weekStart=YYYY-MM-DD
   */
  getWeeklyReport: (weekStart) =>
    client.get('/ai/weekly-report', { params: { weekStart } }),

  /**
   * Retrieve cached or generate a new structured weekly report.
   * POST /ai/weekly-report
   * { weekStart, useMock }
   */
  generateWeeklyReport: (weekStart, useMock = false) =>
    client.post('/ai/weekly-report', { weekStart, useMock }),

  /**
   * Generate 3 personalized habit suggestions based on user goal,
   * peak productive time, and main obstacles.
   * POST /ai/suggestions
   * { goal, productiveTime, struggles, useMock }
   */
  getHabitSuggestions: ({ goal, productiveTime, struggles, useMock = false }) =>
    client.post('/ai/suggestions', { goal, productiveTime, struggles, useMock }),

  /**
   * Retrieve cached or generate new AI streak recovery guidance for an eligible broken habit.
   * POST /ai/recovery
   * { habitId, useMock }
   */
  recoverHabit: (habitId, useMock = false) =>
    client.post('/ai/recovery', { habitId, useMock }),

  /**
   * Send a question about habit data to the AI chat endpoint.
   * POST /ai/chat
   * { message, useMock }
   */
  sendChatMessage: (message, useMock = false) =>
    client.post('/ai/chat', { message, useMock }),

  /**
   * Get or generate daily personalized morning motivation.
   * POST /ai/morning-motivation
   * { useMock }
   */
  getMorningMotivation: (useMock = false) =>
    client.post('/ai/morning-motivation', { useMock }),
};

export default aiApi;
