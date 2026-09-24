/**
 * Auth controller.
 *
 * Handlers for registration, login, current-user retrieval,
 * and profile update. All password exposure is prevented:
 * - User.toJSON() strips the password field.
 * - The password field is never manually selected or logged.
 */

import User from '../models/User.js';
import { signToken } from '../utils/jwt.js';

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    // Password is hashed by the pre-save hook in User.js.
    const user = await User.create({ name: name.trim(), email: normalizedEmail, password });

    const token = signToken(user._id);

    // user.toJSON() removes the password field automatically.
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Select +password explicitly because the schema excludes it from
    // normal queries via toJSON, but we need the hash to compare.
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    // Generic message — do not reveal whether email exists or password is wrong.
    const invalidMsg = 'Invalid email or password.';

    if (!user) {
      return res.status(401).json({ message: invalidMsg });
    }

    const passwordMatch = await user.matchPassword(password);
    if (!passwordMatch) {
      return res.status(401).json({ message: invalidMsg });
    }

    const token = signToken(user._id);

    // Convert to plain object (strips password) before sending.
    return res.json({ user: user.toJSON(), token });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/auth/me  (protected)
// ---------------------------------------------------------------------------
export async function getMe(req, res) {
  // req.user is attached by the protect middleware and has no password field.
  res.json({ user: req.user });
}

// ---------------------------------------------------------------------------
// PUT /api/auth/profile  (protected)
// ---------------------------------------------------------------------------
export async function updateProfile(req, res, next) {
  try {
    // Only allow these specific fields — block _id, email, password, etc.
    const { name, morningMotivation } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (name !== undefined) user.name = name.trim();
    if (morningMotivation !== undefined) user.morningMotivation = Boolean(morningMotivation);

    await user.save();

    return res.json({ user: user.toJSON() });
  } catch (err) {
    return next(err);
  }
}
