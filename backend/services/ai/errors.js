/**
 * AI Error Types and Error Codes.
 *
 * Provides normalized, predictable error codes for AI interactions
 * without exposing sensitive API keys or raw SDK internals.
 */

export const AIErrorCodes = {
  /** Thrown when GEMINI_API_KEY is not configured or missing. */
  AI_NOT_CONFIGURED: 'AI_NOT_CONFIGURED',

  /** Thrown when the provider returns a 429 quota or rate limit error. */
  AI_RATE_LIMITED: 'AI_RATE_LIMITED',

  /** Thrown when the AI request exceeds the configured timeout threshold. */
  AI_TIMEOUT: 'AI_TIMEOUT',

  /** Thrown when the provider returns an unexpected 5xx or network failure. */
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',

  /** Thrown when the AI response is empty, malformed, or fails JSON parsing. */
  AI_INVALID_RESPONSE: 'AI_INVALID_RESPONSE',
};

export class AIError extends Error {
  /**
   * @param {string} code — One of AIErrorCodes
   * @param {string} message — Sanitized human-readable error description
   * @param {Record<string, any>} [details={}] — Safe metadata (no keys, no raw user prompts)
   */
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
