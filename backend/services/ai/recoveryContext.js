/**
 * Recovery Context Builder.
 *
 * Deterministically constructs compact context for habit streak recovery.
 *
 * Rules:
 *   - Reuses existing calcStreak() utility — never reinvents streak math.
 *   - Habit is recovery-eligible if:
 *       1. habit is active (!isArchived)
 *       2. totalCompletions > 0
 *       3. currentStreak === 0
 *       4. longestStreak >= 3
 *   - Never exposes user credentials, emails, passwords, JWTs, or internal database IDs.
 */

import HabitLog from '../../models/HabitLog.js';
import { getLastNDays } from '../../utils/date.js';
import { calcStreak } from '../../utils/streak.js';

/**
 * Builds deterministic recovery context for a specific habit.
 *
 * @param {Object} habit — Mongoose Habit document
 * @param {string|mongoose.Types.ObjectId} userId — Authenticated user ID
 * @param {string} [overrideToday] — Optional date string override for testing
 * @returns {Promise<{
 *   eligible: boolean,
 *   reason?: string,
 *   habit: { name: string, category: string, frequency: string, targetDays: number },
 *   streak: { current: number, longest: number },
 *   history: { recentCompletedDays: number, recentMissedDays: number, totalCompletions: number },
 *   recentPattern: Array<{ date: string, completed: boolean }>,
 *   recovery: { eligible: boolean, reason?: string }
 * }>}
 */
export async function buildRecoveryContext(habit, userId, overrideToday) {
  // 1. Fetch all completion logs for this habit
  const logs = await HabitLog.find({ userId, habitId: habit._id })
    .select('completedDate')
    .sort({ completedDate: 1 });

  const completedDates = logs.map((l) => l.completedDate);
  const totalCompletions = completedDates.length;

  // 2. Authoritative streak calculation using existing engine
  const { current: currentStreak, longest: longestStreak } = calcStreak(
    completedDates,
    overrideToday,
  );

  // 3. Deterministic eligibility determination
  let eligible = false;
  let reason = 'NO_RECOVERY_NEEDED';

  if (habit.isArchived) {
    eligible = false;
    reason = 'HABIT_ARCHIVED';
  } else if (totalCompletions === 0 || longestStreak < 3) {
    eligible = false;
    reason = 'INSUFFICIENT_HISTORY';
  } else if (currentStreak > 0) {
    eligible = false;
    reason = 'NO_RECOVERY_NEEDED';
  } else {
    // Active, has completions, broken streak (current === 0), and demonstrated momentum (longest >= 3)
    eligible = true;
    reason = undefined;
  }

  // 4. Recent completion pattern (last 7 days window)
  const last7Days = getLastNDays(7);
  const datesSet = new Set(completedDates);
  const recentPattern = last7Days.map((date) => ({
    date,
    completed: datesSet.has(date),
  }));

  const recentCompletedDays = recentPattern.filter((p) => p.completed).length;
  const recentMissedDays = 7 - recentCompletedDays;

  // 5. Assemble sanitized context (strictly non-sensitive)
  return {
    eligible,
    reason,
    habit: {
      name: habit.name,
      category: habit.category,
      frequency: habit.frequency,
      targetDays: habit.targetDays,
    },
    streak: {
      current: currentStreak,
      longest: longestStreak,
    },
    history: {
      totalCompletions,
      recentCompletedDays,
      recentMissedDays,
    },
    recentPattern,
    recovery: {
      eligible,
      ...(reason ? { reason } : {}),
    },
  };
}

export default buildRecoveryContext;
