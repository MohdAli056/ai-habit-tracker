/**
 * Auth routes — mounted at /api/auth in server.js.
 *
 * POST /register   — create account
 * POST /login      — authenticate
 * GET  /me         — current user (protected)
 * PUT  /profile    — update profile (protected)
 */

import { Router } from 'express';
import { getMe, login, register, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

export default router;
