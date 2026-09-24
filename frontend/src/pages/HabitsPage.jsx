/**
 * HabitsPage — full habit management UI.
 *
 * Features:
 *   - Active / Archived tabs
 *   - Search (client-side)
 *   - Category filter (client-side)
 *   - Habit cards with complete/edit/archive/delete/reorder actions
 *   - Create and edit via HabitForm slide-over
 *   - Delete confirmation dialog
 *   - Empty states for all scenarios
 *   - Today's completion state loaded on mount (Phase 6)
 */

import { Archive, Plus, Search, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { habitsApi } from '../api/habits.js';
import { logsApi } from '../api/logs.js';
import { ConfirmDialog } from '../components/habits/ConfirmDialog.jsx';
import { HabitCard } from '../components/habits/HabitCard.jsx';
import { HabitForm } from '../components/habits/HabitForm.jsx';
import { SuggestionWizard } from '../components/habits/SuggestionWizard.jsx';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.jsx';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'health', label: 'Health' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'learning', label: 'Learning' },
  { value: 'mindfulness', label: 'Mindfulness' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'social', label: 'Social' },
  { value: 'finance', label: 'Finance' },
  { value: 'creative', label: 'Creative' },
  { value: 'other', label: 'Other' },
];

export function HabitsPage() {
  // ── data ─────────────────────────────────────────────────────────────────
  const [habits, setHabits]             = useState([]);
  const [completedTodayIds, setCompletedTodayIds] = useState(new Set());
  const [streakMap, setStreakMap]       = useState({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  // ── ui ───────────────────────────────────────────────────────────────────
  const [tab, setTab]           = useState('active');
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('all');

  // ── form ─────────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError]     = useState('');

  // ── AI suggestion wizard ─────────────────────────────────────────────────
  const [wizardOpen, setWizardOpen]   = useState(false);

  // ── delete ───────────────────────────────────────────────────────────────
  const [pendingDelete, setPendingDelete]   = useState(null);
  const [deleteLoading, setDeleteLoading]   = useState(false);

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchHabits = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [habitsRes, logsRes, statsRes] = await Promise.all([
        habitsApi.getHabits({ archived: tab === 'archived' }),
        tab === 'active' ? logsApi.getTodayLogs() : Promise.resolve({ data: { logs: [] } }),
        tab === 'active' ? logsApi.getAllStats() : Promise.resolve({ data: { habits: [] } }),
      ]);
      setHabits(habitsRes.data.habits);
      setCompletedTodayIds(new Set(logsRes.data.logs.map((l) => String(l.habitId))));

      const map = {};
      if (statsRes.data?.habits) {
        for (const h of statsRes.data.habits) {
          map[String(h.habitId)] = h.currentStreak || 0;
        }
      }
      setStreakMap(map);
    } catch {
      setError('Failed to load habits. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  // ── client-side filter ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = habits;
    if (category !== 'all') list = list.filter((h) => h.category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (h) => h.name.toLowerCase().includes(q) || h.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [habits, category, search]);

  const activeCount   = habits.filter((h) => !h.isArchived).length;
  const archivedCount = habits.filter((h) => h.isArchived).length;

  // ── completion callback (from HabitCard) ──────────────────────────────────
  function handleCompletionChange(habitId, nowCompleted) {
    setCompletedTodayIds((prev) => {
      const next = new Set(prev);
      if (nowCompleted) next.add(habitId); else next.delete(habitId);
      return next;
    });
  }

  // ── create / edit ─────────────────────────────────────────────────────────
  function openCreate() { setEditing(null); setFormError(''); setFormOpen(true); }
  function openEdit(habit) { setEditing(habit); setFormError(''); setFormOpen(true); }

  async function handleFormSubmit(data) {
    setFormLoading(true);
    setFormError('');
    try {
      if (editing?._id) {
        const { data: res } = await habitsApi.updateHabit(editing._id, data);
        setHabits((prev) => prev.map((h) => (h._id === editing._id ? res.habit : h)));
      } else {
        const { data: res } = await habitsApi.createHabit(data);
        if (tab === 'active') setHabits((prev) => [...prev, res.habit]);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setFormLoading(false);
    }
  }

  // ── archive ───────────────────────────────────────────────────────────────
  async function handleArchive(habit) {
    try {
      await habitsApi.updateHabit(habit._id, { isArchived: !habit.isArchived });
      setHabits((prev) => prev.filter((h) => h._id !== habit._id));
    } catch {
      fetchHabits();
    }
  }

  // ── delete ────────────────────────────────────────────────────────────────
  function confirmDelete(habit) { setPendingDelete(habit); }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleteLoading(true);
    try {
      await habitsApi.deleteHabit(pendingDelete._id);
      setHabits((prev) => prev.filter((h) => h._id !== pendingDelete._id));
      setPendingDelete(null);
    } catch {
      fetchHabits();
    } finally {
      setDeleteLoading(false);
    }
  }

  // ── reorder ───────────────────────────────────────────────────────────────
  async function moveHabit(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= filtered.length) return;

    const newFiltered = [...filtered];
    [newFiltered[index], newFiltered[next]] = [newFiltered[next], newFiltered[index]];

    const ids = newFiltered.map((h) => h._id);
    setHabits((prev) => {
      const updated = [...prev];
      const positions = prev.map((h, i) => ({ h, i })).filter(({ h }) => filtered.some((f) => f._id === h._id));
      positions.forEach(({ i }, fi) => { updated[i] = newFiltered[fi]; });
      return updated;
    });

    try {
      await habitsApi.reorderHabits(ids);
    } catch {
      fetchHabits();
    }
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <PageContainer>
      <div className="habits-header">
        <div>
          <h1 className="habits-title">Your Habits</h1>
          <p className="habits-subtitle">Manage and build your daily routines.</p>
        </div>
        <div className="habits-header-actions" style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => setWizardOpen(true)}>
            <Sparkles size={16} aria-hidden="true" /> Suggest with AI
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} aria-hidden="true" /> New habit
          </Button>
        </div>
      </div>

      <div className="habits-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'active'}
          className={`habits-tab${tab === 'active' ? ' habits-tab-active' : ''}`}
          onClick={() => { setTab('active'); setSearch(''); setCategory('all'); }}>
          Active {activeCount > 0 && <span className="tab-count">{activeCount}</span>}
        </button>
        <button role="tab" aria-selected={tab === 'archived'}
          className={`habits-tab${tab === 'archived' ? ' habits-tab-active' : ''}`}
          onClick={() => { setTab('archived'); setSearch(''); setCategory('all'); }}>
          <Archive size={14} aria-hidden="true" /> Archived
          {archivedCount > 0 && <span className="tab-count">{archivedCount}</span>}
        </button>
      </div>

      <div className="habits-filters">
        <div className="habits-search-wrap">
          <Search size={15} className="habits-search-icon" aria-hidden="true" />
          <input className="habits-search" type="search" placeholder="Search habits…"
            value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search habits" />
        </div>
        <div className="category-filter" role="group" aria-label="Filter by category">
          {CATEGORIES.map(({ value, label }) => (
            <button key={value} type="button"
              className={`category-chip${category === value ? ' category-chip-active' : ''}`}
              onClick={() => setCategory(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="form-alert" role="alert" style={{ marginBottom: '1rem' }}>{error}</p>}

      {loading ? (
        <div className="habits-loading" role="status" aria-label="Loading habits">
          <LoadingSpinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <>
          {search || category !== 'all' ? (
            <EmptyState title="No matching habits" description="Try a different search term or category filter." />
          ) : tab === 'active' ? (
            <EmptyState icon={Plus} title="No active habits yet"
              description="Create your first habit and start building your rhythm."
              action={<Button size="sm" onClick={openCreate}><Plus size={15} /> Create habit</Button>} />
          ) : (
            <EmptyState icon={Archive} title="No archived habits"
              description="Habits you archive will appear here. They're never deleted." />
          )}
        </>
      ) : (
        <ul className="habit-list" aria-label="Habits">
          {filtered.map((habit, index) => (
            <li key={habit._id}>
              <HabitCard
                habit={habit}
                completedToday={completedTodayIds.has(String(habit._id))}
                streak={streakMap[String(habit._id)] || 0}
                isFirst={index === 0}
                isLast={index === filtered.length - 1}
                onEdit={() => openEdit(habit)}
                onArchive={() => handleArchive(habit)}
                onDelete={() => confirmDelete(habit)}
                onMoveUp={() => moveHabit(index, -1)}
                onMoveDown={() => moveHabit(index, 1)}
                onCompletionChange={handleCompletionChange}
              />
            </li>
          ))}
        </ul>
      )}

      <HabitForm open={formOpen} initialData={editing} loading={formLoading}
        onSubmit={handleFormSubmit} onClose={() => { setFormOpen(false); setEditing(null); }} />

      {formError && formOpen && (
        <p className="form-alert" role="alert"
          style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 200, margin: 0 }}>
          {formError}
        </p>
      )}

      <ConfirmDialog open={Boolean(pendingDelete)} title="Delete habit?"
        description={`"${pendingDelete?.name}" will be permanently removed.`}
        confirmLabel="Delete" danger loading={deleteLoading}
        onConfirm={handleDelete} onCancel={() => setPendingDelete(null)} />

      <SuggestionWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSelectSuggestion={(sugg) => {
          setEditing(sugg);
          setFormError('');
          setFormOpen(true);
        }}
      />
    </PageContainer>
  );
}
