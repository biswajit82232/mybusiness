import { AppSidebar } from "@/features/app-sidebar/index.js";

/** Navigation drawer plus mobile overlay (same close behavior as `onClose`). */
export function AppSidebarColumn({
  open,
  onClose,
  page,
  screen,
  alertCount,
  goPage,
  darkMode,
  setDarkMode,
  pendingOutbox = 0,
  onLogout,
  onOpenSearch,
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
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        pendingOutbox={pendingOutbox}
        onLogout={onLogout}
        onOpenSearch={onOpenSearch}
      />
      <div
        className={`sidebar-overlay${open ? " is-open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
    </>
  );
}
