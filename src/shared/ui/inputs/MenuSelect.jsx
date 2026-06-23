import { useEffect, useId, useMemo, useRef, useState } from "react";
import { IcChevD } from "@/shared/ui/icons/AppIcons.jsx";

/**
 * Custom select dropdown (no native <select>).
 * - Touch-friendly: full-width button, large hit targets
 * - Works in overlays and tab pages
 */
export function MenuSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Select",
  disabled = false,
  className = "",
}) {
  const uid = useId();
  const btnRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => options.find((o) => String(o.value) === String(value)) || null, [options, value]);
  const btnText = selected?.label || placeholder;

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      const t = e.target;
      if (btnRef.current && btnRef.current.contains(t)) return;
      if (listRef.current && listRef.current.contains(t)) return;
      setOpen(false);
    };
    const focusOpt = (idx) => {
      const buttons = listRef.current?.querySelectorAll(".menu-select-opt");
      if (!buttons || buttons.length === 0) return;
      const safe = ((idx % buttons.length) + buttons.length) % buttons.length;
      buttons[safe]?.focus();
    };
    const findFocusedIndex = () => {
      const buttons = Array.from(listRef.current?.querySelectorAll(".menu-select-opt") || []);
      return buttons.indexOf(document.activeElement);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const idx = findFocusedIndex();
        focusOpt(idx === -1 ? 0 : idx + 1);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const idx = findFocusedIndex();
        focusOpt(idx === -1 ? -1 : idx - 1);
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        focusOpt(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        const buttons = listRef.current?.querySelectorAll(".menu-select-opt");
        if (buttons && buttons.length) focusOpt(buttons.length - 1);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const cur = listRef.current?.querySelector(`[data-value="${CSS.escape(String(value ?? ""))}"]`);
      if (cur) {
        if (typeof cur.scrollIntoView === "function") {
          cur.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
        /* Move keyboard focus to the currently-selected option so arrow nav works immediately. */
        if (typeof cur.focus === "function") cur.focus();
      }
    }, 0);
    return () => clearTimeout(t);
  }, [open, value]);

  return (
    <div className={`menu-select ${className}`.trim()}>
      {label ? (
        <span className="menu-select-lbl" id={`${uid}-lbl`}>
          {label}
        </span>
      ) : null}
      <button
        ref={btnRef}
        type="button"
        className={`menu-select-btn${open ? " open" : ""}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${uid}-lbl` : undefined}
        aria-controls={`${uid}-list`}
      >
        <span className={`menu-select-btn-txt${selected ? "" : " placeholder"}`}>{btnText}</span>
        <span className="menu-select-btn-ic" aria-hidden="true">
          <IcChevD />
        </span>
      </button>

      {open && (
        <div className="menu-select-pop" role="presentation">
          <ul ref={listRef} id={`${uid}-list`} className="menu-select-list" role="listbox" aria-label={label || "Options"}>
            {options.map((o) => {
              const active = String(o.value) === String(value);
              return (
                <li key={String(o.value)} className="menu-select-li" role="presentation">
                  <button
                    type="button"
                    className={`menu-select-opt${active ? " active" : ""}`}
                    role="option"
                    aria-selected={active}
                    data-value={String(o.value)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setOpen(false);
                      onChange?.(o.value);
                    }}
                  >
                    <span className="menu-select-opt-main">{o.label}</span>
                    {o.sub ? <span className="menu-select-opt-sub">{o.sub}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

