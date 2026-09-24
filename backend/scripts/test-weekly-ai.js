/**
 * Phase 11 Automated Verification: AI Weekly Report
 * Tests live endpoints, caching, deterministic context, isolation, and error handling.
 *
 * Run from backend/ dir: node scripts/test-weekly-ai.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import AIInsight from '../models/AIInsight.js';
import Habit from '../models/Habit.js';
import HabitLog from '../models/HabitLog.js';
import User from '../models/User.js';
import { aiService } from '../services/ai/aiService.js';
import { AIErrorCodes } from '../services/ai/errors.js';
import { MockProvider } from '../services/ai/mockProvider.js';
import { buildWeeklyContext } from '../services/ai/weeklyContext.js';
import { validateWeeklyReport } from '../services/ai/weeklyReportValidator.js';
import { getWeekEnd, getWeekStart } from '../utils/date.js';

const BASE = `http://localhost:${env.PORT}/api`;

async function post(url, body, token) {
  const r = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  let data;
  try {
    data = await r.json();
  } catch {
    data = null;
  }
  return { status: r.status, data };
}

async function get(url, token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`${BASE}${url}${qs ? '?' + qs : ''}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  let data;
  try {
    data = await r.json();
  } catch {
    data = null;
  }
  return { status: r.status, data };
}

let passed = 0;
let failed = 0;

function assert(condition, label, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('  PHASE 11: AI WEEKLY REPORT VERIFICATION TESTS');
  console.log('======================================================\n');

  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas\n');

  const testEmails = ['ai_user_a@test.dev', 'ai_user_b@test.dev'];

  // Clean up any stale records from prior test runs
  const existingUsers = await User.find({ email: { $in: testEmails } });
  const existingIds = existingUsers.map((u) => u._id);
  if (existingIds.length > 0) {
    await AIInsight.deleteMany({ userId: { $in: existingIds } });
    await HabitLog.deleteMany({ userId: { $in: existingIds } });
    await Habit.deleteMany({ userId: { $in: existingIds } });
    await User.deleteMany({ _id: { $in: existingIds } });
    console.log('🧹 Cleaned up stale test records in MongoDB Atlas\n');
  }

  try {
    // ── 1. AUTHENTICATED USER SETUP ──────────────────────────────────────────
    console.log('── 1. USER REGISTRATION & AUTH ──');
    const regA = await post('/auth/register', {
      name: 'User AI Alpha',
      email: 'ai_user_a@test.dev',
      password: 'Password123!',
    });
    assert(regA.status === 201 && !!regA.data.token, 'User A registered with token');
    const tokenA = regA.data.token;
    const userA = regA.data.user;

    const regB = await post('/auth/register', {
      name: 'User AI Beta',
      email: 'ai_user_b@test.dev',
      password: 'Password123!',
    });
    assert(regB.status === 201 && !!regB.data.token, 'User B registered with token');
    const tokenB = regB.data.token;
    const userB = regB.data.user;

    // ── 2. UNAUTHENTICATED REQUEST REJECTION ──────────────────────────────────
    console.log('\n── 2. AUTHENTICATION PROTECTION ──');
    const unauthPost = await post('/ai/weekly-report', { weekStart: '2026-09-21' });
    assert(unauthPost.status === 401, 'Unauthenticated POST /api/ai/weekly-report returns 401');

    const unauthGet = await get('/ai/weekly-report', null, { weekStart: '2026-09-21' });
    assert(unauthGet.status === 401, 'Unauthenticated GET /api/ai/weekly-report returns 401');

    // ── 3. DATE VALIDATION & REJECTION ───────────────────────────────────────
    console.log('\n── 3. STRICT DATE VALIDATION ──');
    const badDates = [
      '2026-02-31', // impossible date
      '21-09-2026', // wrong format DD-MM-YYYY
      'garbage', // invalid string
      '2026-13-01', // month out of bounds
      '', // empty string
    ];

    for (const bad of badDates) {
      const res = await post('/ai/weekly-report', { weekStart: bad }, tokenA);
      assert(
        res.status === 400 && res.data.code === 'INVALID_DATE',
        `POST rejected invalid date "${bad}" with HTTP 400 INVALID_DATE`,
      );

      const getRes = await get('/ai/weekly-report', tokenA, { weekStart: bad });
      assert(
        getRes.status === 400 && getRes.data.code === 'INVALID_DATE',
        `GET rejected invalid date "${bad}" with HTTP 400 INVALID_DATE`,
      );
    }

    // ── 4. DATA ACCURACY VERIFICATION (DETERMINISTIC CONTEXT) ─────────────────
    console.log('\n── 4. DETERMINISTIC CONTEXT BUILDER ACCURACY ──');
    // Create known dataset for User A for week 2026-09-21 to 2026-09-27
    // Habit 1: Morning Run (fitness, targetDays: 5)
    // Completions: Mon (2026-09-21), Tue (2026-09-22), Wed (2026-09-23), Fri (2026-09-25) -> 4 completions
    // Habit 2: Deep Reading (learning, targetDays: 7)
    // Completions: Tue (2026-09-22), Thu (2026-09-24) -> 2 completions
    //
    // Total completions = 6
    // Tuesday has 2 completions (both habits completed)
    // Monday has 1, Wed has 1, Thu has 1, Fri has 1, Sat/Sun have 0
    // Deterministic Best Day = Tuesday (2 completions)
    const habit1 = await Habit.create({
      userId: userA._id,
      name: 'Morning Run',
      category: 'fitness',
      targetDays: 5,
      frequency: 'daily',
    });
    const habit2 = await Habit.create({
      userId: userA._id,
      name: 'Deep Reading',
      category: 'learning',
      targetDays: 7,
      frequency: 'daily',
    });

    const datesH1 = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-25'];
    for (const d of datesH1) {
      await HabitLog.create({ userId: userA._id, habitId: habit1._id, completedDate: d });
    }

    const datesH2 = ['2026-09-22', '2026-09-24'];
    for (const d of datesH2) {
      await HabitLog.create({ userId: userA._id, habitId: habit2._id, completedDate: d });
    }

    const context = await buildWeeklyContext(userA._id, '2026-09-21', '2026-09-27');
    assert(context.summary.activeHabitsCount === 2, 'Context activeHabitsCount is 2');
    assert(context.summary.totalCompletions === 6, 'Context totalCompletions is exactly 6');
    assert(context.summary.bestDay === 'Tuesday (2 completions)', `Context bestDay is "Tuesday (2 completions)" (got: ${context.summary.bestDay})`);
    assert(context.dailyBreakdown.Tue === 2, 'Daily breakdown for Tue is 2');
    assert(context.dailyBreakdown.Mon === 1, 'Daily breakdown for Mon is 1');
    assert(context.dailyBreakdown.Sat === 0, 'Daily breakdown for Sat is 0');
    assert(context.habits.length === 2, 'Context habits array contains 2 habits');
    const h1Ctx = context.habits.find((h) => h.name === 'Morning Run');
    assert(h1Ctx && h1Ctx.completedDays === 4, 'Morning Run completedDays is 4');
    assert(h1Ctx && h1Ctx.completionRate === 80.0, 'Morning Run completionRate is 80.0%');

    // ── 5. STRUCTURED RESPONSE VALIDATOR ──────────────────────────────────────
    console.log('\n── 5. STRUCTURED REPORT VALIDATOR ──');
    const validReport = {
      headline: 'Great consistency in fitness routines',
      summary: 'You logged 6 total habit sessions this week with standout performance on Tuesday. Your morning runs formed a strong anchor.',
      wins: ['Completed 4 out of 5 planned morning runs', 'Strong double-completion day on Tuesday'],
      focusAreas: ['Protect weekend routines to prevent drop-off'],
      recommendation: 'Prepare your workout clothes the night before to reduce morning friction.',
    };
    const validated = validateWeeklyReport(validReport);
    assert(validated.headline === validReport.headline, 'Validator accepts valid report');
    assert(validated.wins.length === 2, 'Validator preserves valid wins array');

    // Malformed report rejection tests
    let caughtEmptyHeadline = false;
    try {
      validateWeeklyReport({ ...validReport, headline: 'hi' });
    } catch (e) {
      caughtEmptyHeadline = e.code === AIErrorCodes.AI_INVALID_RESPONSE;
    }
    assert(caughtEmptyHeadline, 'Validator rejects headline under 5 chars with AI_INVALID_RESPONSE');

    let caughtNoWins = false;
    try {
      validateWeeklyReport({ ...validReport, wins: [] });
    } catch (e) {
      caughtNoWins = e.code === AIErrorCodes.AI_INVALID_RESPONSE;
    }
    assert(caughtNoWins, 'Validator rejects empty wins array with AI_INVALID_RESPONSE');

    let caughtTooManyWins = false;
    try {
      validateWeeklyReport({ ...validReport, wins: ['1', '2', '3', '4', '5'] });
    } catch (e) {
      caughtTooManyWins = e.code === AIErrorCodes.AI_INVALID_RESPONSE;
    }
    assert(caughtTooManyWins, 'Validator rejects wins array exceeding 4 items with AI_INVALID_RESPONSE');

    // ── 6. GENERATE WEEKLY REPORT VIA MOCK PROVIDER ───────────────────────────
    console.log('\n── 6. REPORT GENERATION VIA MOCK PROVIDER ──');
    // Initially, cache check should return null
    const initialGet = await get('/ai/weekly-report', tokenA, { weekStart: '2026-09-21' });
    assert(initialGet.status === 200 && initialGet.data.cached === false && initialGet.data.report === null, 'Initial GET before generation returns cached: false, report: null');

    // Generate report
    const genRes = await post('/ai/weekly-report', { weekStart: '2026-09-21', useMock: true }, tokenA);
    assert(genRes.status === 200, `POST /ai/weekly-report returned 200 (got: ${genRes.status})`);
    assert(genRes.data.cached === false, 'Fresh generation returns cached: false');
    assert(typeof genRes.data.report.headline === 'string', 'Generated report contains headline string');
    assert(typeof genRes.data.report.summary === 'string', 'Generated report contains summary string');
    assert(Array.isArray(genRes.data.report.wins) && genRes.data.report.wins.length > 0, 'Generated report contains non-empty wins array');
    assert(Array.isArray(genRes.data.report.focusAreas), 'Generated report contains focusAreas array');
    assert(typeof genRes.data.report.recommendation === 'string', 'Generated report contains recommendation string');

    // ── 7. AIInsight PERSISTENCE IN ATLAS ────────────────────────────────────
    console.log('\n── 7. AIInsight MONGODB ATLAS PERSISTENCE ──');
    const savedDoc = await AIInsight.findOne({
      userId: userA._id,
      type: 'weekly',
      'meta.weekStart': '2026-09-21',
    });
    assert(!!savedDoc, 'AIInsight document exists in MongoDB Atlas');
    assert(savedDoc.meta.weekStart === '2026-09-21', 'Saved meta.weekStart matches 2026-09-21');
    assert(savedDoc.meta.weekEnd === '2026-09-27', 'Saved meta.weekEnd matches 2026-09-27');
    assert(savedDoc.meta.provider === 'mock', 'Saved meta.provider is "mock"');
    assert(savedDoc.meta.totalCompletions === 6, `Saved meta.totalCompletions is 6 (got: ${savedDoc.meta.totalCompletions})`);
    assert(savedDoc.meta.contextVersion === 1, 'Saved meta.contextVersion is 1');

    // ── 8. CACHED REPORT RETRIEVAL (ZERO QUOTA CONSUMPTION) ───────────────────
    console.log('\n── 8. CACHE HIT VERIFICATION ──');
    // Second POST request must return cached: true without regenerating
    const secondPost = await post('/ai/weekly-report', { weekStart: '2026-09-21', useMock: true }, tokenA);
    assert(secondPost.status === 200, 'Second POST returns 200');
    assert(secondPost.data.cached === true, 'Second POST returns cached: true');
    assert(secondPost.data.report.headline === genRes.data.report.headline, 'Second POST returns identical cached report headline');

    // GET endpoint also returns cached: true
    const cachedGet = await get('/ai/weekly-report', tokenA, { weekStart: '2026-09-21' });
    assert(cachedGet.status === 200, 'GET /ai/weekly-report returns 200');
    assert(cachedGet.data.cached === true, 'GET returns cached: true');
    assert(cachedGet.data.report.headline === genRes.data.report.headline, 'GET returns identical cached report headline');

    // Total AIInsight docs for userA and weekStart should be exactly 1 (no duplicates)
    const countDocs = await AIInsight.countDocuments({
      userId: userA._id,
      type: 'weekly',
      'meta.weekStart': '2026-09-21',
    });
    assert(countDocs === 1, `Exactly 1 cached document exists in Atlas (got: ${countDocs})`);

    // ── 9. WEEK-SPECIFIC CACHE IDENTITY ──────────────────────────────────────
    console.log('\n── 9. WEEK-SPECIFIC CACHE ISOLATION ──');
    // Previous week 2026-09-14 should NOT hit the 2026-09-21 cache
    const prevWeekGet = await get('/ai/weekly-report', tokenA, { weekStart: '2026-09-14' });
    assert(prevWeekGet.status === 200 && prevWeekGet.data.cached === false && prevWeekGet.data.report === null, 'Different week (2026-09-14) is not cached');

    const prevWeekGen = await post('/ai/weekly-report', { weekStart: '2026-09-14', useMock: true }, tokenA);
    assert(prevWeekGen.status === 200 && prevWeekGen.data.cached === false, 'Generated separate report for previous week');
    assert(prevWeekGen.data.meta.weekStart === '2026-09-14', 'Previous week meta.weekStart is 2026-09-14');

    // ── 10. CROSS-USER ISOLATION ─────────────────────────────────────────────
    console.log('\n── 10. CROSS-USER PRIVACY & CACHE ISOLATION ──');
    // User B checking 2026-09-21 must NOT receive User A's report
    const userBGet = await get('/ai/weekly-report', tokenB, { weekStart: '2026-09-21' });
    assert(userBGet.status === 200 && userBGet.data.cached === false && userBGet.data.report === null, "User B receives report: null for User A's generated week");

    // ── 11. AI_NOT_CONFIGURED WHEN GEMINI UNCONFIGURED ────────────────────────
    console.log('\n── 11. AI_NOT_CONFIGURED GRACEFUL ERROR HANDLING ──');
    // When useMock is false and GEMINI_API_KEY is not configured
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    // Week 2026-09-07 is not cached
    const unconfRes = await post('/ai/weekly-report', { weekStart: '2026-09-07', useMock: false }, tokenA);
    assert(unconfRes.status === 503, `Unconfigured Gemini returns HTTP 503 (got: ${unconfRes.status})`);
    assert(unconfRes.data.code === 'AI_NOT_CONFIGURED', `Returns code AI_NOT_CONFIGURED (got: ${unconfRes.data.code})`);
    assert(unconfRes.data.message.includes('AI weekly report is unavailable'), 'Returns clean user-facing message');

    // Restore key if it was present
    if (origKey) process.env.GEMINI_API_KEY = origKey;

    // ── 12. FAILED AI RESPONSES ARE NOT CACHED ────────────────────────────────
    console.log('\n── 12. NO CACHING OF FAILED RESPONSES ──');
    const failedWeekDoc = await AIInsight.findOne({
      userId: userA._id,
      type: 'weekly',
      'meta.weekStart': '2026-09-07',
    });
    assert(!failedWeekDoc, 'No AIInsight document created for 503 failed generation attempt');

    // ── 13. REAL GEMINI SMOKE TEST (IF KEY AVAILABLE) ─────────────────────────
    console.log('\n── 13. REAL GEMINI SMOKE TEST ──');
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0) {
      console.log('  Testing live Gemini 2.5 Flash API with non-sensitive habit data...');
      try {
        const liveRes = await post('/ai/weekly-report', { weekStart: '2026-09-28', useMock: false }, tokenA);
        assert(liveRes.status === 200, `Live Gemini returned HTTP 200 (got: ${liveRes.status})`);
        assert(liveRes.data.meta.provider === 'gemini', 'Live report provider is "gemini"');
        assert(typeof liveRes.data.report.headline === 'string', 'Live report headline is valid string');
      } catch (err) {
        console.error('  Live Gemini test error:', err.message);
      }
    } else {
      console.log('  ℹ️  Live Gemini call skipped (GEMINI_API_KEY not configured in .env). MockProvider verified.');
    }

    // ── 14. DATABASE CLEANUP ──────────────────────────────────────────────────
    console.log('\n── 14. CLEANUP OF TEST DATA ──');
    await AIInsight.deleteMany({ userId: { $in: [userA._id, userB._id] } });
    await HabitLog.deleteMany({ userId: { $in: [userA._id, userB._id] } });
    await Habit.deleteMany({ userId: { $in: [userA._id, userB._id] } });
    await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });
    console.log('🧹 Cleaned up all Phase 11 test records in MongoDB Atlas\n');

  } catch (err) {
    console.error('Unhandled test failure:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
  }

  console.log('======================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main();
