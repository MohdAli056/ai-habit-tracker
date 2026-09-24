const variantClasses = {
  default: 'card-default',
  elevated: 'card-elevated',
  soft: 'card-soft',
};

export function Card({ as: Component = 'div', children, className = '', variant = 'default', ...props }) {
  return (
    <Component {...props} className={`ui-card ${variantClasses[variant] || variantClasses.default} ${className}`}>
      {children}
    </Component>
  );
}
