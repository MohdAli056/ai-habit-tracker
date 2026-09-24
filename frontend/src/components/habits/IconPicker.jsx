/**
 * IconPicker — select from the 12 predefined habit emojis.
 */

export const HABIT_ICONS = ['📚', '🏃', '💧', '🧘', '💻', '🧠', '🥗', '💪', '🎨', '💰', '🤝', '⭐'];

export function IconPicker({ value, onChange }) {
  return (
    <div className="icon-picker" role="radiogroup" aria-label="Choose an icon">
      {HABIT_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          role="radio"
          aria-checked={value === icon}
          className={`icon-option${value === icon ? ' icon-option-selected' : ''}`}
          onClick={() => onChange(icon)}
          title={icon}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
