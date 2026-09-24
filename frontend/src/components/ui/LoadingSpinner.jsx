const sizeClasses = {
  sm: 'spinner-sm',
  md: 'spinner-md',
  lg: 'spinner-lg',
};

export function LoadingSpinner({ label = 'Loading', size = 'md' }) {
  return <span className={`loading-spinner ${sizeClasses[size] || sizeClasses.md}`} role="status" aria-label={label} />;
}
