export function AppShell({ children }) {
  return (
    <div className="app-shell">
      <div className="aurora aurora-one" aria-hidden="true" />
      <div className="aurora aurora-two" aria-hidden="true" />
      <div className="app-content">{children}</div>
    </div>
  );
}
