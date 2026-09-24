/**
 * SuggestionCard — displays a single AI habit suggestion.
 *
 * Shows:
 *   - Emoji icon with colored accent background
 *   - Habit name and category badge
 *   - Frequency and target days badge
 *   - Habit description
 *   - "Why it fits" coaching callout
 *   - "Use This Habit" action button
 */

import { ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';

export function SuggestionCard({ suggestion, onSelect }) {
  if (!suggestion) return null;

  const {
    name,
    description,
    category,
    frequency,
    targetDays,
    icon,
    color,
    reason,
  } = suggestion;

  const frequencyLabel =
    frequency === 'daily'
      ? 'Daily'
      : `${targetDays}x / week`;

  return (
    <Card className="suggestion-card">
      <div className="suggestion-card-header">
        <div
          className="suggestion-icon-wrap"
          style={{
            backgroundColor: `${color}20`,
            borderColor: `${color}40`,
          }}
          aria-hidden="true"
        >
          <span className="suggestion-emoji">{icon || '⭐'}</span>
        </div>

        <div className="suggestion-meta">
          <h4 className="suggestion-name">{name}</h4>
          <div className="suggestion-badges">
            <Badge tone="primary">{category}</Badge>
            <Badge tone="neutral">{frequencyLabel}</Badge>
          </div>
        </div>
      </div>

      <p className="suggestion-description">{description}</p>

      {/* Why it fits coaching callout */}
      <div className="suggestion-reason-box">
        <div className="suggestion-reason-header">
          <Sparkles size={13} className="text-primary" aria-hidden="true" />
          <span>Why this fits you</span>
        </div>
        <p className="suggestion-reason-text">{reason}</p>
      </div>

      <div className="suggestion-card-footer">
        <Button
          onClick={() => onSelect(suggestion)}
          size="sm"
          fullWidth
          className="suggestion-select-btn"
        >
          Use This Habit <ArrowRight size={14} aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}

export default SuggestionCard;
