/**
 * StreakRecoveryCard — AI Streak Recovery Coach for the Dashboard.
 *
 * Deterministically shown ONLY when one or more active habits have a broken streak
 * (currentStreak === 0, longestStreak >= 3, totalCompletions > 0).
 *
 * Guarantees:
 *   - AI never automatically completes habits.
 *   - "Start Recovery" scrolls to and highlights the target habit in Today's Habits.
 *   - Supports multiple eligible habits via compact habit picker (0 AI calls until chosen).
 *   - Empathetic, supportive, non-shame language.
 */

import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Flame,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import aiApi from '../../api/ai.js';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';
import { LoadingSpinner } from '../ui/LoadingSpinner.jsx';

export function StreakRecoveryCard({ eligibleHabits = [], onStartRecovery }) {
  if (!eligibleHabits || eligibleHabits.length === 0) {
    return null;
  }

  // Selected habit defaults to first eligible habit
  const [selectedHabitId, setSelectedHabitId] = useState(
    eligibleHabits[0]?.habitId || eligibleHabits[0]?._id,
  );
  const [recoveryData, setRecoveryData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isUnconfigured, setIsUnconfigured] = useState(false);
  const [useDevMock, setUseDevMock] = useState(false);

  // Sync selectedHabitId if eligibleHabits change
  useEffect(() => {
    if (
      !eligibleHabits.some(
        (h) => String(h.habitId || h._id) === String(selectedHabitId),
      )
    ) {
      setSelectedHabitId(eligibleHabits[0]?.habitId || eligibleHabits[0]?._id);
      setRecoveryData(null);
      setError('');
    }
  }, [eligibleHabits, selectedHabitId]);

  const activeHabit =
    eligibleHabits.find(
      (h) => String(h.habitId || h._id) === String(selectedHabitId),
    ) || eligibleHabits[0];

  // Fetch recovery guidance for active habit
  const handleFetchRecovery = async (forceMock = false) => {
    if (!activeHabit) return;
    const targetId = activeHabit.habitId || activeHabit._id;
    setLoading(true);
    setError('');
    setIsUnconfigured(false);

    try {
      const res = await aiApi.recoverHabit(targetId, forceMock || useDevMock);
      if (res.data.eligible && res.data.recovery) {
        setRecoveryData(res.data.recovery);
        setMeta(res.data.meta);
      } else {
        setError(res.data.reason || 'This habit is currently not eligible for recovery.');
      }
    } catch (err) {
      const status = err.response?.status;
      const code = err.response?.data?.code;
      if (status === 503 || code === 'AI_NOT_CONFIGURED') {
        setIsUnconfigured(true);
      } else if (status === 429) {
        setError('Recovery coach rate limit reached. Please wait a moment and try again.');
      } else {
        setError(
          err.response?.data?.message ||
            'Unable to generate recovery guidance. Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Trigger habit selection change
  const handleSelectHabit = (id) => {
    if (String(id) !== String(selectedHabitId)) {
      setSelectedHabitId(id);
      setRecoveryData(null);
      setError('');
      setIsUnconfigured(false);
    }
  };

  const handleActionClick = () => {
    if (onStartRecovery && activeHabit) {
      onStartRecovery(activeHabit.habitId || activeHabit._id);
    }
  };

  return (
    <Card className="streak-recovery-card" aria-label="Streak Recovery Coach">
      <div className="recovery-header">
        <div className="recovery-badge">
          <Sparkles size={14} className="recovery-sparkle-icon" aria-hidden="true" />
          <span>Streak Recovery Coach</span>
        </div>
        {meta?.provider && (
          <span className="recovery-provider-tag">
            {meta.provider === 'mock' ? 'Offline Preview' : 'Gemini 2.5'}
          </span>
        )}
      </div>

      <div className="recovery-title-row">
        <div>
          <h3 className="recovery-title">
            {eligibleHabits.length > 1
              ? `${eligibleHabits.length} habits could use a gentle reset`
              : 'Reignite your streak'}
          </h3>
          <p className="recovery-subtitle">
            Streaks bend, but momentum is never lost. Re-anchor your routine with a manageable next step.
          </p>
        </div>
      </div>

      {/* Habit Selector if multiple habits qualify */}
      {eligibleHabits.length > 1 && (
        <div className="recovery-selector-container">
          <span className="recovery-selector-label">Choose a habit to recover:</span>
          <div className="recovery-habit-pills" role="tablist">
            {eligibleHabits.map((h) => {
              const id = h.habitId || h._id;
              const isSelected = String(id) === String(selectedHabitId);
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`recovery-habit-pill ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectHabit(id)}
                >
                  <span className="recovery-pill-icon">{h.icon || '⭐'}</span>
                  <span className="recovery-pill-name">{h.name}</span>
                  <span className="recovery-pill-streak">
                    <Flame size={12} aria-hidden="true" /> Best: {h.longestStreak || 0}d
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Habit Summary Box */}
      {activeHabit && (
        <div className="recovery-habit-focus-box">
          <div className="recovery-habit-meta">
            <span
              className="recovery-habit-icon"
              style={{ backgroundColor: `${activeHabit.color || '#6366f1'}20` }}
            >
              {activeHabit.icon || '⭐'}
            </span>
            <div>
              <h4 className="recovery-habit-name">{activeHabit.name}</h4>
              <div className="recovery-habit-details">
                <span className="recovery-streak-stat">
                  Current: <strong>0 days</strong>
                </span>
                <span className="recovery-stat-separator">•</span>
                <span className="recovery-streak-stat">
                  Prior Streak: <strong>{activeHabit.longestStreak || 0} days</strong>
                </span>
              </div>
            </div>
          </div>

          {!recoveryData && !loading && !isUnconfigured && (
            <Button
              size="sm"
              variant="secondary"
              className="recovery-generate-btn"
              onClick={() => handleFetchRecovery(false)}
            >
              <Compass size={15} aria-hidden="true" /> Get Recovery Plan
            </Button>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="recovery-loading" role="status" aria-live="polite">
          <LoadingSpinner size="md" />
          <p className="recovery-loading-text">
            Formulating realistic next steps for {activeHabit?.name || 'your habit'}…
          </p>
        </div>
      )}

      {/* Unconfigured State (503) */}
      {isUnconfigured && !loading && (
        <div className="recovery-unconfigured-box" role="alert">
          <p className="recovery-unconfigured-msg">
            AI recovery guidance is unavailable right now because AI is not configured.
          </p>
          <div className="recovery-unconfigured-actions">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setUseDevMock(true);
                handleFetchRecovery(true);
              }}
            >
              <Zap size={14} aria-hidden="true" /> Try Dev Preview (Mock)
            </Button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && !isUnconfigured && (
        <div className="recovery-error-box" role="alert">
          <p className="recovery-error-msg">{error}</p>
          <Button size="sm" variant="ghost" onClick={() => handleFetchRecovery(false)}>
            <RotateCcw size={14} aria-hidden="true" /> Try again
          </Button>
        </div>
      )}

      {/* Guidance Content */}
      {recoveryData && !loading && (
        <div className="recovery-content animate-fade-in">
          <div className="recovery-headline-box">
            <h4 className="recovery-headline">{recoveryData.headline}</h4>
            <p className="recovery-acknowledgement">{recoveryData.acknowledgement}</p>
          </div>

          <div className="recovery-steps-section">
            <span className="recovery-steps-heading">Actionable Recovery Steps:</span>
            <ol className="recovery-steps-list">
              {recoveryData.recoverySteps.map((step, idx) => (
                <li key={idx} className="recovery-step-item">
                  <span className="recovery-step-number">{idx + 1}</span>
                  <span className="recovery-step-text">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="recovery-first-step-box">
            <div className="recovery-first-step-badge">
              <CheckCircle2 size={14} aria-hidden="true" />
              <span>Micro-Action For Today</span>
            </div>
            <p className="recovery-first-step-text">{recoveryData.firstStep}</p>
          </div>

          <div className="recovery-actions-footer">
            <Button size="sm" onClick={handleActionClick} className="recovery-start-btn">
              Start Recovery <ArrowRight size={14} aria-hidden="true" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleFetchRecovery(false)}
              className="recovery-refresh-btn"
              title="Get a fresh recovery plan"
            >
              <RotateCcw size={14} aria-hidden="true" /> Refresh Plan
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default StreakRecoveryCard;
