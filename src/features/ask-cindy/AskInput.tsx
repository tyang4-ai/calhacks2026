// The Ask Cindy question box: a labelled text box and a send button. Enter sends, empty text doesn't.
import { useId, useState } from "react";
import { Button } from "../../ui";
import { STRINGS, t, type Lang } from "./strings";

export interface AskInputProps {
  lang: Lang;
  /** Called with the trimmed text when the owner sends a non-empty question. */
  onSend: (text: string) => void;
}

const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
} as const;

export function AskInput({ lang, onSend }: AskInputProps) {
  const [text, setText] = useState("");
  const inputId = useId();
  const empty = text.trim() === "";

  const send = () => {
    const q = text.trim();
    if (!q) return;
    onSend(q);
    setText("");
  };

  return (
    <form
      lang={lang}
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
        data-testid="ask-cindy-input"
        type="text"
        autoComplete="off"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t(STRINGS.inputPlaceholder, lang)}
        style={{
          flex: 1,
          minWidth: 0,
          padding: "var(--c-space-8) var(--c-space-12)",
          border: "1px solid var(--c-color-line)",
          borderRadius: "var(--c-radius-control)",
          background: "var(--c-color-paper)",
          color: "var(--c-color-ink)",
          font: "inherit",
          fontSize: "var(--c-text-14)",
        }}
      />
      <Button type="submit" testId="ask-cindy-send" disabled={empty} aria-disabled={empty}>
        {t(STRINGS.send, lang)}
      </Button>
    </form>
  );
}
