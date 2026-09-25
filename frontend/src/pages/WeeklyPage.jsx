/**
 * WeeklyPage — 7-day Monday–Sunday habit tracker grid and weekly analytics.
 *
 * Features:
 *   - Monday–Sunday week structure using pure UTC date utilities
 *   - Previous week, Next week, and Today navigation
 *   - Dynamic date range header (e.g. "Sep 21 – Sep 27, 2026")
 *   - 4 summary cards: Total completions, completion rate, best day, active habits
 *   - Interactive 7-day completion grid with sticky habit column for mobile
 *   - Cell-level completion toggling via logsApi (completeHabit / uncompleteHabit)
 *   - Current day indicator (highlighted column + "Today" badge) only when week contains today
 *   - Per-habit weekly progress tally and server-calculated streak badge
 *   - Polished empty states, loading spinner, and retryable error handling
 */

import {
  AlertCircle,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Lightbulb,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { aiApi } from '../api/ai.js';
import { habitsApi } from '../api/habits.js';
import { logsApi } from '../api/logs.js';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.jsx';
import {
  formatDayHeader,
  formatWeekRange,
  getTodayKey,
  getWeekDays,
  getWeekEnd,
  getWeekStart,
  shiftWeek,
} from '../utils/date.js';

export function WeeklyPage() {
  // Current anchor date (defaults to today)
  const [selectedDateKey, setSelectedDateKey] = useState(getTodayKey);

  // Data state
  const [habits, setHabits] = useState([]);
  const [weeklyLogs, setWeeklyLogs] = useState([]);
  const [streakMap, setStreakMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cell toggling in-flight state: { "habitId:dateKey": boolean }
  const [cellLoading, setCellLoading] = useState({});
  const [cellError, setCellError] = useState('');

  // AI Weekly Report State
  const [aiReport, setAiReport] = useState(null);
  const [aiMeta, setAiMeta] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);


  // 
  const todayKey = useMemo(() => getTodayKey(), []);
  const weekStart = useMemo(() => getWeekStart(selectedDateKey), [selectedDateKey]);
  const weekEnd = useMemo(() => getWeekEnd(selectedDateKey), [selectedDateKey]);
  const weekDays = useMemo(() => getWeekDays(selectedDateKey), [selectedDateKey]);
  const isCurrentWeek = useMemo(() => weekDays.includes(todayKey), [weekDays, todayKey]);
  const weekRangeLabel = useMemo(() => formatWeekRange(weekStart, weekEnd), [weekStart, weekEnd]);

  // 
  const fetchWeeklyData = useCallback(async () => {
    setLoading(true);
    setError('');
    setCellError('');
    try {
      const [habitsRes, rangeRes, statsRes] = await Promise.all([
        habitsApi.getHabits({ archived: false }),
        logsApi.getLogsRange(weekStart, weekEnd),
        logsApi.getAllStats(),
      ]);

      setHabits(habitsRes.data.habits || []);
      setWeeklyLogs(rangeRes.data.logs || []);

      const streaks = {};
      if (statsRes.data?.habits) {
        for (const h of statsRes.data.habits) {
          streaks[String(h.habitId)] = h.currentStreak || 0;
        }
      }
      setStreakMap(streaks);
    } catch (err) {
      console.error('Failed to load weekly data:', err);
      setError('Could not load weekly data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    fetchWeeklyData();
  }, [fetchWeeklyData]);

  // 
  useEffect(() => {
    let isMounted = true;
    async function loadCachedReport() {
      setAiError(null);
      try {
        const res = await aiApi.getWeeklyReport(weekStart);
        if (isMounted) {
          if (res.data?.cached && res.data?.report) {
            setAiReport(res.data.report);
            setAiMeta(res.data.meta);
          } else {
            setAiReport(null);
            setAiMeta(null);
          }
        }
      } catch {
        if (isMounted) {
          setAiReport(null);
          setAiMeta(null);
        }
      }
    }

    loadCachedReport();

    return () => {
      isMounted = false;
    };
  }, [weekStart]);

  // 
  async function handleGenerateReport(useMock = false) {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await aiApi.generateWeeklyReport(weekStart, useMock);
      setAiReport(res.data.report);
      setAiMeta(res.data.meta);
    } catch (err) {
      console.error('Failed to generate weekly insight:', err);
      const code = err.response?.data?.code;
      const message =
        err.response?.data?.message || 'Failed to generate weekly insight. Please try again.';
      setAiError({ code, message });
    } finally {
      setAiLoading(false);
    }
  }


  // 
  // Set of "habitId:dateKey" for fast O(1) checks
  const completedCellSet = useMemo(() => {
    const set = new Set();
    for (const log of weeklyLogs) {
      set.add(`${log.habitId}:${log.completedDate}`);
    }
    return set;
  }, [weeklyLogs]);

  // 
  const activeHabitsCount = habits.length;
  const activeHabitIdSet = useMemo(() => new Set(habits.map((h) => String(h._id))), [habits]);

  // Count completions belonging to active habits only
  const totalWeeklyCompletions = useMemo(() => {
    return weeklyLogs.filter((l) => activeHabitIdSet.has(String(l.habitId))).length;
  }, [weeklyLogs, activeHabitIdSet]);

  const maxPossibleCompletions = activeHabitsCount * 7;
  const weeklyCompletionRate =
    maxPossibleCompletions > 0 ? Math.min(100, Math.round((totalWeeklyCompletions / maxPossibleCompletions) * 100)) : 0;

  // Best day computation
  const bestDayInfo = useMemo(() => {
    if (totalWeeklyCompletions === 0) return { label: 'None', count: 0 };

    const countsByDay = {};
    for (const day of weekDays) {
      countsByDay[day] = 0;
    }
    for (const log of weeklyLogs) {
      if (activeHabitIdSet.has(String(log.habitId)) && countsByDay[log.completedDate] !== undefined) {
        countsByDay[log.completedDate]++;
      }
    }

    let bestDay = null;
    let maxCount = 0;
    for (const day of weekDays) {
      if (countsByDay[day] > maxCount) {
        maxCount = countsByDay[day];
        bestDay = day;
      }
    }

    if (!bestDay || maxCount === 0) return { label: 'None', count: 0 };
    const { dayName } = formatDayHeader(bestDay);
    return { label: dayName, count: maxCount };
  }, [weekDays, weeklyLogs, activeHabitIdSet, totalWeeklyCompletions]);

  // Count per-habit completions in this week
  const habitWeeklyCountMap = useMemo(() => {
    const map = {};
    for (const h of habits) {
      map[String(h._id)] = 0;
    }
    for (const log of weeklyLogs) {
      const id = String(log.habitId);
      if (map[id] !== undefined) {
        map[id]++;
      }
    }
    return map;
  }, [habits, weeklyLogs]);

  // 
  async function handleToggleCell(habitId, dateKey) {
    const cellKey = `${habitId}:${dateKey}`;
    if (cellLoading[cellKey]) return; // In-flight guard

    const isCurrentlyDone = completedCellSet.has(cellKey);

    // Optimistic state update
    setCellLoading((prev) => ({ ...prev, [cellKey]: true }));
    setCellError('');

    if (isCurrentlyDone) {
      // Optimistically remove
      setWeeklyLogs((prev) =>
        prev.filter((l) => !(String(l.habitId) === String(habitId) && l.completedDate === dateKey)),
      );
    } else {
      // Optimistically add
      setWeeklyLogs((prev) => [
        ...prev,
        { _id: `opt-${Date.now()}`, habitId, completedDate: dateKey },
      ]);
    }

    try {
      if (isCurrentlyDone) {
        await logsApi.uncompleteHabit(habitId, dateKey);
      } else {
        await logsApi.completeHabit(habitId, dateKey);
      }
    } catch (err) {
      console.error('Failed to toggle completion for cell:', err);
      // Revert optimistic update
      if (isCurrentlyDone) {
        setWeeklyLogs((prev) => [
          ...prev,
          { _id: `rev-${Date.now()}`, habitId, completedDate: dateKey },
        ]);
      } else {
        setWeeklyLogs((prev) =>
          prev.filter((l) => !(String(l.habitId) === String(habitId) && l.completedDate === dateKey)),
        );
      }
      setCellError('Could not update completion. Please try again.');
    } finally {
      setCellLoading((prev) => {
        const next = { ...prev };
        delete next[cellKey];
        return next;
      });
    }
  }

  // 
  function handlePrevWeek() {
    setSelectedDateKey((prev) => shiftWeek(prev, -1));
  }

  function handleNextWeek() {
    setSelectedDateKey((prev) => shiftWeek(prev, 1));
  }

  function handleToday() {
    setSelectedDateKey(getTodayKey());
  }

  // 
  if (loading && habits.length === 0) {
    return (
      <PageContainer className="weekly-page">
        <div className="weekly-loading" role="status" aria-label="Loading weekly tracker">
          <LoadingSpinner size="lg" />
          <p className="weekly-loading-text">Loading your weekly tracker…</p>
        </div>
      </PageContainer>
    );
  }

  // 
  if (error && habits.length === 0) {
    return (
      <PageContainer className="weekly-page">
        <div className="weekly-error-card" role="alert">
          <p className="weekly-error-message">{error}</p>
          <Button onClick={fetchWeeklyData} size="sm">
            <RotateCcw size={15} aria-hidden="true" /> Try again
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="weekly-page">
      {/* Header and Week Navigation */}
      <header className="weekly-header">
        <div>
          <h1 className="weekly-title">Weekly Tracker</h1>
          <p className="weekly-subtitle">Review and log your consistency across the week.</p>
        </div>

        <div className="weekly-nav-controls" role="navigation" aria-label="Week navigation">
          <div className="weekly-date-range-badge" aria-label={`Selected week: ${weekRangeLabel}`}>
            <CalendarIcon size={14} aria-hidden="true" />
            <span>{weekRangeLabel}</span>
          </div>

          <div className="weekly-btn-group">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handlePrevWeek}
              aria-label="Previous week"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              type="button"
              variant={isCurrentWeek ? 'ghost' : 'secondary'}
              size="sm"
              onClick={handleToday}
              disabled={isCurrentWeek}
              aria-label="Jump to current week"
            >
              Today
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleNextWeek}
              aria-label="Next week"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </header>

      {/* Global cell error alert */}
      {cellError && (
        <p className="form-alert" role="alert" style={{ marginBottom: '1.25rem' }}>
          {cellError}
        </p>
      )}

      {/* Weekly Summary Cards */}
      <section className="weekly-summary-grid" aria-label="Weekly summary metrics">
        {/* Card 1: Total Completions */}
        <Card className="weekly-summary-card">
          <div className="summary-card-header">
            <span className="summary-card-label">Weekly Check-Ins</span>
            <div className="summary-card-icon-wrap icon-completions" aria-hidden="true">
              <Trophy size={18} />
            </div>
          </div>
          <div className="summary-card-stat">
            <span className="summary-card-number">{totalWeeklyCompletions}</span>
            <span className="summary-card-unit">{totalWeeklyCompletions === 1 ? 'completion' : 'completions'}</span>
          </div>
          <p className="summary-card-sub">
            {maxPossibleCompletions > 0 ? `Out of ${maxPossibleCompletions} possible this week` : 'No active habits'}
          </p>
        </Card>

        {/* Card 2: Completion Rate */}
        <Card className="weekly-summary-card">
          <div className="summary-card-header">
            <span className="summary-card-label">Completion Rate</span>
            <div className="summary-card-icon-wrap icon-habits" aria-hidden="true">
              <Target size={18} />
            </div>
          </div>
          <div className="summary-card-stat">
            <span className="summary-card-number">{weeklyCompletionRate}%</span>
            <span className="summary-card-unit">consistency</span>
          </div>
          <p className="summary-card-sub">
            {weeklyCompletionRate === 100
              ? 'Flawless execution this week! 🎉'
              : weeklyCompletionRate > 0
              ? 'Routines completed on schedule'
              : 'Start checking off routines'}
          </p>
        </Card>

        {/* Card 3: Best Day */}
        <Card className="weekly-summary-card">
          <div className="summary-card-header">
            <span className="summary-card-label">Best Day</span>
            <div className="summary-card-icon-wrap icon-streak" aria-hidden="true">
              <Flame size={18} />
            </div>
          </div>
          <div className="summary-card-stat">
            <span className="summary-card-number">{bestDayInfo.label}</span>
            {bestDayInfo.count > 0 && (
              <span className="summary-card-unit">({bestDayInfo.count} done)</span>
            )}
          </div>
          <p className="summary-card-sub">
            {bestDayInfo.count > 0 ? 'Highest check-in tally this week' : 'No completions recorded this week'}
          </p>
        </Card>

        {/* Card 4: Active Habits */}
        <Card className="weekly-summary-card">
          <div className="summary-card-header">
            <span className="summary-card-label">Active Habits</span>
            <div className="summary-card-icon-wrap icon-habits" aria-hidden="true">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="summary-card-stat">
            <span className="summary-card-number">{activeHabitsCount}</span>
            <span className="summary-card-unit">{activeHabitsCount === 1 ? 'routine' : 'routines'}</span>
          </div>
          <p className="summary-card-sub">Tracked in this weekly cycle</p>
        </Card>
      </section>

      {/* Main Weekly Content */}
      {activeHabitsCount === 0 ? (
        <Card className="weekly-empty-card">
          <EmptyState
            icon={Sparkles}
            title="You don't have any active habits yet."
            description="Create your first habit to track your weekly rhythm, build streaks, and stay accountable."
            action={
              <Button as={Link} to="/habits" size="sm">
                <Plus size={15} aria-hidden="true" /> Create habit
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="weekly-table-card">
          {totalWeeklyCompletions === 0 && (
            <div className="weekly-empty-notice" role="status">
              <span>No completions recorded for this week. Click any cell to log your habits!</span>
            </div>
          )}

          {/* Horizontally contained grid wrapper for mobile safety */}
          <div className="weekly-grid-wrapper" role="region" aria-label="Weekly habit grid">
            <table className="weekly-table">
              <thead>
                <tr>
                  <th scope="col" className="weekly-th-habit">
                    Habit
                  </th>
                  {weekDays.map((dateKey) => {
                    const { dayName, dayNumber } = formatDayHeader(dateKey);
                    const isToday = dateKey === todayKey;

                    return (
                      <th
                        key={dateKey}
                        scope="col"
                        className={`weekly-th-day ${isToday ? 'weekly-col-today' : ''}`}
                      >
                        <div className="weekly-day-header">
                          <span className="weekly-day-name">{dayName}</span>
                          <span className="weekly-day-num">{dayNumber}</span>
                          {isToday && <span className="weekly-today-chip">Today</span>}
                        </div>
                      </th>
                    );
                  })}
                  <th scope="col" className="weekly-th-progress">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody>
                {habits.map((habit) => {
                  const habitIdStr = String(habit._id);
                  const streak = streakMap[habitIdStr] || 0;
                  const completedDays = habitWeeklyCountMap[habitIdStr] || 0;
                  const targetDays = habit.targetDays || 7;

                  return (
                    <tr key={habit._id} className="weekly-tr-habit">
                      {/* Sticky habit info column */}
                      <td className="weekly-td-habit">
                        <div className="weekly-habit-info">
                          <span className="weekly-habit-icon" role="img" aria-label={habit.name}>
                            {habit.icon || '⭐'}
                          </span>
                          <div className="weekly-habit-meta">
                            <span className="weekly-habit-name">{habit.name}</span>
                            <div className="weekly-habit-badges">
                              <Badge tone="neutral">{habit.category}</Badge>
                              {streak > 0 && (
                                <Badge tone="warning">🔥 {streak}d</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 7 Interactive Day Cells */}
                      {weekDays.map((dateKey) => {
                        const cellKey = `${habit._id}:${dateKey}`;
                        const isDone = completedCellSet.has(cellKey);
                        const isToday = dateKey === todayKey;
                        const isLoading = Boolean(cellLoading[cellKey]);

                        return (
                          <td
                            key={dateKey}
                            className={`weekly-td-cell ${isToday ? 'weekly-col-today' : ''}`}
                          >
                            <button
                              type="button"
                              className={`weekly-cell-btn ${
                                isDone ? 'weekly-cell-done' : ''
                              }`}
                              onClick={() => handleToggleCell(habit._id, dateKey)}
                              disabled={isLoading}
                              aria-label={`${habit.name} on ${dateKey}: ${
                                isDone ? 'Completed. Click to unmark.' : 'Incomplete. Click to mark complete.'
                              }`}
                              aria-pressed={isDone}
                            >
                              {isLoading ? (
                                <Loader2 size={15} className="spin" aria-hidden="true" />
                              ) : isDone ? (
                                <Check size={16} aria-hidden="true" />
                              ) : (
                                <span className="weekly-cell-dot" aria-hidden="true" />
                              )}
                            </button>
                          </td>
                        );
                      })}

                      {/* Habit Weekly Progress Column */}
                      <td className="weekly-td-progress">
                        <div className="weekly-progress-pill">
                          <span className="weekly-progress-count">
                            {completedDays} / {targetDays}d
                          </span>
                          {completedDays >= targetDays && (
                            <span className="weekly-target-met" title="Weekly target achieved">
                              ✓
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/*  */}
      <section className="weekly-ai-section" aria-label="AI Weekly Reflection">
        {aiLoading ? (
          <Card className="weekly-ai-card weekly-ai-loading-card">
            <Loader2 size={36} className="spin weekly-ai-loading-spinner" aria-hidden="true" />
            <h3 className="weekly-ai-loading-title">Synthesizing your weekly performance…</h3>
            <p className="weekly-ai-loading-desc">
              Analyzing consistency, habit execution, and streak momentum for {weekRangeLabel}.
            </p>
          </Card>
        ) : aiError ? (
          <Card
            className={`weekly-ai-card weekly-ai-notice-card ${
              aiError.code === 'AI_NOT_CONFIGURED' ? 'unconfigured' : 'error'
            }`}
          >
            <AlertCircle
              size={24}
              className={aiError.code === 'AI_NOT_CONFIGURED' ? 'text-muted' : 'text-danger'}
              aria-hidden="true"
            />
            <div className="weekly-ai-notice-content">
              <h3 className="weekly-ai-notice-title">
                {aiError.code === 'AI_NOT_CONFIGURED'
                  ? 'AI Weekly Reflection Unavailable'
                  : 'Could Not Generate Insight'}
              </h3>
              <p className="weekly-ai-notice-desc">{aiError.message}</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {aiError.code !== 'AI_NOT_CONFIGURED' && (
                  <Button size="sm" onClick={() => handleGenerateReport(false)}>
                    <RotateCcw size={14} aria-hidden="true" /> Try again
                  </Button>
                )}
                {import.meta.env.DEV && aiError.code === 'AI_NOT_CONFIGURED' && (
                  <Button size="sm" variant="secondary" onClick={() => handleGenerateReport(true)}>
                    <Sparkles size={14} aria-hidden="true" /> Preview with Mock AI (Dev)
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ) : aiReport ? (
          <Card className="weekly-ai-card">
            <header className="weekly-ai-header">
              <div className="weekly-ai-title-wrap">
                <div className="weekly-ai-icon-badge" aria-hidden="true">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 className="weekly-ai-title">AI Weekly Reflection</h2>
                </div>
              </div>
              <div className="weekly-ai-badge-group">
                {aiMeta?.provider === 'mock' ? (
                  <Badge tone="warning">Mock AI</Badge>
                ) : (
                  <Badge tone="primary">Gemini 2.5</Badge>
                )}
                <Badge tone="neutral">Week of {weekRangeLabel}</Badge>
              </div>
            </header>

            {/* Headline Callout */}
            <div className="weekly-ai-headline-box">
              <h3 className="weekly-ai-headline">{aiReport.headline}</h3>
            </div>

            {/* Summary */}
            <p className="weekly-ai-summary">{aiReport.summary}</p>

            {/* 2-Column Wins & Focus Areas */}
            <div className="weekly-ai-split-grid">
              {/* Wins Card */}
              <div className="weekly-ai-list-card wins">
                <div className="weekly-ai-list-header wins">
                  <Trophy size={16} aria-hidden="true" />
                  <span>Key Wins</span>
                </div>
                <ul className="weekly-ai-list">
                  {aiReport.wins?.map((win, idx) => (
                    <li key={idx} className="weekly-ai-list-item">
                      {win}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Focus Areas Card */}
              <div className="weekly-ai-list-card focus">
                <div className="weekly-ai-list-header focus">
                  <Target size={16} aria-hidden="true" />
                  <span>Focus Areas</span>
                </div>
                {aiReport.focusAreas && aiReport.focusAreas.length > 0 ? (
                  <ul className="weekly-ai-list">
                    {aiReport.focusAreas.map((area, idx) => (
                      <li key={idx} className="weekly-ai-list-item">
                        {area}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p
                    className="weekly-ai-list-item"
                    style={{ fontStyle: 'italic', opacity: 0.8 }}
                  >
                    No major areas of concern — solid momentum this week.
                  </p>
                )}
              </div>
            </div>

            {/* Coach Recommendation */}
            <div className="weekly-ai-recommendation-card">
              <Lightbulb size={22} className="weekly-ai-rec-icon" aria-hidden="true" />
              <div className="weekly-ai-rec-body">
                <div className="weekly-ai-rec-title">Coach Recommendation</div>
                <p className="weekly-ai-rec-text">{aiReport.recommendation}</p>
              </div>
            </div>
          </Card>
        ) : (
          /* Unloaded / CTA State */
          <Card className="weekly-ai-card weekly-ai-cta-card">
            <div className="weekly-ai-cta-icon" aria-hidden="true">
              <Sparkles size={28} />
            </div>
            <h3 className="weekly-ai-cta-title">Unlock Your AI Weekly Reflection</h3>
            <p className="weekly-ai-cta-desc">
              Get an intelligent reflection synthesizing your consistency, best days, habits
              needing focus, and an actionable coaching recommendation for {weekRangeLabel}.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <Button onClick={() => handleGenerateReport(false)} size="md">
                <Sparkles size={16} aria-hidden="true" /> Generate Weekly Insight
              </Button>
            </div>
          </Card>
        )}
      </section>
    </PageContainer>
  );
}

export default WeeklyPage;
