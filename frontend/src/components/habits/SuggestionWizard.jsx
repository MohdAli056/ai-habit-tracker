/**
 * SuggestionWizard — 3-step AI habit discovery wizard.
 *
 * Steps:
 *   1. Goal: "What would you like to improve?" (quick chips + free text)
 *   2. Productive Time: "When are you usually most productive?" (single choice)
 *   3. Struggles: "What usually gets in the way?" (quick chips + free text)
 *
 * States:
 *   - Step 1 -> Step 2 -> Step 3
 *   - In-flight generation spinner
 *   - Results view: 3 SuggestionCard components
 *   - Error / AI Unavailable (503) state with retry & dev mock preview
 *   - Selecting a suggestion forwards data to onSelectSuggestion (prefilling HabitForm)
 */

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Clock,
  HelpCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { aiApi } from '../../api/ai.js';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';
import { SuggestionCard } from './SuggestionCard.jsx';

const GOAL_PRESETS = [
  'Get healthier',
  'Learn a new skill',
  'Become more productive',
  'Improve sleep',
  'Build better routines',
];

const TIME_OPTIONS = [
  { value: 'Morning', label: 'Morning', desc: 'Early start, high morning energy' },
  { value: 'Afternoon', label: 'Afternoon', desc: 'Post-lunch focus and midday rhythm' },
  { value: 'Evening', label: 'Evening', desc: 'Post-work / dinner wind-down' },
  { value: 'Night', label: 'Night', desc: 'Late night quiet and deep focus' },
  { value: 'It varies', label: 'It varies', desc: 'Flexible schedule depending on the day' },
];

const STRUGGLE_PRESETS = [
  'Lack of consistency',
  'Forgetting',
  'Lack of time',
  'Low motivation',
  'Too many distractions',
  'Unclear goals',
  'Overwhelmed by big habits',
];

