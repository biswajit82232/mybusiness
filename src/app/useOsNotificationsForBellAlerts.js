import { useEffect } from "react";

/** EMI: only the single T-3 reminder should surface as an OS notification. */
function shouldOsNotify(n) {
  if (!n || typeof n !== "object") return false;
  if (String(n.kind || "").startsWith("emi-")) return n.kind === "emi-due-3d";
  return true;
}

/** Fire one OS notification per bell alert id per session when permission is granted. */
export function useOsNotificationsForBellAlerts(notifications, notifPerm, firedNotifIds) {
  useEffect(() => {
    if (notifPerm !== "granted") return;
    if (!("serviceWorker" in navigator)) return;
    for (const n of notifications) {
      if (!shouldOsNotify(n)) continue;
      if (firedNotifIds.current.has(n.id)) continue;
      firedNotifIds.current.add(n.id);
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.active?.postMessage({
            type: "SHOW_NOTIFICATION",
            title: n.title,
            body: `${n.sub}${n.meta ? " · " + n.meta : ""}`,
            tag: n.id,
          });
        })
        .catch(() => {});
    }
  }, [notifications, notifPerm, firedNotifIds]);
}
