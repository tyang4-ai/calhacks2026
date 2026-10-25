// F-support T2: the suggested questions for a side, from demoQuestions in src/mock/swarm.ts, in its
// order (the buyer's d04 question first). Each is a button with the test ID prefix it's given:
// support-suggest-<n> in the drawer, support-piece-suggest-<n> in the piece page's side panel (D1-44).
// Clicking one sends it as if typed. Every one has its own scripted run (D1-17).
import { Button } from "../../ui";
import { questionsFor } from "./records";
import { STRINGS, t, type Lang } from "./strings";
import type { Side } from "./threadModel";

export interface SuggestionsProps {
  side: Side;
  lang: Lang;
  /** "support-suggest" in the drawer, "support-piece-suggest" in the side panel. */
  testIdPrefix: "support-suggest" | "support-piece-suggest";
  /** Called with the question's words in the slot's language. */
  onAsk: (text: string) => void;
  /** True while the current thread waits on an answer. */
  disabled?: boolean;
  /** Hides the "Try asking" heading. */
  hideHeading?: boolean;
}

export function Suggestions({ side, lang, testIdPrefix, onAsk, disabled = false, hideHeading = false }: SuggestionsProps) {
  const questions = questionsFor(side);
  if (questions.length === 0) return null;
  return (
    <section lang={lang} aria-label={t(STRINGS.suggestionsHeading, lang)} style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}>
      {!hideHeading && <p style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>{t(STRINGS.suggestionsHeading, lang)}</p>}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}>
        {questions.map((q, i) => (
          <li key={q.text.en}>
            <Button
              variant="quiet"
              size="small"
              testId={`${testIdPrefix}-${i + 1}`}
              disabled={disabled}
              aria-disabled={disabled}
              onClick={() => {
                if (!disabled) onAsk(t(q.text, lang));
              }}
              style={{ textAlign: "left", width: "100%", whiteSpace: "normal" }}
            >
              {t(q.text, lang)}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
