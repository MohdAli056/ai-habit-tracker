/**
 * Date utilities for the frontend — consistent UTC-based YYYY-MM-DD calculations.
 * Matches backend date semantics to prevent timezone drifts across environments.
 */

const FMT_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Format Date object to YYYY-MM-DD using UTC fields.
 */
export function toDateKey(date = new Date()) {
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
 * Return the last N calendar date keys in ascending chronological order ending today.
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
 * Parse YYYY-MM-DD into a UTC Date object.
 */
export function parseUTCDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Return the Monday key for the week containing `dateKey`.
 * ISO week convention: Monday is day 1, Sunday is day 7.
 */
export function getWeekStart(dateKey = getTodayKey()) {
  const date = parseUTCDate(dateKey);
  const day = date.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return toDateKey(date);
}

/**
 * Return the Sunday key for the week containing `dateKey`.
 */
export function getWeekEnd(dateKey = getTodayKey()) {
  const mondayKey = getWeekStart(dateKey);
  const date = parseUTCDate(mondayKey);
  date.setUTCDate(date.getUTCDate() + 6);
  return toDateKey(date);
}

/**
 * Return all 7 date keys (Monday to Sunday) for the week containing `dateKey`.
 */
export function getWeekDays(dateKey = getTodayKey()) {
  const mondayKey = getWeekStart(dateKey);
  const result = [];
  for (let i = 0; i < 7; i++) {
    const d = parseUTCDate(mondayKey);
    d.setUTCDate(d.getUTCDate() + i);
    result.push(toDateKey(d));
  }
  return result;
}

/**
 * Shift a date by N weeks forward (positive) or backward (negative).
 */
export function shiftWeek(dateKey, deltaWeeks) {
  const d = parseUTCDate(dateKey);
  d.setUTCDate(d.getUTCDate() + deltaWeeks * 7);
  return toDateKey(d);
}

/**
 * Format human-readable week range label.
 * E.g. "Sep 21 – 27, 2026" or "Sep 28 – Oct 4, 2026" or "Dec 28, 2026 – Jan 3, 2027"
 */
export function formatWeekRange(startKey, endKey) {
  const s = parseUTCDate(startKey);
  const e = parseUTCDate(endKey);

  const sMonth = s.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const sDay = s.getUTCDate();
  const sYear = s.getUTCFullYear();

  const eMonth = e.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const eDay = e.getUTCDate();
  const eYear = e.getUTCFullYear();

  if (sYear === eYear) {
    if (sMonth === eMonth) {
      return `${sMonth} ${sDay} – ${eDay}, ${sYear}`;
    }
    return `${sMonth} ${sDay} – ${eMonth} ${eDay}, ${sYear}`;
  }
  return `${sMonth} ${sDay}, ${sYear} – ${eMonth} ${eDay}, ${eYear}`;
}

/**
 * Format day column header e.g. { dayName: 'Mon', dayNumber: 21 }.
 */
export function formatDayHeader(dateKey) {
  const d = parseUTCDate(dateKey);
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const dayNumber = d.getUTCDate();
  return { dayName, dayNumber };
}

/**
 * Validate YYYY-MM-DD string format and calendar validity.
 */
export function isValidDateKey(s) {
  if (typeof s !== 'string' || !FMT_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().startsWith(s);
}
