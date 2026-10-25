// The money view (T4), process-pane-money:
// - process-money-diagram places the parties the store's money.moved events name (the buyer, Cindia,
//   the card network, the co-op, the makers, the gallery, a community fund) and draws one kit Thread
//   per move, sewing on the player clock, with its amount and, under it, its kind. The columns are far
//   enough apart that no amount sits on a party box, and a long name wraps inside its box;
// - process-money-balance shows the newest account.synced;
// - process-money-sandbox shows L29.
import { useCallback } from "react";
import type { Party } from "../../core/events";
import type { CindiaState, MoneyMove } from "../../core/state";
import { useCindia } from "../../core/store";
import type { Lang } from "../../core/types";
import { formatDate, Money, stitchProgress, Thread, usePlayerTime, useReducedMotion } from "../../ui";
import { Empty, Quiet, SectionHead, Tag } from "./parts";
import { usePlaying } from "./processes";
import { personName, projectTitle } from "./readers";
import { EMPTY, GLOSSARY, L29, MONEY, MOVE_KIND_LABELS, PARTY_LABELS, t } from "./strings";

const W = 780;
const H = 380;
const NODE_W = 116;
/** One line of text in a party box, and the box's padding above and below its lines. */
const LINE = 20;
const PAD = 4;
/** The four columns and three rows the parties sit on. */
const COL = [60, 285, 505, 720];
const ROW = [50, 190, 330];

/** Where each kind of party sits: columns by role, rows inside a column. Makers stack in the last column. */
const PLACE: Record<Exclude<Party["kind"], "maker">, { x: number; y: number }> = {
  buyer: { x: COL[0], y: ROW[1] },
  supplier: { x: COL[0], y: ROW[2] },
  processor: { x: COL[1], y: ROW[0] },
  cindia: { x: COL[1], y: ROW[1] },
  card_network: { x: COL[1], y: ROW[2] },
  community_fund: { x: COL[2], y: ROW[0] },
  studio: { x: COL[2], y: ROW[1] },
  gallery: { x: COL[2], y: ROW[2] },
};

