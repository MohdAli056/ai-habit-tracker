/**
 * DashboardPage — primary overview for authenticated users.
 *
 * Consumes live data from MongoDB Atlas:
 *   - habitsApi.getHabits({ archived: false })
 *   - logsApi.getAllStats()
 *   - logsApi.getTodayLogs()
 *   - logsApi.getLogsRange(start, end)
 *
 * Features:
 *   - Personalized greeting with name and date
 *   - Circular progress ring with completion ratio & percentage
 *   - Summary cards (Today's progress, Current streak, Active habits, Total completions)
 *   - Today's habits with streak badges & reactive completion controls
 *   - Recent activity stream mapping actual completion logs
 *   - Quick actions (Add habit, Manage habits)
 *   - Graceful empty states, loading spinner, and retryable error handling
 */

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { habitsApi } from '../api/habits.js';
import { logsApi } from '../api/logs.js';
import { MorningMotivationCard } from '../components/dashboard/MorningMotivationCard.jsx';
import { ProgressRing } from '../components/dashboard/ProgressRing.jsx';
import { StreakRecoveryCard } from '../components/dashboard/StreakRecoveryCard.jsx';
import { HabitCard } from '../components/habits/HabitCard.jsx';
import { HabitForm } from '../components/habits/HabitForm.jsx';
import { SuggestionWizard } from '../components/habits/SuggestionWizard.jsx';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Format relative or calendar date key (YYYY-MM-DD) for recent activity.
 */
function formatActivityDate(dateKey, todayKey, yesterdayKey) {
  if (dateKey === todayKey) return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';
  try {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
  } catch {
    return dateKey;
  }
}

/**
 * Helper to compute date key YYYY-MM-DD from a Date object using UTC.
 */
