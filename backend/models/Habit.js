/**
 * Habit model.
 *
 * Every habit belongs to exactly one user via userId.
 * The index on userId makes per-user queries fast.
 * userId is always sourced from req.user._id on the server —
 * never from the client body.
 */

import mongoose from 'mongoose';

const ALLOWED_CATEGORIES = [
  'health', 'fitness', 'learning', 'mindfulness',
  'productivity', 'social', 'finance', 'creative', 'other',
];

const ALLOWED_FREQUENCIES = ['daily', 'weekly'];

const ALLOWED_ICONS = [
  '📚', '🏃', '💧', '🧘', '💻', '🧠', '🥗', '💪', '🎨', '💰', '🤝', '⭐',
];

// Very permissive hex validation — accepts #rgb and #rrggbb (and 4/8-digit forms).
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const habitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Habit name is required.'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      enum: { values: ALLOWED_CATEGORIES, message: 'Invalid category.' },
      default: 'other',
    },
    frequency: {
      type: String,
      enum: { values: ALLOWED_FREQUENCIES, message: 'Frequency must be daily or weekly.' },
      default: 'daily',
    },
    targetDays: {
      type: Number,
      min: [1, 'Target days must be at least 1.'],
      max: [7, 'Target days cannot exceed 7.'],
      default: 7,
    },
    color: {
      type: String,
      default: '#6255db',
      validate: {
        validator: (v) => HEX_COLOR_RE.test(v),
        message: 'Color must be a valid hex value (e.g. #6255db).',
      },
    },
    icon: {
      type: String,
      enum: { values: ALLOWED_ICONS, message: 'Icon must be one of the allowed set.' },
      default: '⭐',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export const HABIT_CATEGORIES = ALLOWED_CATEGORIES;
export const HABIT_FREQUENCIES = ALLOWED_FREQUENCIES;
export const HABIT_ICONS = ALLOWED_ICONS;

const Habit = mongoose.model('Habit', habitSchema);

export default Habit;
