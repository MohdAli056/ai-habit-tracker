/**
 * HabitLog model.
 *
 * One document = one habit completed on one date by one user.
 * The compound unique index (userId + habitId + completedDate) enforces
 * idempotency — calling "complete" twice on the same habit/day produces
 * exactly ONE record, never a duplicate.
 *
 * completedDate is stored as a YYYY-MM-DD string intentionally.
 * Storing it as a JS Date would introduce UTC vs. local timezone ambiguity
 * for daily habit tracking.
 */

import mongoose from 'mongoose';

// Validate YYYY-MM-DD format and check it's a real calendar date.
function isValidDateKey(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().startsWith(v);
}

const habitLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    habitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      required: true,
      index: true,
    },
    completedDate: {
      type: String,
      required: true,
      validate: {
        validator: isValidDateKey,
        message: 'completedDate must be a valid YYYY-MM-DD string.',
      },
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true },
);

// The compound unique index is the cornerstone of idempotency.
habitLogSchema.index({ userId: 1, habitId: 1, completedDate: 1 }, { unique: true });

const HabitLog = mongoose.model('HabitLog', habitLogSchema);

export default HabitLog;
