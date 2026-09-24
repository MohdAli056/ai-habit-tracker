export function IconButton({ 'aria-label': ariaLabel, children, className = '', type = 'button', ...props }) {
  return (
    <button {...props} type={type} className={`icon-button ${className}`} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
