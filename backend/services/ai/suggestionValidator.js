/**
 * Suggestion Response Schema Validator.
 *
 * Validates that Gemini's structured response conforms strictly to the
 * required 3-suggestion habit schema and application-level domain constraints:
 *   - Exactly 3 suggestion items
 *   - Strict enum validation for category, frequency, icon, and hex color
 *   - Reasonable length boundaries
 *   - daily targetDays === 1, weekly targetDays in [1..7]
 */

import { HABIT_CATEGORIES, HABIT_FREQUENCIES, HABIT_ICONS } from '../../models/Habit.js';
import { AIError, AIErrorCodes } from './errors.js';

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Validate and sanitize structured habit suggestions output from AI.
 *
 * @param {any} data — Parsed AI JSON output
 * @returns {Array<{ name: string, description: string, category: string, frequency: string, targetDays: number, icon: string, color: string, reason: string }>}
 * @throws {AIError} if validation fails
 */
export function validateSuggestions(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Suggestions response must be an object with a suggestions array.',
      { received: typeof data },
    );
  }

  const { suggestions } = data;

  if (!Array.isArray(suggestions) || suggestions.length !== 3) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      `Suggestions must contain exactly 3 items (received: ${Array.isArray(suggestions) ? suggestions.length : typeof suggestions}).`,
    );
  }

  const validated = [];

  for (let i = 0; i < suggestions.length; i++) {
    const item = suggestions[i];
    if (!item || typeof item !== 'object') {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Suggestion at index ${i} must be an object.`,
      );
    }

    const { name, description, category, frequency, targetDays, icon, color, reason } = item;

    // 1. Name validation (3 to 60 characters)
    if (typeof name !== 'string' || name.trim().length < 3) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Suggestion at index ${i} has missing or too short name (min 3 characters).`,
      );
    }
    if (name.trim().length > 60) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Suggestion at index ${i} name exceeds maximum length of 60 characters.`,
      );
    }

    // 2. Description validation (5 to 150 characters)
    if (typeof description !== 'string' || description.trim().length < 5) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Suggestion at index ${i} has missing or too short description (min 5 characters).`,
      );
    }
    if (description.trim().length > 150) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Suggestion at index ${i} description exceeds maximum length of 150 characters.`,
      );
    }

    // 3. Category validation (must be in Habit model categories)
    const normCategory = typeof category === 'string' ? category.trim().toLowerCase() : '';
    if (!HABIT_CATEGORIES.includes(normCategory)) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Suggestion at index ${i} has invalid category "${category}". Allowed: ${HABIT_CATEGORIES.join(', ')}.`,
      );
    }

    // 4. Frequency validation ('daily' or 'weekly')
    const normFrequency = typeof frequency === 'string' ? frequency.trim().toLowerCase() : '';
    if (!HABIT_FREQUENCIES.includes(normFrequency)) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Suggestion at index ${i} has invalid frequency "${frequency}". Allowed: daily, weekly.`,
      );
    }

    // 5. TargetDays validation
    const td = Number(targetDays);
    if (!Number.isInteger(td)) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Suggestion at index ${i} targetDays must be an integer.`,
      );
    }
    if (normFrequency === 'daily' && td !== 1) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Suggestion at index ${i} has frequency "daily", so targetDays must equal 1 (received: ${td}).`,
      );
    }
    if (normFrequency === 'weekly' && (td < 1 || td > 7)) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Suggestion at index ${i} has frequency "weekly", so targetDays must be between 1 and 7 (received: ${td}).`,
      );
    }

    // 6. Icon validation (must be one of 12 supported emojis)
    if (typeof icon !== 'string' || !HABIT_ICONS.includes(icon.trim())) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Suggestion at index ${i} has unsupported icon "${icon}". Allowed icons: ${HABIT_ICONS.join(' ')}.`,
      );
    }

    // 7. Color validation (hex format)
    const normColor = typeof color === 'string' ? color.trim() : '';
    if (!HEX_COLOR_RE.test(normColor)) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Suggestion at index ${i} has invalid hex color "${color}". Must be valid hex (e.g. #3b82f6).`,
      );
    }

    // 8. Reason validation (5 to 200 characters)
    if (typeof reason !== 'string' || reason.trim().length < 5) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Suggestion at index ${i} has missing or too short reason (min 5 characters).`,
      );
    }
    if (reason.trim().length > 200) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Suggestion at index ${i} reason exceeds maximum length of 200 characters.`,
      );
    }

    validated.push({
      name: name.trim(),
      description: description.trim(),
      category: normCategory,
      frequency: normFrequency,
      targetDays: td,
      icon: icon.trim(),
      color: normColor,
      reason: reason.trim(),
    });
  }

  return validated;
}

export default validateSuggestions;
