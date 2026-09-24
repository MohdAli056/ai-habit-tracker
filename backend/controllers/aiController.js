/**
 * AI Controller.
 *
 * Handles HTTP requests for AI features.
 * Validates request input dates, delegates to weeklyReportService,
 * and normalizes error responses into safe, user-friendly JSON payloads.
 */

import { AIError, AIErrorCodes } from '../services/ai/errors.js';
import chatService from '../services/ai/chatService.js';
import morningMotivationService from '../services/ai/morningMotivationService.js';
import recoveryService from '../services/ai/recoveryService.js';
import suggestionService from '../services/ai/suggestionService.js';
import weeklyReportService from '../services/ai/weeklyReportService.js';
import { getWeekStart, isValidDateKey } from '../utils/date.js';

/**
 * GET /api/ai/weekly-report?weekStart=YYYY-MM-DD
 *
 * Check whether a cached report exists for the given week.
 * Does NOT generate new AI reports or consume quota.
 */
export async function getWeeklyReport(req, res, next) {
  try {
    const inputDate = req.query.weekStart || req.query.date;

    if (!inputDate || typeof inputDate !== 'string' || !isValidDateKey(inputDate)) {
      return res.status(400).json({
        code: 'INVALID_DATE',
        message: 'Invalid or missing date parameter. Expected valid YYYY-MM-DD.',
      });
    }

    const weekStart = getWeekStart(inputDate);
    const result = await weeklyReportService.getCachedWeeklyReport(req.user._id, weekStart);

    if (!result) {
      return res.status(200).json({
        report: null,
        cached: false,
      });
    }

    return res.status(200).json({
      report: result.report,
      meta: result.meta,
      cached: true,
      generatedAt: result.generatedAt,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/ai/weekly-report
 *
 * Get existing cached report or generate a new structured weekly report.
 * Body: { weekStart?: string, date?: string, useMock?: boolean }
 */
export async function generateWeeklyReport(req, res, next) {
  try {
    const inputDate = req.body?.weekStart || req.body?.date;

    if (!inputDate || typeof inputDate !== 'string' || !isValidDateKey(inputDate)) {
      return res.status(400).json({
        code: 'INVALID_DATE',
        message: 'Invalid or missing weekStart date. Expected valid YYYY-MM-DD.',
      });
    }

    const weekStart = getWeekStart(inputDate);
    // Allow mock provider in non-production or for automated integration tests
    const useMock = Boolean(req.body?.useMock);

    const result = await weeklyReportService.getOrGenerateWeeklyReport({
      userId: req.user._id,
      weekStart,
      useMock,
    });

    return res.status(200).json({
      report: result.report,
      meta: result.meta,
      cached: result.cached,
      generatedAt: result.generatedAt,
    });
  } catch (err) {
    if (err instanceof AIError) {
      if (err.code === AIErrorCodes.AI_NOT_CONFIGURED) {
        return res.status(503).json({
          code: err.code,
          message: 'AI weekly report is unavailable because AI has not been configured.',
        });
      }
      if (err.code === AIErrorCodes.AI_RATE_LIMITED) {
        return res.status(429).json({
          code: err.code,
          message: 'AI service rate limit reached. Please try again in a few minutes.',
        });
      }
      if (err.code === AIErrorCodes.AI_TIMEOUT) {
        return res.status(504).json({
          code: err.code,
          message: 'AI service request timed out. Please try again.',
        });
      }
      if (err.code === AIErrorCodes.AI_INVALID_RESPONSE) {
        return res.status(502).json({
          code: err.code,
          message: 'AI service returned an unparseable or invalid response.',
        });
      }
      return res.status(500).json({
        code: err.code || 'AI_PROVIDER_ERROR',
        message: err.message || 'AI service error.',
      });
    }

    return next(err);
  }
}

/**
 * POST /api/ai/suggestions
 *
 * Generate or retrieve 3 personalized habit suggestions.
 * Body: { goal, productiveTime, struggles, useMock }
 */
export async function getSuggestions(req, res, next) {
  try {
    const { goal, productiveTime, struggles } = req.body || {};
    const useMock = Boolean(req.body?.useMock);

    const result = await suggestionService.getHabitSuggestions({
      userId: req.user._id,
      goal,
      productiveTime,
      struggles,
      useMock,
    });

    return res.status(200).json({
      suggestions: result.suggestions,
      meta: result.meta,
      cached: result.cached,
      generatedAt: result.generatedAt,
    });
  } catch (err) {
    if (err.status === 400 || err.code === 'INVALID_INPUT') {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        message: err.message,
      });
    }

    if (err instanceof AIError) {
      if (err.code === AIErrorCodes.AI_NOT_CONFIGURED) {
        return res.status(503).json({
          code: err.code,
          message: 'AI habit suggestions are unavailable because AI has not been configured.',
        });
      }
      if (err.code === AIErrorCodes.AI_RATE_LIMITED) {
        return res.status(429).json({
          code: err.code,
          message: 'AI service rate limit reached. Please try again in a few minutes.',
        });
      }
      if (err.code === AIErrorCodes.AI_TIMEOUT) {
        return res.status(504).json({
          code: err.code,
          message: 'AI service request timed out. Please try again.',
        });
      }
      if (err.code === AIErrorCodes.AI_INVALID_RESPONSE) {
        return res.status(502).json({
          code: err.code,
          message: 'AI service returned an unparseable or invalid response.',
        });
      }
      return res.status(500).json({
        code: err.code || 'AI_PROVIDER_ERROR',
        message: err.message || 'AI generation failed.',
      });
    }

    return next(err);
  }
}

/**
 * POST /api/ai/recovery
 *
 * Generate or retrieve streak recovery guidance for an eligible broken habit.
 * Body: { habitId: string, useMock?: boolean, overrideToday?: string }
 */
export async function getRecoveryGuidance(req, res, next) {
  try {
    const { habitId, overrideToday } = req.body || {};
    const useMock = Boolean(req.body?.useMock);

    const result = await recoveryService.getRecoveryGuidance({
      userId: req.user._id,
      habitId,
      useMock,
      overrideToday,
    });

    return res.status(200).json(result);
  } catch (err) {
    if (err.status === 400 || err.code === 'INVALID_ID') {
      return res.status(400).json({
        code: 'INVALID_ID',
        message: err.message || 'Invalid or missing habitId.',
      });
    }

    if (err.status === 404 || err.code === 'NOT_FOUND') {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Habit not found.',
      });
    }

    if (err instanceof AIError) {
      if (err.code === AIErrorCodes.AI_NOT_CONFIGURED) {
        return res.status(503).json({
          code: err.code,
          message: 'AI recovery guidance is unavailable right now.',
        });
      }
      if (err.code === AIErrorCodes.AI_RATE_LIMITED) {
        return res.status(429).json({
          code: err.code,
          message: 'AI service rate limit reached. Please try again in a few minutes.',
        });
      }
      if (err.code === AIErrorCodes.AI_TIMEOUT) {
        return res.status(504).json({
          code: err.code,
          message: 'AI service request timed out. Please try again.',
        });
      }
      if (err.code === AIErrorCodes.AI_INVALID_RESPONSE) {
        return res.status(502).json({
          code: err.code,
          message: 'AI service returned an unparseable or invalid response.',
        });
      }
      return res.status(500).json({
        code: err.code || 'AI_PROVIDER_ERROR',
        message: err.message || 'AI generation failed.',
      });
    }

    return next(err);
  }
}

