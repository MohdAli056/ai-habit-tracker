/**
 * Reusable Gemini Client & Generation Utility.
 *
 * Responsibilities:
 *   - Lazy initialization (server boots without GEMINI_API_KEY)
 *   - Reads GEMINI_API_KEY and GEMINI_MODEL
 *   - Controlled generation interface (generateText, generateStructured)
 *   - Backward-compatible client and model getters
 */

import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { aiService } from '../services/ai/aiService.js';
import { AIError, AIErrorCodes } from '../services/ai/errors.js';

let _client = null;

/**
 * Check whether Gemini API key is configured.
 *
 * @returns {boolean}
 */
export function isGeminiConfigured() {
  return Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0);
}

/**
 * Return the shared GoogleGenAI client instance with lazy initialization.
 *
 * @returns {GoogleGenAI}
 * @throws {AIError} if GEMINI_API_KEY is not configured.
 */
export function getGeminiClient() {
  if (_client) return _client;

  if (!isGeminiConfigured()) {
    throw new AIError(
      AIErrorCodes.AI_NOT_CONFIGURED,
      'GEMINI_API_KEY is not set. Add it to your .env file to use AI features.',
    );
  }

  _client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return _client;
}

/**
 * Convenience getter for the configured model name.
 */
export function getGeminiModel() {
  return env.GEMINI_MODEL || 'gemini-2.5-flash';
}

/**
 * Controlled generation function utilizing the AI service layer.
 *
 * @param {Object} params
 * @param {string} params.prompt
 * @param {string} [params.systemInstruction]
 * @param {number} [params.temperature]
 * @param {number} [params.maxOutputTokens]
 * @param {boolean} [params.useMock=false]
 * @param {number} [params.timeoutMs]
 * @returns {Promise<{ text: string, provider: string, model: string, generatedAt: string }>}
 */
export async function generateText(params) {
  return aiService.generateText(params);
}

/**
 * Controlled generation function returning parsed structured JSON.
 *
 * @param {Object} params
 * @returns {Promise<{ data: any, provider: string, model: string, generatedAt: string }>}
 */
export async function generateStructured(params) {
  return aiService.generateStructured(params);
}

export default {
  generateText,
  generateStructured,
  getGeminiClient,
  getGeminiModel,
  isGeminiConfigured,
};
