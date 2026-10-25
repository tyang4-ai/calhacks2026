// The Ask Cindy drawer (studio.drawer.ask): the three suggestions, the thread of questions and
// answers from the store's ask state, a waiting line until the latest question's answer arrives,
// and the question box. Sending emits ask.asked; the sources registry answers, never this file.
import { useLayoutEffect, useRef } from "react";
import { emit, useCindia, userEvent, type SlotProps } from "../../core";
import { cannedAnswers } from "../../mock";
import { Button, Panel } from "../../ui";
import { AnswerCard } from "./AnswerCard";
import { AskInput } from "./AskInput";
import { GLOSSARY, STRINGS, t } from "./strings";

const USER_PREFIX = "ask_user_";

const speaker = {
  fontSize: "var(--c-text-14)",
  color: "var(--c-color-ink-soft)",
  margin: 0,
} as const;

/**
 * Scrolls the element's nearest scrolling ancestor so the element's bottom (or, with a chart, the
 * chart's axis) shows, without scrolling its top out of view. Sizes are read on screen and turned
 * into the scroller's own pixels, so a scaled stage measures the same.
 */
function revealBottom(el: HTMLElement | null): void {
  if (!el) return;
  let scroller = el.parentElement;
  while (scroller && !["auto", "scroll"].includes(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
  if (!scroller || scroller.clientHeight === 0) return;
  const box = scroller.getBoundingClientRect();
  const k = box.height / scroller.clientHeight || 1;
  const target = el.querySelector("svg.recharts-surface") ?? el;
  const top = el.getBoundingClientRect().top;
  const bottom = target.getBoundingClientRect().bottom;
  const below = (bottom - box.bottom) / k + 12;
  if (below <= 0) return;
  const roomAbove = (top - box.top) / k - 8;
  scroller.scrollTop += Math.max(0, Math.min(below, roomAbove));
}

export function AskDrawer({ lang }: SlotProps) {
  const ask = useCindia((s) => s.ask);
  const latestQ = ask.latestQuestionId;
  const send = (questionId: string, text: string) => emit(userEvent("ask.asked", { questionId, text, lang }));

  // When the latest answer arrives, the drawer body scrolls just enough to show it down to its
  // chart's axis, the way a conversation keeps its newest message in view. Only the nearest scrolling
  // area moves (the drawer's body), never the page or the stage.
  const latestRef = useRef<HTMLDivElement>(null);
  const latestAnswered = latestQ ? Boolean(ask.answers[latestQ]) : false;
  useLayoutEffect(() => {
    if (latestQ && latestAnswered) revealBottom(latestRef.current);
  }, [latestQ, latestAnswered]);

  const sendTyped = (text: string) => {
    const n = ask.questionIds.filter((id) => id.startsWith(USER_PREFIX)).length + 1;
    send(`${USER_PREFIX}${n}`, text);
  };

  return (
    <Panel sourceKeys={["b07-ask"]} title={t(GLOSSARY.askCindy, lang)} lang={lang}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-16)" }}>
        <section aria-label={t(STRINGS.suggestionsHeading, lang)}>
          <p style={{ ...speaker, marginBottom: "var(--c-space-8)" }}>{t(STRINGS.suggestionsHeading, lang)}</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}>
            {cannedAnswers.map((a, i) => (
              <li key={a.questionId}>
                <Button
                  variant="quiet"
                  size="small"
                  testId={`ask-cindy-suggestion-${i + 1}`}
                  // A repeat click re-asks under the same ID: the store keeps one question and makes it
                  // the latest again, so its answer shows at once and nothing waits.
                  onClick={() => send(a.questionId, a.questions[lang])}
                  style={{ textAlign: "left", width: "100%" }}
                >
                  {a.questions[lang]}
                </Button>
              </li>
            ))}
          </ul>
        </section>

        {ask.questionIds.length === 0 ? (
          <p style={{ ...speaker, margin: 0 }}>{t(STRINGS.empty, lang)}</p>
        ) : (
          <ol
            aria-live="polite"
            style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--c-space-16)" }}
          >
            {ask.questionIds.map((qid) => {
              const q = ask.questions[qid];
              const answer = ask.answers[qid];
              const isLatest = qid === latestQ;
              if (!q) return null;
              return (
                <li key={qid} style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}>
                  <div
                    lang={q.lang}
                    style={{
                      alignSelf: "flex-end",
                      maxWidth: "85%",
                      padding: "var(--c-space-8) var(--c-space-12)",
                      borderRadius: "var(--c-radius-control)",
                      background: "var(--c-color-mat)",
                    }}
                  >
                    <p style={speaker}>{t(STRINGS.you, lang)}</p>
                    <p style={{ margin: 0 }}>{q.text}</p>
                  </div>
                  {answer ? (
                    <div ref={isLatest ? latestRef : undefined}>
                      <p style={speaker}>{t(STRINGS.cindySays, lang)}</p>
                      <AnswerCard answer={answer} lang={lang} latest={isLatest} />
                    </div>
                  ) : (
                    isLatest && (
                      <p data-testid="ask-cindy-thinking" role="status" style={{ ...speaker, fontStyle: "italic" }}>
                        {t(STRINGS.thinking, lang)}
                      </p>
                    )
                  )}
                </li>
              );
            })}
          </ol>
        )}

        <AskInput lang={lang} onSend={sendTyped} />
      </div>
    </Panel>
  );
}
