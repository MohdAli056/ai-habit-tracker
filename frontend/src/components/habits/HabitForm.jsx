/**
 * HabitForm — create and edit habits in a slide-over panel.
 *
 * Used for both creating (no initialData) and editing (initialData provided).
 * Color picker is a curated palette of 12 hex swatches.
 */

import { useEffect, useState } from 'react';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { IconPicker, HABIT_ICONS } from './IconPicker.jsx';

const CATEGORIES = [
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

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

const PALETTE = [
  '#6255db', '#9d44f5', '#e94d91', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
];

const DEFAULTS = {
  name: '',
  description: '',
  category: 'other',
  frequency: 'daily',
  targetDays: 7,
  icon: '⭐',
  color: '#6255db',
};

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Name is required.';
  const td = Number(values.targetDays);
  if (!Number.isInteger(td) || td < 1 || td > 7) errors.targetDays = 'Enter a number between 1 and 7.';
  return errors;
}

export function HabitForm({ open, initialData, loading, onSubmit, onClose }) {
  const [values, setValues] = useState(DEFAULTS);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setValues(initialData ? { ...DEFAULTS, ...initialData } : DEFAULTS);
      setErrors({});
    }
  }, [open, initialData]);

  if (!open) return null;

  function set(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(values);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({
      name: values.name.trim(),
      description: values.description.trim(),
      category: values.category,
      frequency: values.frequency,
      targetDays: Number(values.targetDays),
      icon: values.icon,
      color: values.color,
    });
  }

  const isEdit = Boolean(initialData?._id);

  return (
    <div className="form-backdrop" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit habit' : 'New habit'}>
      <div className="habit-form-panel">
        <div className="habit-form-header">
          <h2>{isEdit ? 'Edit habit' : 'New habit'}</h2>
          <button type="button" className="form-close-btn" aria-label="Close" onClick={onClose}>✕</button>
        </div>

        <form className="habit-form-body" onSubmit={handleSubmit} noValidate>
          <Input
            label="Name"
            name="name"
            placeholder="e.g. Read for 20 minutes"
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            error={errors.name}
            autoFocus
          />
          <Input
            label="Description (optional)"
            name="description"
            placeholder="What's this habit about?"
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
          />

          {/* Category */}
          <label className="input-field">
            <span className="input-label">Category</span>
            <select
              className="ui-input"
              value={values.category}
              onChange={(e) => set('category', e.target.value)}
            >
              {CATEGORIES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          {/* Frequency + Target days side by side */}
          <div className="habit-form-row">
            <label className="input-field">
              <span className="input-label">Frequency</span>
              <select
                className="ui-input"
                value={values.frequency}
                onChange={(e) => set('frequency', e.target.value)}
              >
                {FREQUENCIES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <Input
              label="Target days (1–7)"
              name="targetDays"
              type="number"
              min={1}
              max={7}
              value={values.targetDays}
              onChange={(e) => set('targetDays', e.target.value)}
              error={errors.targetDays}
            />
          </div>

          {/* Icon picker */}
          <div className="input-field">
            <span className="input-label">Icon</span>
            <IconPicker value={values.icon} onChange={(icon) => set('icon', icon)} />
          </div>

          {/* Color palette */}
          <div className="input-field">
            <span className="input-label">Color</span>
            <div className="color-palette">
              {PALETTE.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={`color-swatch${values.color === hex ? ' color-swatch-selected' : ''}`}
                  style={{ background: hex }}
                  aria-label={hex}
                  aria-pressed={values.color === hex}
                  onClick={() => set('color', hex)}
                />
              ))}
            </div>
          </div>

          <div className="habit-form-footer">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" loading={loading}>{isEdit ? 'Save changes' : 'Create habit'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
