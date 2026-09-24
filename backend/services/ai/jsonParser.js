/**
 * Structured Output / JSON Parser Utility.
 *
 * Safely parses AI-generated JSON, stripping markdown code blocks
 * (```json ... ```) if present and returning normalized errors on parse failure.
 */

import { AIError, AIErrorCodes } from './errors.js';

/**
 * Clean markdown formatting and parse JSON safely.
 *
 * @param {string} text — Raw AI text output
 * @returns {any} Parsed JSON object or array
 * @throws {AIError} with AI_INVALID_RESPONSE if parsing fails
 */
export function parseAIJson(text) {
  if (typeof text !== 'string') {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'AI response must be a string to parse as JSON',
      { type: typeof text },
    );
  }

  let cleaned = text.trim();

  // Strip markdown code fences if present (e.g. ```json ... ``` or ``` ... ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
    cleaned = cleaned.trim();
  }

  if (!cleaned) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'AI response is empty after trimming and cannot be parsed as JSON',
    );
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      `Failed to parse AI response as JSON: ${err.message}`,
      {
        snippet: cleaned.slice(0, 150),
      },
    );
  }
}
