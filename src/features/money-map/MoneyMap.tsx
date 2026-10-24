// The money map: party nodes, one thread per move and the studio's balance, in one kit Panel
// that declares b04-bank, so it shows the Simulated badge while that source is scripted.
import type { SlotProps } from "../../core";
import { Panel } from "../../ui";
import { AccountBalance } from "./AccountBalance";
import { MoveThreads } from "./MoveThreads";
import { PartyNodes } from "./PartyNodes";
import { CANVAS_H, CANVAS_W } from "./partyLayout";
import { strings, t } from "./strings";

export function MoneyMap({ lang }: SlotProps) {
  return (
    <Panel title={t(strings.title, lang)} sourceKeys={["b04-bank"]} lang={lang}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-16)" }}>
        <AccountBalance lang={lang} />
        <div
          data-testid="money-map-canvas"
          role="img"
          aria-label={t(strings.canvasLabel, lang)}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 900,
            aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
            margin: "0 auto",
          }}
        >
          <svg
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            width="100%"
            height="100%"
            style={{ position: "absolute", inset: 0, overflow: "visible" }}
            aria-hidden="true"
          >
            <MoveThreads lang={lang} />
          </svg>
          <PartyNodes lang={lang} />
        </div>
      </div>
    </Panel>
  );
}

export default MoneyMap;