/** Splits a name into lines that fit a party box: words for English, up to 7 characters for Chinese. */
function wrapName(name: string): string[] {
  if (!name.includes(" ")) {
    const out: string[] = [];
    for (let i = 0; i < name.length; i += 7) out.push(name.slice(i, i + 7));
    return out;
  }
  const lines: string[] = [];
  for (const word of name.split(" ")) {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${word}`.length <= 15) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

/** A clock far past every move, so a Thread draws finished. */
const FINISHED = Number.MAX_SAFE_INTEGER;

const partyKey = (p: Party) => (p.id ? `${p.kind}:${p.id}` : p.kind);

interface PlacedParty {
  key: string;
  party: Party;
  x: number;
  y: number;
}

/** Places every party the moves name. Several makers share the last column, spread from the top. */
function placeParties(moves: MoneyMove[]): PlacedParty[] {
  const seen = new Map<string, Party>();
  for (const m of moves) for (const p of [m.from, m.to]) if (!seen.has(partyKey(p))) seen.set(partyKey(p), p);
  const parties = [...seen.entries()];
  const makers = parties.filter(([, p]) => p.kind === "maker");
  const out: PlacedParty[] = [];
  const byKind = new Map<string, number>();
  for (const [key, party] of parties) {
    if (party.kind === "maker") {
      const i = makers.findIndex(([k]) => k === key);
      const y = makers.length === 1 ? ROW[1] : ROW[0] + ((ROW[2] - ROW[0]) * i) / (makers.length - 1);
      out.push({ key, party, x: COL[3], y });
      continue;
    }
    const base = PLACE[party.kind];
    // Two parties of one kind (two community funds) step down so they don't overlap.
    const n = byKind.get(party.kind) ?? 0;
    byKind.set(party.kind, n + 1);
    out.push({ key, party, x: base.x, y: base.y + n * (3 * LINE + 8) });
  }
  return out;
}

function partyName(p: Party, lang: Lang): string | null {
  if (!p.id) return null;
  if (p.kind === "maker" || p.kind === "buyer") return personName(p.id, lang);
  if (p.kind === "community_fund") return projectTitle(p.id, lang);
  return null;
}

/** The move's kind under its amount, at the curve's middle, once the amount shows (the kit shows it half way). */
function MoveKind({ from, to, bow, startAt, finished, text }: { from: PlacedParty; to: PlacedParty; bow: number; startAt: number; finished: boolean; text: string }) {
  const now = usePlayerTime();
  const reduced = useReducedMotion();
  if (!finished && stitchProgress(now, startAt, reduced) < 0.5) return null;
  // The kit's thread is a quadratic curve whose middle is half way to its control point.
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const x = (from.x + to.x) / 2 - (dy * bow) / 2;
  const y = (from.y + to.y) / 2 + (dx * bow) / 2;
  return (
    <text x={x} y={y + 24} textAnchor="middle" dominantBaseline="central" fill="var(--c-color-ink-soft)" style={{ fontSize: "var(--c-text-14)" }}>
      {text}
    </text>
  );
}

function moneyView(s: CindiaState) {
  const moves = s.money.moveIds.map((id) => s.money.moves[id]).filter(Boolean);
  const acct = s.money.latestAccountId ? s.money.accounts[s.money.latestAccountId] : null;
  return { moves, account: acct ? { accountId: s.money.latestAccountId!, ...acct } : null };
}

export function MoneyProcess({ lang }: { lang: Lang }) {
  const v = useCindia(useCallback((s: CindiaState) => moneyView(s), []));
  // A thread sews on the player clock while it plays. A paused clock never moves, so a move that
  // arrives then (a seek, or a person's milestone release) shows finished instead of not at all.
  const playing = usePlaying();
  const placed = placeParties(v.moves);
  const at = new Map(placed.map((p) => [p.key, p]));
  // Moves between the same two parties bow apart so their threads don't lie on top of each other.
  const pairCount = new Map<string, number>();

  return (
    <div data-testid="process-pane-money" className="flex flex-wrap gap-6">
      <div className="flex min-w-0 flex-col gap-2" style={{ flex: `1 1 ${W}px`, maxWidth: W }}>
        <div
          data-testid="process-money-diagram"
          role="img"
          aria-label={v.moves.map((m) => `${m.moveId} ${t(MOVE_KIND_LABELS[m.kind], lang)}`).join(", ")}
          style={{ width: "100%", aspectRatio: `${W} / ${H}`, position: "relative" }}
        >
          {v.moves.length === 0 ? (
            <Empty text={EMPTY.money} lang={lang} />
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ overflow: "visible" }}>
              <g>
                {v.moves.map((m) => {
                  const a = at.get(partyKey(m.from));
                  const b = at.get(partyKey(m.to));
                  if (!a || !b) return null;
                  const pair = [partyKey(m.from), partyKey(m.to)].toSorted().join("|");
                  const n = pairCount.get(pair) ?? 0;
                  pairCount.set(pair, n + 1);
                  // The first bows one way, the next the other way and further, so their amounts don't overlap.
                  const bow = (n % 2 === 0 ? 1 : -1) * (0.12 + 0.2 * Math.ceil(n / 2) + (n % 2 === 0 ? 0 : 0.14));
                  return (
                    <g key={m.moveId} data-move-id={m.moveId} data-kind={m.kind} data-from={partyKey(m.from)} data-to={partyKey(m.to)}>
                      <Thread from={{ x: a.x, y: a.y }} to={{ x: b.x, y: b.y }} startAt={m.at} amountCents={m.amountCents} tone={m.kind === "refund" ? "out" : m.kind === "fee" ? "neutral" : "in"} bow={bow} now={playing ? undefined : FINISHED} />
                      <MoveKind from={a} to={b} bow={bow} startAt={m.at} finished={!playing} text={t(MOVE_KIND_LABELS[m.kind], lang)} />
                    </g>
                  );
                })}
              </g>
              <g>
                {placed.map((p) => {
                  const name = partyName(p.party, lang);
                  // The party's word, then its name in full, one line each, centered in a box that fits them.
                  const lines = [t(PARTY_LABELS[p.party.kind], lang), ...(name ? wrapName(name) : [])];
                  const h = lines.length * LINE + 2 * PAD;
                  return (
                    <g key={p.key} data-party={p.key}>
                      <rect
                        x={p.x - NODE_W / 2}
                        y={p.y - h / 2}
                        width={NODE_W}
                        height={h}
                        rx={2}
                        fill="var(--c-color-paper)"
                        stroke={p.party.kind === "community_fund" ? "var(--c-color-jade)" : "var(--c-color-ink)"}
                        strokeWidth={1.2}
                      />
                      {lines.map((line, i) => (
                        <text
                          key={i}
                          x={p.x}
                          y={p.y - h / 2 + PAD + LINE * i + LINE / 2}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontWeight={i === 0 ? 600 : undefined}
                          fill={i === 0 ? "var(--c-color-ink)" : "var(--c-color-ink-soft)"}
                          style={{ fontSize: "var(--c-text-14)" }}
                        >
                          {line}
                        </text>
                      ))}
                    </g>
                  );
                })}
              </g>
            </svg>
          )}
        </div>
        <p data-testid="process-money-sandbox">
          <Quiet>{t(L29, lang)}</Quiet>
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-4" style={{ flex: "1 1 280px" }}>
        <section data-testid="process-money-balance" data-account-id={v.account?.accountId}>
          <SectionHead title={GLOSSARY.balance} lang={lang} />
          {v.account ? (
            <p className="flex flex-wrap items-baseline gap-2">
              <Money cents={v.account.balanceCents} style={{ fontSize: "var(--c-text-24)", fontWeight: 700 }} />
              <Quiet>
                {t(MONEY.asOf, lang)} {formatDate(v.account.asOf, lang)}
              </Quiet>
            </p>
          ) : (
            <Quiet>{t(MONEY.noBalance, lang)}</Quiet>
          )}
        </section>
        <section className="min-h-0">
          <SectionHead title={MONEY.moves} lang={lang} />
          <ol className="m-0 flex list-none flex-col gap-1 overflow-auto p-0" style={{ maxHeight: 310 }}>
            {v.moves.map((m) => (
              <li key={m.moveId} data-move-id={m.moveId} className="flex flex-wrap items-center gap-x-2" style={{ fontSize: "var(--c-text-14)" }}>
                <Tag tone="soft">{m.moveId}</Tag>
                <span>{t(MOVE_KIND_LABELS[m.kind], lang)}</span>
                <Quiet>
                  {t(PARTY_LABELS[m.from.kind], lang)} → {t(PARTY_LABELS[m.to.kind], lang)}
                </Quiet>
                <Money cents={m.amountCents} />
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

export default MoneyProcess;
