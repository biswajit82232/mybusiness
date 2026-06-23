import { useEffect, useRef, useState } from "react";
import { filterCustomerSuggestRows } from "@/domain/index.js";
import { Field } from "@/shared/ui/layout/AppChrome.jsx";

/**
 * Name autocomplete (reuse customer suggest styles). Caller supplies rows with `displayName`.
 */
export function LoanGivenNameSuggest({
  label,
  value,
  onChange,
  onPick,
  rows,
  listId,
  required,
  autoFocus,
  placeholder,
  metaForRow,
}) {
  const matches = filterCustomerSuggestRows(rows, value);
  const [open, setOpen] = useState(false);
  const blurTRef = useRef(null);

  useEffect(
    () => () => {
      if (blurTRef.current) clearTimeout(blurTRef.current);
    },
    [],
  );

  const pick = (row) => {
    if (blurTRef.current) clearTimeout(blurTRef.current);
    onPick(row);
    setOpen(false);
  };

  return (
    <Field label={label}>
      <div className="customer-autocomplete">
        <input
          type="text"
          required={required}
          value={value}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            if (blurTRef.current) clearTimeout(blurTRef.current);
            blurTRef.current = window.setTimeout(() => setOpen(false), 180);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && open && matches.length > 0) {
              e.preventDefault();
              pick(matches[0]);
            }
          }}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && matches.length > 0}
          aria-controls={listId}
        />
        {open && matches.length > 0 ? (
          <ul id={listId} className="customer-suggest-list" role="listbox">
            {matches.map((r) => {
              const meta = metaForRow?.(r);
              return (
                <li key={r.id} className="customer-suggest-li" role="presentation">
                  <button
                    type="button"
                    className="customer-suggest-item"
                    role="option"
                    aria-selected="false"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(r)}
                  >
                    <span className="customer-suggest-name">{r.displayName}</span>
                    {meta ? <span className="customer-suggest-phone">{meta}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}
