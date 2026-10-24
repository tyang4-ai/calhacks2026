// Each approval card's decision: approve and decline while the approval is pending, the owner's
// seal once it's granted (by the owner's tap or the timeline), and the reason once it's declined.
// Everything renders from the store. The reducer keeps the first decision, so a second grant is a no-op.
import { useState, type FormEvent } from "react";
import { userEvent } from "../../core/events";
import { player } from "../../core/player";
import { emit, useCindia } from "../../core/store";
import type { Approval, Person, Studio } from "../../core/types";
import { getById } from "../../mock";
import { Button, Seal } from "../../ui";
import { GLOSSARY, UI, t, type Lang } from "./strings";

export interface DecisionBarProps {
  approvalId: string;
  lang: Lang;
  /** On a compact card: the seal at its smaller size, and nothing for a declined card. */
  compact?: boolean;
}

/** The seal's size on a compact card: room for the surname and the date, no more. */
const COMPACT_SEAL = 48;
/** The seal's size in a full card's header. */
const FULL_SEAL = 64;

const studio = getById<Studio>("std_gu");
/** The payload type fixes the owner to "own_01". The value itself comes from the studio. */
const OWNER_ID = (studio?.ownerId ?? "own_01") as "own_01";
const owner = getById<Person>(OWNER_ID);

const rowStyle = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "var(--c-space-12)",
  marginTop: "var(--c-space-16)",
  paddingTop: "var(--c-space-12)",
  borderTop: "1px solid var(--c-color-line)",
} as const;

/**
 * The owner's seal once the approval is granted. The card puts it in its header, next to the title,
 * so the seal stays in view with the card's figures and costs no row of its own. The seal carries
 * the grant's date, and the card's status badge reads approved.
 */
function SealedMark({ approvalId, lang, date, decidedAt, byUser, size }: { approvalId: string; lang: Lang; date?: string; decidedAt?: number; byUser: boolean; size: number }) {
  // The seal lands on the player clock from the grant's time. A tap made while the player is paused
  // would wait on a frozen clock forever, so that seal shows already landed (no wall clock).
  const [startAt] = useState(() => (byUser && !player.isPlaying() ? undefined : decidedAt));
  return (
    <span style={{ flexShrink: 0, display: "inline-flex" }}>
      <Seal testId={`approvals-seal-${approvalId}`} char={owner?.surnameChar ?? ""} date={date} lang={lang} startAt={startAt} size={size} />
    </span>
  );
}

export function DecisionBar({ approvalId, lang, compact = false }: DecisionBarProps) {
  const item = useCindia((s) => s.approvals.items[approvalId]);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  if (!item) return null;

  if (item.status === "granted") {
    return <SealedMark approvalId={approvalId} lang={lang} date={item.date} decidedAt={item.decidedAt} byUser={item.source === "user"} size={compact ? COMPACT_SEAL : FULL_SEAL} />;
  }

  if (item.status === "declined") {
    // A compact card shows its Declined badge itself, so the bar has nothing to add.
    if (compact) return null;
    return (
      <div style={{ ...rowStyle, flexDirection: "column", alignItems: "flex-start", gap: "var(--c-space-4)" }}>
        <span style={{ color: "var(--c-color-ink)", fontWeight: 600, fontSize: "var(--c-text-16)" }}>{t(GLOSSARY.declined, lang)}</span>
        {item.reason && (
          <span style={{ color: "var(--c-color-ink-soft)", fontSize: "var(--c-text-14)" }}>
            {t(UI.reasonLabel, lang)}: {t(item.reason, lang)}
          </span>
        )}
      </div>
    );
  }

  const approve = () => {
    const approval = getById<Approval>(approvalId);
    if (!approval) return;
    emit(userEvent("approval.granted", { approvalId, by: OWNER_ID, date: approval.decisionDate }));
  };

  const text = reason.trim();
  const submitDecline = (e: FormEvent) => {
    e.preventDefault();
    if (!text) return;
    emit(userEvent("approval.declined", { approvalId, by: OWNER_ID, reason: { en: text, zh: text } }));
  };

  if (declining) {
    const inputId = `approvals-reason-input-${approvalId}`;
    return (
      <form onSubmit={submitDecline} style={{ ...rowStyle, flexDirection: "column", alignItems: "stretch", gap: "var(--c-space-8)" }}>
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
        <div style={{ display: "flex", gap: "var(--c-space-8)", flexWrap: "wrap" }}>
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
    <div style={rowStyle}>
      <Button testId={`approvals-approve-${approvalId}`} variant="seal" onClick={approve}>
        {t(GLOSSARY.approve, lang)}
      </Button>
      <Button testId={`approvals-decline-${approvalId}`} variant="quiet" onClick={() => setDeclining(true)}>
        {t(GLOSSARY.decline, lang)}
      </Button>
    </div>
  );
}
