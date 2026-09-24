/**
 * JWT utilities — sign and verify tokens.
 *
 * The token payload contains only the user's _id string.
 * Expiry is 30 days — long enough for comfortable sessions in a personal
 * habit-tracker, without requiring a separate refresh-token flow.
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const EXPIRY = '30d';

/**
 * Sign a JWT for the given user ID.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {string} Signed JWT
 * @throws {Error} If JWT_SECRET is not configured.
 */
export function signToken(userId) {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured. Add it to your .env file.');
  }
  return jwt.sign({ id: String(userId) }, env.JWT_SECRET, { expiresIn: EXPIRY });
}

/**
 * Verify a JWT and return its decoded payload.
 *
 * @param {string} token
 * @returns {{ id: string, iat: number, exp: number }}
 * @throws {JsonWebTokenError | TokenExpiredError} on invalid/expired tokens.
 */
export function verifyToken(token) {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured. Add it to your .env file.');
  }
  return jwt.verify(token, env.JWT_SECRET);
}
