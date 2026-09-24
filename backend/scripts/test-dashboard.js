/**
 * Phase 7 Verification Script: Dashboard Endpoints & Stats
 * Tests live dashboard data endpoints against MongoDB Atlas.
 * Run from backend/ dir: node scripts/test-dashboard.js
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
  console.log('  PHASE 7: DASHBOARD BACKEND DATA VERIFICATION');
  console.log('======================================================\n');

  await mongoose.connect(env.MONGODB_URI);

  const testEmails = ['phase7_a@test.dev', 'phase7_zero@test.dev'];
  const existingUsers = await User.find({ email: { $in: testEmails } });
  const existingIds = existingUsers.map((u) => u._id);

  if (existingIds.length > 0) {
    await HabitLog.deleteMany({ userId: { $in: existingIds } });
    await Habit.deleteMany({ userId: { $in: existingIds } });
    await User.deleteMany({ _id: { $in: existingIds } });
  }
  console.log('🧹 Cleaned up existing test records in MongoDB Atlas\n');

  // ── 1. Register Users ──────────────────────────────────────────────
  console.log('── 1. USER SETUP ──');
  const regA = await post('/auth/register', { name: 'Dash User A', email: 'phase7_a@test.dev', password: 'Password123' });
  const regZero = await post('/auth/register', { name: 'Dash Zero User', email: 'phase7_zero@test.dev', password: 'Password123' });

  const tokenA = regA.data.token;
  const tokenZero = regZero.data.token;
  const userAId = regA.data.user?._id;
  const userZeroId = regZero.data.user?._id;

  assert(tokenA && userAId, 'User A registered (with habits)');
  assert(tokenZero && userZeroId, 'User Zero registered (zero habits)');

  // ── 2. Create Habits & History for User A ──────────────────────────
  console.log('\n── 2. CREATE HABITS & COMPLETIONS FOR USER A ──');
  const h1Res = await post('/habits', { name: 'Morning Meditation', category: 'mindfulness', frequency: 'daily', targetDays: 7, icon: '🧘', color: '#9d44f5' }, tokenA);
  const h2Res = await post('/habits', { name: 'Read 30 mins', category: 'learning', frequency: 'daily', targetDays: 7, icon: '📚', color: '#6255db' }, tokenA);
  const h3Res = await post('/habits', { name: 'Daily Run', category: 'fitness', frequency: 'daily', targetDays: 5, icon: '🏃', color: '#22c55e' }, tokenA);

  const h1 = h1Res.data.habit;
  const h2 = h2Res.data.habit;
  const h3 = h3Res.data.habit;
  assert(h1 && h2 && h3, 'Created 3 active habits for User A');

  const today = getTodayKey();
  const yesterday = getYesterdayKey();
  const d2 = getLastNDays(3)[0]; // 2 days ago

  // Habit 1: 3-day streak (today, yesterday, 2 days ago)
  await post('/logs', { habitId: h1._id, completedDate: d2 }, tokenA);
  await post('/logs', { habitId: h1._id, completedDate: yesterday }, tokenA);
  await post('/logs', { habitId: h1._id, completedDate: today }, tokenA);

  // Habit 2: completed today
  await post('/logs', { habitId: h2._id, completedDate: today }, tokenA);

  // Habit 3: completed yesterday only (streak = 1, but not completed today)
  await post('/logs', { habitId: h3._id, completedDate: yesterday }, tokenA);

  // ── 3. Test Dashboard Data API for User A ──────────────────────────
  console.log('\n── 3. DASHBOARD METRICS FOR USER A ──');
  const habitsRes = await get('/habits', tokenA, { archived: 'false' });
  assert(habitsRes.status === 200 && habitsRes.data.habits?.length === 3, 'GET /api/habits returned 3 active habits');

  const todayRes = await get('/logs/today', tokenA);
  assert(todayRes.status === 200, 'GET /api/logs/today returned 200');
  const todayLogs = todayRes.data.logs || [];
  assert(todayLogs.length === 2, `User A has 2 completed habits today (found ${todayLogs.length})`);

  const statsRes = await get('/logs/stats', tokenA);
  assert(statsRes.status === 200, 'GET /api/logs/stats returned 200');
  const stats = statsRes.data;

  assert(stats.activeHabits === 3, `activeHabits === 3 (got ${stats.activeHabits})`);
  assert(stats.completedToday === 2, `completedToday === 2 (got ${stats.completedToday})`);
  assert(stats.totalCompletions === 5, `totalCompletions === 5 (got ${stats.totalCompletions})`);
  assert(stats.bestCurrentStreak === 3, `bestCurrentStreak === 3 (got ${stats.bestCurrentStreak})`);
  assert(stats.bestLongestStreak === 3, `bestLongestStreak === 3 (got ${stats.bestLongestStreak})`);

  // Verify habit breakdown in stats
  const h1Stats = stats.habits.find((h) => String(h.habitId) === String(h1._id));
  assert(h1Stats && h1Stats.currentStreak === 3 && h1Stats.completedToday === true, 'Habit 1 has streak=3 and completedToday=true');

  const h3Stats = stats.habits.find((h) => String(h.habitId) === String(h3._id));
  assert(h3Stats && h3Stats.currentStreak === 1 && h3Stats.completedToday === false, 'Habit 3 has streak=1 and completedToday=false');

  // Range query for recent activity stream
  const rangeRes = await get('/logs/range', tokenA, { start: d2, end: today });
  assert(rangeRes.status === 200 && rangeRes.data.logs?.length === 5, 'GET /api/logs/range returned 5 logs for activity feed');

  // ── 4. Test Zero Habits User ───────────────────────────────────────
  console.log('\n── 4. ZERO HABITS USER VERIFICATION ──');
  const zeroHabits = await get('/habits', tokenZero, { archived: 'false' });
  assert(zeroHabits.data.habits?.length === 0, 'Zero user has 0 habits');

  const zeroToday = await get('/logs/today', tokenZero);
  assert(zeroToday.data.logs?.length === 0, 'Zero user has 0 today completions');

  const zeroStats = await get('/logs/stats', tokenZero);
  assert(zeroStats.data.activeHabits === 0, 'Zero user activeHabits === 0');
  assert(zeroStats.data.completedToday === 0, 'Zero user completedToday === 0');
  assert(zeroStats.data.totalCompletions === 0, 'Zero user totalCompletions === 0');
  assert(zeroStats.data.bestCurrentStreak === 0, 'Zero user bestCurrentStreak === 0');

  // ── 5. User Isolation ──────────────────────────────────────────────
  console.log('\n── 5. USER ISOLATION ──');
  assert(zeroHabits.data.habits.length === 0, 'User Zero cannot see User A habits');
  assert(zeroToday.data.logs.length === 0, 'User Zero cannot see User A today logs');
  assert(zeroStats.data.totalCompletions === 0, 'User Zero cannot see User A completions');

  // ── 6. Cleanup ─────────────────────────────────────────────────────
  console.log('\n── 6. DATABASE CLEANUP ──');
  await HabitLog.deleteMany({ userId: { $in: [userAId, userZeroId] } });
  await Habit.deleteMany({ userId: { $in: [userAId, userZeroId] } });
  await User.deleteMany({ _id: { $in: [userAId, userZeroId] } });

  const leftLogs = await HabitLog.countDocuments({ userId: { $in: [userAId, userZeroId] } });
  const leftHabits = await Habit.countDocuments({ userId: { $in: [userAId, userZeroId] } });
  const leftUsers = await User.countDocuments({ _id: { $in: [userAId, userZeroId] } });
  assert(leftLogs === 0 && leftHabits === 0 && leftUsers === 0, 'All test records cleanly removed from Atlas');

  await mongoose.disconnect();

  console.log('\n======================================================');
  console.log(`  PHASE 7 BACKEND TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

main().catch(async (err) => {
  console.error('Test script crashed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
