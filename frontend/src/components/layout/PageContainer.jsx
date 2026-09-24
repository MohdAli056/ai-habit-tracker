export function PageContainer({ as: Component = 'div', children, className = '', ...props }) {
  return <Component {...props} className={`page-container ${className}`}>{children}</Component>;
}
