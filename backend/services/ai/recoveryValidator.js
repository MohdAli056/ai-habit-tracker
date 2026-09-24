/**
 * Recovery Report Schema Validator.
 *
 * Validates that Gemini's structured response conforms strictly to the
 * required recovery schema and length limits.
 */

import { AIError, AIErrorCodes } from './errors.js';

/**
 * Validate and sanitize structured recovery report.
 *
 * @param {any} data — Parsed AI JSON output
 * @returns {{
 *   headline: string,
 *   acknowledgement: string,
 *   recoverySteps: string[],
 *   firstStep: string
 * }}
 * @throws {AIError} if validation fails
 */
export function validateRecoveryReport(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Recovery response must be an object.',
      { received: typeof data },
    );
  }

  const { headline, acknowledgement, recoverySteps, firstStep } = data;

  // 1. Headline validation (5-120 chars)
  if (typeof headline !== 'string' || headline.trim().length < 5) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Recovery headline is missing or too short (min 5 characters).',
    );
  }
  if (headline.trim().length > 120) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Recovery headline exceeds maximum length of 120 characters.',
    );
  }

  // 2. Acknowledgement validation (10-400 chars)
  if (typeof acknowledgement !== 'string' || acknowledgement.trim().length < 10) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Recovery acknowledgement is missing or too short (min 10 characters).',
    );
  }
  if (acknowledgement.trim().length > 400) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Recovery acknowledgement exceeds maximum length of 400 characters.',
    );
  }

  // 3. RecoverySteps validation (array of 1 to 3 strings, each 10-250 chars)
  if (!Array.isArray(recoverySteps) || recoverySteps.length === 0) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Recovery steps must be an array with 1 to 3 items.',
    );
  }
  if (recoverySteps.length > 3) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Recovery steps cannot exceed 3 items.',
    );
  }
  for (let i = 0; i < recoverySteps.length; i++) {
    const step = recoverySteps[i];
    if (typeof step !== 'string' || step.trim().length < 10) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Recovery step at index ${i} must be a string of at least 10 characters.`,
      );
    }
    if (step.trim().length > 250) {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        `Recovery step at index ${i} exceeds maximum length of 250 characters.`,
      );
    }
  }

  // 4. FirstStep validation (10-250 chars)
  if (typeof firstStep !== 'string' || firstStep.trim().length < 10) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Recovery firstStep is missing or too short (min 10 characters).',
    );
  }
  if (firstStep.trim().length > 250) {
    throw new AIError(
      AIErrorCodes.AI_INVALID_RESPONSE,
      'Recovery firstStep exceeds maximum length of 250 characters.',
    );
  }

  return {
    headline: headline.trim(),
    acknowledgement: acknowledgement.trim(),
    recoverySteps: recoverySteps.map((s) => s.trim()),
    firstStep: firstStep.trim(),
  };
}

export default validateRecoveryReport;
