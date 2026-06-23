import { IcChevR } from "@/shared/ui/icons/AppIcons.jsx";
export function SettingsHubRow({ icon, title, subtitle, onClick, variant }) {
  return (
    <button
      type="button"
      className={`settings-hub-row${variant === "danger" ? " settings-hub-row--danger" : ""}`}
      onClick={onClick}
    >
      <span className="settings-hub-row-ic">{icon}</span>
      <span className="settings-hub-row-text">
        <span className="settings-hub-row-title">{title}</span>
        {subtitle ? <span className="settings-hub-row-sub">{subtitle}</span> : null}
      </span>
      <span className="settings-hub-row-chev" aria-hidden="true"><IcChevR /></span>
    </button>
  );
}