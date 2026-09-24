const toneClasses = {
  accent: 'badge-accent',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  neutral: 'badge-neutral',
};

export function Badge({ children, className = '', tone = 'neutral' }) {
  return <span className={`ui-badge ${toneClasses[tone] || toneClasses.neutral} ${className}`}>{children}</span>;
}
