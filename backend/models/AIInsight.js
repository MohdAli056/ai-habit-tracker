/**
 * AIInsight Model.
 *
 * Persists AI-generated insights, weekly summaries, streak recovery guidance,
 * habit suggestions, and conversational assistance.
 *
 * Indexed on { userId: 1, type: 1, generatedAt: -1 } for fast per-user
 * retrieval of recent insights by category.
 */

import mongoose from 'mongoose';

export const AI_INSIGHT_TYPES = [
  'weekly',
  'suggestion',
  'recovery',
  'chat',
  'morning',
];

const aiInsightSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required.'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: AI_INSIGHT_TYPES,
        message: 'Invalid insight type. Allowed: weekly, suggestion, recovery, chat, morning.',
      },
      required: [true, 'Insight type is required.'],
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Insight content is required.'],
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Compound index for efficient queries like "most recent weekly insight for user"
aiInsightSchema.index({ userId: 1, type: 1, generatedAt: -1 });

const AIInsight = mongoose.model('AIInsight', aiInsightSchema);

export default AIInsight;
