/**
 * Morning Motivation Response Validator.
 *
 * Strictly validates structured AI output for morning motivation.
 * Enforces:
 *   - Object structure
 *   - message: required string (10 to 350 characters)
 *   - focusHabit: string matching an active habit or null
 *
 * Throws AI_INVALID_RESPONSE on any schema violation.
 */

import { AIError, AIErrorCodes } from './errors.js';

/**
 * Validate structured morning motivation response.
 *
 * @param {unknown} data — Raw parsed AI output
 * @param {string[]} [validHabitNames=[]] — Allowed active habit names for focusHabit validation
 * @returns {{
 *   message: string,
 *   focusHabit: string|null
 * }} Validated motivation payload
 */
export function validateMorningMotivation(data, validHabitNames = []) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Invalid morning motivation response: expected a JSON object.',
    );
  }

  // 1. Validate message
  if (typeof data.message !== 'string') {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Invalid morning motivation response: "message" field must be a string.',
    );
  }

  const trimmedMessage = data.message.trim();
  if (trimmedMessage.length < 10) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Invalid morning motivation response: "message" is too short (minimum 10 characters).',
    );
  }

  if (trimmedMessage.length > 350) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Invalid morning motivation response: "message" exceeds maximum length of 350 characters.',
    );
  }

  // 2. Validate focusHabit
  let focusHabit = null;
  if (data.focusHabit !== undefined && data.focusHabit !== null) {
    if (typeof data.focusHabit !== 'string') {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        'Invalid morning motivation response: "focusHabit" must be a string or null.',
      );
    }

    const trimmedFocus = data.focusHabit.trim();
    if (trimmedFocus.length > 0) {
      // If valid habit names are provided, verify focusHabit corresponds to one of them
      if (Array.isArray(validHabitNames) && validHabitNames.length > 0) {
        const normalizedValid = validHabitNames.map((n) => n.toLowerCase());
        const matchIndex = normalizedValid.indexOf(trimmedFocus.toLowerCase());

        if (matchIndex >= 0) {
          // Use canonical casing from active habits
          focusHabit = validHabitNames[matchIndex];
        } else {
          // If the model suggested a habit name not in the user's active list,
          // throw validation error or normalize to null
          throw new AIError(
            AIErrorCodes.AI_INVALID_RESPONSE,
            `Invalid morning motivation response: focusHabit "${trimmedFocus}" does not match any active user habit.`,
          );
        }
      } else {
        // If user has zero active habits, focusHabit must be null
        throw new AIError(
          AIErrorCodes.AI_INVALID_RESPONSE,
          'Invalid morning motivation response: focusHabit must be null when user has no active habits.',
        );
      }
    }
  }

  return {
    message: trimmedMessage,
    focusHabit,
  };
}

export default {
  validateMorningMotivation,
};
