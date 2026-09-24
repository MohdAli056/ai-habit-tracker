/**
 * Health check route.
 *
 * GET /api/health
 *
 * Returns a minimal JSON body indicating the server is reachable.
 * Intentionally has no database dependency so it works even when
 * MONGODB_URI is not configured.
 */

import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

export default router;
