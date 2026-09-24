/**
 * Habit routes — mounted at /api/habits in server.js.
 *
 * IMPORTANT: /reorder is registered BEFORE /:id so the literal string
 * "reorder" is never treated as a habit ID.
 *
 * All routes require authentication (protect middleware).
 */

import { Router } from 'express';
import {
  createHabit,
  deleteHabit,
  getHabit,
  listHabits,
  reorderHabits,
  updateHabit,
} from '../controllers/habitController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// All habit routes require a valid JWT.
router.use(protect);

// /reorder MUST come before /:id.
router.put('/reorder', reorderHabits);

router.route('/').get(listHabits).post(createHabit);
router.route('/:id').get(getHabit).put(updateHabit).delete(deleteHabit);

export default router;
