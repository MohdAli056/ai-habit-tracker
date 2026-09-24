/**
 * Phase 8 Verification Script: Habits + Weekly Experience
 * Tests live endpoints and weekly queries against MongoDB Atlas.
 * Run from backend/ dir: node scripts/test-weekly.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import Habit from '../models/Habit.js';
import HabitLog from '../models/HabitLog.js';
import User from '../models/User.js';
import { getTodayKey, getWeekEnd, getWeekStart } from '../utils/date.js';

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

async function put(url, body, token) {
  const r = await fetch(`${BASE}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
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
  console.log('  PHASE 8: HABITS + WEEKLY EXPERIENCE TESTS');
  console.log('======================================================\n');

  await mongoose.connect(env.MONGODB_URI);

  const testEmails = ['phase8_a@test.dev', 'phase8_zero@test.dev', 'phase8_b@test.dev'];
  const existingUsers = await User.find({ email: { $in: testEmails } });
  const existingIds = existingUsers.map((u) => u._id);

  if (existingIds.length > 0) {
    await HabitLog.deleteMany({ userId: { $in: existingIds } });
    await Habit.deleteMany({ userId: { $in: existingIds } });
    await User.deleteMany({ _id: { $in: existingIds } });
  }
  console.log('🧹 Cleaned up existing test records in MongoDB Atlas\n');

  // ── 1. Setup Users ─────────────────────────────────────────────────
  console.log('── 1. USER SETUP ──');
  const regA = await post('/auth/register', { name: 'Weekly User A', email: 'phase8_a@test.dev', password: 'Password123' });
  const regB = await post('/auth/register', { name: 'Weekly User B', email: 'phase8_b@test.dev', password: 'Password123' });
  const regZero = await post('/auth/register', { name: 'Weekly User Zero', email: 'phase8_zero@test.dev', password: 'Password123' });

  const tokenA = regA.data.token;
  const tokenB = regB.data.token;
  const tokenZero = regZero.data.token;
  const userAId = regA.data.user?._id;
  const userBId = regB.data.user?._id;
  const userZeroId = regZero.data.user?._id;

  assert(tokenA && userAId, 'User A registered');
  assert(tokenB && userBId, 'User B registered');
  assert(tokenZero && userZeroId, 'User Zero registered');

  // ── 2. Create Active & Archived Habits for User A ──────────────────
  console.log('\n── 2. HABIT MANAGEMENT & ARCHIVE EXCLUSION ──');
  const h1Res = await post('/habits', { name: 'Morning Routine', category: 'mindfulness', frequency: 'daily', targetDays: 7, icon: '🧘', color: '#9d44f5' }, tokenA);
  const h2Res = await post('/habits', { name: 'Strength Training', category: 'fitness', frequency: 'daily', targetDays: 5, icon: '🏃', color: '#22c55e' }, tokenA);
  const h3Res = await post('/habits', { name: 'Read Deep Work', category: 'learning', frequency: 'daily', targetDays: 6, icon: '📚', color: '#6255db' }, tokenA);
  const hArchRes = await post('/habits', { name: 'Old Discontinued Habit', category: 'other', frequency: 'daily', targetDays: 7, icon: '⭐', color: '#888888' }, tokenA);

  const h1 = h1Res.data.habit;
  const h2 = h2Res.data.habit;
  const h3 = h3Res.data.habit;
  const hArch = hArchRes.data.habit;

  assert(h1 && h2 && h3 && hArch, 'Created 4 habits for User A');

  // Archive the 4th habit
  const archRes = await put(`/habits/${hArch._id}`, { isArchived: true }, tokenA);
  assert(archRes.status === 200 && archRes.data.habit.isArchived === true, 'Archived the 4th habit');

  // Verify active habits query returns only the 3 active ones
  const activeList = await get('/habits', tokenA, { archived: 'false' });
  assert(activeList.data.habits?.length === 3, 'GET /habits?archived=false returns exactly 3 active habits (archived excluded)');

  const archivedList = await get('/habits', tokenA, { archived: 'true' });
  assert(archivedList.data.habits?.length === 1 && archivedList.data.habits[0]._id === hArch._id, 'GET /habits?archived=true returns archived habit');

  // ── 3. Weekly Date Calculations & Logs ─────────────────────────────
  console.log('\n── 3. WEEKLY RANGE & LOGS VERIFICATION ──');
  const todayKey = getTodayKey();
  const currentWeekStart = getWeekStart(todayKey); // Monday
  const currentWeekEnd = getWeekEnd(todayKey);     // Sunday

  assert(currentWeekStart <= currentWeekEnd, `Monday (${currentWeekStart}) is before or equal to Sunday (${currentWeekEnd})`);

  // Log completions for current week:
  // Habit 1: on Monday and Tuesday
  // Habit 2: on Monday
  const log1Mon = await post('/logs', { habitId: h1._id, completedDate: currentWeekStart }, tokenA);
  assert(log1Mon.status === 201, 'Logged completion for Habit 1 on Monday');

  // Shift 1 day from Monday for Tuesday
  const [y, m, d] = currentWeekStart.split('-').map(Number);
  const tuesDate = new Date(Date.UTC(y, m - 1, d + 1));
  const tuesKey = `${tuesDate.getUTCFullYear()}-${String(tuesDate.getUTCMonth() + 1).padStart(2, '0')}-${String(tuesDate.getUTCDate()).padStart(2, '0')}`;

  const log1Tue = await post('/logs', { habitId: h1._id, completedDate: tuesKey }, tokenA);
  const log2Mon = await post('/logs', { habitId: h2._id, completedDate: currentWeekStart }, tokenA);
  assert(log1Tue.status === 201 && log2Mon.status === 201, 'Logged completions for Habit 1 on Tuesday and Habit 2 on Monday');

  // Query current week range
  const currentWeekQuery = await get('/logs/range', tokenA, { start: currentWeekStart, end: currentWeekEnd });
  assert(currentWeekQuery.status === 200, 'GET /api/logs/range current week returned 200');
  assert(currentWeekQuery.data.logs?.length === 3, `Current week has 3 completed logs (got ${currentWeekQuery.data.logs?.length})`);

  // ── 4. Previous Week & Next Week (Empty Weeks) ─────────────────────
  console.log('\n── 4. PREVIOUS WEEK & NEXT WEEK (ZERO COMPLETIONS) ──');
  // Previous week Monday–Sunday
  const prevMonDate = new Date(Date.UTC(y, m - 1, d - 7));
  const prevSunDate = new Date(Date.UTC(y, m - 1, d - 1));
  const prevMonKey = `${prevMonDate.getUTCFullYear()}-${String(prevMonDate.getUTCMonth() + 1).padStart(2, '0')}-${String(prevMonDate.getUTCDate()).padStart(2, '0')}`;
  const prevSunKey = `${prevSunDate.getUTCFullYear()}-${String(prevSunDate.getUTCMonth() + 1).padStart(2, '0')}-${String(prevSunDate.getUTCDate()).padStart(2, '0')}`;

  const prevWeekQuery = await get('/logs/range', tokenA, { start: prevMonKey, end: prevSunKey });
  assert(prevWeekQuery.status === 200 && prevWeekQuery.data.logs?.length === 0, 'Previous week returns 0 completions (empty week verified)');

  // Next week Monday–Sunday
  const nextMonDate = new Date(Date.UTC(y, m - 1, d + 7));
  const nextSunDate = new Date(Date.UTC(y, m - 1, d + 13));
  const nextMonKey = `${nextMonDate.getUTCFullYear()}-${String(nextMonDate.getUTCMonth() + 1).padStart(2, '0')}-${String(nextMonDate.getUTCDate()).padStart(2, '0')}`;
  const nextSunKey = `${nextSunDate.getUTCFullYear()}-${String(nextSunDate.getUTCMonth() + 1).padStart(2, '0')}-${String(nextSunDate.getUTCDate()).padStart(2, '0')}`;

  const nextWeekQuery = await get('/logs/range', tokenA, { start: nextMonKey, end: nextSunKey });
  assert(nextWeekQuery.status === 200 && nextWeekQuery.data.logs?.length === 0, 'Next week returns 0 completions (empty week verified)');

  // ── 5. User with Zero Habits ───────────────────────────────────────
  console.log('\n── 5. ZERO HABITS USER VERIFICATION ──');
  const zeroHabits = await get('/habits', tokenZero, { archived: 'false' });
  assert(zeroHabits.data.habits?.length === 0, 'User Zero has 0 active habits');

  const zeroWeekLogs = await get('/logs/range', tokenZero, { start: currentWeekStart, end: currentWeekEnd });
  assert(zeroWeekLogs.data.logs?.length === 0, 'User Zero has 0 weekly logs');

  // ── 6. Cell Completion Toggle ──────────────────────────────────────
  console.log('\n── 6. INTERACTIVE CELL COMPLETION TOGGLE ──');
  // Toggle complete Habit 3 on Monday
  const toggleComplete = await post('/logs', { habitId: h3._id, completedDate: currentWeekStart }, tokenA);
  assert(toggleComplete.status === 201, 'Cell toggle complete: POST /logs succeeded');

  const afterComplete = await get('/logs/range', tokenA, { start: currentWeekStart, end: currentWeekEnd });
  assert(afterComplete.data.logs?.length === 4, 'After cell toggle complete, total logs is 4');

  // Toggle uncomplete Habit 3 on Monday
  const toggleUncomplete = await del(`/logs/${h3._id}?date=${currentWeekStart}`, tokenA);
  assert(toggleUncomplete.status === 200, 'Cell toggle uncomplete: DELETE /logs/:habitId?date=... succeeded');

  const afterUncomplete = await get('/logs/range', tokenA, { start: currentWeekStart, end: currentWeekEnd });
  assert(afterUncomplete.data.logs?.length === 3, 'After cell toggle uncomplete, total logs reverted back to 3');

  // ── 7. Cross-User Security & Isolation ─────────────────────────────
  console.log('\n── 7. CROSS-USER SECURITY & ISOLATION ──');
  // User B tries to view User A's weekly logs
  const userBLogs = await get('/logs/range', tokenB, { start: currentWeekStart, end: currentWeekEnd });
  assert(userBLogs.data.logs?.length === 0, 'User B sees 0 logs in current week (isolated from User A)');

  // User B tries to toggle completion on User A's habit
  const xToggle = await post('/logs', { habitId: h1._id, completedDate: currentWeekStart }, tokenB);
  assert(xToggle.status === 404, 'User B cannot complete User A habit (404)');

  const xUncomplete = await del(`/logs/${h1._id}?date=${currentWeekStart}`, tokenB);
  assert(xUncomplete.status === 404, 'User B cannot uncomplete User A habit (404)');

  // ── 8. Invalid Date Inputs ─────────────────────────────────────────
  console.log('\n── 8. INVALID INPUT REJECTION ──');
  const badRange = await get('/logs/range', tokenA, { start: currentWeekEnd, end: currentWeekStart });
  assert(badRange.status === 400, 'Range query rejects start > end with 400');

  const malformedDate = await get('/logs/range', tokenA, { start: 'invalid-date', end: currentWeekEnd });
  assert(malformedDate.status === 400, 'Range query rejects invalid date string with 400');

  // ── 9. Database Cleanup ────────────────────────────────────────────
  console.log('\n── 9. DATABASE CLEANUP ──');
  await HabitLog.deleteMany({ userId: { $in: [userAId, userBId, userZeroId] } });
  await Habit.deleteMany({ userId: { $in: [userAId, userBId, userZeroId] } });
  await User.deleteMany({ _id: { $in: [userAId, userBId, userZeroId] } });

  const leftLogs = await HabitLog.countDocuments({ userId: { $in: [userAId, userBId, userZeroId] } });
  const leftHabits = await Habit.countDocuments({ userId: { $in: [userAId, userBId, userZeroId] } });
  const leftUsers = await User.countDocuments({ _id: { $in: [userAId, userBId, userZeroId] } });
  assert(leftLogs === 0 && leftHabits === 0 && leftUsers === 0, 'All test records cleanly purged from MongoDB Atlas');

  await mongoose.disconnect();

  console.log('\n======================================================');
  console.log(`  PHASE 8 BACKEND TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

main().catch(async (err) => {
  console.error('Test script crashed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
