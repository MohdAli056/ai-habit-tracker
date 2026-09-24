/**
 * AI Routes.
 *
 * Routes for AI-powered weekly insights.
 * All endpoints are protected by JWT authentication.
 */

import { Router } from 'express';
import {
  generateWeeklyReport,
  getChatResponse,
  getMorningMotivation,
  getRecoveryGuidance,
  getSuggestions,
  getWeeklyReport,
} from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Protect all AI routes
router.use(protect);

// GET /api/ai/weekly-report?weekStart=YYYY-MM-DD
// Check if cached report exists (does not generate or consume AI quota)
router.get('/weekly-report', getWeeklyReport);

// POST /api/ai/weekly-report
// Get or generate structured weekly report
router.post('/weekly-report', generateWeeklyReport);

// POST /api/ai/suggestions
// Generate 3 personalized habit suggestions based on goal, productive time, and struggles
router.post('/suggestions', getSuggestions);

// POST /api/ai/recovery
// Generate or retrieve streak recovery guidance for an eligible broken habit
router.post('/recovery', getRecoveryGuidance);

// POST /api/ai/chat
// Natural language chat about authenticated user's precomputed habit analytics
router.post('/chat', getChatResponse);

// POST /api/ai/morning-motivation
// Generate or retrieve daily morning motivation for authenticated user
router.post('/morning-motivation', getMorningMotivation);

export default router;
