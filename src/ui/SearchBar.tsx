import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import type { Lang, Text } from "../core/types";
import { addChip, chipTestIds, removeChipAt } from "./cards";
import { Chip } from "./Chip";
import { pickText, SEARCH_WORDS } from "./strings";

export interface SearchBarProps {
  /** On the bar's root. */
  testId?: string;
  /**
   * `input` on the text box, `submit` on the button, and chip n (from 1) gets `<chipPrefix><n>`,
   * its remove control `<chipPrefix>remove-<n>`. `add`, when given, goes on the add-a-keyword box.
   */
  testIds: { input: string; submit: string; chipPrefix: string; add?: string };
  value: string;
  onChange: (value: string) => void;
  chips: string[];
  /** Makes each chip removable, and shows the add-a-keyword box unless `showAdd` is false. */
  onChipsChange?: (chips: string[]) => void;
  onSubmit: (value: string) => void;
  placeholder: Text;
  lang: Lang;
  /** Default "Search". */
  submitLabel?: Text;
  /** Default true when `onChipsChange` is set. */
  showAdd?: boolean;
  /** Default "Add a keyword". */
  addPlaceholder?: Text;
  /** Shown after the chips, such as the Rule-based badge. */
  chipsAside?: ReactNode;
  disabled?: boolean;
}

/**
 * The search text and its keyword chips. Enter in the text box searches. Each chip can be removed,
 * and a keyword typed into the add box becomes a chip on Enter. Chips keep their order, so chip n's
 * test ID stays stable. It holds no state: the feature owns the text and the chips.
 */
export function SearchBar({
  testId,
  testIds,
  value,
  onChange,
  chips,
  onChipsChange,
  onSubmit,
  placeholder,
  lang,
  submitLabel = SEARCH_WORDS.submit,
  showAdd,
  addPlaceholder = SEARCH_WORDS.addKeyword,
  chipsAside,
  disabled = false,
}: SearchBarProps) {
  const canAdd = onChipsChange !== undefined && showAdd !== false;
  const hint = pickText(placeholder, lang);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!disabled) onSubmit(value);
  }

  function onAddKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing || !onChipsChange) return;
    e.preventDefault();
    const box = e.currentTarget;
    const next = addChip(chips, box.value);
    if (next.length !== chips.length) onChipsChange(next);
    box.value = "";
  }

  return (
    <div className="c-searchbar" data-testid={testId} lang={lang}>
      <form className="c-searchbar__form" role="search" onSubmit={submit}>
        <svg className="c-searchbar__icon" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12.5 12.5 L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
        </svg>
        <input
          className="c-searchbar__input"
          data-testid={testIds.input}
          type="text"
          value={value}
          placeholder={hint}
          aria-label={hint}
          enterKeyHint="search"
          autoComplete="off"
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="submit" className="c-button c-button--primary c-searchbar__submit" data-testid={testIds.submit} disabled={disabled}>
          {pickText(submitLabel, lang)}
        </button>
      </form>
      {(chips.length > 0 || canAdd || chipsAside !== undefined) && (
        <div className="c-searchbar__chips">
          <ul className="c-searchbar__chiplist" aria-label={pickText(SEARCH_WORDS.keywords, lang)}>
            {chips.map((chip, i) => {
              const ids = chipTestIds(testIds.chipPrefix, i + 1);
              return (
                <li key={`${i}:${chip}`}>
                  <Chip
                    testId={ids.chip}
                    label={chip}
                    lang={lang}
                    removeTestId={onChipsChange ? ids.remove : undefined}
                    onRemove={onChipsChange ? () => onChipsChange(removeChipAt(chips, i)) : undefined}
                  />
                </li>
              );
            })}
          </ul>
          {canAdd && (
            <input
              className="c-searchbar__add"
              data-testid={testIds.add}
              type="text"
              defaultValue=""
              placeholder={pickText(addPlaceholder, lang)}
              aria-label={pickText(addPlaceholder, lang)}
              autoComplete="off"
              disabled={disabled}
              onKeyDown={onAddKey}
            />
          )}
          {chipsAside}
        </div>
      )}
    </div>
  );
}
