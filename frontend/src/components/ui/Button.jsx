import { LoadingSpinner } from './LoadingSpinner.jsx';

const variantClasses = {
  primary: 'button-primary',
  secondary: 'button-secondary',
  ghost: 'button-ghost',
  danger: 'button-danger',
};

const sizeClasses = {
  sm: 'button-sm',
  md: 'button-md',
  lg: 'button-lg',
};

export function Button({
  as: Component = 'button',
  children,
  className = '',
  disabled = false,
  fullWidth = false,
  loading = false,
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...props
}) {
  const isNativeButton = Component === 'button';

  return (
    <Component
      {...props}
      className={`ui-button ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || sizeClasses.md} ${fullWidth ? 'button-full' : ''} ${className}`.trim()}
      {...(isNativeButton
        ? { type, disabled: disabled || loading }
        : { 'aria-disabled': (disabled || loading) || undefined })}
    >
      {loading && <LoadingSpinner size="sm" />}
      <span>{children}</span>
    </Component>
  );
}
