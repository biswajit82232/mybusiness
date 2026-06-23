/**
 * Primary column after the sidebar: mobile app bar + main stage (routes, overlays, global modals).
 */
export function AuthenticatedMainColumn({ mobileBar, children }) {
  return (
    <div id="main-content" className="main-content" tabIndex={-1}>
      {mobileBar}
      {children}
    </div>
  );
}