export function SuggestionWizard({ open, onClose, onSelectSuggestion }) {
  const [step, setStep] = useState(1); // 1, 2, 3, or 'results'
  const [goal, setGoal] = useState('');
  const [productiveTime, setProductiveTime] = useState('Morning');
  const [struggles, setStruggles] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [meta, setMeta] = useState(null);

  if (!open) return null;

  function resetForm() {
    setStep(1);
    setGoal('');
    setProductiveTime('Morning');
    setStruggles('');
    setError(null);
    setSuggestions([]);
    setMeta(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleGenerate(useMock = false) {
    if (!goal.trim() || !productiveTime || !struggles.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await aiApi.getHabitSuggestions({
        goal: goal.trim(),
        productiveTime,
        struggles: struggles.trim(),
        useMock,
      });

      setSuggestions(res.data.suggestions || []);
      setMeta(res.data.meta || null);
      setStep('results');
    } catch (err) {
      console.error('Failed to generate suggestions:', err);
      const code = err.response?.data?.code;
      const message =
        err.response?.data?.message ||
        'Failed to generate suggestions. Please try again.';
      setError({ code, message });
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(suggestion) {
    onSelectSuggestion({
      name: suggestion.name,
      description: suggestion.description,
      category: suggestion.category,
      frequency: suggestion.frequency,
      targetDays: suggestion.targetDays,
      icon: suggestion.icon,
      color: suggestion.color,
    });
    handleClose();
  }

  return (
    <div
      className="form-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="AI Habit Suggestion Wizard"
    >
      <div className="suggestion-wizard-panel">
        {/* Header */}
        <div className="suggestion-wizard-header">
          <div className="suggestion-wizard-title-wrap">
            <div className="suggestion-wizard-icon-wrap" aria-hidden="true">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="suggestion-wizard-title">AI Habit Suggestions</h2>
              <p className="suggestion-wizard-subtitle">
                {step === 'results'
                  ? '3 tailored routines based on your focus and schedule'
                  : `Step ${step} of 3 — Tailor your recommendations`}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="form-close-btn"
            aria-label="Close"
            onClick={handleClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Progress Bar */}
        {step !== 'results' && (
          <div
            className="wizard-progress-track"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={3}
          >
            <div
              className="wizard-progress-bar"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        )}

        {/* Wizard Body */}
        <div className="suggestion-wizard-body">
          {loading ? (
            /* Loading State */
            <div className="wizard-state-card loading-state">
              <Loader2 size={36} className="spin text-primary" aria-hidden="true" />
              <h3 className="wizard-state-title">Designing your tailored habits…</h3>
              <p className="wizard-state-desc">
                Analyzing your goal, peak energy time, and friction points to craft sustainable micro-habits.
              </p>
            </div>
          ) : error ? (
            /* Error / AI Unavailable State */
            <div
              className={`wizard-state-card error-state ${
                error.code === 'AI_NOT_CONFIGURED' ? 'unconfigured' : ''
              }`}
            >
              <AlertCircle
                size={32}
                className={error.code === 'AI_NOT_CONFIGURED' ? 'text-muted' : 'text-danger'}
                aria-hidden="true"
              />
              <h3 className="wizard-state-title">
                {error.code === 'AI_NOT_CONFIGURED'
                  ? 'AI Habit Suggestions Unavailable'
                  : 'Generation Failed'}
              </h3>
              <p className="wizard-state-desc">{error.message}</p>
              <div className="wizard-error-actions">
                {error.code !== 'AI_NOT_CONFIGURED' && (
                  <Button size="sm" onClick={() => handleGenerate(false)}>
                    <RotateCcw size={14} aria-hidden="true" /> Try again
                  </Button>
                )}
                {import.meta.env.DEV && error.code === 'AI_NOT_CONFIGURED' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleGenerate(true)}
                  >
                    <Sparkles size={14} aria-hidden="true" /> Preview with Mock AI (Dev)
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setError(null)}>
                  Back to inputs
                </Button>
              </div>
            </div>
          ) : step === 1 ? (
            /* ── Step 1: Goal ── */
            <div className="wizard-step-content">
              <div className="wizard-prompt">
                <Target size={20} className="text-primary" aria-hidden="true" />
                <h3>What would you like to improve?</h3>
              </div>
              <p className="wizard-instruction">
                Choose an area of focus or describe what positive change you want to make.
              </p>

              {/* Quick preset chips */}
              <div className="wizard-chips-wrap">
                {GOAL_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`wizard-chip ${goal === preset ? 'active' : ''}`}
                    onClick={() => setGoal(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Free text input */}
              <div className="input-field" style={{ marginTop: '1.25rem' }}>
                <span className="input-label">Custom Goal Description</span>
                <textarea
                  className="ui-input wizard-textarea"
                  placeholder="e.g. Read 20 pages every day, drink more water, or build a consistent workout streak..."
                  value={goal}
                  onChange={(e) => setGoal(e.target.value.slice(0, 200))}
                  rows={3}
                />
                <span className="input-helper">{goal.length} / 200 characters</span>
              </div>
            </div>
          ) : step === 2 ? (
            /* ── Step 2: Productive Time ── */
            <div className="wizard-step-content">
              <div className="wizard-prompt">
                <Clock size={20} className="text-primary" aria-hidden="true" />
                <h3>When are you usually most productive?</h3>
              </div>
              <p className="wizard-instruction">
                We'll anchor your new habits to the part of the day where your focus is naturally highest.
              </p>

              <div className="wizard-options-grid">
                {TIME_OPTIONS.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    className={`wizard-option-card ${
                      productiveTime === value ? 'selected' : ''
                    }`}
                    onClick={() => setProductiveTime(value)}
                  >
                    <div className="wizard-option-header">
                      <span className="wizard-option-radio" aria-hidden="true">
                        {productiveTime === value && <span className="wizard-radio-dot" />}
                      </span>
                      <strong className="wizard-option-label">{label}</strong>
                    </div>
                    <span className="wizard-option-desc">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : step === 3 ? (
            /* ── Step 3: Struggles ── */
            <div className="wizard-step-content">
              <div className="wizard-prompt">
                <HelpCircle size={20} className="text-primary" aria-hidden="true" />
                <h3>What usually gets in the way?</h3>
              </div>
              <p className="wizard-instruction">
                Select your common roadblocks so the coach can design frictionless counter-strategies.
              </p>

              {/* Quick chips */}
              <div className="wizard-chips-wrap">
                {STRUGGLE_PRESETS.map((preset) => {
                  const isActive = struggles.includes(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      className={`wizard-chip ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        if (isActive) {
                          setStruggles((prev) =>
                            prev
                              .replace(preset, '')
                              .replace(/,\s*,/g, ',')
                              .replace(/^,\s*|,\s*$/g, '')
                              .trim(),
                          );
                        } else {
                          setStruggles((prev) =>
                            prev ? `${prev}, ${preset}` : preset,
                          );
                        }
                      }}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>

              {/* Free text input */}
              <div className="input-field" style={{ marginTop: '1.25rem' }}>
                <span className="input-label">Describe Obstacles or Context</span>
                <textarea
                  className="ui-input wizard-textarea"
                  placeholder="e.g. I get pulled into phone scrolling after dinner, or I start too ambitious and burn out by day 4..."
                  value={struggles}
                  onChange={(e) => setStruggles(e.target.value.slice(0, 300))}
                  rows={3}
                />
                <span className="input-helper">{struggles.length} / 300 characters</span>
              </div>
            </div>
          ) : (
            /* ── Results State: 3 Suggestion Cards ── */
            <div className="wizard-results-content">
              <div className="wizard-results-header">
                <div>
                  <h3 className="wizard-results-heading">Select a Habit to Begin</h3>
                  <p className="wizard-results-sub">
                    Click "Use This Habit" on any recommendation to review and fine-tune it in your habit builder.
                  </p>
                </div>
                {meta?.provider === 'mock' && (
                  <Badge tone="warning">Mock AI</Badge>
                )}
              </div>

              <div className="wizard-suggestions-grid">
                {suggestions.map((suggestion, index) => (
                  <SuggestionCard
                    key={`${suggestion.name}-${index}`}
                    suggestion={suggestion}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {!loading && !error && (
          <div className="suggestion-wizard-footer">
            {step === 1 && (
              <>
                <Button variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={goal.trim().length < 3}
                >
                  Next: Productive Time <ArrowRight size={15} aria-hidden="true" />
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft size={15} aria-hidden="true" /> Back
                </Button>
                <Button onClick={() => setStep(3)}>
                  Next: Your Struggles <ArrowRight size={15} aria-hidden="true" />
                </Button>
              </>
            )}

            {step === 3 && (
              <>
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft size={15} aria-hidden="true" /> Back
                </Button>
                <Button
                  onClick={() => handleGenerate(false)}
                  disabled={struggles.trim().length < 3}
                >
                  <Sparkles size={15} aria-hidden="true" /> Generate Suggestions
                </Button>
              </>
            )}

            {step === 'results' && (
              <>
                <Button variant="secondary" onClick={() => setStep(1)}>
                  <RotateCcw size={14} aria-hidden="true" /> Try Different Goal
                </Button>
                <Button variant="ghost" onClick={handleClose}>
                  Done
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SuggestionWizard;
