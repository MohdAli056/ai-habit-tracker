const gapClasses = {
  sm: 'stack-sm',
  md: 'stack-md',
  lg: 'stack-lg',
};

export function Stack({ align = 'stretch', children, className = '', gap = 'md' }) {
  return <div className={`stack ${gapClasses[gap] || gapClasses.md} stack-align-${align} ${className}`}>{children}</div>;
}
