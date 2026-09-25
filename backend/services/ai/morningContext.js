/**
 * Morning Motivation Context Builder.
 *
 * Deterministically constructs a compact habit-tracking snapshot for the authenticated user
 * to power the AI Morning Motivation coach.
 *
 * Adheres to strict privacy boundaries:
 *   - Zero MongoDB ObjectIds, passwords, hashes, emails, or JWTs.
 *   - Built on deterministic analytics, date, and streak utilities.
 */

import Habit from '../../models/Habit.js';
import HabitLog from '../../models/HabitLog.js';
import { getLastNDays, getTodayKey } from '../../utils/date.js';
import { calcStreak } from '../../utils/streak.js';

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Build deterministic morning motivation context.
 *
 * @param {string|mongoose.Types.ObjectId} userId — Authenticated user ID
 * @param {string} [overrideToday] — Optional testing date override (YYYY-MM-DD)
 * @returns {Promise<{
 *   date: string,
 *   dayOfWeek: string,
 *   today: {
 *     scheduledHabits: number,
 *     completedHabits: number,
 *     remainingHabits: number,
 *     completionRate: number
 *   },
 *   streaks: {
 *     bestCurrentStreak: number,
 *     bestLongestStreak: number
 *   },
 *   recent: {
 *     last7DaysCompletionRate: number,
 *     last7DaysCompletions: number
 *   },
 *   highlights: {
 *     topHabit: string|null,
 *     needsAttention: string[]
 *   },
 *   habitNames: string[]
 * }>}
 */
export async function buildMorningContext(userId, overrideToday) {
  const todayKey = overrideToday || getTodayKey();

  // Compute English day of week based on UTC date
  const parsedDate = new Date(todayKey + 'T00:00:00Z');
  const dayOfWeek = WEEKDAYS[parsedDate.getUTCDay()] || 'Today';

  // 1. Fetch active habits for user
  const activeHabits = await Habit.find({ userId, isArchived: false })
    .select('name category frequency targetDays')
    .sort({ order: 1, createdAt: 1 })
    .lean();

  const habitNames = activeHabits.map((h) => h.name.trim());

  // If user has zero active habits, return clean zero-state context
  if (activeHabits.length === 0) {
    return {
      date: todayKey,
      dayOfWeek,
      today: {
        scheduledHabits: 0,
        completedHabits: 0,
        remainingHabits: 0,
        completionRate: 0,
      },
      streaks: {
        bestCurrentStreak: 0,
        bestLongestStreak: 0,
      },
      recent: {
        last7DaysCompletionRate: 0,
        last7DaysCompletions: 0,
      },
      highlights: {
        topHabit: null,
        needsAttention: [],
      },
      habitNames: [],
    };
  }

  // 2. Fetch all completion logs for user
  const allLogs = await HabitLog.find({ userId })
    .select('habitId completedDate')
    .sort({ completedDate: 1 })
    .lean();

  // Group logs by habitId
  const byHabit = {};
  for (const log of allLogs) {
    const key = String(log.habitId);
    if (!byHabit[key]) byHabit[key] = [];
    byHabit[key].push(log.completedDate);
  }

  // 3. Today's progress
  const todayLogs = allLogs.filter((l) => l.completedDate === todayKey);
  const completedTodaySet = new Set(todayLogs.map((l) => String(l.habitId)));
  const completedHabits = activeHabits.filter((h) => completedTodaySet.has(String(h._id))).length;
  const scheduledHabits = activeHabits.length;
  const remainingHabits = Math.max(0, scheduledHabits - completedHabits);
  const completionRate =
    scheduledHabits > 0 ? Math.round((completedHabits / scheduledHabits) * 100) : 0;

  // 4. Streaks per habit and best streaks
  const habitStats = activeHabits.map((h) => {
    const id = String(h._id);
    const dates = byHabit[id] || [];
    const { current, longest } = calcStreak(dates, todayKey);
    return {
      name: h.name.trim(),
      category: h.category,
      currentStreak: current,
      longestStreak: longest,
      totalCompletions: dates.length,
      isCompletedToday: completedTodaySet.has(id),
    };
  });

  const bestCurrentStreak = Math.max(0, ...habitStats.map((h) => h.currentStreak));
  const bestLongestStreak = Math.max(0, ...habitStats.map((h) => h.longestStreak));

  // 5. Recent 7-Day Performance
  const last7Days = getLastNDays(7);
  const last7Set = new Set(last7Days);
  const logs7 = allLogs.filter((l) => last7Set.has(l.completedDate));
  const totalScheduled7 = activeHabits.reduce((acc, h) => acc + (h.targetDays || 7), 0);
  const last7DaysCompletionRate =
    totalScheduled7 > 0
      ? Math.min(100, Math.round((logs7.length / totalScheduled7) * 100))
      : 0;

  // 6. Highlights: topHabit and needsAttention
  // Top habit: highest current streak, or highest total completions
  const sortedByMomentum = [...habitStats].sort((a, b) => {
    if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
    if (b.longestStreak !== a.longestStreak) return b.longestStreak - a.longestStreak;
    return b.totalCompletions - a.totalCompletions;
  });

  const topHabitCandidate = sortedByMomentum.length > 0 ? sortedByMomentum[0] : null;
  const topHabit =
    topHabitCandidate && (topHabitCandidate.currentStreak > 0 || topHabitCandidate.totalCompletions > 0)
      ? topHabitCandidate.name
      : habitStats[0]?.name || null;

  // Needs attention: habits with 0 current streak that have previous completions, or not completed today with broken streak
  const needsAttention = habitStats
    .filter((h) => h.currentStreak === 0 && h.totalCompletions > 0 && !h.isCompletedToday)
    .map((h) => h.name)
    .slice(0, 3);

  return {
    date: todayKey,
    dayOfWeek,
    today: {
      scheduledHabits,
      completedHabits,
      remainingHabits,
      completionRate,
    },
    streaks: {
      bestCurrentStreak,
      bestLongestStreak,
    },
    recent: {
      last7DaysCompletionRate,
      last7DaysCompletions: logs7.length,
    },
    highlights: {
      topHabit,
      needsAttention,
    },
    habitNames,
  };
}

export default buildMorningContext;
