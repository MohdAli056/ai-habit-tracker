/**
 * StatisticsPage — detailed data-oriented metrics, streaks, habit table, and 90-day activity heatmap.
 *
 * Features:
 *   - Lifetime streak & completion statistics (Current best, All-time longest, Total check-ins)
 *   - 7-Day & 30-Day activity comparison cards
 *   - GitHub-style 90-day activity heatmap with accessible intensity levels and hover tooltips
 *   - Category habit distribution vs completion distribution
 *   - Comprehensive habit-level statistics table (streaks, recent counts, completion rates, last completed date)
 *   - Responsive contained horizontal scrolling on mobile viewports
 *   - Zero-data empty states, loading indicators, and retryable error handling
 */

import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { HabitChatWidget } from '../components/chat/HabitChatWidget.jsx';
import { getLastNDays, getTodayKey } from '../utils/date.js';

/**
 * Format YYYY-MM-DD into readable date (e.g. "Sep 22, 2026").
 */
function formatDateLabel(dateKey) {
  if (!dateKey) return 'Never';
  try {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
  } catch {
    return dateKey;
  }
}

export function StatisticsPage() {
  const [stats, setStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredCell, setHoveredCell] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, heatmapRes] = await Promise.all([
        logsApi.getStatistics(),
        logsApi.getHeatmap(90),
      ]);
      setStats(statsRes.data);
      setHeatmapData(heatmapRes.data.heatmap || {});
    } catch (err) {
      console.error('Failed to load statistics:', err);
      setError('Could not load statistics. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Build 90-Day Heatmap Grid ─────────────────────────────────────────────
  // Grid columns = weeks (~13 weeks), rows = 7 days (Mon..Sun: 0..6)
  const heatmapWeeks = useMemo(() => {
    const last90 = getLastNDays(91); // 13 full weeks
    const weeks = [];
    let currentWeek = [];

    for (const dateKey of last90) {
      const d = new Date(dateKey + 'T00:00:00Z');
      // ISO day: Mon=0, Tue=1, ..., Sun=6
      const dayIndex = d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1;

      // If Monday and week has items, push to weeks
      if (dayIndex === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push({
        date: dateKey,
        dayIndex,
        count: heatmapData[dateKey] || 0,
      });
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    return weeks;
  }, [heatmapData]);

  // Helper for heatmap cell color level (0..4)
  function getHeatmapLevel(count) {
    if (!count || count === 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count <= 4) return 3;
    return 4;
  }

  return (
    <PageContainer>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="stats-header">
        <div className="stats-header-info">
          <div className="stats-header-badge">
            <BarChart3 size={16} aria-hidden="true" />
            <span>Progress & Metrics</span>
          </div>
          <h1 className="stats-title">Statistics</h1>
          <p className="stats-subtitle">
            Comprehensive streak data, volume analysis, and historical activity for all your active routines.
          </p>
        </div>
      </header>

      {/* ── Loading & Error States ────────────────────────────────────────── */}
      {loading && (
        <div className="stats-loading-wrap" aria-live="polite">
          <LoadingSpinner size={36} />
          <p className="muted-copy">Loading detailed routine statistics...</p>
        </div>
      )}

      {error && !loading && (
        <Card className="stats-error-card" variant="soft">
          <div className="stats-error-content">
            <AlertCircle size={24} className="text-danger" aria-hidden="true" />
            <div>
              <h3>Unable to load statistics</h3>
              <p className="muted-copy">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              leftIcon={<RefreshCw size={14} />}
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* ── Empty State: Zero Habits ──────────────────────────────────────── */}
      {!loading && !error && stats && stats.overview.activeHabits === 0 && (
        <EmptyState
          icon={Target}
          title="You don't have any active habits yet"
          description="Create your habits to start accumulating completion volume, streaks, and heatmap data."
          action={
            <Button as={Link} to="/habits" variant="primary" leftIcon={<Plus size={16} />}>
              Create Habit
            </Button>
          }
        />
      )}

      {/* ── Main Statistics Content ───────────────────────────────────────── */}
      {!loading && !error && stats && stats.overview.activeHabits > 0 && (
        <div className="stats-main-content">
          {/* ── 4 Lifetime & Streak KPI Cards ───────────────────────────────── */}
          <section className="stats-summary-grid" aria-label="Lifetime Overview">
            {/* Card 1: Best Current Streak */}
            <Card className="stats-kpi-card" variant="strong">
              <div className="stats-kpi-icon-wrap bg-primary-soft text-primary">
                <Flame size={22} aria-hidden="true" />
              </div>
              <div className="stats-kpi-val">{stats.overview.bestCurrentStreak} <span className="stats-kpi-unit">days</span></div>
              <div className="stats-kpi-label">Current Best Streak</div>
              <div className="stats-kpi-sub">Across all active routines</div>
            </Card>

            {/* Card 2: Longest Streak */}
            <Card className="stats-kpi-card" variant="strong">
              <div className="stats-kpi-icon-wrap bg-warning-soft text-warning">
                <Trophy size={22} aria-hidden="true" />
              </div>
              <div className="stats-kpi-val">{stats.overview.bestLongestStreak} <span className="stats-kpi-unit">days</span></div>
              <div className="stats-kpi-label">All-Time Longest Streak</div>
              <div className="stats-kpi-sub">Personal record milestone</div>
            </Card>

            {/* Card 3: Total Completions */}
            <Card className="stats-kpi-card" variant="strong">
              <div className="stats-kpi-icon-wrap bg-success-soft text-success">
                <CheckCircle2 size={22} aria-hidden="true" />
              </div>
              <div className="stats-kpi-val">{stats.overview.totalCompletions}</div>
              <div className="stats-kpi-label">Lifetime Completions</div>
              <div className="stats-kpi-sub">Total check-in records in database</div>
            </Card>

            {/* Card 4: Active Routines */}
            <Card className="stats-kpi-card" variant="strong">
              <div className="stats-kpi-icon-wrap bg-primary-soft text-primary">
                <Target size={22} aria-hidden="true" />
              </div>
              <div className="stats-kpi-val">{stats.overview.activeHabits}</div>
              <div className="stats-kpi-label">Active Habits</div>
              <div className="stats-kpi-sub">Routines currently being tracked</div>
            </Card>
          </section>

          {/* ── 7-Day vs 30-Day Activity Comparison Cards ───────────────────── */}
          <section className="stats-windows-grid" aria-label="Activity Time Windows">
            {/* 7-Day Window Card */}
            <Card className="stats-window-card" variant="soft">
              <div className="stats-window-header">
                <div>
                  <span className="stats-window-badge">7-Day Activity</span>
                  <h2 className="stats-section-title">Last 7 Days</h2>
                </div>
                <div className="stats-window-rate">{stats.sevenDay.completionRate}% rate</div>
              </div>
              <div className="stats-window-metrics">
                <div className="stats-window-metric-item">
                  <span className="stats-metric-num">{stats.sevenDay.totalCompletions}</span>
                  <span className="stats-metric-lbl">Total Check-Ins</span>
                </div>
                <div className="stats-window-metric-item">
                  <span className="stats-metric-num">{stats.sevenDay.activeDays} / 7</span>
                  <span className="stats-metric-lbl">Active Days</span>
                </div>
                <div className="stats-window-metric-item">
                  <span className="stats-metric-num">{stats.sevenDay.avgPerDay}</span>
                  <span className="stats-metric-lbl">Avg Per Day</span>
                </div>
              </div>
            </Card>

            {/* 30-Day Window Card */}
            <Card className="stats-window-card" variant="soft">
              <div className="stats-window-header">
                <div>
                  <span className="stats-window-badge">30-Day Activity</span>
                  <h2 className="stats-section-title">Last 30 Days</h2>
                </div>
                <div className="stats-window-rate">{stats.thirtyDay.completionRate}% rate</div>
              </div>
              <div className="stats-window-metrics">
                <div className="stats-window-metric-item">
                  <span className="stats-metric-num">{stats.thirtyDay.totalCompletions}</span>
                  <span className="stats-metric-lbl">Total Check-Ins</span>
                </div>
                <div className="stats-window-metric-item">
                  <span className="stats-metric-num">{stats.thirtyDay.activeDays} / 30</span>
                  <span className="stats-metric-lbl">Active Days</span>
                </div>
                <div className="stats-window-metric-item">
                  <span className="stats-metric-num">{stats.thirtyDay.avgPerDay}</span>
                  <span className="stats-metric-lbl">Avg Per Day</span>
                </div>
              </div>
            </Card>
          </section>

          {/* ── 90-Day GitHub-Style Activity Heatmap ─────────────────────────── */}
          <Card className="stats-heatmap-card" variant="strong">
            <div className="stats-heatmap-header">
              <div>
                <h2 className="stats-section-title">90-Day Activity Heatmap</h2>
                <p className="muted-copy">
                  Daily completion density over the past 3 months. Hover over any cell to see activity.
                </p>
              </div>
              <div className="stats-heatmap-legend">
                <span className="stats-legend-text">Less</span>
                <span className="heatmap-cell level-0" title="0 completions" />
                <span className="heatmap-cell level-1" title="1 completion" />
                <span className="heatmap-cell level-2" title="2 completions" />
                <span className="heatmap-cell level-3" title="3-4 completions" />
                <span className="heatmap-cell level-4" title="5+ completions" />
                <span className="stats-legend-text">More</span>
              </div>
            </div>

            {/* Heatmap Tooltip Display */}
            <div className="stats-heatmap-hover-info" aria-live="polite">
              {hoveredCell ? (
                <span>
                  <strong>{formatDateLabel(hoveredCell.date)}</strong>: {hoveredCell.count} {hoveredCell.count === 1 ? 'routine completed' : 'routines completed'}
                </span>
              ) : (
                <span className="muted-copy">Hover over any square for day details</span>
              )}
            </div>

            {/* Matrix Wrapper (Horizontal Scroll on Mobile) */}
            <div className="stats-heatmap-wrapper">
              <div className="stats-heatmap-days-col" aria-hidden="true">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
              </div>
              <div className="stats-heatmap-grid" role="grid" aria-label="90-Day Habit Completion Matrix">
                {heatmapWeeks.map((week, wIdx) => (
                  <div key={wIdx} className="stats-heatmap-week-col" role="row">
                    {week.map((day) => (
                      <div
                        key={day.date}
                        role="gridcell"
                        tabIndex={0}
                        className={`heatmap-cell level-${getHeatmapLevel(day.count)}`}
                        onMouseEnter={() => setHoveredCell(day)}
                        onFocus={() => setHoveredCell(day)}
                        onMouseLeave={() => setHoveredCell(null)}
                        onBlur={() => setHoveredCell(null)}
                        aria-label={`${formatDateLabel(day.date)}: ${day.count} completions`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* ── Category Habit Distribution Chart ───────────────────────────── */}
          <Card className="stats-category-card" variant="soft">
            <div className="stats-category-header">
              <div>
                <h2 className="stats-section-title">Habits by Category</h2>
                <p className="muted-copy">
                  Distribution of your active routines across life categories.
                </p>
              </div>
            </div>

            <div className="stats-chart-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={stats.categoryDistribution}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="category"
                    stroke="var(--subtle)"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="var(--subtle)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--border)', opacity: 0.2 }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="insights-chart-tooltip">
                          <div className="insights-tooltip-date capitalize">{item.category}</div>
                          <div className="insights-tooltip-value">
                            <strong>{item.habitCount}</strong> {item.habitCount === 1 ? 'active habit' : 'active habits'}
                          </div>
                          <div className="muted-copy" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                            {item.totalCompletions} total check-ins
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="habitCount"
                    fill="var(--primary)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* ── Detailed Habit Statistics Table ─────────────────────────────── */}
          <Card className="stats-table-card" variant="strong">
            <div className="stats-table-header">
              <div>
                <h2 className="stats-section-title">Habit Metrics Breakdown</h2>
                <p className="muted-copy">
                  Individual completion consistency, streaks, and historical activity for each routine.
                </p>
              </div>
              <span className="stats-habit-count-badge">
                {stats.habitStats.length} {stats.habitStats.length === 1 ? 'Habit' : 'Habits'}
              </span>
            </div>

            {/* Table wrapper with contained horizontal scrolling for mobile */}
            <div className="stats-table-wrapper">
              <table className="stats-habits-table" aria-label="Habit Performance Metrics">
                <thead>
                  <tr>
                    <th scope="col" className="col-habit">Habit</th>
                    <th scope="col" className="col-category">Category</th>
                    <th scope="col" className="col-streak text-center">Current Streak</th>
                    <th scope="col" className="col-streak text-center">Best Streak</th>
                    <th scope="col" className="col-7d text-center">Last 7d</th>
                    <th scope="col" className="col-30d text-center">Last 30d</th>
                    <th scope="col" className="col-rate text-center">30d Rate</th>
                    <th scope="col" className="col-last text-right">Last Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.habitStats.map((h) => (
                    <tr key={String(h.habitId)}>
                      <td className="col-habit">
                        <div className="stats-habit-cell">
                          <span
                            className="stats-habit-icon"
                            style={{ backgroundColor: `${h.color}1a` }}
                          >
                            {h.icon}
                          </span>
                          <span className="stats-habit-name">{h.name}</span>
                        </div>
                      </td>
                      <td className="col-category">
                        <span className="stats-cat-chip capitalize">{h.category}</span>
                      </td>
                      <td className="col-streak text-center">
                        <span className="stats-streak-pill current">
                          <Flame size={13} aria-hidden="true" /> {h.currentStreak}d
                        </span>
                      </td>
                      <td className="col-streak text-center">
                        <span className="stats-streak-pill longest">
                          <Trophy size={13} aria-hidden="true" /> {h.longestStreak}d
                        </span>
                      </td>
                      <td className="col-7d text-center font-medium">
                        {h.completionsLast7}
                      </td>
                      <td className="col-30d text-center font-medium">
                        {h.completionsLast30}
                      </td>
                      <td className="col-rate text-center">
                        <span
                          className={`stats-rate-badge ${
                            h.completionRate30 >= 75
                              ? 'rate-high'
                              : h.completionRate30 >= 40
                              ? 'rate-med'
                              : 'rate-low'
                          }`}
                        >
                          {h.completionRate30}%
                        </span>
                      </td>
                      <td className="col-last text-right text-muted-subtle">
                        {formatDateLabel(h.lastCompletedDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── AI Habit-Data Chat Floating Widget ───────────────────────────── */}
      <HabitChatWidget hasHabits={stats?.overview?.activeHabits > 0} />
    </PageContainer>
  );
}

export default StatisticsPage;
