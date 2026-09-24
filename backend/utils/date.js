/**
 * Date utilities — consistent YYYY-MM-DD key helpers.
 *
 * All date keys are based on UTC to avoid local-timezone shifts between
 * server environments. A user who completes "today" at 11 PM IST will get
 * the same key as one who does it at 10 PM UTC — UTC is the consistent base.
 *
 * Uses date-fns for calendar math.
 */

import {
  addDays,
  format,
  getISODay,
  parseISO,
  subDays,
} from 'date-fns';

const FMT = 'yyyy-MM-dd';

/**
 * Format a Date as YYYY-MM-DD using UTC calendar.
 */
export function toDateKey(date = new Date()) {
  // Build date parts from UTC fields to stay timezone-neutral.
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Today's date key (UTC).
 */
export function getTodayKey() {
  return toDateKey(new Date());
}

/**
 * Yesterday's date key (UTC).
 */
export function getYesterdayKey() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return toDateKey(d);
}

/**
 * Return the last N calendar date keys in ascending chronological order.
 * E.g. getLastNDays(3) → ['2026-09-19', '2026-09-20', '2026-09-21']
 */
export function getLastNDays(n) {
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    result.push(toDateKey(d));
  }
  return result;
}

/**
 * Monday–Sunday of the week that contains `date`.
 * Uses ISO week convention (Monday = day 1).
 */
export function getCurrentWeek() {
  const today = new Date();
  const todayKey = toDateKey(today);
  const parsed = parseISO(todayKey); // midnight local to date-fns

  // getISODay: Mon=1 … Sun=7
  const dayOfWeek = getISODay(parsed);
  const monday = subDays(parsed, dayOfWeek - 1);

  return Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), FMT));
}

/**
 * Return the Monday key for the week containing `dateKey` (string or Date).
 */
export function getWeekStart(date = new Date()) {
  const dateKey = typeof date === 'string' ? date : toDateKey(date);
  const parsed = parseISO(dateKey);
  const dayOfWeek = getISODay(parsed);
  return format(subDays(parsed, dayOfWeek - 1), FMT);
}

/**
 * Return the Sunday key for the week containing `dateKey` (string or Date).
 */
export function getWeekEnd(date = new Date()) {
  const dateKey = typeof date === 'string' ? date : toDateKey(date);
  const parsed = parseISO(dateKey);
  const dayOfWeek = getISODay(parsed);
  return format(addDays(parsed, 7 - dayOfWeek), FMT);
}

/**
 * Validate that a string is a parseable YYYY-MM-DD date key.
 */
export function isValidDateKey(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().startsWith(s);
}
