// A drafted follow-up for an approval: v1's follow-up to the gallery (apr_01), and the Reporter's
// draft about a found listing (apr_03). The text comes from the followup.drafted payload (never the
// FollowUp record in the mock), because a live source rewrites it. The recipient reads English, so
// to, subject and body always show the payload's English; the labels follow lang.
import { useState } from "react";
import { useCindia } from "../../core/store";
import type { Text } from "../../core/types";
import { Badge, Button } from "../../ui";
import { findFollowUp } from "./approvalSummary";
import { GLOSSARY, UI, t, type Lang } from "./strings";

export interface FollowUpDraftProps {
  approvalId: string;
  lang: Lang;
  /** The draft's heading. v1's "Follow-up · Draft" when unset. */
  heading?: Text;
  /** The line under the body. v1's "Sent in English, as the gallery reads it." when unset. */
  note?: Text;
}

const labelStyle = {
  color: "var(--c-color-ink-soft)",
  fontSize: "var(--c-text-14)",
  marginRight: "var(--c-space-8)",
} as const;

export function FollowUpDraft({ approvalId, lang, heading, note }: FollowUpDraftProps) {
  const followUp = useCindia((s) => findFollowUp(s, approvalId));
  // Sent only follows a grant: a declined follow-up never reads Sent, even if a later
  // followup.sent arrives (the timeline's own, after the owner said no).
  const granted = useCindia((s) => s.approvals.items[approvalId]?.status === "granted");
  const [open, setOpen] = useState(false);

  if (!followUp || !followUp.to || !followUp.subject || !followUp.body) return null;

  const bodyStyle = open
    ? { whiteSpace: "pre-line" as const }
    : {
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical" as const,
        overflow: "hidden",
      };

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--c-space-8)",
        border: "1px solid var(--c-color-line)",
        borderRadius: "var(--c-radius-control)",
        padding: "var(--c-space-12)",
        background: "var(--c-color-paper)",
        fontSize: "var(--c-text-16)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--c-space-8)" }}>
        <strong>{heading ? t(heading, lang) : `${t(GLOSSARY.followUp, lang)} · ${t(UI.draftLabel, lang)}`}</strong>
        {followUp.sent && granted && <Badge variant="jade">{t(GLOSSARY.sent, lang)}</Badge>}
      </div>
      <div lang="en">
        <span style={labelStyle} lang={lang}>
          {t(UI.to, lang)}
        </span>
        {followUp.to.en}
      </div>
      <div lang="en">
        <span style={labelStyle} lang={lang}>
          {t(UI.subject, lang)}
        </span>
        {followUp.subject.en}
      </div>
      <p lang="en" style={{ margin: 0, lineHeight: "var(--c-leading-body)", overflowWrap: "anywhere", ...bodyStyle }}>
        {followUp.body.en}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--c-space-8)", flexWrap: "wrap" }}>
        <span style={{ color: "var(--c-color-ink-soft)", fontSize: "var(--c-text-14)" }}>{t(note ?? UI.draftInEnglish, lang)}</span>
        <Button variant="quiet" size="small" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {t(open ? UI.showLess : UI.readDraft, lang)}
        </Button>
      </div>
    </section>
  );
}
