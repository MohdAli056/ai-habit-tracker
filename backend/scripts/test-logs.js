/**
 * Phase 6 Verification Script: Habit Completion + Streak Engine
 * Tests live endpoints against MongoDB Atlas.
 * Run from backend/ dir: node scripts/test-logs.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import Habit from '../models/Habit.js';
import HabitLog from '../models/HabitLog.js';
import User from '../models/User.js';
import { getLastNDays, getTodayKey, getYesterdayKey } from '../utils/date.js';

const BASE = `http://localhost:${env.PORT}/api`;

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

async function del(url, token) {
  const r = await fetch(`${BASE}${url}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: r.status, data: await r.json() };
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
  console.log('  PHASE 6: HABIT COMPLETION & STREAK ENGINE TESTS');
  console.log('======================================================\n');

  await mongoose.connect(env.MONGODB_URI);

  // Initial cleanup of test emails
  const testEmails = ['phase6_a@test.dev', 'phase6_b@test.dev'];
  const existingUsers = await User.find({ email: { $in: testEmails } });
  const existingIds = existingUsers.map((u) => u._id);

  if (existingIds.length > 0) {
    await HabitLog.deleteMany({ userId: { $in: existingIds } });
    await Habit.deleteMany({ userId: { $in: existingIds } });
    await User.deleteMany({ _id: { $in: existingIds } });
  }
  console.log('🧹 Cleaned up existing test records in MongoDB Atlas\n');

  // ── 1. Register User A and User B ──────────────────────────────────
  console.log('── 1. AUTHENTICATION & SETUP ──');
  const regA = await post('/auth/register', { name: 'User 6A', email: 'phase6_a@test.dev', password: 'Password123' });
  const regB = await post('/auth/register', { name: 'User 6B', email: 'phase6_b@test.dev', password: 'Password123' });
  const tokenA = regA.data.token;
  const tokenB = regB.data.token;
  const userAId = regA.data.user?._id;
  const userBId = regB.data.user?._id;

  assert(tokenA && userAId, 'User A registered and received token');
  assert(tokenB && userBId, 'User B registered and received token');

  // Create habits for User A and User B
  const hA1Res = await post('/habits', { name: 'TEST_Habit_1', category: 'health', frequency: 'daily', targetDays: 7, icon: '💧', color: '#22c55e' }, tokenA);
  const hA2Res = await post('/habits', { name: 'TEST_Habit_2', category: 'productivity', frequency: 'daily', targetDays: 5, icon: '📚', color: '#6255db' }, tokenA);
  const hB1Res = await post('/habits', { name: 'TEST_Habit_B', category: 'fitness', frequency: 'daily', targetDays: 3, icon: '🏃', color: '#f59e0b' }, tokenB);

  const habitA1 = hA1Res.data.habit;
  const habitA2 = hA2Res.data.habit;
  const habitB1 = hB1Res.data.habit;

  assert(habitA1 && habitA2, 'Created test habits for User A');
  assert(habitB1, 'Created test habit for User B');

  const today = getTodayKey();
  const yesterday = getYesterdayKey();
  const last3 = getLastNDays(3);
  const dayBeforeYesterday = last3[0]; // 2 days ago

  // ── 2. MARK COMPLETE & IDEMPOTENCY ─────────────────────────────────
  console.log('\n── 2. MARK COMPLETE & IDEMPOTENCY ──');
  // Mark today complete
  const mark1 = await post('/logs', { habitId: habitA1._id }, tokenA);
  assert(mark1.status === 201 && mark1.data.log?.completedDate === today, 'Mark complete (defaults to today)', JSON.stringify(mark1.data));

  // MANDATORY IDEMPOTENCY TEST: Call POST /logs again with exact same habitId and completedDate
  const mark2 = await post('/logs', { habitId: habitA1._id, completedDate: today }, tokenA);
  assert(mark2.status === 201, 'Second mark complete call succeeded');

  // Check MongoDB directly to ensure EXACTLY ONE document exists in Atlas
  const countInDb = await HabitLog.countDocuments({
    userId: userAId,
    habitId: habitA1._id,
    completedDate: today,
  });
  assert(countInDb === 1, `Idempotency verified in Atlas: exactly 1 log document found (count=${countInDb})`);

  // Complete yesterday and 2 days ago for habitA1 to create a 3-day streak
  const markYday = await post('/logs', { habitId: habitA1._id, completedDate: yesterday }, tokenA);
  const markD2 = await post('/logs', { habitId: habitA1._id, completedDate: dayBeforeYesterday }, tokenA);
  assert(markYday.status === 201 && markD2.status === 201, 'Created historical completions for streak calculation (yesterday & 2 days ago)');

  // Complete today for habitA2 as well
  await post('/logs', { habitId: habitA2._id, completedDate: today }, tokenA);

  // ── 3. TODAY LOGS ──────────────────────────────────────────────────
  console.log('\n── 3. TODAY LOGS (GET /api/logs/today) ──');
  const todayRes = await get('/logs/today', tokenA);
  assert(todayRes.status === 200, 'GET /api/logs/today returned 200');
  const todayLogs = todayRes.data.logs || [];
  assert(todayLogs.length === 2, `User A has 2 completions today (found ${todayLogs.length})`);
  const todayHabitIds = todayLogs.map((l) => String(l.habitId));
  assert(todayHabitIds.includes(String(habitA1._id)) && todayHabitIds.includes(String(habitA2._id)), 'Today logs contain habitA1 and habitA2');

  // ── 4. RANGE QUERY ─────────────────────────────────────────────────
  console.log('\n── 4. RANGE QUERY (GET /api/logs/range) ──');
  const rangeRes = await get('/logs/range', tokenA, { start: dayBeforeYesterday, end: today });
  assert(rangeRes.status === 200, 'GET /api/logs/range valid dates returned 200');
  assert(rangeRes.data.logs?.length === 4, `Found 4 logs in range [${dayBeforeYesterday} .. ${today}] (got ${rangeRes.data.logs?.length})`);

  // Invalid range: start > end
  const badRange = await get('/logs/range', tokenA, { start: today, end: dayBeforeYesterday });
  assert(badRange.status === 400, 'GET /api/logs/range rejected start > end with 400');

  // Malformed dates
  const malformedRange = await get('/logs/range', tokenA, { start: '21-09-2026', end: today });
  assert(malformedRange.status === 400, 'GET /api/logs/range rejected DD-MM-YYYY format with 400');

  // Impossible date
  const impossibleRange = await get('/logs/range', tokenA, { start: '2026-02-31', end: today });
  assert(impossibleRange.status === 400, 'GET /api/logs/range rejected impossible date 2026-02-31 with 400');

  // ── 5. HEATMAP DATA ────────────────────────────────────────────────
  console.log('\n── 5. HEATMAP DATA (GET /api/logs/heatmap) ──');
  const heatmapRes = await get('/logs/heatmap', tokenA, { days: 30 });
  assert(heatmapRes.status === 200, 'GET /api/logs/heatmap returned 200');
  const hm = heatmapRes.data.heatmap || {};
  assert(hm[today] === 2, `Heatmap today count is 2 (got ${hm[today]})`);
  assert(hm[yesterday] === 1, `Heatmap yesterday count is 1 (got ${hm[yesterday]})`);

  // ── 6. SINGLE HABIT STATS ──────────────────────────────────────────
  console.log('\n── 6. SINGLE HABIT STATS (GET /api/logs/stats/habit/:id) ──');
  const habitStatsRes = await get(`/logs/stats/habit/${habitA1._id}`, tokenA);
  assert(habitStatsRes.status === 200, 'GET /api/logs/stats/habit/:id returned 200');
  const stats = habitStatsRes.data;
  assert(stats.totalCompletions === 3, `Total completions = 3 (got ${stats.totalCompletions})`);
  assert(stats.currentStreak === 3, `Current streak = 3 (got ${stats.currentStreak})`);
  assert(stats.longestStreak === 3, `Longest streak = 3 (got ${stats.longestStreak})`);
  assert(typeof stats.completionRateLast30Days === 'number', `30-day rate is a number (${stats.completionRateLast30Days}%)`);
  assert(Array.isArray(stats.recentDates) && stats.recentDates.length === 3, `Recent dates has 3 entries`);

  // ── 7. ALL HABIT STATS ─────────────────────────────────────────────
  console.log('\n── 7. ALL HABIT STATS (GET /api/logs/stats) ──');
  const allStatsRes = await get('/logs/stats', tokenA);
  assert(allStatsRes.status === 200, 'GET /api/logs/stats returned 200');
  const allStats = allStatsRes.data;
  assert(allStats.totalCompletions === 4, `Total user completions = 4 (got ${allStats.totalCompletions})`);
  assert(allStats.activeHabits === 2, `Active habits = 2 (got ${allStats.activeHabits})`);
  assert(allStats.completedToday === 2, `Completed today = 2 (got ${allStats.completedToday})`);
  assert(Array.isArray(allStats.habits) && allStats.habits.length === 2, `Habit breakdown array length = 2`);

  // ── 8. UNMARK COMPLETE ─────────────────────────────────────────────
  console.log('\n── 8. UNMARK COMPLETE (DELETE /api/logs/:habitId) ──');
  const unmarkRes = await del(`/logs/${habitA2._id}`, tokenA);
  assert(unmarkRes.status === 200, 'DELETE /api/logs/:habitId returned 200');

  const afterToday = await get('/logs/today', tokenA);
  assert(afterToday.data.logs?.length === 1, `After unmarking, today logs count is 1 (got ${afterToday.data.logs?.length})`);

  // Unmark past date
  const unmarkPast = await del(`/logs/${habitA1._id}?date=${dayBeforeYesterday}`, tokenA);
  assert(unmarkPast.status === 200, 'DELETE /api/logs/:habitId?date=... past date returned 200');

  // Check stats streak updated (broken streak: today + yesterday = 2)
  const afterUnmarkStats = await get(`/logs/stats/habit/${habitA1._id}`, tokenA);
  assert(afterUnmarkStats.data.currentStreak === 2, `After removing 2-days-ago, streak is 2 (got ${afterUnmarkStats.data.currentStreak})`);

  // ── 9. CROSS-USER SECURITY ─────────────────────────────────────────
  console.log('\n── 9. CROSS-USER SECURITY ──');
  // User B tries to complete User A's habit
  const xComplete = await post('/logs', { habitId: habitA1._id }, tokenB);
  assert(xComplete.status === 404, 'User B cannot mark complete on User A habit (404)');

  // User B tries to unmark User A's habit
  const xUnmark = await del(`/logs/${habitA1._id}`, tokenB);
  assert(xUnmark.status === 404, 'User B cannot unmark User A habit (404)');

  // User B tries to get stats for User A's habit
  const xStats = await get(`/logs/stats/habit/${habitA1._id}`, tokenB);
  assert(xStats.status === 404, 'User B cannot view stats for User A habit (404)');

  // User B GET /today only sees User B logs (should be 0)
  const xToday = await get('/logs/today', tokenB);
  assert(xToday.data.logs?.length === 0, 'User B sees 0 today logs (isolated from User A)');

  // User B GET /stats only sees User B stats
  const xAllStats = await get('/logs/stats', tokenB);
  assert(xAllStats.data.totalCompletions === 0, 'User B aggregate stats totalCompletions is 0');

  // ── 10. AUTHENTICATION REQUIREMENT ─────────────────────────────────
  console.log('\n── 10. AUTHENTICATION PROTECTION ──');
  const unauthPost = await post('/logs', { habitId: habitA1._id }, null);
  assert(unauthPost.status === 401, 'Unauthenticated POST /api/logs rejected with 401');

  const unauthToday = await get('/logs/today', null);
  assert(unauthToday.status === 401, 'Unauthenticated GET /api/logs/today rejected with 401');

  const unauthStats = await get('/logs/stats', null);
  assert(unauthStats.status === 401, 'Unauthenticated GET /api/logs/stats rejected with 401');

  // ── 11. CLEANUP ────────────────────────────────────────────────────
  console.log('\n── 11. DATABASE CLEANUP ──');
  await HabitLog.deleteMany({ userId: { $in: [userAId, userBId] } });
  await Habit.deleteMany({ userId: { $in: [userAId, userBId] } });
  await User.deleteMany({ _id: { $in: [userAId, userBId] } });

  const leftoverLogs = await HabitLog.countDocuments({ userId: { $in: [userAId, userBId] } });
  const leftoverHabits = await Habit.countDocuments({ userId: { $in: [userAId, userBId] } });
  const leftoverUsers = await User.countDocuments({ _id: { $in: [userAId, userBId] } });

  assert(leftoverLogs === 0 && leftoverHabits === 0 && leftoverUsers === 0, 'All test users, habits, and logs completely removed from Atlas');

  await mongoose.disconnect();

  console.log('\n======================================================');
  console.log(`  PHASE 6 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error('Test script crashed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
