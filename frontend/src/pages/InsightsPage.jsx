/**
 * InsightsPage — analytical overview and trend analysis derived from real user data.
 *
 * Features:
 *   - Deterministic metrics (Completion rate, Total check-ins, Best day, Top habit)
 *   - Flexible time windows (7 Days, 30 Days, 90 Days)
 *   - Period comparison with absolute and percentage change badges
 *   - Daily completion trend chart using Recharts (ResponsiveContainer, AreaChart)
 *   - Habit performance breakdown (Top performers vs. Habits needing attention)
 *   - Category consistency distribution
 *   - Zero-data empty states, loading indicators, and retryable error handling
 */

import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Flame,
  Minus,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { logsApi } from '../api/logs.js';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.jsx';

/**
 * Format YYYY-MM-DD date key into short month & day (e.g. "Sep 22").
 */
function formatChartTick(dateKey) {
  if (!dateKey) return '';
  try {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
  } catch {
    return dateKey;
  }
}

/**
 * Custom Tooltip for Recharts completion trend.
 */
function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const dataPoint = payload[0].payload;
  const count = payload[0].value;

  return (
    <div className="insights-chart-tooltip">
      <div className="insights-tooltip-date">
        {formatChartTick(label)} ({dataPoint.dayName})
      </div>
      <div className="insights-tooltip-value">
        <span className="insights-tooltip-dot" />
        <strong>{count}</strong> {count === 1 ? 'completion' : 'completions'}
      </div>
    </div>
  );
}