function toUTCKey(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DashboardPage() {
  const { user } = useAuth();

  // ── Data State ───────────────────────────────────────────────────────────
  const [habits, setHabits] = useState([]);
  const [stats, setStats] = useState(null);
  const [completedTodayIds, setCompletedTodayIds] = useState(new Set());
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── AI Suggestion Wizard & HabitForm State ───────────────────────────────
  const [wizardOpen, setWizardOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Current Date Keys
  const now = new Date();
  const todayKey = toUTCKey(now);
  const ydayDate = new Date(now.getTime() - 86400000);
  const yesterdayKey = toUTCKey(ydayDate);
  const weekAgoDate = new Date(now.getTime() - 7 * 86400000);
  const weekAgoKey = toUTCKey(weekAgoDate);

  // ── Coordinated Data Fetch ───────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [habitsRes, statsRes, todayRes, rangeRes] = await Promise.all([
        habitsApi.getHabits({ archived: false }),
        logsApi.getAllStats(),
        logsApi.getTodayLogs(),
        logsApi.getLogsRange(weekAgoKey, todayKey),
      ]);

      setHabits(habitsRes.data.habits || []);
      setStats(statsRes.data || null);

      const todayIds = new Set((todayRes.data.logs || []).map((l) => String(l.habitId)));
      setCompletedTodayIds(todayIds);

      // Sort recent logs descending by completion date
      const sortedLogs = (rangeRes.data.logs || []).slice().sort((a, b) =>
        b.completedDate.localeCompare(a.completedDate),
      );
      setRecentLogs(sortedLogs);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Could not load your dashboard. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [todayKey, weekAgoKey]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Derived Metrics ──────────────────────────────────────────────────────
  const activeHabitsCount = habits.length;
  const completedTodayCount = habits.filter((h) => completedTodayIds.has(String(h._id))).length;
  const progressPercentage =
    activeHabitsCount > 0 ? Math.min(100, Math.round((completedTodayCount / activeHabitsCount) * 100)) : 0;

  // Map habitId -> streak from stats endpoint
  const habitStreakMap = useMemo(() => {
    const map = {};
    if (stats?.habits) {
      for (const h of stats.habits) {
        map[String(h.habitId)] = h.currentStreak || 0;
      }
    }
    return map;
  }, [stats]);

  // Map habitId -> habit object for quick lookup
  const habitsMap = useMemo(() => {
    const map = {};
    for (const h of habits) {
      map[String(h._id)] = h;
    }
    return map;
  }, [habits]);

  // Best active current streak across habits (from server stats)
  const currentStreak = stats?.bestCurrentStreak ?? 0;
  const totalCompletions = stats?.totalCompletions ?? 0;
  const completionsLast30 = stats?.completionsLast30Days ?? 0;

  // ── Recovery Eligible Habits ─────────────────────────────────────────────
  const eligibleHabits = useMemo(() => {
    if (!stats?.habits || !habits || habits.length === 0) return [];
    const activeHabitIds = new Set(habits.map((h) => String(h._id)));
    return stats.habits.filter((h) => {
      const id = String(h.habitId || h._id);
      return (
        activeHabitIds.has(id) &&
        (h.currentStreak || 0) === 0 &&
        (h.longestStreak || 0) >= 3 &&
        (h.totalCompletions || 0) > 0
      );
    });
  }, [stats, habits]);

  function handleStartRecovery(habitId) {
    const el = document.getElementById(`habit-card-${habitId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('habit-card-highlight');
      setTimeout(() => el.classList.remove('habit-card-highlight'), 2500);
    }
  }

  // ── Reactive Completion Handler ──────────────────────────────────────────
  function handleCompletionChange(habitId, nowCompleted) {
    setCompletedTodayIds((prev) => {
      const next = new Set(prev);
      if (nowCompleted) {
        next.add(String(habitId));
      } else {
        next.delete(String(habitId));
      }
      return next;
    });

    // Optimistically update recent logs feed
    if (nowCompleted) {
      const habit = habitsMap[String(habitId)];
      if (habit) {
        setRecentLogs((prev) => [
          {
            _id: `temp-${Date.now()}`,
            habitId: habit._id,
            completedDate: todayKey,
            createdAt: new Date().toISOString(),
          },
          ...prev.filter((l) => !(String(l.habitId) === String(habitId) && l.completedDate === todayKey)),
        ]);
      }
    } else {
      setRecentLogs((prev) =>
        prev.filter((l) => !(String(l.habitId) === String(habitId) && l.completedDate === todayKey)),
      );
    }
  }

  // ── Habit Creation from Suggestion Handler ───────────────────────────────
  async function handleCreateHabit(data) {
    setFormLoading(true);
    try {
      await habitsApi.createHabit(data);
      setFormOpen(false);
      setFormInitialData(null);
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to create habit from suggestion:', err);
    } finally {
      setFormLoading(false);
    }
  }

  // ── Time-based Greeting & Motivation ─────────────────────────────────────
  const hour = new Date().getHours();
  let timeGreeting = 'Good morning';
  if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
  else if (hour >= 17) timeGreeting = 'Good evening';

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  let motivationalSubtitle = 'Every check-in strengthens your daily rhythm. Make today count.';
  if (activeHabitsCount === 0) {
    motivationalSubtitle = 'Ready to build lasting routines? Create your first habit below.';
  } else if (progressPercentage === 100) {
    motivationalSubtitle = 'All habits completed today! Fantastic consistency. 🎉';
  } else if (completedTodayCount > 0) {
    motivationalSubtitle = `${completedTodayCount} of ${activeHabitsCount} done. Keep up the strong momentum!`;
  }

  // ── Render Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageContainer className="dashboard-page">
        <div className="dashboard-loading" role="status" aria-label="Loading your dashboard">
          <LoadingSpinner size="lg" />
          <p className="dashboard-loading-text">Loading your dashboard…</p>
        </div>
      </PageContainer>
    );
  }

  // ── Render Error ─────────────────────────────────────────────────────────
  if (error && habits.length === 0) {
    return (
      <PageContainer className="dashboard-page">
        <div className="dashboard-error-card" role="alert">
          <p className="dashboard-error-message">{error}</p>
          <Button onClick={fetchDashboardData} size="sm">
            <RotateCcw size={15} aria-hidden="true" /> Try again
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="dashboard-page">
      {/* Dashboard Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-main">
          <div className="dashboard-date-badge" aria-label="Current date">
            {formattedDate}
          </div>
          <h1 className="dashboard-title">
            {timeGreeting}, {firstName} <span aria-hidden="true">👋</span>
          </h1>
          <p className="dashboard-subtitle">{motivationalSubtitle}</p>
        </div>

        <div className="dashboard-header-actions">
          <Button as={Link} to="/habits" variant="secondary" size="sm">
            Manage habits
          </Button>
          <Button as={Link} to="/habits" size="sm">
            <Plus size={15} aria-hidden="true" /> New habit
          </Button>
        </div>
      </header>

      {/* AI Morning Motivation Card */}
      <MorningMotivationCard />

      {/* Summary Cards Grid */}
      <section className="dashboard-summary-grid" aria-label="Habit tracking summary">
        {/* Card 1: Today's Progress with Circular Progress Ring */}
        <Card className="dashboard-summary-card summary-card-progress">
          <div className="summary-card-header">
            <span className="summary-card-label">Today's Progress</span>
            <span className="summary-card-badge" aria-label={`${completedTodayCount} of ${activeHabitsCount} completed`}>
              {completedTodayCount} / {activeHabitsCount}
            </span>
          </div>

          <div className="summary-card-progress-body">
            <ProgressRing
              completed={completedTodayCount}
              total={activeHabitsCount}
              size={96}
              strokeWidth={8}
            />
            <div className="summary-card-progress-info">
              <span className="summary-card-progress-status">
                {activeHabitsCount === 0
                  ? 'No habits yet'
                  : progressPercentage === 100
                  ? 'All done today!'
                  : `${completedTodayCount} completed`}
              </span>
              <span className="summary-card-sub">
                {activeHabitsCount === 0
                  ? 'Add a habit to start'
                  : `${activeHabitsCount - completedTodayCount} remaining today`}
              </span>
            </div>
          </div>
        </Card>

        {/* Card 2: Current Streak */}
        <Card className="dashboard-summary-card">
          <div className="summary-card-header">
            <span className="summary-card-label">Current Streak</span>
            <div className="summary-card-icon-wrap icon-streak" aria-hidden="true">
              <Flame size={18} />
            </div>
          </div>
          <div className="summary-card-stat">
            <span className="summary-card-number">{currentStreak}</span>
            <span className="summary-card-unit">{currentStreak === 1 ? 'day' : 'days'}</span>
          </div>
          <p className="summary-card-sub">
            {currentStreak > 0 ? 'Top active streak across routines' : 'Complete today to spark a streak'}
          </p>
        </Card>

        {/* Card 3: Total Active Habits */}
        <Card className="dashboard-summary-card">
          <div className="summary-card-header">
            <span className="summary-card-label">Active Habits</span>
            <div className="summary-card-icon-wrap icon-habits" aria-hidden="true">
              <Target size={18} />
            </div>
          </div>
          <div className="summary-card-stat">
            <span className="summary-card-number">{activeHabitsCount}</span>
            <span className="summary-card-unit">{activeHabitsCount === 1 ? 'habit' : 'habits'}</span>
          </div>
          <p className="summary-card-sub">Building daily consistency</p>
        </Card>

        {/* Card 4: Total Completions */}
        <Card className="dashboard-summary-card">
          <div className="summary-card-header">
            <span className="summary-card-label">Total Completions</span>
            <div className="summary-card-icon-wrap icon-completions" aria-hidden="true">
              <Trophy size={18} />
            </div>
          </div>
          <div className="summary-card-stat">
            <span className="summary-card-number">{totalCompletions}</span>
            <span className="summary-card-unit">check-ins</span>
          </div>
          <p className="summary-card-sub">
            {completionsLast30 > 0 ? `${completionsLast30} in the last 30 days` : 'Lifetime check-in tally'}
          </p>
        </Card>
      </section>

      {/* Main Content Layout: Two Columns (Today's Habits + Secondary Sidebar) */}
      <div className="dashboard-content-layout">
        {/* Left Column: Today's Habits */}
        <section className="dashboard-habits-section" aria-labelledby="todays-habits-heading">
          <div className="dashboard-section-header">
            <div>
              <h2 id="todays-habits-heading" className="dashboard-section-title">
                Today's Habits
              </h2>
              <p className="dashboard-section-subtitle">
                {activeHabitsCount > 0
                  ? `${completedTodayCount} of ${activeHabitsCount} completed today`
                  : 'Start your rhythm by creating a habit'}
              </p>
            </div>
            {activeHabitsCount > 0 && (
              <Button as={Link} to="/habits" variant="ghost" size="sm">
                View all <ArrowRight size={14} aria-hidden="true" />
              </Button>
            )}
          </div>

          {activeHabitsCount === 0 ? (
            <Card className="dashboard-empty-card">
              <EmptyState
                icon={Sparkles}
                title="No active habits yet"
                description="Create your first habit and build a rhythm that transforms your routine."
                action={
                  <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Button size="sm" onClick={() => setWizardOpen(true)}>
                      <Sparkles size={15} aria-hidden="true" /> Suggest with AI
                    </Button>
                    <Button as={Link} to="/habits" variant="secondary" size="sm">
                      <Plus size={15} aria-hidden="true" /> Create manually
                    </Button>
                  </div>
                }
              />
            </Card>
          ) : (
            <ul className="dashboard-habits-list" aria-label="Today's habit list">
              {habits.map((habit) => (
                <li key={habit._id}>
                  <HabitCard
                    habit={habit}
                    completedToday={completedTodayIds.has(String(habit._id))}
                    streak={habitStreakMap[String(habit._id)] || 0}
                    showActions={false}
                    onCompletionChange={handleCompletionChange}
                  />
                </li>
              ))}
            </ul>
          )}

          {/* AI Streak Recovery Section (deterministic, shown only when habits qualify) */}
          <StreakRecoveryCard
            eligibleHabits={eligibleHabits}
            onStartRecovery={handleStartRecovery}
          />
        </section>

        {/* Right Column: Quick Actions + Recent Activity */}
        <aside className="dashboard-aside" aria-label="Quick actions and recent activity">
          {/* Quick Actions Card */}
          <Card className="dashboard-aside-card">
            <h3 className="dashboard-aside-title">Quick Actions</h3>
            <div className="dashboard-quick-actions">
              <Button
                variant="secondary"
                fullWidth
                size="sm"
                onClick={() => setWizardOpen(true)}
              >
                <Sparkles size={15} aria-hidden="true" /> Suggest a Habit (AI)
              </Button>
              <Button as={Link} to="/habits" variant="ghost" fullWidth size="sm">
                <Plus size={15} aria-hidden="true" /> Add New Habit
              </Button>
              <Button as={Link} to="/habits" variant="ghost" fullWidth size="sm">
                <CheckCircle2 size={15} aria-hidden="true" /> View All Habits
              </Button>
            </div>
          </Card>

          {/* Recent Activity Stream */}
          <Card className="dashboard-aside-card">
            <div className="dashboard-activity-header">
              <h3 className="dashboard-aside-title">Recent Activity</h3>
              <Clock size={15} className="text-muted" aria-hidden="true" />
            </div>

            {recentLogs.length === 0 ? (
              <p className="dashboard-activity-empty">
                No completions recorded yet. Complete a habit today to see your activity stream!
              </p>
            ) : (
              <ul className="dashboard-activity-list" aria-label="Recent completion list">
                {recentLogs.slice(0, 7).map((log) => {
                  const habit = habitsMap[String(log.habitId)];
                  const name = habit?.name || 'Completed Habit';
                  const icon = habit?.icon || '✅';
                  const dateLabel = formatActivityDate(log.completedDate, todayKey, yesterdayKey);

                  return (
                    <li key={log._id || `${log.habitId}-${log.completedDate}`} className="dashboard-activity-item">
                      <span className="dashboard-activity-icon" aria-hidden="true">
                        {icon}
                      </span>
                      <div className="dashboard-activity-body">
                        <span className="dashboard-activity-text">
                          Completed <strong className="dashboard-activity-name">{name}</strong>
                        </span>
                        <span className="dashboard-activity-date">{dateLabel}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      <SuggestionWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSelectSuggestion={(sugg) => {
          setFormInitialData(sugg);
          setFormOpen(true);
        }}
      />

      <HabitForm
        open={formOpen}
        initialData={formInitialData}
        loading={formLoading}
        onSubmit={handleCreateHabit}
        onClose={() => {
          setFormOpen(false);
          setFormInitialData(null);
        }}
      />
    </PageContainer>
  );
}

export default DashboardPage;
