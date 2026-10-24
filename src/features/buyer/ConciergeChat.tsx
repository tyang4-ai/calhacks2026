// The buyer's gift finder text box. It shows the latest concierge.asked request from the store, so the
// timeline's request reads as if typed. The buyer can type their own and press Enter, which emits a
// user concierge.asked. The sources registry answers it; this component never emits the answer.
import { useId, useState, type KeyboardEvent } from "react";
import { userEvent } from "../../core/events";
import type { CindiaState } from "../../core/state";
import { emit, useCindia } from "../../core/store";
import { tr, ui, type Lang } from "./strings";

export interface ConciergeChatProps {
  lang: Lang;
}

const selectQuery = (s: CindiaState) => s.buyer.conciergeQuery;

export function ConciergeChat({ lang }: ConciergeChatProps) {
  const storeQuery = useCindia(selectQuery);
  // What the buyer is typing. null means the box shows the store's request.
  const [draft, setDraft] = useState<string | null>(null);
  const inputId = useId();
  const hintId = useId();

  const value = draft ?? storeQuery ?? "";

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    const query = (draft ?? "").trim();
    if (query === "") return;
    emit(userEvent("concierge.asked", { query, lang }));
    setDraft(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-4)" }}>
      <label
        htmlFor={inputId}
        style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)", fontWeight: 500 }}
      >
        {tr(ui.conciergeInputLabel, lang)}
      </label>
      <input
        id={inputId}
        data-testid="buyer-concierge-input"
        type="text"
        value={value}
        placeholder={tr(ui.conciergePlaceholder, lang)}
        aria-describedby={hintId}
        autoComplete="off"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        style={{
          font: "inherit",
          fontSize: "var(--c-text-16)",
          color: "var(--c-color-ink)",
          background: "var(--c-color-paper)",
          border: "1px solid var(--c-color-line)",
          borderRadius: "var(--c-radius-control)",
          padding: "var(--c-space-8) var(--c-space-12)",
          minHeight: 44,
          boxSizing: "border-box",
          width: "100%",
        }}
      />
      <span id={hintId} style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>
        {tr(ui.conciergeHint, lang)}
      </span>
    </div>
  );
}
