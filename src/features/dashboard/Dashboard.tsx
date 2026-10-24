// F-dashboard T3: the dashboard grid. Tiles assemble in event order as the month runs: cash on
// account.synced, revenue on the month's first ledger.posted, open flags on flag.raised, maker share
// on month.closed. Each tile gets one assembling motion on the player clock. It renders finished when
// the tile mounts while the player is paused (a seek() from a test or the demo controls), when the
// player's epoch changes after mount, and under reduced motion.
import { useState, type ReactNode } from "react";
import type { EventType } from "../../core/events";
import type { SlotProps } from "../../core/featureTypes";
import { player } from "../../core/player";
import { useCindia } from "../../core/store";
import { Panel, uiProgress, usePlayerTime, useReducedMotion } from "../../ui";
import { cash, makerShare, openFlags, revenueByChannel } from "./figures";
import { RevenueTile } from "./RevenueTile";
import { CashTile, FlagsTile, MakerShareTile } from "./StatTile";
import { UI, t } from "./strings";

interface Start {
  at: number;
  epoch: number;
  finished: boolean;
}

/** The scripted time of the latest event of a type at or before now, or now for a live or test emit. */
function startOf(type: EventType, known?: number): Start {
  const now = player.now();
  let at = known;
  if (at === undefined) {
    const events = player.getTimeline()?.events ?? [];
    for (const e of events) {
      if (e.at > now) break;
      if (e.type === type) {
        at = e.at;
        break;
      }
    }
  }
  return { at: at ?? now, epoch: player.epoch(), finished: !player.isPlaying() };
}

/** One tile's assembling motion: a short rise and fade, once, when the tile first mounts. */
function Assemble({ type, at, area, children }: { type: EventType; at?: number; area: string; children: ReactNode }) {
  const now = usePlayerTime();
  const reduced = useReducedMotion();
  const [start] = useState(() => startOf(type, at));
  const finished = reduced || start.finished || player.epoch() !== start.epoch;
  const p = finished ? 1 : uiProgress(now, start.at);
  return <div style={{ gridArea: area, minWidth: 0, opacity: p, transform: `translateY(${(1 - p) * 12}px)` }}>{children}</div>;
}

export function Dashboard({ lang }: SlotProps) {
  const ledgerEntryIds = useCindia((s) => s.month.ledgerEntryIds);
  const closed = useCindia((s) => s.month.closed);
  const money = useCindia((s) => s.money);
  const month = useCindia((s) => s.month);

  const cashFig = cash(money);
  const flagsFig = openFlags(month);
  const shareFig = makerShare(closed);
  const hasRevenue = ledgerEntryIds.length > 0;
  const rows = hasRevenue ? revenueByChannel(ledgerEntryIds) : [];
  const any = cashFig || flagsFig || shareFig || hasRevenue;

  return (
    <Panel sourceKeys={["b10-derived"]} title={t(UI.title, lang)} lang={lang} style={{ height: "100%", boxSizing: "border-box" }}>
      <div
        data-testid="dashboard-tiles"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
          gridTemplateAreas: any ? '"cash revenue" "flags revenue" "share share"' : undefined,
          gap: 16,
          alignItems: "stretch",
        }}
      >
        {!any && (
          <p style={{ gridColumn: "1 / -1", margin: 0, color: "var(--c-color-ink-soft)", fontSize: 16 }}>{t(UI.empty, lang)}</p>
        )}
        {cashFig && (
          <Assemble type="account.synced" at={cashFig.at} area="cash">
            <CashTile figure={cashFig} lang={lang} />
          </Assemble>
        )}
        {hasRevenue && (
          <Assemble type="ledger.posted" area="revenue">
            <RevenueTile rows={rows} lang={lang} />
          </Assemble>
        )}
        {flagsFig && (
          <Assemble type="flag.raised" at={flagsFig.firstAt} area="flags">
            <FlagsTile figure={flagsFig} lang={lang} />
          </Assemble>
        )}
        {shareFig && (
          <Assemble type="month.closed" area="share">
            <MakerShareTile figure={shareFig} lang={lang} />
          </Assemble>
        )}
      </div>
    </Panel>
  );
}
