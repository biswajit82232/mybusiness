import { AppSidebar } from "@/features/app-sidebar/index.js";

/** Navigation drawer plus mobile overlay (same close behavior as `onClose`). */
export function AppSidebarColumn({
  open,
  onClose,
  page,
  screen,
  alertCount,
  goPage,
  pendingOutbox = 0,
  onLogout,
}) {
  return (
    <>
      <AppSidebar
        open={open}
        onClose={onClose}
        page={page}
        screen={screen}
        alertCount={alertCount}
        goPage={goPage}
        pendingOutbox={pendingOutbox}
        onLogout={onLogout}
      />
      <div
        className={`sidebar-overlay${open ? " is-open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
    </>
  );
}