/**
 * POST /api/ai/chat
 *
 * Natural language chat about authenticated user's precomputed habit analytics.
 * Body: { message: string, useMock?: boolean, overrideToday?: string }
 */
export async function getChatResponse(req, res, next) {
  try {
    const { message, overrideToday } = req.body || {};
    const useMock = Boolean(req.body?.useMock);

    const result = await chatService.processChatMessage({
      userId: req.user._id,
      message,
      useMock,
      overrideToday,
    });

    return res.status(200).json(result);
  } catch (err) {
    if (err.status === 400 || err.code === 'INVALID_INPUT') {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        message: err.message || 'Invalid or missing message.',
      });
    }

    if (err instanceof AIError) {
      if (err.code === AIErrorCodes.AI_NOT_CONFIGURED) {
        return res.status(503).json({
          code: err.code,
          message: 'AI chat is unavailable because AI has not been configured.',
        });
      }
      if (err.code === AIErrorCodes.AI_RATE_LIMITED) {
        return res.status(429).json({
          code: err.code,
          message: 'AI service rate limit reached. Please try again in a few minutes.',
        });
      }
      if (err.code === AIErrorCodes.AI_TIMEOUT) {
        return res.status(504).json({
          code: err.code,
          message: 'AI service request timed out. Please try again.',
        });
      }
      if (err.code === AIErrorCodes.AI_INVALID_RESPONSE) {
        return res.status(502).json({
          code: err.code,
          message: 'AI service returned an unparseable or invalid response.',
        });
      }
      return res.status(500).json({
        code: err.code || 'AI_PROVIDER_ERROR',
        message: err.message || 'AI generation failed.',
      });
    }

    return next(err);
  }
}

/**
 * POST /api/ai/morning-motivation
 *
 * Generate or retrieve daily morning motivation for authenticated user.
 * Body: { useMock?: boolean, overrideToday?: string }
 */
export async function getMorningMotivation(req, res, next) {
  try {
    const { overrideToday } = req.body || {};
    const useMock = Boolean(req.body?.useMock);

    if (overrideToday && !isValidDateKey(overrideToday)) {
      return res.status(400).json({
        code: 'INVALID_DATE',
        message: 'Invalid overrideToday format. Expected YYYY-MM-DD.',
      });
    }

    const result = await morningMotivationService.getMorningMotivation({
      userId: req.user._id,
      useMock,
      overrideToday,
    });

    return res.status(200).json(result);
  } catch (err) {
    if (err.status === 400 || err.code === 'INVALID_INPUT') {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        message: err.message || 'Invalid morning motivation request.',
      });
    }

    if (err instanceof AIError) {
      if (err.code === AIErrorCodes.AI_NOT_CONFIGURED) {
        return res.status(503).json({
          code: err.code,
          message: 'AI morning motivation is unavailable because AI has not been configured.',
        });
      }
      if (err.code === AIErrorCodes.AI_RATE_LIMITED) {
        return res.status(429).json({
          code: err.code,
          message: 'AI service rate limit reached. Please try again in a few minutes.',
        });
      }
      if (err.code === AIErrorCodes.AI_TIMEOUT) {
        return res.status(504).json({
          code: err.code,
          message: 'AI service request timed out. Please try again.',
        });
      }
      if (err.code === AIErrorCodes.AI_INVALID_RESPONSE) {
        return res.status(502).json({
          code: err.code,
          message: 'AI service returned an unparseable or invalid response.',
        });
      }
      return res.status(500).json({
        code: err.code || 'AI_PROVIDER_ERROR',
        message: err.message || 'AI generation failed.',
      });
    }

    return next(err);
  }
}