export function InsightsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInsights = useCallback(async (selectedDays) => {
    setLoading(true);
    setError('');
    try {
      const res = await logsApi.getInsights(selectedDays);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load insights:', err);
      setError('Could not load analytics. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights(days);
  }, [days, fetchInsights]);

  // Window options
  const periods = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
  ];

  return (
    <PageContainer>
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <header className="insights-header">
        <div className="insights-header-info">
          <div className="insights-header-badge">
            <Sparkles size={16} aria-hidden="true" />
            <span>Deterministic Analytics</span>
          </div>
          <h1 className="insights-title">Insights</h1>
          <p className="insights-subtitle">
            Understand your routine momentum, identify consistency gaps, and track trends over time.
          </p>
        </div>

        {/* Time Period Selector */}
        <div className="insights-period-selector" role="group" aria-label="Select time period">
          {periods.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`insights-period-btn ${days === p.value ? 'insights-period-btn-active' : ''}`}
              onClick={() => setDays(p.value)}
              aria-pressed={days === p.value}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Loading & Error States ────────────────────────────────────────── */}
      {loading && (
        <div className="insights-loading-wrap" aria-live="polite">
          <LoadingSpinner size={36} />
          <p className="muted-copy">Computing your routine insights...</p>
        </div>
      )}

      {error && !loading && (
        <Card className="insights-error-card" variant="soft">
          <div className="insights-error-content">
            <AlertCircle size={24} className="text-danger" aria-hidden="true" />
            <div>
              <h3>Unable to load insights</h3>
              <p className="muted-copy">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchInsights(days)}
              leftIcon={<RefreshCw size={14} />}
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* ── Empty State: Zero Habits ──────────────────────────────────────── */}
      {!loading && !error && data && data.activeHabitCount === 0 && (
        <EmptyState
          icon={Target}
          title="You don't have any active habits yet"
          description="Create your first habit to begin generating insights, momentum tracking, and trends."
          action={
            <Button as={Link} to="/habits" variant="primary" leftIcon={<Plus size={16} />}>
              Create Habit
            </Button>
          }
        />
      )}

      {/* ── Main Insights Content ─────────────────────────────────────────── */}
      {!loading && !error && data && data.activeHabitCount > 0 && (
        <div className="insights-main-grid">
          {/* Zero Completions Notice (if active habits exist but no logs in period) */}
          {data.summary.totalCompletions === 0 && (
            <div className="insights-zero-activity-banner" role="status">
              <Calendar size={18} aria-hidden="true" />
              <span>
                No completions recorded in the last {days} days. Check off habits on the Dashboard or Weekly grid to build your analytics!
              </span>
            </div>
          )}

          {/* ── Top Summary Metrics Cards (4-column grid) ───────────────────── */}
          <section className="insights-summary-grid" aria-label="Key Performance Indicators">
            {/* Card 1: Completion Rate */}
            <Card className="insights-stat-card" variant="strong">
              <div className="insights-stat-top">
                <span className="insights-stat-icon text-primary">
                  <TrendingUp size={20} aria-hidden="true" />
                </span>
                {data.summary.totalCompletions > 0 && data.summary.prevTotalCompletions > 0 && (
                  <span
                    className={`insights-delta-badge ${
                      data.summary.completionRate >= data.summary.prevCompletionRate
                        ? 'delta-positive'
                        : 'delta-negative'
                    }`}
                  >
                    {data.summary.completionRate >= data.summary.prevCompletionRate ? (
                      <ArrowUpRight size={14} aria-hidden="true" />
                    ) : (
                      <ArrowDownRight size={14} aria-hidden="true" />
                    )}
                    {Math.abs(data.summary.completionRate - data.summary.prevCompletionRate).toFixed(1)}% vs prev
                  </span>
                )}
              </div>
              <div className="insights-stat-val">{data.summary.completionRate}%</div>
              <div className="insights-stat-label">Completion Rate</div>
              <div className="insights-stat-sub">
                Based on scheduled routine targets across the last {days} days
              </div>
            </Card>

            {/* Card 2: Total Check-Ins */}
            <Card className="insights-stat-card" variant="strong">
              <div className="insights-stat-top">
                <span className="insights-stat-icon text-success">
                  <CheckCircle2 size={20} aria-hidden="true" />
                </span>
                {data.summary.prevTotalCompletions > 0 && (
                  <span
                    className={`insights-delta-badge ${
                      data.summary.absoluteChange >= 0 ? 'delta-positive' : 'delta-negative'
                    }`}
                  >
                    {data.summary.absoluteChange >= 0 ? '+' : ''}
                    {data.summary.absoluteChange} vs prev
                  </span>
                )}
              </div>
              <div className="insights-stat-val">{data.summary.totalCompletions}</div>
              <div className="insights-stat-label">Total Check-Ins</div>
              <div className="insights-stat-sub">
                Completed routines in this {days}-day window
              </div>
            </Card>

            {/* Card 3: Best Day */}
            <Card className="insights-stat-card" variant="strong">
              <div className="insights-stat-top">
                <span className="insights-stat-icon text-warning">
                  <Award size={20} aria-hidden="true" />
                </span>
                <span className="insights-day-badge">Peak Day</span>
              </div>
              <div className="insights-stat-val">
                {data.summary.bestDay ? data.summary.bestDay.dayName : '—'}
              </div>
              <div className="insights-stat-label">Most Productive Day</div>
              <div className="insights-stat-sub">
                {data.summary.bestDay
                  ? `${data.summary.bestDay.count} routine completions`
                  : 'Requires at least 1 completion'}
              </div>
            </Card>

            {/* Card 4: Top Habit */}
            <Card className="insights-stat-card" variant="strong">
              <div className="insights-stat-top">
                <span className="insights-stat-icon text-primary">
                  <Flame size={20} aria-hidden="true" />
                </span>
                <span className="insights-day-badge">Top Habit</span>
              </div>
              <div className="insights-stat-val text-truncate">
                {data.summary.topHabit ? (
                  <>
                    <span className="insights-habit-icon-sm">{data.summary.topHabit.icon}</span>{' '}
                    {data.summary.topHabit.name}
                  </>
                ) : (
                  '—'
                )}
              </div>
              <div className="insights-stat-label">Strongest Consistency</div>
              <div className="insights-stat-sub">
                {data.summary.topHabit && data.summary.topHabit.completions > 0
                  ? `${data.summary.topHabit.rate}% rate (${data.summary.topHabit.completions} completions)`
                  : 'Check in routines to rank habits'}
              </div>
            </Card>
          </section>

          {/* ── Completion Trend Chart ──────────────────────────────────────── */}
          <Card className="insights-chart-card" variant="soft">
            <div className="insights-chart-header">
              <div>
                <h2 className="insights-section-title">Daily Activity Trend</h2>
                <p className="muted-copy">
                  Daily completions over the last {days} days. Hover over any day for details.
                </p>
              </div>
              <div className="insights-chart-legend">
                <span className="insights-legend-dot" />
                <span>Daily Check-Ins</span>
              </div>
            </div>

            <div className="insights-chart-container">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={data.dailyTrend}
                  margin={{ top: 12, right: 12, left: -24, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartTick}
                    stroke="var(--subtle)"
                    fontSize={12}
                    tickLine={false}
                    interval={days === 90 ? 13 : days === 30 ? 4 : 0}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="var(--subtle)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#trendGradient)"
                    dot={{ r: days <= 7 ? 4 : 2, fill: 'var(--primary)', strokeWidth: 1 }}
                    activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--background)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* ── Habit Performance: Top vs Needs Attention (2-column grid) ───── */}
          <div className="insights-split-grid">
            {/* Top Performers */}
            <Card className="insights-performers-card" variant="strong">
              <div className="insights-performers-header">
                <div className="insights-card-title-wrap">
                  <Trophy size={18} className="text-warning" aria-hidden="true" />
                  <h2 className="insights-section-title">Top Performers</h2>
                </div>
                <span className="insights-section-badge">Ranked by Rate</span>
              </div>

              <div className="insights-performers-list">
                {data.topHabits.length === 0 || data.summary.totalCompletions === 0 ? (
                  <p className="muted-copy insights-empty-text">
                    No habit completions recorded yet in this time window.
                  </p>
                ) : (
                  data.topHabits.map((h, idx) => (
                    <div key={String(h.habitId)} className="insights-performer-item">
                      <div className="insights-performer-rank">#{idx + 1}</div>
                      <div className="insights-performer-icon" style={{ backgroundColor: `${h.color}1a` }}>
                        {h.icon}
                      </div>
                      <div className="insights-performer-details">
                        <div className="insights-performer-name-row">
                          <span className="insights-performer-name">{h.name}</span>
                          <span className="insights-performer-rate">{h.rate}%</span>
                        </div>
                        <div className="insights-progress-bar-bg">
                          <div
                            className="insights-progress-bar-fill"
                            style={{ width: `${h.rate}%`, backgroundColor: h.color || 'var(--primary)' }}
                          />
                        </div>
                        <div className="insights-performer-meta">
                          <span>{h.completions} of {h.scheduled} target days</span>
                          {h.currentStreak > 0 && (
                            <span className="insights-performer-streak">
                              <Flame size={12} aria-hidden="true" /> {h.currentStreak}d streak
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Needs Attention / Low Consistency */}
            <Card className="insights-performers-card" variant="strong">
              <div className="insights-performers-header">
                <div className="insights-card-title-wrap">
                  <Target size={18} className="text-primary" aria-hidden="true" />
                  <h2 className="insights-section-title">Consistency Opportunities</h2>
                </div>
                <span className="insights-section-badge">Needs Attention</span>
              </div>

              <div className="insights-performers-list">
                {data.needsAttention.length === 0 ? (
                  <div className="insights-all-strong-box">
                    <CheckCircle2 size={24} className="text-success" aria-hidden="true" />
                    <div>
                      <strong>All routines on track!</strong>
                      <p className="muted-copy">
                        All your active habits are maintaining high consistency over this {days}-day window.
                      </p>
                    </div>
                  </div>
                ) : (
                  data.needsAttention.map((h) => (
                    <div key={String(h.habitId)} className="insights-performer-item">
                      <div className="insights-performer-icon" style={{ backgroundColor: `${h.color}1a` }}>
                        {h.icon}
                      </div>
                      <div className="insights-performer-details">
                        <div className="insights-performer-name-row">
                          <span className="insights-performer-name">{h.name}</span>
                          <span className="insights-attention-pill">
                            {h.rate < 50 ? `${h.rate}% completion` : 'Streak broken'}
                          </span>
                        </div>
                        <div className="insights-progress-bar-bg">
                          <div
                            className="insights-progress-bar-fill fill-attention"
                            style={{ width: `${Math.max(h.rate, 4)}%` }}
                          />
                        </div>
                        <div className="insights-performer-meta">
                          <span>{h.completions} check-ins in {days}d</span>
                          <span className="muted-copy">Small daily wins rebuild streaks</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* ── Category Performance Breakdown ─────────────────────────────── */}
          <Card className="insights-category-card" variant="soft">
            <div className="insights-category-header">
              <div>
                <h2 className="insights-section-title">Category Performance</h2>
                <p className="muted-copy">
                  Completion consistency grouped across your routine areas in the last {days} days.
                </p>
              </div>
            </div>

            <div className="insights-category-grid">
              {data.categoryPerformance.map((c) => (
                <div key={c.category} className="insights-category-item">
                  <div className="insights-cat-name-row">
                    <span className="insights-cat-name capitalize">{c.category}</span>
                    <span className="insights-cat-rate">{c.rate}%</span>
                  </div>
                  <div className="insights-progress-bar-bg">
                    <div
                      className="insights-progress-bar-fill"
                      style={{ width: `${c.rate}%`, backgroundColor: 'var(--primary)' }}
                    />
                  </div>
                  <div className="insights-cat-meta">
                    <span>{c.habitCount} {c.habitCount === 1 ? 'habit' : 'habits'}</span>
                    <span>{c.completions} completions</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}

export default InsightsPage;
