// The overview's five tiles (F-seller-hub T2), test ID seller-overview: kit StatTiles, amounts
// through Money, each inside a kit Link that opens its view without a page load.
// - sales and flags open /sell/month, waiting opens /sell/month where the catch is,
// - approvals opens /sell/approvals, hits opens /sell/watch.
// Under the tiles, the approvals still waiting for the owner, each opening its card.
import { sellRoute } from "../../core/nav";
import { useCindia } from "../../core/store";
import type { CindiaState } from "../../core/state";
import type { SellView } from "../../core/featureTypes";
import { Link, Money, StatTile } from "../../ui";
import { overviewFigures, pendingApprovals, type OverviewFigures } from "./overviewFigures";
import { GLOSSARY, OVERVIEW, SEP, t, tf, type Lang, type TileId } from "./strings";
import styles from "./seller-hub.module.css";

const selectSlices = (s: CindiaState) => ({ month: s.month, approvals: s.approvals, watch: s.watch });
const selectPending = (s: CindiaState) => pendingApprovals(s);

/** Cindy's newest lines (agent.acted), newest first, at most five. */
const selectActs = (s: CindiaState) =>
  s.agent.actIds
    .slice(-5)
    .toReversed()
    .map((id) => s.agent.acts[id])
    .filter((a) => a !== undefined);

const TILE_VIEW: Record<TileId, SellView> = {
  sales: "month",
  waiting: "month",
  approvals: "approvals",
  flags: "month",
  hits: "watch",
};

const TILE_ORDER: TileId[] = ["sales", "waiting", "approvals", "flags", "hits"];

function tileValue(tile: TileId, f: OverviewFigures) {
  switch (tile) {
    case "sales":
      return (
        <span data-role="value">
          <Money cents={f.salesCents} />
        </span>
      );
    case "waiting":
      return (
        <span data-role="value">
          <Money cents={f.waitingCents} tone={f.waitingCents > 0 ? "pending" : "neutral"} />
        </span>
      );
    case "approvals":
      return f.approvalsWaiting;
    case "flags":
      return f.openFlags;
    case "hits":
      return f.hits;
  }
}

function tileDetail(tile: TileId, f: OverviewFigures, lang: Lang): string {
  switch (tile) {
    case "sales":
      return f.orderCount === 0 ? t(OVERVIEW.salesEmpty, lang) : tf(OVERVIEW.salesDetail, lang, { orders: f.orderCount, refunds: f.refundCount });
    case "waiting":
      return t(f.waitingCents > 0 ? OVERVIEW.waitingDetail : OVERVIEW.waitingNone, lang);
    case "approvals":
      return t(f.approvalsWaiting > 0 ? OVERVIEW.approvalsDetail : OVERVIEW.approvalsNone, lang);
    case "flags":
      return t(f.openFlags > 0 ? OVERVIEW.flagsDetail : OVERVIEW.flagsNone, lang);
    case "hits":
      return t(OVERVIEW.hitsDetail, lang);
  }
}

function needsAttention(tile: TileId, f: OverviewFigures): boolean {
  if (tile === "waiting") return f.waitingCents > 0;
  if (tile === "flags") return f.openFlags > 0;
  if (tile === "hits") return f.hits > 0;
  return false;
}

export function OverviewTiles({ lang }: { lang: Lang }) {
  const figures = overviewFigures(useCindia(selectSlices));
  const pending = useCindia(selectPending);
  const acts = useCindia(selectActs);
  return (
    <div className={styles.overview} lang={lang}>
      <p className={styles.intro}>{t(OVERVIEW.intro, lang)}</p>
      <div className={styles.tiles}>
        {TILE_ORDER.map((tile) => (
          <Link key={tile} to={sellRoute(TILE_VIEW[tile])} variant="block" testId={`seller-overview-tile-${tile}`} className={styles.tileLink}>
            <StatTile
              title={OVERVIEW.tiles[tile]}
              lang={lang}
              value={tileValue(tile, figures)}
              attention={needsAttention(tile, figures)}
              detail={
                <>
                  <span>{tileDetail(tile, figures, lang)}</span>
                  <span className={styles.tileOpen}>{t(OVERVIEW.open[tile], lang)} →</span>
                </>
              }
            />
          </Link>
        ))}
      </div>
      <div className={styles.lower}>
        <section className={styles.pending} aria-label={t(OVERVIEW.pendingTitle, lang)}>
          <h3 className={styles.h3}>{t(OVERVIEW.pendingTitle, lang)}</h3>
          {pending.length === 0 ? (
            <p className={styles.empty}>{t(OVERVIEW.pendingNone, lang)}</p>
          ) : (
            <ul className={styles.pendingList}>
              {pending.map((p) => (
                <li key={p.approvalId} className={styles.pendingRow} data-approval-id={p.approvalId}>
                  <span className={styles.pendingKind}>
                    {p.kind ? t(OVERVIEW.kinds[p.kind], lang) : t(GLOSSARY.approval, lang)}
                    {SEP}
                    <span className={styles.mono}>{p.approvalId}</span>
                  </span>
                  {p.amountCents !== undefined ? <Money cents={p.amountCents} /> : <span />}
                  <Link to={sellRoute("approvals", { ref: p.approvalId })}>{t(OVERVIEW.review, lang)}</Link>
                  <span className={styles.pendingNote}>{t(GLOSSARY.proposedByCindy, lang)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={styles.pending} aria-label={t(OVERVIEW.latestTitle, lang)}>
          <h3 className={styles.h3}>{t(OVERVIEW.latestTitle, lang)}</h3>
          {acts.length === 0 ? (
            <p className={styles.empty}>{t(OVERVIEW.latestNone, lang)}</p>
          ) : (
            <ol className={styles.pendingList}>
              {acts.map((a) => (
                <li key={a.actId} className={styles.actRow}>
                  <span className={styles.mono}>{tf(OVERVIEW.seconds, lang, { s: (a.at / 1000).toFixed(1) })}</span>
                  <span>{t(a.text, lang)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
