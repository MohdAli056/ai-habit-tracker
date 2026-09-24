/**
 * Chat Response Validator.
 *
 * Validates that Gemini's structured response conforms strictly to the
 * required chat response schema.
 */

import { AIError, AIErrorCodes } from './errors.js';

/**
 * Validate and sanitize structured chat response.
 *
 * @param {any} data — Parsed AI JSON output
 * @returns {{ answer: string, dataPoints: string[] }}
 * @throws {AIError} if validation fails
 */
export function validateChatResponse(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Chat response must be an object.',
      { received: typeof data },
    );
  }

  const { answer, dataPoints } = data;

  // 1. Answer validation (10–800 chars)
  if (typeof answer !== 'string' || answer.trim().length < 10) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Chat response answer is missing or too short (min 10 characters).',
    );
  }
  if (answer.trim().length > 800) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Chat response answer exceeds maximum length of 800 characters.',
    );
  }

  // 2. DataPoints validation (array of 0 to 3 strings)
  const sanitizedDataPoints = Array.isArray(dataPoints) ? dataPoints : [];
  if (sanitizedDataPoints.length > 3) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Chat response dataPoints cannot exceed 3 items.',
    );
  }

  for (let i = 0; i < sanitizedDataPoints.length; i++) {
    const dp = sanitizedDataPoints[i];
    if (typeof dp !== 'string' || dp.trim().length < 3) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Chat dataPoint at index ${i} must be a string of at least 3 characters.`,
      );
    }
    if (dp.trim().length > 200) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Chat dataPoint at index ${i} exceeds maximum length of 200 characters.`,
      );
    }
  }

  return {
    answer: answer.trim(),
    dataPoints: sanitizedDataPoints.map((dp) => dp.trim()),
  };
}

export default validateChatResponse;
