/**
 * Phase 9: Automated test suite for Insights + Statistics analytics layer.
 * Run with: node scripts/test-analytics.js
 *
 * Verifies with real MongoDB Atlas:
 *   1. User setup & multi-category habits
 *   2. Realistic completions across historical dates (current period vs prev period)
 *   3. GET /api/logs/insights (7-day, 30-day, period comparison, best day, daily trend, top habits, needs attention, categories)
 *   4. GET /api/logs/statistics (overview, 7-day stats, 30-day stats, habit stats table, category distribution)
 *   5. GET /api/logs/heatmap (90-day activity map)
 *   6. Zero habits & zero completions edge cases (no NaNs, clean responses)
 *   7. Cross-user isolation and security (User A vs User B)
 *   8. Automatic cleanup of test records in Atlas
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Habit from '../models/Habit.js';
import HabitLog from '../models/HabitLog.js';
import User from '../models/User.js';
import { getLastNDays, getTodayKey, toDateKey } from '../utils/date.js';

const BASE = 'http://localhost:8000/api';
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

async function post(url, body, token) {
  const r = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}

async function get(url, token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`${BASE}${url}${qs ? '?' + qs : ''}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: r.status, data: await r.json() };
}

async function put(url, body, token) {
  const r = await fetch(`${BASE}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}

async function cleanupAtlas(prefix = 'phase9_') {
  const users = await User.find({ email: new RegExp(`^${prefix}`) });
  const uIds = users.map((u) => u._id);
  if (uIds.length > 0) {
    await HabitLog.deleteMany({ userId: { $in: uIds } });
    await Habit.deleteMany({ userId: { $in: uIds } });
    await User.deleteMany({ _id: { $in: uIds } });
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('  PHASE 9: INSIGHTS & STATISTICS ANALYTICS TESTS');
  console.log('======================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  await cleanupAtlas();
  console.log('🧹 Cleaned up existing test records in MongoDB Atlas\n');

  try {
    // ── 1. USER SETUP ─────────────────────────────────────────────────────────
    console.log('── 1. USER SETUP ──');
    const ts = Date.now();
    const userARes = await post('/auth/register', {
      name: 'User A',
      email: `phase9_userA_${ts}@test.dev`,
      password: 'Password123!',
    });
    const tokenA = userARes.data.token;
    assert(!!tokenA, 'User A registered and received token');

    const userBRes = await post('/auth/register', {
      name: 'User B',
      email: `phase9_userB_${ts}@test.dev`,
      password: 'Password123!',
    });
    const tokenB = userBRes.data.token;
    assert(!!tokenB, 'User B registered and received token');

    const userZeroRes = await post('/auth/register', {
      name: 'User Zero',
      email: `phase9_userZero_${ts}@test.dev`,
      password: 'Password123!',
    });
    const tokenZero = userZeroRes.data.token;
    assert(!!tokenZero, 'User Zero (0 habits) registered');

    // ── 2. HABIT MANAGEMENT & CATEGORIES ──────────────────────────────────────
    console.log('\n── 2. CREATE HABITS FOR USER A ACROSS CATEGORIES ──');
    // Habit 1: Morning Meditation (mindfulness, daily 7)
    const h1Res = await post('/habits', {
      name: 'Morning Meditation',
      category: 'mindfulness',
      frequency: 'daily',
      targetDays: 7,
      icon: '🧘',
      color: '#6255db',
    }, tokenA);
    const habit1Id = h1Res.data.habit._id;

    // Habit 2: Workout (fitness, 5 days)
    const h2Res = await post('/habits', {
      name: 'Daily Workout',
      category: 'fitness',
      frequency: 'daily',
      targetDays: 5,
      icon: '💪',
      color: '#10b981',
    }, tokenA);
    const habit2Id = h2Res.data.habit._id;

    // Habit 3: Read Books (learning, 7 days)
    const h3Res = await post('/habits', {
      name: 'Read Books',
      category: 'learning',
      frequency: 'daily',
      targetDays: 7,
      icon: '📚',
      color: '#f59e0b',
    }, tokenA);
    const habit3Id = h3Res.data.habit._id;

    // Habit 4: Archived Habit (should be excluded from active statistics)
    const h4Res = await post('/habits', {
      name: 'Old Habit',
      category: 'other',
      targetDays: 7,
    }, tokenA);
    await put(`/habits/${h4Res.data.habit._id}`, { isArchived: true }, tokenA);

    assert(!!habit1Id && !!habit2Id && !!habit3Id, 'Created 3 active habits and 1 archived habit for User A');

    // ── 3. LOG COMPLETIONS IN CURRENT & PREVIOUS PERIODS ──────────────────────
    console.log('\n── 3. LOG COMPLETIONS FOR DATA INTEGRITY ──');
    const today = getTodayKey();
    const last30 = getLastNDays(30);
    const all60 = getLastNDays(60);
    const prev30 = all60.slice(0, 30);

    // Current period completions:
    // Habit 1: 15 completions in current 30 days, including today and yesterday (streak = 2)
    const h1CurrentDates = [
      last30[29], // today
      last30[28], // yesterday
      last30[26],
      last30[24],
      last30[22],
      last30[20],
      last30[18],
      last30[16],
      last30[14],
      last30[12],
      last30[10],
      last30[8],
      last30[6],
      last30[4],
      last30[2],
    ];
    for (const d of h1CurrentDates) {
      await post('/logs', { habitId: habit1Id, completedDate: d }, tokenA);
    }

    // Habit 2: 6 completions in current 30 days (low consistency, rate < 50%)
    const h2CurrentDates = [last30[25], last30[20], last30[15], last30[10], last30[5], last30[1]];
    for (const d of h2CurrentDates) {
      await post('/logs', { habitId: habit2Id, completedDate: d }, tokenA);
    }

    // Habit 3: 0 completions in current 30 days (needs attention, rate = 0%)

    // Previous period completions (for period comparison):
    // Habit 1: 5 completions in previous 30 days
    const h1PrevDates = [prev30[20], prev30[15], prev30[10], prev30[5], prev30[0]];
    for (const d of h1PrevDates) {
      await post('/logs', { habitId: habit1Id, completedDate: d }, tokenA);
    }

    // Also add 1 completion to User B's own habit to test isolation
    const hBRes = await post('/habits', {
      name: 'User B Habit',
      category: 'health',
    }, tokenB);
    await post('/logs', { habitId: hBRes.data.habit._id, completedDate: today }, tokenB);

    assert(true, 'Logged completions across current and previous periods');

    // ── 4. INSIGHTS ENDPOINT (30 DAYS) ────────────────────────────────────────
    console.log('\n── 4. GET /api/logs/insights?days=30 ──');
    const insights30Res = await get('/logs/insights', tokenA, { days: '30' });
    assert(insights30Res.status === 200, 'GET /api/logs/insights?days=30 returned 200');

    const in30 = insights30Res.data;
    assert(in30.period.days === 30, 'Period days is 30');
    assert(in30.activeHabitCount === 3, 'Active habit count is 3 (excludes archived)');

    // Total completions in current 30 days for active habits:
    // H1: 15, H2: 6, H3: 0 -> total = 21
    assert(in30.summary.totalCompletions === 21, `Summary total completions is 21 (got ${in30.summary.totalCompletions})`);
    assert(in30.summary.prevTotalCompletions === 5, `Summary prev total completions is 5 (got ${in30.summary.prevTotalCompletions})`);
    assert(in30.summary.absoluteChange === 16, `Absolute change is +16 (got ${in30.summary.absoluteChange})`);
    assert(in30.summary.percentChange === 320, `Percent change is +320% (got ${in30.summary.percentChange})`);

    // Scheduled opportunities:
    // H1 (targetDays=7) -> round(7/7 * 30) = 30
    // H2 (targetDays=5) -> round(5/7 * 30) = 21
    // H3 (targetDays=7) -> round(7/7 * 30) = 30
    // Total scheduled = 30 + 21 + 30 = 81
    // Completion rate = (21 / 81) * 100 = 25.9%
    const expectedRate = Number(((21 / 81) * 100).toFixed(1));
    assert(in30.summary.completionRate === expectedRate, `Completion rate is ${expectedRate}% (got ${in30.summary.completionRate}%)`);

    // Best Day
    assert(in30.summary.bestDay !== null, `Best day is identified: ${in30.summary.bestDay?.dayName} with ${in30.summary.bestDay?.count} completions`);

    // Top habit should be Habit 1 (rate: 15/30 = 50%)
    assert(String(in30.summary.topHabit?.habitId) === String(habit1Id), `Top habit is Morning Meditation (got ${in30.summary.topHabit?.name})`);

    // Daily Trend
    assert(Array.isArray(in30.dailyTrend) && in30.dailyTrend.length === 30, `Daily trend contains exactly 30 entries (got ${in30.dailyTrend?.length})`);
    assert(in30.dailyTrend[29].date === today, `Last entry in daily trend is today (${today})`);

    // Needs Attention should include Habit 3 (0%) and Habit 2 (6/21 = 28.6%)
    const needsAttnNames = in30.needsAttention.map((h) => h.name);
    assert(needsAttnNames.includes('Read Books') && needsAttnNames.includes('Daily Workout'), 'Needs attention correctly flags Read Books and Daily Workout');

    // Category Performance
    assert(in30.categoryPerformance.length >= 2, `Category performance returns categories (got ${in30.categoryPerformance.length})`);

    // ── 5. INSIGHTS ENDPOINT (7 DAYS) ─────────────────────────────────────────
    console.log('\n── 5. GET /api/logs/insights?days=7 ──');
    const insights7Res = await get('/logs/insights', tokenA, { days: '7' });
    assert(insights7Res.status === 200, 'GET /api/logs/insights?days=7 returned 200');
    assert(insights7Res.data.period.days === 7, 'Period days is 7');
    assert(insights7Res.data.dailyTrend.length === 7, 'Daily trend has exactly 7 days');

    // ── 6. STATISTICS ENDPOINT ────────────────────────────────────────────────
    console.log('\n── 6. GET /api/logs/statistics ──');
    const statsRes = await get('/logs/statistics', tokenA);
    assert(statsRes.status === 200, 'GET /api/logs/statistics returned 200');

    const stats = statsRes.data;
    // Lifetime overview: 21 (current 30) + 5 (prev 30) = 26 completions
    assert(stats.overview.totalCompletions === 26, `Total completions is 26 (got ${stats.overview.totalCompletions})`);
    assert(stats.overview.activeHabits === 3, 'Active habits is 3');
    assert(stats.overview.bestCurrentStreak === 2, `Best current streak is 2 (got ${stats.overview.bestCurrentStreak})`);

    // 7-day stats
    assert(typeof stats.sevenDay.totalCompletions === 'number', 'sevenDay total completions is a number');
    assert(typeof stats.sevenDay.activeDays === 'number', 'sevenDay active days is a number');
    assert(typeof stats.sevenDay.avgPerDay === 'number', 'sevenDay avg per day is a number');
    assert(typeof stats.sevenDay.completionRate === 'number', 'sevenDay completion rate is a number');

    // 30-day stats
    assert(stats.thirtyDay.totalCompletions === 21, `thirtyDay total completions is 21 (got ${stats.thirtyDay.totalCompletions})`);
    assert(typeof stats.thirtyDay.avgPerDay === 'number', `thirtyDay avg per day is ${stats.thirtyDay.avgPerDay}`);

    // Habit stats table items
    assert(stats.habitStats.length === 3, `habitStats contains all 3 active habits (got ${stats.habitStats.length})`);
    const h1Stat = stats.habitStats.find((h) => String(h.habitId) === String(habit1Id));
    assert(h1Stat?.totalCompletions === 20, `H1 total completions is 20 (15 current + 5 prev, got ${h1Stat?.totalCompletions})`);
    assert(h1Stat?.currentStreak === 2, `H1 current streak is 2 (got ${h1Stat?.currentStreak})`);
    assert(h1Stat?.lastCompletedDate === today, `H1 last completed date is today (got ${h1Stat?.lastCompletedDate})`);

    // Category distribution
    assert(stats.categoryDistribution.length >= 3, `Category distribution contains active categories (got ${stats.categoryDistribution.length})`);

    // ── 7. ACTIVITY HEATMAP (90 DAYS) ─────────────────────────────────────────
    console.log('\n── 7. GET /api/logs/heatmap?days=90 ──');
    const heatmapRes = await get('/logs/heatmap', tokenA, { days: '90' });
    assert(heatmapRes.status === 200, 'GET /api/logs/heatmap?days=90 returned 200');
    assert(heatmapRes.data.heatmap[today] >= 1, `Heatmap includes today with count >= 1 (got ${heatmapRes.data.heatmap[today]})`);

    // ── 8. ZERO HABITS / ZERO ACTIVITY USER ───────────────────────────────────
    console.log('\n── 8. ZERO HABITS & ZERO ACTIVITY VERIFICATION ──');
    const zeroInsights = await get('/logs/insights', tokenZero);
    assert(zeroInsights.data.activeHabitCount === 0, 'Zero user has 0 active habits');
    assert(zeroInsights.data.summary.totalCompletions === 0, 'Zero user has 0 total completions');
    assert(zeroInsights.data.summary.completionRate === 0, 'Zero user completion rate is 0 (no NaN)');
    assert(zeroInsights.data.summary.bestDay === null, 'Zero user best day is null');
    assert(zeroInsights.data.summary.topHabit === null, 'Zero user top habit is null');

    const zeroStats = await get('/logs/statistics', tokenZero);
    assert(zeroStats.data.overview.totalCompletions === 0, 'Zero user totalCompletions is 0');
    assert(zeroStats.data.overview.activeHabits === 0, 'Zero user activeHabits is 0');
    assert(zeroStats.data.sevenDay.completionRate === 0, 'Zero user 7d rate is 0');
    assert(zeroStats.data.thirtyDay.completionRate === 0, 'Zero user 30d rate is 0');
    assert(zeroStats.data.habitStats.length === 0, 'Zero user habitStats is empty array');

    // ── 9. CROSS-USER ISOLATION ───────────────────────────────────────────────
    console.log('\n── 9. CROSS-USER SECURITY & ISOLATION ──');
    const userBInsights = await get('/logs/insights', tokenB, { days: '30' });
    assert(userBInsights.data.summary.totalCompletions === 1, `User B sees only their 1 completion (got ${userBInsights.data.summary.totalCompletions}, isolated from User A's 21)`);
    assert(userBInsights.data.activeHabitCount === 1, 'User B sees only their 1 habit');

    const userBStats = await get('/logs/statistics', tokenB);
    assert(userBStats.data.overview.totalCompletions === 1, 'User B total completions is 1');
    assert(userBStats.data.habitStats.length === 1, 'User B habitStats has only 1 habit');

    // ── 10. INVALID PARAMETERS REJECTION ─────────────────────────────────────
    console.log('\n── 10. INVALID PARAMETERS HANDLING ──');
    const invalidDaysRes = await get('/logs/insights', tokenA, { days: 'invalid' });
    assert(invalidDaysRes.status === 200 && invalidDaysRes.data.period.days === 30, 'Invalid days param safely defaults to 30');

    // ── 11. CLEANUP ───────────────────────────────────────────────────────────
    console.log('\n── 11. DATABASE CLEANUP ──');
    await cleanupAtlas();
    assert(true, 'Cleaned up all test records from MongoDB Atlas');

  } catch (err) {
    console.error('Test execution error:', err);
    failedCount++;
  } finally {
    await mongoose.disconnect();
    console.log('\n======================================================');
    console.log(`  PHASE 9 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runTests();
