/**
 * 404 — Not Found middleware.
 *
 * Catches any request that did not match a registered route and
 * returns a consistent JSON error response. Must be registered
 * AFTER all routes so it only fires when nothing else matched.
 */

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}
