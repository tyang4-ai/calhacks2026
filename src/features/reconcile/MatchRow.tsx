// F-reconcile T1: one match's detail block, and the cells T2 puts into a kit LedgerTable row
// (the row itself carries reconcile-match-<matchId>, so this block sets no test ID).
import type { ReactNode } from "react";
import type { MatchState } from "../../core/state";
import type { Channel, Piece } from "../../core/types";
import { getById } from "../../mock";
import { Badge, Money, formatDate } from "../../ui";
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

export function MatchRow({ match, lang }: MatchRowProps) {
  const records = matchRecords(match);
  const special = match.kind !== "one_to_one";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--c-space-8)", flexWrap: "wrap" }}>
        <MatchedMark lang={lang} />
        {special ? <Badge variant="jade">{matchKindLabel(match.kind, lang)}</Badge> : null}
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--c-space-4)" }}>
        {records.map((r) => {
          const amount = recordCents(r);
          return (
            <li key={r.id} style={{ display: "flex", gap: "var(--c-space-8)", alignItems: "baseline", flexWrap: "wrap" }}>
              <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--c-color-ink-soft)" }}>{r.id}</span>
              <span>{recordLabel(r, lang)}</span>
              {amount ? <Money cents={amount.cents} tone={amount.tone} /> : null}
            </li>
          );
        })}
      </ul>
      <span style={{ color: "var(--c-color-ink-soft)" }}>{matchReason(match, lang)}</span>
    </div>
  );
}

export function matchCells(match: MatchState, lang: "en" | "zh"): Record<"date" | "type" | "party" | "detail" | "amount", ReactNode> {
  const payout = matchPayout(match);
  return {
    date: payout ? formatDate(payout.date, lang) : "",
    type: match.kind === "one_to_one" ? t(GLOSSARY.match, lang) : matchKindLabel(match.kind, lang),
    party: payout ? channelName(payout.channelId, lang) : "",
    detail: <MatchRow match={match} lang={lang} />,
    amount: payout ? <Money cents={payout.netCents} tone="in" /> : null,
  };
}
