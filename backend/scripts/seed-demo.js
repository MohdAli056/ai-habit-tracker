/**
 * Phase 17 — Seed / Demo Data Generator
 *
 * Populates MongoDB Atlas with a realistic demo account ('demo@cadence.local')
 * and 90 days of deterministic habit tracking history.
 *
 * Invariants:
 *  - 100% deterministic (no Math.random(), no Date.now() for completions).
 *  - Zero AIInsight records seeded (AI features generate insights dynamically).
 *  - Idempotent and safely rerunnable without duplicate users, habits, or logs.
 *  - Strict tenant isolation (never modifies non-demo user data).
 *
 * Usage:
 *   npm run seed:demo
 *   node scripts/seed-demo.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Habit from '../models/Habit.js';
import HabitLog from '../models/HabitLog.js';
import AIInsight from '../models/AIInsight.js';
import { getLastNDays, getTodayKey } from '../utils/date.js';
import { calcStreak } from '../utils/streak.js';

export const DEMO_USER = {
  name: 'Demo User',
  email: 'demo@cadence.local',
  password: 'Demo@12345',
  morningMotivation: true,
};

export const DEMO_HABITS = [
  {
    name: 'Morning Reading',
    description: 'Read 20 pages of non-fiction or professional literature',
    category: 'learning',
    frequency: 'daily',
    targetDays: 7,
    color: '#6366f1', // Indigo
    icon: '📚',
    order: 0,
    isArchived: false,
  },
  {
    name: 'Morning Exercise',
    description: '30-minute cardio, mobility, or strength routine',
    category: 'fitness',
    frequency: 'daily',
    targetDays: 5,
    color: '#f59e0b', // Amber
    icon: '🏃',
    order: 1,
    isArchived: false,
  },
  {
    name: 'Drink 2L Water',
    description: 'Stay hydrated throughout the day with clean filtered water',
    category: 'health',
    frequency: 'daily',
    targetDays: 7,
    color: '#06b6d4', // Cyan
    icon: '💧',
    order: 2,
    isArchived: false,
  },
  {
    name: 'Mindful Meditation',
    description: '10 minutes of stillness and mindful breath focus',
    category: 'mindfulness',
    frequency: 'daily',
    targetDays: 7,
    color: '#8b5cf6', // Purple
    icon: '🧘',
    order: 3,
    isArchived: false,
  },
  {
    name: 'Deep Work Block',
    description: '90 minutes of distraction-free focused execution on top priorities',
    category: 'productivity',
    frequency: 'daily',
    targetDays: 5,
    color: '#3b82f6', // Blue
    icon: '💻',
    order: 4,
    isArchived: false,
  },
  {
    name: 'Learn JavaScript',
    description: 'Study modern ECMAScript, architecture patterns, and web standards',
    category: 'learning',
    frequency: 'weekly',
    targetDays: 4,
    color: '#10b981', // Emerald
    icon: '🧠',
    order: 5,
    isArchived: false,
  },
  {
    name: 'Evening Walk',
    description: '20-minute relaxing outdoor stroll to disconnect before bed',
    category: 'fitness',
    frequency: 'daily',
    targetDays: 7,
    color: '#ec4899', // Pink
    icon: '💪',
    order: 6,
    isArchived: false,
  },
  {
    name: 'Daily Reflection Journal',
    description: 'Evening bullet journal of daily wins, learnings, and gratitude',
    category: 'creative',
    frequency: 'daily',
    targetDays: 7,
    color: '#f97316', // Orange
    icon: '🎨',
    order: 7,
    isArchived: false,
  },
];

/**
 * Curated completion pattern for days 80..89 (where 89 is today).
 * Ensures:
 *  - Habit 2 (Drink Water): Long continuous streak (18+ days up to today)
 *  - Habit 0 (Reading): Moderate continuous streak (8 days up to today)
 *  - Habit 7 (Journal): Short streak (3 days up to today)
 *  - Habit 1 (Exercise): Short streak (2 days up to today)
 *  - Habit 3 (Meditation): Streak of 5 days ending yesterday (anchor yesterday, user can complete today!)
 *  - Habit 4 (Deep Work): Broken streak (0 current, 7 longest) -> eligible for AI Streak Recovery!
 *  - Habit 6 (Evening Walk): Needing attention (0 current, missed last 4 days)
 *  - Today (day 89): Exactly 5 completed, 3 incomplete.
 */
const RECENT_MATRIX = [
  // 80 81 82 83 84 85 86 87 88 89 (today)
  [1, 0, 1, 1, 1, 1, 1, 1, 1, 1], // Habit 0: Reading (current: 8)
  [1, 1, 0, 1, 1, 0, 1, 0, 1, 1], // Habit 1: Exercise (current: 2)
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Habit 2: Water (current: 27)
  [0, 1, 1, 0, 1, 1, 1, 1, 1, 0], // Habit 3: Meditation (current: 5 from yday)
  [1, 1, 1, 1, 1, 0, 0, 0, 0, 0], // Habit 4: Deep Work (current: 0, longest: 7 -> Recovery eligible)
  [1, 0, 1, 0, 1, 1, 0, 1, 0, 1], // Habit 5: JavaScript (current: 1)
  [0, 0, 1, 0, 0, 1, 0, 0, 0, 0], // Habit 6: Evening Walk (current: 0 -> Needs attention)
  [1, 1, 0, 1, 1, 1, 0, 1, 1, 1], // Habit 7: Journal (current: 3)
];

