/**
 * Centralised error-handling middleware.
 *
 * Express identifies error handlers by their four-argument signature
 * (err, req, res, next). This middleware must be registered LAST,
 * after all routes and the notFound handler.
 *
 * Behaviour:
 * - Uses err.status / err.statusCode if set, otherwise 500.
 * - Exposes err.message in the response always.
 * - Only includes a stack trace in development so production responses
 *   do not leak internal details.
 */

import { isDev } from '../config/env.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status ?? err.statusCode ?? 500;
  let message = err.message || 'An unexpected error occurred.';

  if (err.name === 'CastError') {
    status = 404;
    message = 'Resource not found.';
  }

  const body = { message };

  if (isDev && err.stack) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
}
