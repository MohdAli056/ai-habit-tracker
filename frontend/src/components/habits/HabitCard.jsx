/**
 * HabitCard — displays a single habit with its actions.
 *
 * Actions: Complete/Uncomplete, Edit, Archive/Unarchive, Delete, Move Up/Down.
 * Completion calls the real API.
 */

import { Archive, ArchiveRestore, Check, ChevronDown, ChevronUp, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { logsApi } from '../../api/logs.js';
import { Badge } from '../ui/Badge.jsx';

const CATEGORY_TONE = {
  health: 'success', fitness: 'success', learning: 'accent',
  mindfulness: 'accent', productivity: 'warning', social: 'neutral',
  finance: 'warning', creative: 'accent', other: 'neutral',
};
const FREQ_LABELS = { daily: 'Daily', weekly: 'Weekly' };

export function HabitCard({
  habit,
  completedToday = false,
  streak = 0,
  showActions = true,
  isFirst,
  isLast,
  onEdit,
  onArchive,
  onDelete,
  onMoveUp,
  onMoveDown,
  onCompletionChange,
}) {
  const { _id, icon, name, description, category, frequency, targetDays, color, isArchived } = habit;
  const tone = CATEGORY_TONE[category] || 'neutral';

  const [completed, setCompleted] = useState(completedToday);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionError, setCompletionError] = useState('');

  useEffect(() => {
    setCompleted(completedToday);
  }, [completedToday]);

  async function handleToggleComplete() {
    setCompletionLoading(true);
    setCompletionError('');
    try {
      if (completed) {
        await logsApi.uncompleteHabit(_id);
        setCompleted(false);
        onCompletionChange?.(_id, false);
      } else {
        await logsApi.completeHabit(_id);
        setCompleted(true);
        onCompletionChange?.(_id, true);
      }
    } catch {
      setCompletionError('Could not update completion. Try again.');
    } finally {
      setCompletionLoading(false);
    }
  }

  return (
    <article
      id={`habit-card-${_id}`}
      className={`habit-card${completed ? ' habit-card-done' : ''}`}
      style={{ '--habit-color': color }}
    >
      <div className="habit-card-accent" aria-hidden="true" />

      {/* Completion button */}
      {!isArchived && (
        <button
          type="button"
          className={`habit-complete-btn${completed ? ' habit-complete-btn-done' : ''}`}
          aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
          aria-pressed={completed}
          onClick={handleToggleComplete}
          disabled={completionLoading}
        >
          {completionLoading
            ? <Loader2 size={16} className="spin" aria-hidden="true" />
            : <Check size={16} aria-hidden="true" />}
        </button>
      )}

      <div className="habit-card-icon">
        <span role="img" aria-label={name}>{icon}</span>
      </div>

      <div className="habit-card-body">
        <div className="habit-card-top">
          <h3 className="habit-card-name">{name}</h3>
          <div className="habit-card-badges">
            <Badge tone={tone}>{category}</Badge>
            <Badge tone="neutral">{FREQ_LABELS[frequency]} · {targetDays}d</Badge>
            {typeof streak === 'number' && streak > 0 && (
              <Badge tone="warning">🔥 {streak} {streak === 1 ? 'day' : 'days'}</Badge>
            )}
            {completed && !isArchived && <Badge tone="success">Done today</Badge>}
          </div>
        </div>
        {description && <p className="habit-card-description">{description}</p>}
        {completionError && (
          <p className="habit-completion-error" role="alert">{completionError}</p>
        )}
      </div>

      {showActions && (
        <div className="habit-card-actions">
          {!isArchived && (
            <div className="habit-reorder-btns">
              <button type="button" className="habit-action-btn" aria-label="Move up"    disabled={isFirst}  onClick={onMoveUp}><ChevronUp size={15} /></button>
              <button type="button" className="habit-action-btn" aria-label="Move down"  disabled={isLast}   onClick={onMoveDown}><ChevronDown size={15} /></button>
            </div>
          )}
          <button type="button" className="habit-action-btn" aria-label="Edit" onClick={onEdit}><Pencil size={15} /></button>
          <button type="button" className="habit-action-btn" aria-label={isArchived ? 'Unarchive' : 'Archive'} onClick={onArchive}>
            {isArchived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
          </button>
          <button type="button" className="habit-action-btn habit-action-danger" aria-label="Delete" onClick={onDelete}><Trash2 size={15} /></button>
        </div>
      )}
    </article>
  );
}