/**
 * Deterministic completion function for habitIndex on dayIndex.
 * dayIndex: 0 (89 days ago) to 89 (today).
 */
export function isHabitCompleted(habitIdx, dayIdx, dayOfWeek) {
  if (dayIdx >= 80) {
    return RECENT_MATRIX[habitIdx][dayIdx - 80] === 1;
  }
  // Days 63..79 for habit 2 (Water) to build a continuous strong streak up to today
  if (habitIdx === 2 && dayIdx >= 63) {
    return true;
  }

  // Deterministic formula for days 0..79 based on habit profile and day index:
  switch (habitIdx) {
    case 0: // Reading: ~85% consistency
      return (dayIdx * 7 + 3) % 10 < 8 || dayOfWeek === 0;
    case 1: // Exercise: ~70% consistency, mostly weekdays & Saturdays
      return dayOfWeek !== 0 && (dayIdx * 13 + 5) % 10 < 8;
    case 2: // Water: ~90% consistency
      return (dayIdx * 11 + 7) % 10 < 9;
    case 3: // Meditation: ~65% consistency
      return (dayIdx * 17 + 2) % 10 < 7;
    case 4: // Deep Work: ~75% consistency on weekdays, lower on weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return (dayIdx * 5 + 1) % 10 < 3;
      }
      return (dayIdx * 19 + 4) % 10 < 8;
    case 5: // JavaScript: ~60% consistency
      return (dayIdx * 23 + 9) % 10 < 6;
    case 6: // Evening Walk: ~45% consistency (struggling)
      return (dayIdx * 29 + 1) % 10 < 5;
    case 7: // Journal: ~65% consistency
      return (dayIdx * 31 + 6) % 10 < 7;
    default:
      return false;
  }
}

/**
 * Core idempotent seed function.
 */
export async function seedDemo({ quiet = false } = {}) {
  // Ensure DB connection is active
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  // 1. Find or create demo user
  let demoUser = await User.findOne({ email: DEMO_USER.email });
  if (!demoUser) {
    demoUser = await User.create({
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      password: DEMO_USER.password,
      morningMotivation: DEMO_USER.morningMotivation,
    });
  } else {
    // Reset password & settings idempotently
    demoUser.name = DEMO_USER.name;
    demoUser.password = DEMO_USER.password;
    demoUser.morningMotivation = DEMO_USER.morningMotivation;
    await demoUser.save();
  }

  // 2. Remove any prior habits, logs, or insights strictly for demoUser._id
  await HabitLog.deleteMany({ userId: demoUser._id });
  await Habit.deleteMany({ userId: demoUser._id });
  await AIInsight.deleteMany({ userId: demoUser._id });

  // 3. Insert the 8 deterministic habits
  const habitDocs = await Habit.insertMany(
    DEMO_HABITS.map((h, i) => ({
      ...h,
      userId: demoUser._id,
      order: i,
    })),
  );

  // 4. Generate 90 calendar days of deterministic history
  const dates = getLastNDays(90);
  const todayKey = getTodayKey();

  const logsToInsert = [];
  const habitDateMap = Array.from({ length: 8 }, () => []);

  for (let d = 0; d < 90; d++) {
    const dateKey = dates[d];
    const dow = new Date(dateKey + 'T00:00:00Z').getUTCDay();

    for (let h = 0; h < 8; h++) {
      if (isHabitCompleted(h, d, dow)) {
        logsToInsert.push({
          userId: demoUser._id,
          habitId: habitDocs[h]._id,
          completedDate: dateKey,
          notes: '',
        });
        habitDateMap[h].push(dateKey);
      }
    }
  }

  await HabitLog.insertMany(logsToInsert);

  // 5. Calculate summary metrics
  let todayCount = 0;
  let bestCurrentStreak = 0;
  let bestLongestStreak = 0;

  for (let h = 0; h < 8; h++) {
    const streak = calcStreak(habitDateMap[h], todayKey);
    if (streak.current > bestCurrentStreak) bestCurrentStreak = streak.current;
    if (streak.longest > bestLongestStreak) bestLongestStreak = streak.longest;
    if (habitDateMap[h].includes(todayKey)) todayCount++;
  }

  if (!quiet) {
    console.log(`
========================================
DEMO DATA SEEDED
========================================

Demo User:
Name: ${demoUser.name}
Email: ${demoUser.email}
Password: ${DEMO_USER.password}

Habits:
${habitDocs.length}

History:
90 days (${dates[0]} to ${dates[89]})

Completion Logs:
${logsToInsert.length}

Today's Completions:
${todayCount} / ${habitDocs.length}

Current Best Streak:
${bestCurrentStreak} days

Longest Streak:
${bestLongestStreak} days

Database:
MongoDB Atlas

========================================
`);
  }

  return {
    user: demoUser,
    habits: habitDocs,
    logsCount: logsToInsert.length,
    todayCount,
    bestCurrentStreak,
    bestLongestStreak,
    dateRange: { start: dates[0], end: dates[89] },
  };
}

// Execute standalone if invoked directly
import path from 'path';

const isDirectRun =
  process.argv[1] &&
  path.basename(process.argv[1]).replace(/\.[^/.]+$/, '') === 'seed-demo';

if (isDirectRun) {
  seedDemo()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Demo seeding failed:', err);
      try {
        await disconnectDB();
      } catch (_) {}
      process.exit(1);
    });
}
