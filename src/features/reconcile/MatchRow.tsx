// F-reconcile T1: one match's details cell, and the cells T2 puts into a kit LedgerTable row
// (the row itself carries its test ID, so this cell sets none). The cell stays on one line so the
// month list shows several whole rows; the full details sit in its title.
import type { ReactNode } from "react";
import type { MatchState } from "../../core/state";
import type { Channel, Piece } from "../../core/types";
import { getById } from "../../mock";
import { Money, formatCents, formatDate } from "../../ui";
import { matchKindLabel, matchPayout, matchReason, matchRecords, type MatchRecord } from "./matchLabels";
import { GLOSSARY, t } from "./strings";

export interface MatchRowProps {
  match: MatchState;
  lang: "en" | "zh";
}

function channelName(channelId: string, lang: "en" | "zh"): string {
  const ch = getById<Channel>(channelId);
  return ch ? ch.name[lang] : channelId;
}

function recordLabel(r: MatchRecord, lang: "en" | "zh"): string {
  switch (r.kind) {
    case "order": {
      const piece = getById<Piece>(r.order.pieceId);
      return piece ? piece.title[lang] : t(GLOSSARY.order, lang);
    }
    case "refund":
      return t(GLOSSARY.refund, lang);
    case "payout":
      return `${t(GLOSSARY.payout, lang)} · ${channelName(r.payout.channelId, lang)}`;
    default:
      return "";
  }
}

function recordCents(r: MatchRecord): { cents: number; tone: "in" | "out" | "neutral" } | null {
  switch (r.kind) {
    case "order":
      return { cents: r.order.grossCents, tone: "neutral" };
    case "refund":
      return { cents: -r.refund.amountCents, tone: "out" };
    case "payout":
      return { cents: r.payout.netCents, tone: "in" };
    default:
      return null;
  }
}

/** The jade check with its text cue: "✓ Matched". */
function MatchedMark({ lang }: { lang: "en" | "zh" }) {
  return (
    <span style={{ color: "var(--c-color-jade)", fontWeight: 600, whiteSpace: "nowrap" }}>
      <span aria-hidden="true">✓</span> {t(GLOSSARY.match, lang)}
    </span>
  );
}

/** The match's full detail as plain text: kind, each record with its label and amount, and the reason. */
export function matchDetailText(match: MatchState, lang: "en" | "zh"): string {
  const parts: string[] = [t(GLOSSARY.match, lang)];
  if (match.kind !== "one_to_one") parts.push(matchKindLabel(match.kind, lang));
  for (const r of matchRecords(match)) {
    const amount = recordCents(r);
    parts.push([r.id, recordLabel(r, lang), amount ? formatCents(amount.cents) : ""].filter(Boolean).join(" "));
  }
  parts.push(matchReason(match, lang));
  return parts.join(" · ");
}

/** The From column's width cap, so a long party name ends in an ellipsis instead of wrapping. */
export const PARTY_MAX = "8rem";

/** A details cell held to one line, ending in an ellipsis, with the full text in its title. */
export function OneLine({ title, maxWidth = "13rem", children }: { title: string; maxWidth?: string; children?: ReactNode }) {
  return (
    <div title={title} style={{ maxWidth, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
}

/** One match's details on one line: the matched mark and the record IDs. The rest is in the title. */
export function MatchRow({ match, lang }: MatchRowProps) {
  return (
    <OneLine title={matchDetailText(match, lang)}>
      <MatchedMark lang={lang} />{" "}
      <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--c-color-ink-soft)" }}>{match.recordIds.join(", ")}</span>
    </OneLine>
  );
}

export function matchCells(match: MatchState, lang: "en" | "zh"): Record<"date" | "type" | "party" | "detail" | "amount", ReactNode> {
  const payout = matchPayout(match);
  return {
    date: payout ? <span style={{ whiteSpace: "nowrap" }}>{formatDate(payout.date, lang)}</span> : "",
    type: match.kind === "one_to_one" ? t(GLOSSARY.match, lang) : matchKindLabel(match.kind, lang),
    party: payout ? (
      <OneLine title={channelName(payout.channelId, lang)} maxWidth={PARTY_MAX}>
        {channelName(payout.channelId, lang)}
      </OneLine>
    ) : (
      ""
    ),
    detail: <MatchRow match={match} lang={lang} />,
    amount: payout ? <Money cents={payout.netCents} tone="in" /> : null,
  };
}
