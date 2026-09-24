/**
 * MorningMotivationCard — Displays personalized daily AI motivation on the Dashboard.
 *
 * Requirements:
 *   - Respects user.morningMotivation setting: if disabled, renders null.
 *   - Fetches today's motivation via aiApi.getMorningMotivation(useMock).
 *   - Non-blocking: loads asynchronously without holding up the dashboard.
 *   - Displays motivational message and optional focus routine badge.
 *   - Gracefully handles 503 AI_NOT_CONFIGURED with a Dev Preview toggle.
 *   - Includes retry control on network failure.
 */

import {
  AlertCircle,
  CheckCircle2,
  Flame,
  RefreshCw,
  Sparkles,
  Sun,
  Target,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { aiApi } from '../../api/ai.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';

export function MorningMotivationCard() {
  const { user } = useAuth();

  const [motivation, setMotivation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAiUnconfigured, setIsAiUnconfigured] = useState(false);
  const [useMock, setUseMock] = useState(false);

  // If the user has disabled morning motivation in their settings, do not render
  const isEnabled = user?.morningMotivation ?? true;

  const fetchMotivation = useCallback(async (mockOverride = useMock) => {
    if (!isEnabled) return;

    setLoading(true);
    setError(null);
    setIsAiUnconfigured(false);

    try {
      const res = await aiApi.getMorningMotivation(mockOverride);
      const data = res.data;
      setMotivation({
        message: data.message,
        focusHabit: data.focusHabit,
        cached: data.cached,
        generatedAt: data.generatedAt,
      });
    } catch (err) {
      console.error('Failed to load morning motivation:', err);
      if (err.response?.status === 503 || err.response?.data?.code === 'AI_NOT_CONFIGURED') {
        setIsAiUnconfigured(true);
      } else {
        setError(err.response?.data?.message || 'Could not load morning motivation.');
      }
    } finally {
      setLoading(false);
    }
  }, [isEnabled, useMock]);

  useEffect(() => {
    if (isEnabled) {
      fetchMotivation();
    }
  }, [isEnabled, fetchMotivation]);

  if (!isEnabled) {
    return null;
  }

  return (
    <Card className="morning-motivation-card" variant="soft" aria-label="Daily Morning Motivation">
      <div className="morning-motivation-inner">
        {/* Header Strip */}
        <div className="morning-motivation-header">
          <div className="morning-motivation-badge">
            <Sparkles size={14} className="morning-sparkle-icon" aria-hidden="true" />
            <span>Morning Motivation</span>
          </div>

          {useMock && (
            <span className="morning-mock-pill">Dev Preview</span>
          )}
        </div>

        {/* Content Body */}
        <div className="morning-motivation-body">
          {loading && (
            <div className="morning-loading-skeleton" aria-live="polite">
              <div className="skeleton-line line-long" />
              <div className="skeleton-line line-short" />
            </div>
          )}

          {!loading && isAiUnconfigured && (
            <div className="morning-unconfigured-state" role="status">
              <div className="morning-unconfigured-content">
                <AlertCircle size={16} className="text-warning flex-shrink-0" />
                <span>AI motivation is unavailable because AI is not configured.</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUseMock(true);
                  fetchMotivation(true);
                }}
              >
                Enable Dev Preview (Mock AI)
              </Button>
            </div>
          )}

          {!loading && error && !isAiUnconfigured && (
            <div className="morning-error-state" role="alert">
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchMotivation()}
                leftIcon={<RefreshCw size={13} />}
              >
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && !isAiUnconfigured && motivation && (
            <div className="morning-content-wrapper">
              <p className="morning-motivation-text">
                "{motivation.message}"
              </p>

              {motivation.focusHabit && (
                <div className="morning-focus-chip" aria-label={`Recommended focus habit: ${motivation.focusHabit}`}>
                  <Target size={13} className="text-primary" aria-hidden="true" />
                  <span className="morning-focus-label">Today's focus:</span>
                  <strong className="morning-focus-name">{motivation.focusHabit}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default MorningMotivationCard;
