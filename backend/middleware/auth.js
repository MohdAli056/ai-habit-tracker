/**
 * Authentication middleware.
 *
 * Reads the Authorization header, verifies the JWT, loads the user
 * from the database, and attaches it to req.user.
 *
 * Usage:
 *   router.get('/me', protect, getMe);
 */

import User from '../models/User.js';
import { verifyToken } from '../utils/jwt.js';

export async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorised. No token provided.' });
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Not authorised. User not found.' });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Not authorised. Invalid or expired token.' });
  }
}
