// The owner's decision on one approval. While it's pending, DecisionBar offers approve (the kit
// Button's seal variant) and decline with a one-line reason; a report on a live hit waits for the
// owner's own check first. OwnerSeal is the owner's stamp, small on a card and large on the detail.
// DecisionOutcome sits on the detail once decided: the large seal, who sealed it and when, and what
// happens next. Everything renders from the store, and the reducer keeps the first decision, so a
// second one changes nothing.
import { useState, type FormEvent } from "react";
import { userEvent } from "../../core/events";
import { player } from "../../core/player";
import { emit, useCindia } from "../../core/store";
import type { ApprovalKind, Person, Studio } from "../../core/types";
import { getById } from "../../mock";
import { Button, Seal, formatDate } from "../../ui";
import { recordFromState } from "./approvalSummary";
import { GLOSSARY, KIND_NEXT, UI, sealedByLine, t, type Lang } from "./strings";

/** The payload type fixes the owner to "own_01". The value itself comes from the co-op's record. */
function ownerId(): "own_01" {
  return (getById<Studio>("std_dine")?.ownerId ?? "own_01") as "own_01";
}

function owner(): Person | undefined {
  return getById<Person>(ownerId());
}

export interface OwnerSealProps {
  testId?: string;
  lang: Lang;
  size: number;
  date?: string;
  /** Player time of the grant. */
  decidedAt?: number;
  /** The grant was the owner's own tap on this screen. */
  byUser: boolean;
}

/** The owner's seal with the grant's date. It lands on the player clock from the grant's time. */
export function OwnerSeal({ testId, lang, size, date, decidedAt, byUser }: OwnerSealProps) {
  // A tap made while the player is paused would wait on a frozen clock forever, so that seal shows
  // already landed (no wall clock).
  const [startAt] = useState(() => (byUser && !player.isPlaying() ? undefined : decidedAt));
  return (
    <span style={{ flexShrink: 0, display: "inline-flex" }}>
      <Seal testId={testId} char={owner()?.surnameChar ?? ""} date={date} lang={lang} startAt={startAt} size={size} />
    </span>
  );
}

export interface DecisionBarProps {
  approvalId: string;
  lang: Lang;
  /** A report on a hit from a live scan: approve waits until the owner ticks her own check. */
  needsCheck?: boolean;
}

const rowStyle = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "var(--c-space-8)",
} as const;

/** Approve and decline while the approval is pending. Nothing once it's decided. */
export function DecisionBar({ approvalId, lang, needsCheck = false }: DecisionBarProps) {
  const status = useCindia((s) => s.approvals.items[approvalId]?.status);
  const decisionDate = useCindia((s) => recordFromState(s, approvalId)?.decisionDate);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [checked, setChecked] = useState(false);

  if (status !== "pending") return null;

  const approve = () => {
    // The decision's date is the approval's decisionDate (src/mock or the inline object), never the wall clock.
    if (!decisionDate) return;
    emit(userEvent("approval.granted", { approvalId, by: ownerId(), date: decisionDate }));
  };

  const text = reason.trim();
  const submitDecline = (e: FormEvent) => {
    e.preventDefault();
    if (!text) return;
    emit(userEvent("approval.declined", { approvalId, by: ownerId(), reason: { en: text, zh: text } }));
  };

  if (declining) {
    const inputId = `approvals-reason-input-${approvalId}`;
    return (
      <form onSubmit={submitDecline} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "var(--c-space-8)" }}>
        <label htmlFor={inputId} style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>
          {t(UI.reasonLabel, lang)}
        </label>
        <input
          id={inputId}
          data-testid={`approvals-reason-${approvalId}`}
          type="text"
          autoFocus
          value={reason}
          placeholder={t(UI.reasonPlaceholder, lang)}
          onChange={(e) => setReason(e.target.value)}
          style={{
            fontFamily: "inherit",
            fontSize: "var(--c-text-16)",
            color: "var(--c-color-ink)",
            background: "var(--c-color-paper)",
            border: "1px solid var(--c-color-line)",
            borderRadius: "var(--c-radius-control)",
            padding: "var(--c-space-8) var(--c-space-12)",
          }}
        />
        <div style={rowStyle}>
          <Button type="submit" variant="primary" size="small" disabled={!text}>
            {t(UI.confirmDecline, lang)}
          </Button>
          <Button
            variant="quiet"
            size="small"
            onClick={() => {
              setDeclining(false);
              setReason("");
            }}
          >
            {t(UI.cancel, lang)}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}>
      {needsCheck && (
        <label style={{ display: "inline-flex", alignItems: "center", gap: "var(--c-space-8)", fontSize: "var(--c-text-14)", cursor: "pointer" }}>
          <input
            type="checkbox"
            data-testid={`approvals-confirm-${approvalId}`}
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: "var(--c-color-ink)" }}
          />
          {t(UI.confirmLooked, lang)}
        </label>
      )}
      <div style={rowStyle}>
        <Button testId={`approvals-approve-${approvalId}`} variant="seal" onClick={approve} disabled={!decisionDate || (needsCheck && !checked)}>
          {t(GLOSSARY.approve, lang)}
        </Button>
        <Button testId={`approvals-decline-${approvalId}`} variant="quiet" onClick={() => setDeclining(true)}>
          {t(GLOSSARY.decline, lang)}
        </Button>
      </div>
    </div>
  );
}

/** The large seal's size on the detail. */
const DETAIL_SEAL = 88;

export interface DecisionOutcomeProps {
  approvalId: string;
  kind?: ApprovalKind;
  lang: Lang;
}

/**
 * On the detail once decided. A grant from anyone lands the large seal with the owner's character and
 * the grant's date (no test ID: the card carries approvals-seal-<approvalId>), who sealed it, and
 * the kind's "what happens next" line (approvals-next). A decline shows its reason.
 */
export function DecisionOutcome({ approvalId, kind, lang }: DecisionOutcomeProps) {
  const item = useCindia((s) => s.approvals.items[approvalId]);
  if (!item || item.status === "pending") return null;

  if (item.status === "declined") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-4)", paddingTop: "var(--c-space-12)", borderTop: "1px solid var(--c-color-line)" }}>
        <strong>{t(GLOSSARY.declined, lang)}</strong>
        {item.reason && (
          <span style={{ color: "var(--c-color-ink-soft)", fontSize: "var(--c-text-14)" }}>
            {t(UI.reasonLabel, lang)}: {t(item.reason, lang)}
          </span>
        )}
      </div>
    );
  }

  const person = owner();
  const date = item.date ? { en: formatDate(item.date, "en"), zh: formatDate(item.date, "zh") } : undefined;
  return (
    <div style={{ display: "flex", gap: "var(--c-space-16)", alignItems: "flex-start", paddingTop: "var(--c-space-12)", borderTop: "1px solid var(--c-color-line)" }}>
      <OwnerSeal lang={lang} size={DETAIL_SEAL} date={item.date} decidedAt={item.decidedAt} byUser={item.source === "user"} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}>
        {person && date && <span style={{ fontSize: "var(--c-text-14)", lineHeight: 1.4 }}>{t(sealedByLine(person.name, GLOSSARY.owner, date), lang)}</span>}
        {kind && (
          <p data-testid="approvals-next" style={{ margin: 0, fontSize: "var(--c-text-14)", lineHeight: 1.4 }}>
            <strong style={{ display: "block" }}>{t(UI.whatNext, lang)}</strong>
            {t(KIND_NEXT[kind], lang)}
          </p>
        )}
      </div>
    </div>
  );
}
