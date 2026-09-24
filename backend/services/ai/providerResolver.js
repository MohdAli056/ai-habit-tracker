/**
 * AI Provider Resolver.
 *
 * Resolves the appropriate AI provider (GeminiProvider vs. MockProvider)
 * based on configuration and explicit request flags.
 *
 * Architecture Rule:
 *   - Production features NEVER silently receive fake mock data when GEMINI_API_KEY is missing.
 *   - If GEMINI_API_KEY is unset and useMock is not explicitly enabled, throws AI_NOT_CONFIGURED.
 *   - Tests and zero-quota workflows explicitly set useMock: true to get deterministic MockProvider.
 */

import { env } from '../../config/env.js';
import { AIError, AIErrorCodes } from './errors.js';
import { GeminiProvider } from './geminiProvider.js';
import { MockProvider } from './mockProvider.js';

let _geminiInstance = null;
let _mockInstance = null;

/**
 * Resolve and return the appropriate AI provider instance.
 *
 * @param {Object} [options={}]
 * @param {boolean} [options.useMock=false] — Explicitly use MockProvider (for testing/offline)
 * @param {string} [options.model] — Optional model override
 * @returns {GeminiProvider | MockProvider}
 * @throws {AIError} with AI_NOT_CONFIGURED if Gemini key is missing and useMock is false
 */
export function getAIProvider(options = {}) {
  if (options.useMock) {
    if (!_mockInstance) {
      _mockInstance = new MockProvider(options);
    }
    return _mockInstance;
  }

  if (env.GEMINI_API_KEY) {
    if (!_geminiInstance || options.model) {
      _geminiInstance = new GeminiProvider(options);
    }
    return _geminiInstance;
  }

  throw new AIError(
    AIErrorCodes.AI_NOT_CONFIGURED,
    'Gemini AI is not configured. Set GEMINI_API_KEY in your environment to enable AI features.',
  );
}
