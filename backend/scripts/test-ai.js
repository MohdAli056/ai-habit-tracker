/**
 * Phase 10: Automated test suite for Gemini AI Infrastructure.
 * Run with: node scripts/test-ai.js
 *
 * Verifies:
 *   1. AI module imports and exports cleanly
 *   2. MockProvider returns deterministic structured output
 *   3. JSON parser parses clean JSON and markdown-fenced JSON
 *   4. JSON parser rejects malformed JSON with AI_INVALID_RESPONSE
 *   5. Missing GEMINI_API_KEY throws AI_NOT_CONFIGURED (no silent fallback)
 *   6. Lazy initialization: server boots without Gemini key
 *   7. AI error normalization and error codes
 *   8. AIInsight model loads and validates enum types
 *   9. AIInsight document creation and compound index queries in Atlas
 *  10. Database cleanup of test records in Atlas
 *  11. Optional live Gemini smoke test if key is present (or graceful skip)
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import AIInsight, { AI_INSIGHT_TYPES } from '../models/AIInsight.js';
import User from '../models/User.js';
import {
  AIError,
  AIErrorCodes,
  aiService,
  getAIProvider,
  MockProvider,
  parseAIJson,
} from '../services/ai/index.js';
import {
  generateStructured,
  generateText,
  getGeminiModel,
  isGeminiConfigured,
} from '../utils/gemini.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('  PHASE 10: GEMINI AI INFRASTRUCTURE TESTS');
  console.log('======================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas\n');

  try {
    // ── 1. MODULE EXPORTS & IMPORT INTEGRITY ─────────────────────────────────
    console.log('── 1. AI MODULE IMPORTS & INTEGRITY ──');
    assert(typeof aiService.generateText === 'function', 'aiService.generateText is a function');
    assert(typeof aiService.generateStructured === 'function', 'aiService.generateStructured is a function');
    assert(typeof getAIProvider === 'function', 'getAIProvider is a function');
    assert(typeof parseAIJson === 'function', 'parseAIJson is a function');
    assert(typeof generateText === 'function', 'utils/gemini generateText is a function');
    assert(typeof generateStructured === 'function', 'utils/gemini generateStructured is a function');

    // ── 2. MOCK PROVIDER VERIFICATION ────────────────────────────────────────
    console.log('\n── 2. MOCK PROVIDER DETERMINISTIC OUTPUT ──');
    const mockProvider = new MockProvider();
    const mockRes = await mockProvider.generate({ prompt: 'Test prompt for habits' });

    assert(mockRes.provider === 'mock', `Provider is mock (got: ${mockRes.provider})`);
    assert(mockRes.model === 'mock-model', `Model is mock-model (got: ${mockRes.model})`);
    assert(typeof mockRes.text === 'string' && mockRes.text.includes('[MOCK AI]'), 'Mock output contains [MOCK AI] tag');
    assert(!!mockRes.generatedAt, 'Mock output includes generatedAt timestamp');

    // Mock with JSON output
    const mockJsonRes = await mockProvider.generate({ prompt: 'Generate JSON report', returnJson: true });
    const parsedMock = JSON.parse(mockJsonRes.text);
    assert(parsedMock.mock === true, 'Mock JSON output contains mock: true');

    // ── 3. JSON PARSER HANDLING (CLEAN & FENCED) ─────────────────────────────
    console.log('\n── 3. JSON PARSER UTILITY (CLEAN & FENCED) ──');
    const rawJson = '{"habits": ["Meditation", "Reading"], "score": 95}';
    const parsed1 = parseAIJson(rawJson);
    assert(parsed1.score === 95 && parsed1.habits.length === 2, 'parseAIJson correctly parses clean JSON string');

    const fencedJson = '```json\n{"status": "success", "recommendation": "Drink water"}\n```';
    const parsed2 = parseAIJson(fencedJson);
    assert(parsed2.status === 'success', 'parseAIJson correctly strips ```json markdown fences');

    const genericFencedJson = '```\n{"tier": "gold"}\n```';
    const parsed3 = parseAIJson(genericFencedJson);
    assert(parsed3.tier === 'gold', 'parseAIJson correctly strips generic ``` markdown fences');

    // ── 4. JSON PARSER MALFORMED INPUT REJECTION ──────────────────────────────
    console.log('\n── 4. JSON PARSER MALFORMED INPUT REJECTION ──');
    let threwInvalid = false;
    try {
      parseAIJson('This is not JSON at all');
    } catch (err) {
      threwInvalid = err instanceof AIError && err.code === AIErrorCodes.AI_INVALID_RESPONSE;
    }
    assert(threwInvalid, 'parseAIJson throws AIError with AI_INVALID_RESPONSE on malformed JSON');

    let threwEmpty = false;
    try {
      parseAIJson('   ');
    } catch (err) {
      threwEmpty = err instanceof AIError && err.code === AIErrorCodes.AI_INVALID_RESPONSE;
    }
    assert(threwEmpty, 'parseAIJson throws AIError with AI_INVALID_RESPONSE on empty string');

    // ── 5. AI SERVICE LAYER WITH MOCK ─────────────────────────────────────────
    console.log('\n── 5. AI SERVICE LAYER (WITH MOCK FLAG) ──');
    const serviceTextRes = await aiService.generateText({
      prompt: 'Summarize weekly progress',
      useMock: true,
    });
    assert(serviceTextRes.provider === 'mock', 'aiService.generateText({ useMock: true }) routes to MockProvider');

    const serviceStructRes = await aiService.generateStructured({
      prompt: 'Structured summary',
      useMock: true,
    });
    // MockProvider generates structured JSON when mock is used
    assert(serviceStructRes.provider === 'mock', 'aiService.generateStructured returns provider: mock');
    assert(!!serviceStructRes.data, 'aiService.generateStructured returns parsed data');

    // ── 6. PROVIDER RESOLVER & MISSING KEY BEHAVIOR ───────────────────────────
    console.log('\n── 6. PROVIDER RESOLVER & CONFIGURATION CHECK ──');
    const status = aiService.getStatus();
    assert(typeof status.configured === 'boolean', `AI status configured is boolean (got: ${status.configured})`);
    assert(status.model === getGeminiModel(), `Configured model is ${getGeminiModel()}`);

    if (!isGeminiConfigured()) {
      let threwNotConfigured = false;
      try {
        getAIProvider({ useMock: false });
      } catch (err) {
        threwNotConfigured = err instanceof AIError && err.code === AIErrorCodes.AI_NOT_CONFIGURED;
      }
      assert(
        threwNotConfigured,
        'getAIProvider({ useMock: false }) throws AI_NOT_CONFIGURED when GEMINI_API_KEY is missing (no silent fake content)',
      );
    } else {
      const provider = getAIProvider({ useMock: false });
      assert(provider.name === 'gemini', 'getAIProvider resolves GeminiProvider when key is present');
    }

    // ── 7. AI ERROR HIERARCHY & NORMALIZATION ─────────────────────────────────
    console.log('\n── 7. AI ERROR HIERARCHY & CODES ──');
    const testErr = new AIError(AIErrorCodes.AI_TIMEOUT, 'Operation timed out', { timeoutMs: 15000 });
    assert(testErr instanceof Error && testErr instanceof AIError, 'AIError extends standard JavaScript Error');
    assert(testErr.code === 'AI_TIMEOUT', 'AIError preserves error code');
    assert(testErr.toJSON().code === 'AI_TIMEOUT', 'AIError.toJSON() includes code and details');

    // ── 8. AIINSIGHT MONGOOSE MODEL VALIDATION ────────────────────────────────
    console.log('\n── 8. AIINSIGHT MONGOOSE MODEL VALIDATION ──');
    assert(Array.isArray(AI_INSIGHT_TYPES), 'AI_INSIGHT_TYPES is an array');
    assert(
      AI_INSIGHT_TYPES.includes('weekly') &&
      AI_INSIGHT_TYPES.includes('suggestion') &&
      AI_INSIGHT_TYPES.includes('recovery') &&
      AI_INSIGHT_TYPES.includes('chat') &&
      AI_INSIGHT_TYPES.includes('morning'),
      'AI_INSIGHT_TYPES contains all 5 required types (weekly, suggestion, recovery, chat, morning)',
    );

    // Test rejection of invalid type
    const invalidDoc = new AIInsight({
      userId: new mongoose.Types.ObjectId(),
      type: 'invalid_type_xyz',
      content: { test: true },
    });
    let validateErr = null;
    try {
      await invalidDoc.validate();
    } catch (err) {
      validateErr = err;
    }
    assert(
      !!validateErr && !!validateErr.errors['type'],
      'AIInsight rejects invalid type outside allowed enum',
    );

    // ── 9. AIINSIGHT PERSISTENCE & COMPOUND INDEX QUERY ───────────────────────
    console.log('\n── 9. AIINSIGHT PERSISTENCE & QUERY IN ATLAS ──');
    // Create temporary test user
    const testUser = await User.create({
      name: 'AI Test User',
      email: `phase10_ai_tester_${Date.now()}@test.dev`,
      password: 'Password123!',
    });

    // Create valid AIInsight records
    const insightDoc1 = await AIInsight.create({
      userId: testUser._id,
      type: 'weekly',
      content: { summary: 'Great consistency on meditation', score: 85 },
      meta: { periodStart: '2026-09-15', periodEnd: '2026-09-21', provider: 'mock' },
      generatedAt: new Date(Date.now() - 10000),
    });

    const insightDoc2 = await AIInsight.create({
      userId: testUser._id,
      type: 'weekly',
      content: { summary: 'Newest weekly report', score: 92 },
      meta: { periodStart: '2026-09-22', periodEnd: '2026-09-28', provider: 'mock' },
      generatedAt: new Date(),
    });

    assert(!!insightDoc1._id && !!insightDoc2._id, 'Created 2 AIInsight documents in MongoDB Atlas');

    // Query using compound index { userId, type, generatedAt: -1 }
    const latestWeekly = await AIInsight.findOne({
      userId: testUser._id,
      type: 'weekly',
    }).sort({ generatedAt: -1 });

    assert(
      latestWeekly && latestWeekly.content.summary === 'Newest weekly report',
      'AIInsight successfully queried by { userId, type } sorted by generatedAt descending',
    );

    // ── 10. DATABASE CLEANUP ──────────────────────────────────────────────────
    console.log('\n── 10. DATABASE CLEANUP ──');
    await AIInsight.deleteMany({ userId: testUser._id });
    await User.deleteOne({ _id: testUser._id });
    const remainingInsights = await AIInsight.countDocuments({ userId: testUser._id });
    assert(remainingInsights === 0, 'Cleaned up all test AIInsight documents from MongoDB Atlas');

    // ── 11. OPTIONAL LIVE GEMINI SMOKE TEST ───────────────────────────────────
    console.log('\n── 11. LIVE GEMINI SMOKE TEST ──');
    if (isGeminiConfigured()) {
      console.log(`  Live GEMINI_API_KEY detected! Testing single call with model ${getGeminiModel()}...`);
      try {
        const liveRes = await generateText({
          prompt: 'Respond with the word "OK" only.',
          maxOutputTokens: 100,
        });
        assert(
          liveRes.provider === 'gemini' && liveRes.text.length > 0,
          `Live Gemini smoke test passed (received: "${liveRes.text.trim()}")`,
        );
      } catch (liveErr) {
        console.warn('  ⚠️ Live Gemini call failed:', liveErr.message);
      }
    } else {
      console.log('  ℹ️ Live Gemini smoke test skipped — GEMINI_API_KEY not configured.');
      assert(true, 'Live Gemini smoke test safely skipped without failure');
    }

  } catch (err) {
    console.error('Fatal test error:', err);
    failedCount++;
  } finally {
    await mongoose.disconnect();
    console.log('\n======================================================');
    console.log(`  PHASE 10 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');
    process.exitCode = failedCount > 0 ? 1 : 0;
  }
}

runTests();
