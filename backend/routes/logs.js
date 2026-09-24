/**
 * Log routes — mounted at /api/logs in server.js.
 *
 * CRITICAL ORDERING: All named routes (/today, /range, /heatmap, /stats,
 * /stats/habit/:id) MUST be registered BEFORE the parameter route (/:habitId)
 * to prevent "today", "range", etc. from being interpreted as habitId values.
 *
 * All routes require authentication (protect middleware).
 */

import { Router } from 'express';
import {
  getAllStats,
  getHabitStats,
  getHeatmap,
  getInsights,
  getLogsRange,
  getStatistics,
  getTodayLogs,
  markComplete,
  markIncomplete,
} from '../controllers/logController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

// Named routes first — order matters.
router.post('/', markComplete);
router.get('/today', getTodayLogs);
router.get('/range', getLogsRange);
router.get('/heatmap', getHeatmap);
router.get('/stats', getAllStats);
router.get('/stats/habit/:id', getHabitStats);
router.get('/insights', getInsights);
router.get('/statistics', getStatistics);

// Parameter route last.
router.delete('/:habitId', markIncomplete);

export default router;
