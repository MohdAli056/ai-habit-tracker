/**
 * Streak calculation engine.
 *
 * calcStreak(completedDates, todayKey?) → { current, longest }
 *
 * Input: an array of YYYY-MM-DD date-key strings (may have duplicates, any order).
 *        Optional todayKey overrides "today" for deterministic testing.
 * Output: { current: number, longest: number }
 *
 * Current streak rules:
 *   1. If today is in the set → count consecutive days backwards from today.
 *   2. Else if yesterday is in the set → count backwards from yesterday.
 *   3. Otherwise → 0.
 *
 * Longest streak: walk the full sorted set and find the longest consecutive run.
 */

import { getTodayKey } from './date.js';

/** Parse YYYY-MM-DD into UTC milliseconds. */
function keyToMs(key) {
  return new Date(key + 'T00:00:00Z').getTime();
}

const ONE_DAY_MS = 86_400_000;

function msToDayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * @param {string[]} completedDates — YYYY-MM-DD strings (possibly unsorted/duplicate)
 * @param {string} [overrideToday] — optional "today" override for testing
 * @returns {{ current: number, longest: number }}
 */
export function calcStreak(completedDates, overrideToday) {
  if (!completedDates || completedDates.length === 0) {
    return { current: 0, longest: 0 };
  }

  // De-duplicate and sort ascending.
  const sorted = [...new Set(completedDates)].sort();

  // ── Longest streak ─────────────────────────────────────────────────────────
  let longest = 1;
  let runLen = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = keyToMs(sorted[i]) - keyToMs(sorted[i - 1]);
    if (diff === ONE_DAY_MS) {
      runLen += 1;
      if (runLen > longest) longest = runLen;
    } else {
      runLen = 1;
    }
  }

  // ── Current streak ─────────────────────────────────────────────────────────
  const dateSet = new Set(sorted);
  const today = overrideToday ?? getTodayKey();
  const yesterday = msToDayKey(keyToMs(today) - ONE_DAY_MS);

  let anchor = null;
  if (dateSet.has(today)) {
    anchor = today;
  } else if (dateSet.has(yesterday)) {
    anchor = yesterday;
  }

  let current = 0;
  if (anchor) {
    current = 1;
    let cursor = keyToMs(anchor);
    while (true) {
      cursor -= ONE_DAY_MS;
      const prevKey = msToDayKey(cursor);
      if (dateSet.has(prevKey)) {
        current += 1;
      } else {
        break;
      }
    }
  }

  return { current, longest };
}
