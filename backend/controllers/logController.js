/**
 * Log controller — habit completion tracking.
 *
 * All handlers enforce:
 *   - req.user._id as the authenticated userId (never from body)
 *   - The target habit must belong to the authenticated user
 *   - Completions are idempotent via compound unique index upsert
 */

import mongoose from 'mongoose';
import Habit from '../models/Habit.js';
import HabitLog from '../models/HabitLog.js';
import { getLastNDays, getTodayKey, isValidDateKey } from '../utils/date.js';
import { calcStreak } from '../utils/streak.js';

/**
 * Mark a habit as completed for a given date.
 * POST /api/logs
 */
export async function markComplete(req, res, next) {
  try {
    const { habitId, completedDate, notes } = req.body;

    if (!habitId) return res.status(400).json({ message: 'habitId is required.' });

    const dateKey = completedDate ?? getTodayKey();

    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({ message: 'completedDate must be a valid YYYY-MM-DD string.' });
    }

    // Verify the habit exists and belongs to the authenticated user.
    if (!mongoose.isValidObjectId(habitId)) return res.status(404).json({ message: 'Habit not found.' });
    const habit = await Habit.findOne({ _id: habitId, userId: req.user._id });
    if (!habit) return res.status(404).json({ message: 'Habit not found.' });

    // Upsert — the compound unique index guarantees idempotency.
    const log = await HabitLog.findOneAndUpdate(
      { userId: req.user._id, habitId, completedDate: dateKey },
      { $set: { userId: req.user._id, habitId, completedDate: dateKey, notes: notes ?? '' } },
      { upsert: true, returnDocument: 'after' },
    );

    res.status(201).json({ log });
  } catch (err) {
    next(err);
  }
}

/**
 * Remove completion for a habit on a given date.
 * DELETE /api/logs/:habitId
 */
export async function markIncomplete(req, res, next) {
  try {
    const { habitId } = req.params;
    const dateKey = req.query.date ?? getTodayKey();

    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({ message: 'date must be a valid YYYY-MM-DD string.' });
    }

    // Verify habit ownership.
    if (!mongoose.isValidObjectId(habitId)) return res.status(404).json({ message: 'Habit not found.' });
    const habit = await Habit.findOne({ _id: habitId, userId: req.user._id });
    if (!habit) return res.status(404).json({ message: 'Habit not found.' });

    await HabitLog.deleteOne({ userId: req.user._id, habitId, completedDate: dateKey });

    // Return 200 even if there was nothing to delete (idempotent).
    res.json({ message: 'Completion removed.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Get completions for today for the authenticated user.
 * GET /api/logs/today
 */
export async function getTodayLogs(req, res, next) {
  try {
    const today = getTodayKey();
    const logs = await HabitLog.find({ userId: req.user._id, completedDate: today });
    res.json({ logs, date: today });
  } catch (err) {
    next(err);
  }
}

/**
 * Get completions within a date range [start, end].
 * GET /api/logs/range
 */
export async function getLogsRange(req, res, next) {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ message: 'start and end query params are required.' });
    }

    if (!isValidDateKey(start) || !isValidDateKey(end)) {
      return res.status(400).json({ message: 'start and end must be valid YYYY-MM-DD strings.' });
    }

    if (start > end) {
      return res.status(400).json({ message: 'start must not be after end.' });
    }

    const logs = await HabitLog.find({
      userId: req.user._id,
      completedDate: { $gte: start, $lte: end },
    }).sort({ completedDate: 1 });

    res.json({ logs, start, end });
  } catch (err) {
    next(err);
  }
}

/**
 * Get aggregated daily completion counts for heatmap visualization.
 * GET /api/logs/heatmap?days=90
 */
