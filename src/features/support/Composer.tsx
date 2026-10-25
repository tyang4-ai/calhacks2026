// F-support T2: the composer (support-input, support-send).
// - Send or Enter emits support.asked with userEvent(): the thread, the side, the text, the slot's
//   language and contextIds, which hold only what's on screen. The sources registry answers.
// - While the current thread waits on an answer, Send waits, so a person can't stack questions.
// - In live mode, support-live-note under the input reads L12.
import { useId, useState } from "react";
import { useCindia } from "../../core/store";
import { Button } from "../../ui";
import { askSupport } from "./ask";
import { L12, STRINGS, t, type Lang } from "./strings";
import type { Side } from "./threadModel";

export interface ComposerProps {
  side: Side;
  lang: Lang;
  contextIds: string[];
  currentThreadId: string | null;
  /** True while the current thread waits on an answer. */
  busy: boolean;
  /** Called with the thread a question went to. */
  onAsked?: (threadId: string) => void;
}

const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
} as const;

export function Composer({ side, lang, contextIds, currentThreadId, busy, onAsked }: ComposerProps) {
  const [text, setText] = useState("");
  const inputId = useId();
  const noteId = useId();
  const live = useCindia((s) => s.mode === "live");
  const empty = text.trim() === "";
  const blocked = empty || busy;

  const send = () => {
    if (blocked) return;
    const threadId = askSupport({ text, side, lang, contextIds, currentThreadId });
    if (!threadId) return;
    setText("");
    onAsked?.(threadId);
  };

  return (
    <div lang={lang} style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        style={{ display: "flex", gap: "var(--c-space-8)", alignItems: "center" }}
      >
        <label htmlFor={inputId} style={visuallyHidden}>
          {t(STRINGS.inputLabel, lang)}
        </label>
        <input
          id={inputId}
          data-testid="support-input"
          type="text"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t(STRINGS.inputPlaceholder, lang)}
          aria-describedby={live ? noteId : undefined}
          style={{
            flex: 1,
            minWidth: 0,
            height: 40,
            boxSizing: "border-box",
            padding: "var(--c-space-8) var(--c-space-12)",
            border: "1px solid var(--c-color-line)",
            borderRadius: "var(--c-radius-control)",
            background: "var(--c-color-paper)",
            color: "var(--c-color-ink)",
            font: "inherit",
            fontSize: "var(--c-text-16)",
          }}
        />
        <Button
          type="submit"
          testId="support-send"
          disabled={blocked}
          aria-disabled={blocked}
          title={busy ? t(STRINGS.waitForAnswer, lang) : undefined}
          data-busy={busy ? "true" : undefined}
        >
          {t(STRINGS.send, lang)}
        </Button>
      </form>
      {live && (
        <p id={noteId} data-testid="support-live-note" style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>
          {t(L12, lang)}
        </p>
      )}
    </div>
  );
}
