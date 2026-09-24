/**
 * AI Service Layer.
 *
 * Provides a clean interface for all backend services to generate text
 * and structured JSON data without coupling to specific SDKs or providers.
 */

import { env } from '../../config/env.js';
import { parseAIJson } from './jsonParser.js';
import { getAIProvider } from './providerResolver.js';

export const aiService = {
  /**
   * Check whether Gemini AI is configured with an active API key.
   *
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0);
  },

  /**
   * Return high-level AI provider status metadata (safe for status checks).
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      model: env.GEMINI_MODEL || 'gemini-2.5-flash',
      provider: this.isConfigured() ? 'gemini' : 'unconfigured',
    };
  },

  /**
   * Generate text through the resolved provider.
   *
   * @param {Object} params
   * @param {string} params.prompt — The generation prompt
   * @param {string} [params.systemInstruction] — Optional system instructions
   * @param {number} [params.temperature] — Optional temperature
   * @param {number} [params.maxOutputTokens] — Optional max tokens
   * @param {boolean} [params.useMock=false] — Force MockProvider
   * @param {number} [params.timeoutMs] — Request timeout in milliseconds
   * @returns {Promise<{ text: string, provider: string, model: string, generatedAt: string }>}
   */
  async generateText({
    prompt,
    systemInstruction,
    temperature,
    maxOutputTokens,
    useMock = false,
    timeoutMs,
    ...rest
  }) {
    const provider = getAIProvider({ useMock });
    return provider.generate({
      prompt,
      systemInstruction,
      temperature,
      maxOutputTokens,
      timeoutMs,
      ...rest
    });
  },

  /**
   * Generate text and parse it into structured JSON.
   *
   * @param {Object} params — Generation parameters
   * @returns {Promise<{ data: any, provider: string, model: string, generatedAt: string }>}
   */
  async generateStructured(params) {
    const result = await this.generateText({ ...params, returnJson: true });
    const parsed = parseAIJson(result.text);

    return {
      data: parsed,
      provider: result.provider,
      model: result.model,
      generatedAt: result.generatedAt,
    };
  },
};

export default aiService;
