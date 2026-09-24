/**
 * Deterministic Weekly Context Builder.
 *
 * Gathers and normalizes purely deterministic metrics for a given user and week
 * (Monday–Sunday) to supply as context to Gemini.
 *
 * Guarantees:
 *   - Backend remains single source of truth for calculations (rates, streaks, counts)
 *   - Gemini does NOT recalculate numbers
 *   - Zero user credentials or sensitive profile data (no email, password, JWT, IDs)
 *   - Sanitized habit names (treated strictly as untrusted data)
 */

import Habit from '../../models/Habit.js';
import HabitLog from '../../models/HabitLog.js';
import { calcStreak } from '../../utils/streak.js';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Sanitize untrusted user habit name to prevent instruction injection.
 */
function sanitizeHabitName(name) {
  if (!name || typeof name !== 'string') return 'Habit';
  return name.trim().slice(0, 60).replace(/[\r\n\t]/g, ' ');
}

/**
 * Build deterministic weekly context for Gemini interpretation.
 *
 * @param {string|mongoose.Types.ObjectId} userId — Authenticated user ID
 * @param {string} weekStart — Monday YYYY-MM-DD
 * @param {string} weekEnd — Sunday YYYY-MM-DD
 * @returns {Promise<Object>} Compact deterministic context object
 */
export async function buildWeeklyContext(userId, weekStart, weekEnd) {
  // 1. Fetch active habits for user
  const activeHabits = await Habit.find({ userId, isArchived: false })
    .select('_id name category targetDays frequency')
    .sort({ order: 1, createdAt: 1 });

  // 2. Fetch all logs for user (needed for authoritative streaks)
  const allLogs = await HabitLog.find({ userId }).select('habitId completedDate');

  // Group all logs by habitId
  const logsByHabit = {};
  for (const log of allLogs) {
    const hId = String(log.habitId);
    if (!logsByHabit[hId]) logsByHabit[hId] = [];
    logsByHabit[hId].push(log.completedDate);
  }

  // 3. Filter weekly logs for active habits
  const activeHabitIds = new Set(activeHabits.map((h) => String(h._id)));
  const weeklyLogs = allLogs.filter(
    (l) => activeHabitIds.has(String(l.habitId)) && l.completedDate >= weekStart && l.completedDate <= weekEnd,
  );

  // Group weekly completions by habitId
  const weeklyByHabit = {};
  for (const log of weeklyLogs) {
    const hId = String(log.habitId);
    weeklyByHabit[hId] = (weeklyByHabit[hId] || 0) + 1;
  }

  // 4. Daily completion counts and Best Day calculation
  // ISO days: 1 = Mon, ..., 7 = Sun
  const isoCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  const dailyCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

  for (const log of weeklyLogs) {
    const d = new Date(log.completedDate + 'T00:00:00Z');
    const iso = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    isoCounts[iso] = (isoCounts[iso] || 0) + 1;
    dailyCounts[DAY_NAMES[iso - 1]] = (dailyCounts[DAY_NAMES[iso - 1]] || 0) + 1;
  }

  let bestDay = null;
  let maxCount = 0;
  // Deterministic tie-breaker: iterate 1..7 (earlier ISO day wins: Mon < Tue < ... < Sun)
  for (let iso = 1; iso <= 7; iso++) {
    if (isoCounts[iso] > maxCount) {
      maxCount = isoCounts[iso];
      bestDay = {
        day: DAY_NAMES_FULL[iso - 1],
        completions: maxCount,
      };
    }
  }

  // 5. Per-habit calculations
  let totalScheduled = 0;
  const habitDetails = activeHabits.map((h) => {
    const hId = String(h._id);
    const targetDays = h.targetDays || 7;
    totalScheduled += targetDays;

    const completedDays = weeklyByHabit[hId] || 0;
    const completionRate = targetDays > 0
      ? Math.min(100, Number(((completedDays / targetDays) * 100).toFixed(1)))
      : 0;

    const allDates = logsByHabit[hId] || [];
    const { current: currentStreak, longest: longestStreak } = calcStreak(allDates);

    return {
      name: sanitizeHabitName(h.name),
      category: h.category || 'other',
      targetDays,
      completedDays,
      completionRate,
      currentStreak,
      longestStreak,
    };
  });

  const totalCompletions = weeklyLogs.length;
  const completionRate = totalScheduled > 0
    ? Math.min(100, Number(((totalCompletions / totalScheduled) * 100).toFixed(1)))
    : 0;

  // 6. High-level categorization
  const strongHabits = habitDetails.filter((h) => h.completionRate >= 75);
  const habitsNeedingFocus = habitDetails.filter((h) => h.completionRate < 50);

  return {
    week: {
      start: weekStart,
      end: weekEnd,
    },
    summary: {
      activeHabitsCount: activeHabits.length,
      totalCompletions,
      totalScheduled,
      completionRate,
      bestDay: bestDay ? `${bestDay.day} (${bestDay.completions} completions)` : 'None recorded',
    },
    dailyBreakdown: dailyCounts,
    habits: habitDetails,
    highlights: {
      strongHabitsCount: strongHabits.length,
      needsFocusCount: habitsNeedingFocus.length,
    },
  };
}
