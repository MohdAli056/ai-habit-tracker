/**
 * GeminiProvider — Google Gemini GenAI SDK provider (@google/genai).
 *
 * Implements lazy initialization, configurable timeout, error normalization,
 * and security guarantees (no API keys or raw credentials in responses).
 */

import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';
import { AIError, AIErrorCodes } from './errors.js';

const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds

export class GeminiProvider {
  constructor(options = {}) {
    this.name = 'gemini';
    this.model = options.model || env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this._client = null;
  }

  /**
   * Lazily initialize and return the GoogleGenAI instance.
   * Ensures the server boots normally even when GEMINI_API_KEY is unset.
   */
  getClient() {
    if (this._client) return this._client;

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AIError(
        AIErrorCodes.AI_NOT_CONFIGURED,
        'Gemini API key is not configured. Please add GEMINI_API_KEY to your .env file.',
      );
    }

    this._client = new GoogleGenAI({ apiKey });
    return this._client;
  }

  /**
   * Generate text using Gemini with strict timeout and error normalization.
   *
   * @param {Object} params
   * @param {string} params.prompt — User/task prompt
   * @param {string} [params.systemInstruction] — System instruction
   * @param {number} [params.temperature] — Sampling temperature (0.0 - 2.0)
   * @param {number} [params.maxOutputTokens] — Maximum generation token limit
   * @param {number} [params.timeoutMs] — Request timeout override
   * @returns {Promise<{ text: string, provider: string, model: string, generatedAt: string }>}
   */
  async generate({
    prompt,
    systemInstruction,
    temperature,
    maxOutputTokens,
    timeoutMs,
    returnJson = false,
  }) {
    if (!prompt || typeof prompt !== 'string') {
      throw new AIError(
        AIErrorCodes.AI_INVALID_RESPONSE,
        'Prompt is required and must be a non-empty string.',
      );
    }

    const client = this.getClient();
    const activeTimeout = timeoutMs || this.timeoutMs;

    // Config object for @google/genai generateContent
    const config = {};
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (typeof temperature === 'number') config.temperature = temperature;
    if (typeof maxOutputTokens === 'number') config.maxOutputTokens = maxOutputTokens;
    if (returnJson) config.responseMimeType = 'application/json';

    // Timeout promise to ensure requests do not hang indefinitely
    let timerId = null;
    const timeoutPromise = new Promise((_, reject) => {
      timerId = setTimeout(() => {
        reject(
          new AIError(
            AIErrorCodes.AI_TIMEOUT,
            `Gemini request timed out after ${activeTimeout}ms`,
          ),
        );
      }, activeTimeout);
    });

    try {
      const executionPromise = client.models.generateContent({
        model: this.model,
        contents: prompt,
        config,
      });

      const response = await Promise.race([executionPromise, timeoutPromise]);
      clearTimeout(timerId);

      const text = response?.text || '';
      if (!text) {
        throw new AIError(
          AIErrorCodes.AI_INVALID_RESPONSE,
          'Gemini returned an empty response text.',
        );
      }

      return {
        text,
        provider: this.name,
        model: this.model,
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      clearTimeout(timerId);

      // Re-throw if already an AIError
      if (err instanceof AIError) throw err;

      // Classify and normalize SDK errors
      const errMsg = err.message || '';
      const errStatus = err.status || err.code;

      if (
        errStatus === 429 ||
        errStatus === 503 ||
        errMsg.includes('429') ||
        errMsg.includes('503') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('high demand') ||
        errMsg.includes('quota')
      ) {
        throw new AIError(
          AIErrorCodes.AI_RATE_LIMITED,
          'Gemini AI is currently experiencing high demand. Please try again in a moment.',
        );
      }

      if (
        errStatus === 400 ||
        errStatus === 403 ||
        errMsg.includes('API_KEY_INVALID') ||
        errMsg.includes('API key')
      ) {
        throw new AIError(
          AIErrorCodes.AI_NOT_CONFIGURED,
          'Gemini API key is invalid or not authorized.',
        );
      }

      throw new AIError(
        AIErrorCodes.AI_PROVIDER_ERROR,
        `Gemini provider encountered an error: ${errMsg}`,
      );
    }
  }
}
