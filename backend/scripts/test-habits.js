/**
 * Phase 5 verification script.
 * Run from backend/ dir: node scripts/test-habits.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';

const BASE = `http://localhost:${env.PORT}/api`;

async function post(url, body, token) {
  const r = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return r.json();
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

const pass = (label) => console.log(`  ✅ PASS: ${label}`);
const fail = (label, detail = '') => console.log(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection;

  // Clean up any leftover test data
  await db.collection('users').deleteMany({ email: { $in: ['hab_a@test.dev', 'hab_b@test.dev'] } });
  await db.collection('habits').deleteMany({ name: { $regex: /^TEST_/ } });
  console.log('🧹 Cleaned up previous test data\n');

  // ── Register User A & B ────────────────────────────────────────────
  const regA = await post('/auth/register', { name: 'Hab User A', email: 'hab_a@test.dev', password: 'passsA123' });
  const regB = await post('/auth/register', { name: 'Hab User B', email: 'hab_b@test.dev', password: 'passsB123' });
  const tA = regA.token;
  const tB = regB.token;
  tA ? pass(`User A registered (${regA.user.name})`) : fail('User A register');
  tB ? pass(`User B registered (${regB.user.name})`) : fail('User B register');

  // ── CREATE habits for User A ───────────────────────────────────────
  console.log('\n── CREATE ──');
  const c1 = await post('/habits', { name: 'TEST_Read', description: '20 mins', category: 'learning', frequency: 'daily', targetDays: 7, icon: '📚', color: '#6255db' }, tA);
  const c2 = await post('/habits', { name: 'TEST_Run', category: 'fitness', frequency: 'daily', targetDays: 5, icon: '🏃', color: '#22c55e' }, tA);
  const c3 = await post('/habits', { name: 'TEST_Meditate', category: 'mindfulness', frequency: 'daily', targetDays: 7, icon: '🧘', color: '#9d44f5' }, tA);
  c1.habit ? pass(`Created ${c1.habit.name} (icon ${c1.habit.icon})`) : fail('Create Read', JSON.stringify(c1));
  c2.habit ? pass(`Created ${c2.habit.name}`) : fail('Create Run', JSON.stringify(c2));
  c3.habit ? pass(`Created ${c3.habit.name}`) : fail('Create Meditate', JSON.stringify(c3));

  // Verify userId is from auth, not body
  const sentBody = { name: 'TEST_EvilHabit', category: 'other', frequency: 'daily', targetDays: 1, icon: '⭐', color: '#6255db', userId: regB.user._id };
  const evil = await post('/habits', sentBody, tA);
  evil.habit && String(evil.habit.userId) === String(regA.user._id)
    ? pass('userId always from auth, not body')
    : fail('userId injection prevention');

  const id1 = c1.habit?._id; const id2 = c2.habit?._id; const id3 = c3.habit?._id;
  if (!id1 || !id2 || !id3) { console.log('Cannot continue — habit IDs missing'); process.exit(1); }

  // ── LIST ──────────────────────────────────────────────────────────
  console.log('\n── LIST ──');
  const listActive = await get('/habits', tA, { archived: false });
  listActive.data.habits.length >= 3 ? pass(`Active habits: ${listActive.data.habits.length}`) : fail('List active', `got ${listActive.data.habits?.length}`);
  const listUserB = await get('/habits', tB);
  listUserB.data.habits.length === 0 ? pass('User B sees 0 habits (correct isolation)') : fail('User isolation on list', `saw ${listUserB.data.habits.length}`);

  // ── GET single ────────────────────────────────────────────────────
  console.log('\n── GET ──');
  const getSingle = await get(`/habits/${id1}`, tA);
  getSingle.status === 200 ? pass(`GET /habits/${id1} → ${getSingle.data.habit.name}`) : fail('GET single');

  // ── UPDATE ────────────────────────────────────────────────────────
  console.log('\n── UPDATE ──');
  const upd = await put(`/habits/${id1}`, { name: 'TEST_Read daily', targetDays: 6 }, tA);
  upd.data.habit?.name === 'TEST_Read daily' && upd.data.habit.targetDays === 6
    ? pass(`Updated name="${upd.data.habit.name}" targetDays=${upd.data.habit.targetDays}`)
    : fail('Update');

  // ── ARCHIVE / UNARCHIVE ───────────────────────────────────────────
  console.log('\n── ARCHIVE ──');
  await put(`/habits/${id3}`, { isArchived: true }, tA);
  const actv = await get('/habits', tA, { archived: false });
  const arch = await get('/habits', tA, { archived: true });
  const archOk = arch.data.habits.length === 1 && arch.data.habits[0]._id === id3;
  archOk ? pass(`Archive: active=${actv.data.habits.length} archived=${arch.data.habits.length}`) : fail('Archive');
  await put(`/habits/${id3}`, { isArchived: false }, tA);
  const afterUnarch = await get('/habits', tA, { archived: false });
  afterUnarch.data.habits.length >= 3 ? pass(`Unarchive: active back to ${afterUnarch.data.habits.length}`) : fail('Unarchive');

  // ── REORDER ───────────────────────────────────────────────────────
  console.log('\n── REORDER ──');
  const reorder = await put('/habits/reorder', { orderedIds: [id2, id1, id3] }, tA);
  reorder.status === 200 ? pass('Reorder call succeeded') : fail('Reorder', JSON.stringify(reorder.data));
  const afterRo = await get('/habits', tA);
  const names = afterRo.data.habits.map(h => `${h.name}(${h.order})`).join(' ');
  pass(`After reorder order: ${names}`);

  // ── SEARCH ────────────────────────────────────────────────────────
  console.log('\n── SEARCH + FILTER ──');
  const sRun = await get('/habits', tA, { search: 'run' });
  sRun.data.habits.length === 1 && sRun.data.habits[0].name.toLowerCase().includes('run')
    ? pass(`Search "run" → ${sRun.data.habits.length} result`)
    : fail('Search', `got ${sRun.data.habits?.length}`);
  const sCat = await get('/habits', tA, { category: 'learning' });
  sCat.data.habits.length >= 1 ? pass(`Category filter "learning" → ${sCat.data.habits.length} result(s)`) : fail('Category filter');

  // ── CROSS-USER SECURITY ───────────────────────────────────────────
  console.log('\n── CROSS-USER SECURITY ──');
  const xGet = await get(`/habits/${id1}`, tB);
  xGet.status === 404 ? pass('User B cannot GET User A habit (404)') : fail('Cross-user GET', `status=${xGet.status}`);
  const xPut = await put(`/habits/${id1}`, { name: 'Hacked' }, tB);
  xPut.status === 404 ? pass('User B cannot PUT User A habit (404)') : fail('Cross-user PUT', `status=${xPut.status}`);
  const xDel = await del(`/habits/${id1}`, tB);
  xDel.status === 404 ? pass('User B cannot DELETE User A habit (404)') : fail('Cross-user DELETE', `status=${xDel.status}`);
  const xReorder = await put('/habits/reorder', { orderedIds: [id1, id2] }, tB);
  xReorder.status === 403 ? pass('User B cannot REORDER User A habits (403)') : fail('Cross-user REORDER', `status=${xReorder.status}`);
  const xUnauth = await get('/habits', null);
  xUnauth.status === 401 ? pass('Unauthenticated request rejected (401)') : fail('Unauth', `status=${xUnauth.status}`);

  // ── DELETE ────────────────────────────────────────────────────────
  console.log('\n── DELETE ──');
  const delRes = await del(`/habits/${id2}`, tA);
  delRes.status === 200 ? pass(`Delete ${c2.habit.name}: "${delRes.data.message}"`) : fail('Delete');

  // ── CLEANUP ───────────────────────────────────────────────────────
  console.log('\n🧹 Cleaning up test data…');
  await db.collection('habits').deleteMany({ userId: { $in: [new mongoose.Types.ObjectId(regA.user._id), new mongoose.Types.ObjectId(regB.user._id)] } });
  await db.collection('users').deleteMany({ email: { $in: ['hab_a@test.dev', 'hab_b@test.dev'] } });
  console.log('✅ Test data removed');

  await mongoose.disconnect();
  console.log('\n🎉 Phase 5 verification complete.\n');
}

main().catch(async (err) => {
  console.error('Script error:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
