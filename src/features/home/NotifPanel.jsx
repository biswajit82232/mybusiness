import { IcBell, IcWhatsApp, IcX } from "@/shared/ui/icons/AppIcons.jsx";

export function NotifPanel({ items = [], notifPerm, onRequestPerm, onDismiss, onDismissAll, onClick }) {
  return (
    <div className="notif-panel notif-panel-home-right" role="dialog" aria-label="Alerts">
      <div className="notif-panel-hd">
        <span>Alerts</span>
        {items.length > 0 && (
          <button type="button" className="notif-clear-all" onClick={onDismissAll}>
            Clear all
          </button>
        )}
      </div>
      <div className="notif-panel-body">
        {items.length === 0 ? (
          <p className="notif-empty">No alerts. You&apos;re all caught up.</p>
        ) : (
          items.map((n) => (
            <div key={n.id} className={`notif-item-wrap notif-kind-${n.kind}`}>
              <button type="button" className={`notif-item notif-kind-${n.kind}`} onClick={() => onClick(n)}>
                <span className="notif-item-title">{n.title}</span>
                <span className="notif-item-sub">{n.sub}</span>
                {n.meta && <span className="notif-item-meta">{n.meta}</span>}
              </button>
              {n.waHref ? (
                <a
                  className="notif-item-wa"
                  href={n.waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`WhatsApp: ${n.title}`}
                  title="Send WhatsApp reminder"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IcWhatsApp />
                </a>
              ) : null}
              <button
                type="button"
                className="notif-item-dismiss"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(n.id);
                }}
                aria-label={`Dismiss: ${n.title}`}
              >
                <IcX />
              </button>
            </div>
          ))
        )}
      </div>
      {"Notification" in window && notifPerm !== "granted" && notifPerm !== "denied" && (
        <div className="notif-panel-footer">
          <button type="button" className="notif-enable-btn" onClick={onRequestPerm}>
            <IcBell /> Enable push notifications
          </button>
        </div>
      )}
    </div>
  );
}
