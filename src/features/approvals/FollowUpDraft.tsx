// The follow-up Cindy drafted for the gallery, inside apr_01's card. The text comes from the
// followup.drafted payload (never fup_01 in the mock), because a live B02 rewrites it. The gallery
// reads English, so to, subject and body always show the payload's English; the labels follow lang.
import { useState } from "react";
import { useCindia } from "../../core/store";
import type { CindiaState, FollowUpState } from "../../core/state";
import { Badge, Button } from "../../ui";
import { GLOSSARY, UI, t, type Lang } from "./strings";

export interface FollowUpDraftProps {
  approvalId: string;
  lang: Lang;
}

/** The latest drafted follow-up for this approval, or null before followup.drafted. */
function findFollowUp(s: CindiaState, approvalId: string): FollowUpState | null {
  let found: FollowUpState | null = null;
  for (const f of Object.values(s.approvals.followUps)) {
    if (f.approvalId === approvalId && f.body) found = f;
  }
  return found;
}

const labelStyle = {
  color: "var(--c-color-ink-soft)",
  fontSize: "var(--c-text-14)",
  marginRight: "var(--c-space-8)",
} as const;

export function FollowUpDraft({ approvalId, lang }: FollowUpDraftProps) {
  const followUp = useCindia((s) => findFollowUp(s, approvalId));
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
        <strong>
          {t(GLOSSARY.followUp, lang)} · {t(UI.draftLabel, lang)}
        </strong>
        {followUp.sent && <Badge variant="jade">{t(GLOSSARY.sent, lang)}</Badge>}
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
      <p lang="en" style={{ margin: 0, lineHeight: "var(--c-leading-body)", ...bodyStyle }}>
        {followUp.body.en}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--c-space-8)", flexWrap: "wrap" }}>
        <span style={{ color: "var(--c-color-ink-soft)", fontSize: "var(--c-text-14)" }}>{t(UI.draftInEnglish, lang)}</span>
        <Button variant="quiet" size="small" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {t(open ? UI.showLess : UI.readDraft, lang)}
        </Button>
      </div>
    </section>
  );
}