export async function getHeatmap(req, res, next) {
  try {
    const days = Math.min(Number(req.query.days) || 90, 365);
    const keys = getLastNDays(days);
    const start = keys[0];
    const end = keys[keys.length - 1];

    const logs = await HabitLog.find({
      userId: req.user._id,
      completedDate: { $gte: start, $lte: end },
    }).select('completedDate');

    const counts = {};
    for (const log of logs) {
      counts[log.completedDate] = (counts[log.completedDate] ?? 0) + 1;
    }

    res.json({ heatmap: counts, start, end });
  } catch (err) {
    next(err);
  }
}

/**
 * Get lifetime and streak statistics for a single habit.
 * GET /api/logs/stats/habit/:id
 */
export async function getHabitStats(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Habit not found.' });
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!habit) return res.status(404).json({ message: 'Habit not found.' });

    const logs = await HabitLog.find({ userId: req.user._id, habitId: req.params.id })
      .sort({ completedDate: 1 })
      .select('completedDate notes');

    const completedDates = logs.map((l) => l.completedDate);
    const { current, longest } = calcStreak(completedDates);

    // Completion rate over last 30 days
    const last30 = getLastNDays(30);
    const datesSet = new Set(completedDates);
    const completedIn30 = last30.filter((d) => datesSet.has(d)).length;
    const rateIn30 = Number((completedIn30 / 30 * 100).toFixed(1));

    res.json({
      habit: { _id: habit._id, name: habit.name },
      totalCompletions: logs.length,
      currentStreak: current,
      longestStreak: longest,
      completionRateLast30Days: rateIn30,
      recentDates: completedDates.slice(-14), // last 14 completions
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get aggregate dashboard statistics across all active habits.
 * GET /api/logs/stats
 */
export async function getAllStats(req, res, next) {
  try {
    const habits = await Habit.find({ userId: req.user._id, isArchived: false }).select('_id name icon color');
    const allLogs = await HabitLog.find({ userId: req.user._id }).select('habitId completedDate');

    const totalCompletions = allLogs.length;

    // Group dates by habitId
    const byHabit = {};
    for (const log of allLogs) {
      const key = String(log.habitId);
      if (!byHabit[key]) byHabit[key] = [];
      byHabit[key].push(log.completedDate);
    }

    // Completion counts for today
    const todayKey = getTodayKey();
    const completedTodayIds = new Set(
      allLogs.filter((l) => l.completedDate === todayKey).map((l) => String(l.habitId)),
    );

    const habitStats = habits.map((h) => {
      const id = String(h._id);
      const dates = byHabit[id] ?? [];
      const { current, longest } = calcStreak(dates);
      return {
        habitId: h._id,
        name: h.name,
        icon: h.icon,
        color: h.color,
        totalCompletions: dates.length,
        currentStreak: current,
        longestStreak: longest,
        completedToday: completedTodayIds.has(id),
      };
    });

    const last30 = new Set(getLastNDays(30));
    const completedInLast30 = allLogs.filter((l) => last30.has(l.completedDate)).length;

    const bestCurrentStreak = habitStats.length > 0 ? Math.max(0, ...habitStats.map((h) => h.currentStreak)) : 0;
    const bestLongestStreak = habitStats.length > 0 ? Math.max(0, ...habitStats.map((h) => h.longestStreak)) : 0;

    res.json({
      totalCompletions,
      activeHabits: habits.length,
      completedToday: completedTodayIds.size,
      completionsLast30Days: completedInLast30,
      bestCurrentStreak,
      bestLongestStreak,
      habits: habitStats,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get comprehensive analytics and trend insights for the specified period.
 * GET /api/logs/insights
 */
export async function getInsights(req, res, next) {
  try {
    const rawDays = parseInt(req.query.days, 10);
    const validDays = [7, 30, 90];
    const days = validDays.includes(rawDays) ? rawDays : 30;

    // Current period and preceding period of same length
    const allNDays = getLastNDays(days * 2);
    const prevPeriod = allNDays.slice(0, days);
    const currentPeriod = allNDays.slice(days);

    const start = currentPeriod[0];
    const end = currentPeriod[currentPeriod.length - 1];
    const prevStart = prevPeriod[0];
    const prevEnd = prevPeriod[prevPeriod.length - 1];

    const currentSet = new Set(currentPeriod);
    const prevSet = new Set(prevPeriod);

    // Active habits only
    const habits = await Habit.find({ userId: req.user._id, isArchived: false })
      .select('_id name icon color category frequency targetDays');

    // All logs for user
    const allLogs = await HabitLog.find({ userId: req.user._id })
      .select('habitId completedDate');

    // Group logs by habitId
    const logsByHabit = {};
    for (const log of allLogs) {
      const hId = String(log.habitId);
      if (!logsByHabit[hId]) logsByHabit[hId] = [];
      logsByHabit[hId].push(log.completedDate);
    }

    // Active habit IDs set
    const activeHabitIds = new Set(habits.map((h) => String(h._id)));

    // Filter logs for active habits in current and prev periods
    const currentActiveLogs = allLogs.filter(
      (l) => activeHabitIds.has(String(l.habitId)) && currentSet.has(l.completedDate),
    );
    const prevActiveLogs = allLogs.filter(
      (l) => activeHabitIds.has(String(l.habitId)) && prevSet.has(l.completedDate),
    );

    // Total scheduled opportunities in window
    let totalScheduled = 0;
    const habitPerformance = habits.map((h) => {
      const id = String(h._id);
      const targetDays = h.targetDays || 7;
      const scheduled = Math.round((targetDays / 7) * days);
      totalScheduled += scheduled;

      const allDates = logsByHabit[id] ?? [];
      const currentCompletions = allDates.filter((d) => currentSet.has(d)).length;
      const rate = scheduled > 0 ? Math.min(100, Number(((currentCompletions / scheduled) * 100).toFixed(1))) : 0;
      const { current: currentStreak, longest: longestStreak } = calcStreak(allDates);

      return {
        habitId: h._id,
        name: h.name,
        icon: h.icon,
        color: h.color,
        category: h.category,
        scheduled,
        completions: currentCompletions,
        totalCompletions: allDates.length,
        rate,
        currentStreak,
        longestStreak,
      };
    });

    const totalCompletions = currentActiveLogs.length;
    const prevTotalCompletions = prevActiveLogs.length;

    const completionRate = totalScheduled > 0
      ? Math.min(100, Number(((totalCompletions / totalScheduled) * 100).toFixed(1)))
      : 0;
    const prevCompletionRate = totalScheduled > 0
      ? Math.min(100, Number(((prevTotalCompletions / totalScheduled) * 100).toFixed(1)))
      : 0;

    const absoluteChange = totalCompletions - prevTotalCompletions;
    let percentChange = 0;
    if (prevTotalCompletions > 0) {
      percentChange = Number((((totalCompletions - prevTotalCompletions) / prevTotalCompletions) * 100).toFixed(1));
    } else if (totalCompletions > 0) {
      percentChange = 100;
    }

    // Daily trend: map every single date in currentPeriod (including 0-count days)
    const logsPerDate = {};
    for (const log of currentActiveLogs) {
      logsPerDate[log.completedDate] = (logsPerDate[log.completedDate] || 0) + 1;
    }

    const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyTrend = currentPeriod.map((dateKey) => {
      const d = new Date(dateKey + 'T00:00:00Z');
      return {
        date: dateKey,
        dayName: dayNamesShort[d.getUTCDay()],
        count: logsPerDate[dateKey] || 0,
      };
    });

    // Best Day calculation: ISO day of week 1 (Mon) .. 7 (Sun)
    const dayOfWeekCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    for (const log of currentActiveLogs) {
      const d = new Date(log.completedDate + 'T00:00:00Z');
      const iso = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
      dayOfWeekCounts[iso] = (dayOfWeekCounts[iso] || 0) + 1;
    }

    const dayNamesFull = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let bestDay = null;
    let maxDayCount = 0;
    // Tie breaker: iterate 1..7 (earlier in ISO week wins: Mon < Tue < ... < Sun)
    for (let iso = 1; iso <= 7; iso++) {
      if (dayOfWeekCounts[iso] > maxDayCount) {
        maxDayCount = dayOfWeekCounts[iso];
        bestDay = {
          dayName: dayNamesFull[iso - 1],
          count: maxDayCount,
        };
      }
    }

    // Top habits: ranked by completion rate in period, then currentStreak, then completions, then name
    const sortedHabits = [...habitPerformance].sort((a, b) => {
      if (b.rate !== a.rate) return b.rate - a.rate;
      if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
      if (b.completions !== a.completions) return b.completions - a.completions;
      return a.name.localeCompare(b.name);
    });

    const topHabits = sortedHabits.filter((h) => h.completions > 0 || sortedHabits.length <= 3);
    const topHabit = sortedHabits.length > 0 ? sortedHabits[0] : null;

    // Habits needing attention: rate < 50% OR (currentStreak === 0 && totalCompletions > 0)
    const needsAttention = sortedHabits
      .filter((h) => h.rate < 50 || (h.currentStreak === 0 && h.totalCompletions > 0))
      .sort((a, b) => a.rate - b.rate);

    // Category performance
    const categoryMap = {};
    for (const h of habitPerformance) {
      const cat = h.category || 'other';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { category: cat, habitCount: 0, scheduled: 0, completions: 0 };
      }
      categoryMap[cat].habitCount += 1;
      categoryMap[cat].scheduled += h.scheduled;
      categoryMap[cat].completions += h.completions;
    }

    const categoryPerformance = Object.values(categoryMap).map((c) => ({
      category: c.category,
      habitCount: c.habitCount,
      completions: c.completions,
      rate: c.scheduled > 0 ? Math.min(100, Number(((c.completions / c.scheduled) * 100).toFixed(1))) : 0,
    })).sort((a, b) => b.completions - a.completions);

    res.json({
      period: { days, start, end, prevStart, prevEnd },
      summary: {
        totalCompletions,
        prevTotalCompletions,
        completionRate,
        prevCompletionRate,
        absoluteChange,
        percentChange,
        bestDay,
        topHabit: topHabit && (topHabit.completions > 0 || totalCompletions === 0) ? {
          habitId: topHabit.habitId,
          name: topHabit.name,
          icon: topHabit.icon,
          color: topHabit.color,
          rate: topHabit.rate,
          completions: topHabit.completions,
        } : null,
      },
      dailyTrend,
      topHabits: sortedHabits.slice(0, 5),
      needsAttention: needsAttention.slice(0, 5),
      categoryPerformance,
      activeHabitCount: habits.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get detailed long-term performance statistics and habit breakdowns.
 * GET /api/logs/statistics
 */
export async function getStatistics(req, res, next) {
  try {
    const habits = await Habit.find({ userId: req.user._id, isArchived: false })
      .select('_id name icon color category frequency targetDays createdAt');

    const allLogs = await HabitLog.find({ userId: req.user._id })
      .select('habitId completedDate')
      .sort({ completedDate: 1 });

    const totalCompletions = allLogs.length;

    // Group logs by habitId
    const byHabit = {};
    for (const log of allLogs) {
      const key = String(log.habitId);
      if (!byHabit[key]) byHabit[key] = [];
      byHabit[key].push(log.completedDate);
    }

    const last7Days = getLastNDays(7);
    const last30Days = getLastNDays(30);
    const last7Set = new Set(last7Days);
    const last30Set = new Set(last30Days);

    // 7-day stats
    const logs7 = allLogs.filter((l) => last7Set.has(l.completedDate));
    const activeDates7 = new Set(logs7.map((l) => l.completedDate));
    const totalScheduled7 = habits.reduce((acc, h) => acc + (h.targetDays || 7), 0);
    const completionRate7 = totalScheduled7 > 0
      ? Math.min(100, Number(((logs7.length / totalScheduled7) * 100).toFixed(1)))
      : 0;

    const sevenDay = {
      totalCompletions: logs7.length,
      activeDays: activeDates7.size,
      avgPerDay: Number((logs7.length / 7).toFixed(1)),
      completionRate: completionRate7,
    };

    // 30-day stats
    const logs30 = allLogs.filter((l) => last30Set.has(l.completedDate));
    const activeDates30 = new Set(logs30.map((l) => l.completedDate));
    const totalScheduled30 = habits.reduce((acc, h) => acc + Math.round(((h.targetDays || 7) / 7) * 30), 0);
    const completionRate30 = totalScheduled30 > 0
      ? Math.min(100, Number(((logs30.length / totalScheduled30) * 100).toFixed(1)))
      : 0;

    const thirtyDay = {
      totalCompletions: logs30.length,
      activeDays: activeDates30.size,
      avgPerDay: Number((logs30.length / 30).toFixed(1)),
      completionRate: completionRate30,
    };

    // Detailed per-habit stats
    const habitStats = habits.map((h) => {
      const id = String(h._id);
      const dates = byHabit[id] ?? [];
      const { current, longest } = calcStreak(dates);

      const inLast7 = dates.filter((d) => last7Set.has(d)).length;
      const inLast30 = dates.filter((d) => last30Set.has(d)).length;
      const scheduled30 = Math.round(((h.targetDays || 7) / 7) * 30);
      const rate30 = scheduled30 > 0 ? Math.min(100, Number(((inLast30 / scheduled30) * 100).toFixed(1))) : 0;
      const lastCompletedDate = dates.length > 0 ? dates[dates.length - 1] : null;

      return {
        habitId: h._id,
        name: h.name,
        icon: h.icon,
        color: h.color,
        category: h.category,
        frequency: h.frequency,
        targetDays: h.targetDays,
        currentStreak: current,
        longestStreak: longest,
        totalCompletions: dates.length,
        completionsLast7: inLast7,
        completionsLast30: inLast30,
        completionRate30: rate30,
        lastCompletedDate,
      };
    });

    const bestCurrentStreak = habitStats.length > 0 ? Math.max(0, ...habitStats.map((h) => h.currentStreak)) : 0;
    const bestLongestStreak = habitStats.length > 0 ? Math.max(0, ...habitStats.map((h) => h.longestStreak)) : 0;

    // Category distribution (Habit distribution + completion distribution)
    const categoryMap = {};
    for (const h of habits) {
      const cat = h.category || 'other';
      if (!categoryMap[cat]) categoryMap[cat] = { category: cat, habitCount: 0, totalCompletions: 0 };
      categoryMap[cat].habitCount += 1;
      const id = String(h._id);
      categoryMap[cat].totalCompletions += (byHabit[id] || []).length;
    }

    const categoryDistribution = Object.values(categoryMap).sort((a, b) => b.habitCount - a.habitCount);

    // Top habits and needs attention
    const topHabits = [...habitStats].sort((a, b) => {
      if (b.completionRate30 !== a.completionRate30) return b.completionRate30 - a.completionRate30;
      if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
      return b.totalCompletions - a.totalCompletions;
    });

    const needsAttention = [...habitStats]
      .filter((h) => h.completionRate30 < 50 || (h.currentStreak === 0 && h.totalCompletions > 0))
      .sort((a, b) => a.completionRate30 - b.completionRate30);

    res.json({
      overview: {
        totalCompletions,
        activeHabits: habits.length,
        bestCurrentStreak,
        bestLongestStreak,
      },
      sevenDay,
      thirtyDay,
      habitStats,
      categoryDistribution,
      topHabits: topHabits.slice(0, 5),
      needsAttention: needsAttention.slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
}

