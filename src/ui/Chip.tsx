import type { Lang, Text } from "../core/types";
import { pickText, SEARCH_WORDS } from "./strings";

export interface ChipProps {
  testId?: string;
  /** A keyword as typed, or a Text picked by `lang`. */
  label: string | Text;
  /** Marked by its border and weight as well as its color. */
  selected?: boolean;
  /** Shows a remove control after the label. */
  onRemove?: () => void;
  /** Makes the label a button. */
  onClick?: () => void;
  /** On the remove control. SearchBar passes `<chipPrefix>remove-<n>`. */
  removeTestId?: string;
  lang?: Lang;
}

/**
 * One chip: a keyword or a facet. The remove control is an icon with an accessible name and no
 * text of its own, so the chip's text is exactly its label.
 */
export function Chip({ testId, label, selected = false, onRemove, onClick, removeTestId, lang = "en" }: ChipProps) {
  const text = typeof label === "string" ? label : pickText(label, lang);
  return (
    <span
      className={`c-chip${selected ? " c-chip--selected" : ""}${onRemove ? " c-chip--removable" : ""}`}
      data-testid={testId}
      data-selected={selected || undefined}
      lang={typeof label === "string" ? undefined : lang}
    >
      {onClick ? (
        <button type="button" className="c-chip__label c-chip__label--button" aria-pressed={selected} onClick={onClick}>
          {text}
        </button>
      ) : (
        <span className="c-chip__label">{text}</span>
      )}
      {onRemove && (
        <button
          type="button"
          className="c-chip__remove"
          data-testid={removeTestId}
          aria-label={`${pickText(SEARCH_WORDS.remove, lang)} ${text}`}
          title={pickText(SEARCH_WORDS.remove, lang)}
          onClick={onRemove}
        >
          <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
            <path d="M3.5 3.5 L10.5 10.5 M10.5 3.5 L3.5 10.5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
      )}
    </span>
  );
}
