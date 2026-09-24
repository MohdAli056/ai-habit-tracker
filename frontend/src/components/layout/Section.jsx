const spacingClasses = {
  sm: 'section-sm',
  md: 'section-md',
  lg: 'section-lg',
};

export function Section({ children, className = '', description, heading, spacing = 'md' }) {
  return (
    <section className={`section ${spacingClasses[spacing] || spacingClasses.md} ${className}`}>
      {(heading || description) && (
        <div className="section-heading">
          {heading && <h2>{heading}</h2>}
          {description && <p className="muted-copy">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
