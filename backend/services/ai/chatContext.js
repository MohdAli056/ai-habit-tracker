/**
 * Chat Context Builder.
 *
 * Deterministically constructs a compact analytics snapshot for the authenticated user
 * to power the AI Habit-Data Chat assistant.
 *
 * Reuses authoritative Phase 9 metric definitions:
 *   - streak calculation via calcStreak()
 *   - 7-day and 30-day completion counts and scheduled rates
 *   - per-habit metrics and category distribution
 *   - deterministic best-day and needs-attention classification
 *
 * Security Guarantees:
 *   - Zero MongoDB IDs, passwords, JWTs, emails, or credentials exposed
 *   - Strict per-user isolation (all database queries scoped by authenticated userId)
 */

import Habit from '../../models/Habit.js';
import HabitLog from '../../models/HabitLog.js';
import { getLastNDays } from '../../utils/date.js';
import { calcStreak } from '../../utils/streak.js';

/**
 * Builds deterministic context snapshot for a user.
 *
 * @param {string|mongoose.Types.ObjectId} userId — Authenticated user ID
 * @param {string} [overrideToday] — Optional testing date override
 * @returns {Promise<Object>} Compact deterministic context
 */
export async function buildChatContext(userId, overrideToday) {
  // 1. Fetch active and archived habits
  const activeHabits = await Habit.find({ userId, isArchived: false })
    .select('name category frequency targetDays')
    .sort({ order: 1, createdAt: 1 })
    .lean();

  const archivedCount = await Habit.countDocuments({ userId, isArchived: true });

  // 2. Fetch all completion logs for user
  const allLogs = await HabitLog.find({ userId })
    .select('habitId completedDate')
    .sort({ completedDate: 1 })
    .lean();

  const totalCompletions = allLogs.length;

  // 3. Group completions by habitId
  const byHabit = {};
  for (const log of allLogs) {
    const key = String(log.habitId);
    if (!byHabit[key]) byHabit[key] = [];
    byHabit[key].push(log.completedDate);
  }

  // 4. Windows: Last 7 and Last 30 days
  const last7Days = getLastNDays(7);
  const last30Days = getLastNDays(30);
  const last7Set = new Set(last7Days);
  const last30Set = new Set(last30Days);

  const logs7 = allLogs.filter((l) => last7Set.has(l.completedDate));
  const logs30 = allLogs.filter((l) => last30Set.has(l.completedDate));

  const totalScheduled7 = activeHabits.reduce((acc, h) => acc + (h.targetDays || 7), 0);
  const completionRate7 =
    totalScheduled7 > 0
      ? Math.min(100, Number(((logs7.length / totalScheduled7) * 100).toFixed(1)))
      : 0;

  const totalScheduled30 = activeHabits.reduce(
    (acc, h) => acc + Math.round(((h.targetDays || 7) / 7) * 30),
    0,
  );
  const completionRate30 =
    totalScheduled30 > 0
      ? Math.min(100, Number(((logs30.length / totalScheduled30) * 100).toFixed(1)))
      : 0;

  // 5. Per-habit metrics
  const habitMetrics = activeHabits.map((h) => {
    const id = String(h._id);
    const dates = byHabit[id] || [];
    const { current, longest } = calcStreak(dates, overrideToday);

    const inLast7 = dates.filter((d) => last7Set.has(d)).length;
    const inLast30 = dates.filter((d) => last30Set.has(d)).length;
    const scheduled30 = Math.round(((h.targetDays || 7) / 7) * 30);
    const rate30 =
      scheduled30 > 0 ? Math.min(100, Number(((inLast30 / scheduled30) * 100).toFixed(1))) : 0;

    return {
      name: h.name,
      category: h.category,
      frequency: h.frequency,
      targetDays: h.targetDays,
      totalCompletions: dates.length,
      completionsLast7Days: inLast7,
      completionsLast30Days: inLast30,
      completionRate30Days: rate30,
      currentStreak: current,
      longestStreak: longest,
    };
  });

  const bestCurrentStreak =
    habitMetrics.length > 0 ? Math.max(0, ...habitMetrics.map((h) => h.currentStreak)) : 0;
  const bestLongestStreak =
    habitMetrics.length > 0 ? Math.max(0, ...habitMetrics.map((h) => h.longestStreak)) : 0;

  // 6. Category breakdown
  const categoryMap = {};
  for (const h of habitMetrics) {
    const cat = h.category || 'other';
    if (!categoryMap[cat]) {
      categoryMap[cat] = {
        category: cat,
        habitCount: 0,
        completionsLast30Days: 0,
        rateSum: 0,
      };
    }
    categoryMap[cat].habitCount += 1;
    categoryMap[cat].completionsLast30Days += h.completionsLast30Days;
    categoryMap[cat].rateSum += h.completionRate30Days;
  }

  const categoryPerformance = Object.values(categoryMap).map((c) => ({
    category: c.category,
    habitCount: c.habitCount,
    completionsLast30Days: c.completionsLast30Days,
    averageCompletionRate: Number((c.rateSum / c.habitCount).toFixed(1)),
  }));

  // 7. Deterministic Best Day (Monday..Sunday in last 30 days)
  const dayOfWeekCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  for (const log of logs30) {
    const d = new Date(log.completedDate + 'T00:00:00Z');
    const iso = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    dayOfWeekCounts[iso] = (dayOfWeekCounts[iso] || 0) + 1;
  }

  const dayNamesFull = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  let bestDay = null;
  let maxDayCount = 0;
  for (let iso = 1; iso <= 7; iso++) {
    if (dayOfWeekCounts[iso] > maxDayCount) {
      maxDayCount = dayOfWeekCounts[iso];
      bestDay = `${dayNamesFull[iso - 1]} (${maxDayCount} completions in last 30 days)`;
    }
  }

  // 8. Needs Attention & Top Habits
  const needsAttention = habitMetrics
    .filter((h) => h.completionRate30Days < 50 || (h.currentStreak === 0 && h.totalCompletions > 0))
    .sort((a, b) => a.completionRate30Days - b.completionRate30Days)
    .map((h) => ({
      name: h.name,
      completionRate: `${h.completionRate30Days}%`,
      currentStreak: `${h.currentStreak}d`,
    }));

  const sortedTop = [...habitMetrics].sort((a, b) => {
    if (b.completionRate30Days !== a.completionRate30Days) {
      return b.completionRate30Days - a.completionRate30Days;
    }
    if (b.currentStreak !== a.currentStreak) {
      return b.currentStreak - a.currentStreak;
    }
    return b.totalCompletions - a.totalCompletions;
  });

  const topHabit = sortedTop.length > 0 ? sortedTop[0] : null;

  return {
    summary: {
      activeHabitCount: activeHabits.length,
      archivedHabitCount: archivedCount,
      totalCompletions,
      bestCurrentStreak,
      bestLongestStreak,
    },
    recentPerformance: {
      completionsLast7Days: logs7.length,
      completionsLast30Days: logs30.length,
      completionRate7Days: `${completionRate7}%`,
      completionRate30Days: `${completionRate30}%`,
    },
    bestDay: bestDay || 'No completions recorded in the last 30 days',
    topHabit: topHabit
      ? {
          name: topHabit.name,
          category: topHabit.category,
          completionRate30Days: `${topHabit.completionRate30Days}%`,
          currentStreak: `${topHabit.currentStreak}d`,
          longestStreak: `${topHabit.longestStreak}d`,
        }
      : null,
    habits: habitMetrics,
    categories: categoryPerformance,
    needsAttention,
  };
}

export default buildChatContext;
