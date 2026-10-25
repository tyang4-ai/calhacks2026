// F-support T1: the thread (support-thread). One kit ChatBubble per message (support-msg-<n>, from 1),
// in arrival order from threadModel.ts:
// - the person's questions on the right,
// - Cindia's replies on the left, each named by its agent from the roster with its kind (the
//   Rule-based badge for a code agent). The newest carries support-reply, its agent support-agent,
//   and its records support-refs. Replies show as written: L14, L15 and L16 arrive inside them.
// - an escalation as support-handoff: its reason and, while its approval is pending, the line that
//   the co-op's manager has been asked to decide,
// - "ask the maker": the forward as a note (support-forwarded-<questionId>) and the maker's own
//   answer (support-maker-answer-<questionId>), her text exactly as she wrote it, in her language,
//   under her name and MakerMark, with "In her own words" and the Demo data badge.
// It never shows a reply, a reason or a maker's answer that no event carried.
import { useMemo } from "react";
import { useCindia } from "../../core/store";
import type { Text } from "../../core/types";
import { Badge, ChatBubble, Link, MakerMark } from "../../ui";
import { agentLabel, makerOf, refView } from "./records";
import { GLOSSARY, STRINGS, forwardedLine, t, type Lang } from "./strings";
import { latestReply, threadItems, type ThreadItem } from "./threadModel";

export interface ThreadProps {
  threadId: string | null;
  lang: Lang;
  /** Shown while the thread has no messages. */
  emptyText?: Text;
}

/** The records a reply names, as small links. */
function Refs({ refIds, lang, testId }: { refIds: string[]; lang: Lang; testId?: string }) {
  if (refIds.length === 0) return null;
  return (
    <ul
      data-testid={testId}
      aria-label={t(STRINGS.refsLabel, lang)}
      style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: "var(--c-space-4) var(--c-space-12)" }}
    >
      {refIds.map((id) => {
        const { label, to } = refView(id, lang);
        return (
          <li key={id} data-ref-id={id} style={{ fontSize: "var(--c-text-14)" }}>
            {to ? (
              <Link to={to} title={id}>
                {label}
              </Link>
            ) : (
              <span title={id}>{label}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" style={{ flex: "0 0 auto", color: "var(--c-color-amber)", marginTop: 3 }}>
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.5 V8 L10.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Handoff({ item, lang }: { item: Extract<ThreadItem, { kind: "escalated" }>; lang: Lang }) {
  const status = useCindia((s) => s.approvals.items[item.message.approvalId]?.status ?? null);
  const line = status === "granted" ? STRINGS.handoffGranted : status === "declined" ? STRINGS.handoffDeclined : STRINGS.handoffPending;
  return (
    <div
      data-testid="support-handoff"
      data-approval-id={item.message.approvalId}
      data-approval-status={status ?? "pending"}
      role="status"
      style={{
        display: "flex",
        gap: "var(--c-space-8)",
        width: "100%",
        boxSizing: "border-box",
        padding: "var(--c-space-12) var(--c-space-16)",
        background: "color-mix(in srgb, var(--c-color-amber) 12%, var(--c-color-paper))",
        border: "1px solid var(--c-color-amber)",
        borderRadius: "var(--c-radius-control)",
      }}
    >
      <ClockIcon />
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-4)" }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: "var(--c-text-14)" }}>{t(STRINGS.handoffTitle, lang)}</p>
        <p style={{ margin: 0 }}>{t(item.message.reason, lang)}</p>
        <p style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>{t(line, lang)}</p>
      </div>
    </div>
  );
}

function MakerAnswer({ item, lang }: { item: Extract<ThreadItem, { kind: "maker" }>; lang: Lang }) {
  const maker = makerOf(item.entry.makerId);
  // Her words, never translated by the page: the same text in both languages, in her own lang.
  const words: Text = { en: item.entry.text, zh: item.entry.text };
  return (
    <ChatBubble
      role="agent"
      agentName={maker.name}
      text={words}
      lang={item.entry.lang}
      at={item.entry.at}
      testId={`support-maker-answer-${item.questionId}`}
      badge={
        <span lang={lang} style={{ display: "inline-flex", alignItems: "center", gap: "var(--c-space-8)" }}>
          <MakerMark char={maker.char} size={20} label={t(maker.name, lang)} />
          <Badge variant="demo" />
        </span>
      }
      detail={
        <span lang={lang} style={{ fontStyle: "italic" }}>
          {t(GLOSSARY.inHerOwnWords, lang)}
        </span>
      }
    />
  );
}

export function Thread({ threadId, lang, emptyText }: ThreadProps) {
  const support = useCindia((s) => s.support);
  const log = useCindia((s) => s.log);
  const items = useMemo(() => threadItems({ support, log }, threadId), [support, log, threadId]);
  const newest = latestReply(items);

  return (
    <div data-testid="support-thread" data-thread-id={threadId ?? undefined} lang={lang} className="c-chat">
      <ol className="c-chat__list" aria-live="polite">
        {items.length === 0 && emptyText && <li className="c-chat__empty">{t(emptyText, lang)}</li>}
        {items.map((item, i) => {
          const n = i + 1;
          const role = item.kind === "asked" ? "person" : item.kind === "forwarded" ? "note" : "agent";
          return (
            <li key={item.key} data-testid={`support-msg-${n}`} data-kind={item.kind} className={`c-chat__item c-chat__item--${role}`}>
              {item.kind === "asked" && (
                <ChatBubble role="person" text={{ en: item.message.text, zh: item.message.text }} lang={lang} at={item.message.at} />
              )}
              {item.kind === "answered" &&
                (() => {
                  const isNewest = newest?.key === item.key;
                  const agent = agentLabel(item.message.agentId);
                  return (
                    <ChatBubble
                      role="agent"
                      agentName={agent.name}
                      agentKind={agent.kind}
                      text={item.message.reply}
                      lang={lang}
                      at={item.message.at}
                      testId={isNewest ? "support-reply" : undefined}
                      nameTestId={isNewest ? "support-agent" : undefined}
                      detail={item.message.refIds.length > 0 ? <Refs refIds={item.message.refIds} lang={lang} testId={isNewest ? "support-refs" : undefined} /> : undefined}
                    />
                  );
                })()}
              {item.kind === "escalated" && <Handoff item={item} lang={lang} />}
              {item.kind === "forwarded" && (
                <ChatBubble
                  role="note"
                  text={forwardedLine(makerOf(item.entry.makerId).name)}
                  lang={lang}
                  at={item.entry.at}
                  testId={`support-forwarded-${item.questionId}`}
                />
              )}
              {item.kind === "maker" && <MakerAnswer item={item} lang={lang} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
