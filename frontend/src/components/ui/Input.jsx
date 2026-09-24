import { useId } from 'react';

export function Input({ error, hint, id, label, className = '', ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ') || undefined;

  return (
    <label className={`input-field ${className}`}>
      {label && <span className="input-label">{label}</span>}
      <input id={inputId} className={`ui-input ${error ? 'input-invalid' : ''}`} aria-describedby={describedBy} aria-invalid={Boolean(error)} {...props} />
      {hint && <span id={`${inputId}-hint`} className="input-hint">{hint}</span>}
      {error && <span id={`${inputId}-error`} className="input-error">{error}</span>}
    </label>
  );
}
