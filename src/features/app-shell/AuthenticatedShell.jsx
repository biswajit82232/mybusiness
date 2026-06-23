/**
 * Root layout after auth: skip link, sidebar column, and main column (`children`).
 */
export function AuthenticatedShell({ sidebar, children }) {
  return (
    <div className="shell app-md3">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="app-layout">
        {sidebar}
        {children}
      </div>
    </div>
  );
}
