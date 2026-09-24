/**
 * Weekly Report Schema Validator.
 *
 * Validates that Gemini's structured response conforms strictly to the
 * required weekly report schema and length limits.
 */

import { AIError, AIErrorCodes } from './errors.js';

/**
 * Validate and sanitize structured weekly report.
 *
 * @param {any} data — Parsed AI JSON output
 * @returns {{ headline: string, summary: string, wins: string[], focusAreas: string[], recommendation: string }}
 * @throws {AIError} if validation fails
 */
export function validateWeeklyReport(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Weekly report response must be an object.',
      { received: typeof data },
    );
  }

  const { headline, summary, wins, focusAreas, recommendation } = data;

  // 1. Headline validation
  if (typeof headline !== 'string' || headline.trim().length < 5) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Weekly report headline is missing or too short (min 5 characters).',
    );
  }
  if (headline.length > 150) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Weekly report headline exceeds maximum length of 150 characters.',
    );
  }

  // 2. Summary validation
  if (typeof summary !== 'string' || summary.trim().length < 10) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Weekly report summary is missing or too short (min 10 characters).',
    );
  }
  if (summary.length > 650) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Weekly report summary exceeds maximum length of 650 characters.',
    );
  }

  // 3. Wins validation (1 to 4 items)
  if (!Array.isArray(wins) || wins.length === 0) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Weekly report wins must be a non-empty array of strings.',
    );
  }
  if (wins.length > 4) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Weekly report wins cannot exceed 4 items.',
    );
  }
  for (let i = 0; i < wins.length; i++) {
    if (typeof wins[i] !== 'string' || wins[i].trim().length === 0) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Weekly report win at index ${i} must be a non-empty string.`,
      );
    }
  }

  // 4. Focus areas validation (0 to 4 items)
  const sanitizedFocusAreas = Array.isArray(focusAreas) ? focusAreas : [];
  if (sanitizedFocusAreas.length > 4) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Weekly report focusAreas cannot exceed 4 items.',
    );
  }
  for (let i = 0; i < sanitizedFocusAreas.length; i++) {
    if (typeof sanitizedFocusAreas[i] !== 'string' || sanitizedFocusAreas[i].trim().length === 0) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Weekly report focusArea at index ${i} must be a non-empty string.`,
      );
    }
  }

  // 5. Recommendation validation
  if (typeof recommendation !== 'string' || recommendation.trim().length < 10) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Weekly report recommendation is missing or too short (min 10 characters).',
    );
  }
  if (recommendation.length > 550) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Weekly report recommendation exceeds maximum length of 550 characters.',
    );
  }

  return {
    headline: headline.trim(),
    summary: summary.trim(),
    wins: wins.map((w) => w.trim().slice(0, 200)),
    focusAreas: sanitizedFocusAreas.map((f) => f.trim().slice(0, 200)),
    recommendation: recommendation.trim(),
  };
}
