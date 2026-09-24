const columnClasses = {
  two: 'grid-two',
  three: 'grid-three',
  four: 'grid-four',
};

export function Grid({ children, className = '', columns = 'two' }) {
  return <div className={`responsive-grid ${columnClasses[columns] || columnClasses.two} ${className}`.trim()}>{children}</div>;
}
