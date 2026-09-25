import User from '../models/User.js';
import { signToken } from '../utils/jwt.js';

/**
 * Register a new user account.
 * POST /api/auth/register
 */
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

    const user = await User.create({ name: name.trim(), email: normalizedEmail, password });
    const token = signToken(user._id);

    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
}

/**
 * Authenticate existing user and issue token.
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    const invalidMsg = 'Invalid email or password.';

    if (!user) {
      return res.status(401).json({ message: invalidMsg });
    }

    const passwordMatch = await user.matchPassword(password);
    if (!passwordMatch) {
      return res.status(401).json({ message: invalidMsg });
    }

    const token = signToken(user._id);

    return res.json({ user: user.toJSON(), token });
  } catch (err) {
    return next(err);
  }
}

/**
 * Get current authenticated user profile.
 * GET /api/auth/me
 */
export async function getMe(req, res) {
  res.json({ user: req.user });
}

/**
 * Update authenticated user preferences and profile.
 * PUT /api/auth/profile
 */
export async function updateProfile(req, res, next) {
  try {
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
