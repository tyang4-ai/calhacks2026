// The money map: party nodes, one thread per move and the co-op's balance, in one kit Panel that
// declares b04-bank and b16-bank-books, so it shows the Simulated badge while either is scripted.
// The panel fills its view: the balance stands in a narrow column on the left, and the canvas keeps
// its 1000 by 600 viewBox and scales to the space beside it, by width or height, whichever runs out
// first, so it is never sized in fixed pixels and nothing spills out of the Sell frame.
import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import type { SlotProps } from "../../core";
import { Panel } from "../../ui";
import { AccountBalance } from "./AccountBalance";
import { MoveThreads } from "./MoveThreads";
import { PartyNodes } from "./PartyNodes";
import { CANVAS_H, CANVAS_W } from "./partyLayout";
import { strings, t } from "./strings";

/** The balance column's width, in the frame's pixels. */
const BALANCE_W = 184;

const bodyStyle: CSSProperties = {
  flex: "1 1 auto",
  minHeight: 0,
  display: "flex",
  gap: "var(--c-space-24)",
};

/** The space the canvas may fill. A size container, so the canvas can fit both of its sides. */
const stageStyle: CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  minHeight: 0,
  containerType: "size",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const canvasStyle: CSSProperties = {
  position: "relative",
  width: `min(100cqw, calc(100cqh * ${CANVAS_W} / ${CANVAS_H}))`,
  aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
  flex: "0 0 auto",
};

/**
 * Canvas units per CSS pixel, measured from the canvas's own layout width (which a transform on
 * the stage doesn't change). Labels drawn in the SVG multiply their sizes by it, so every amount and
 * note draws at the kit's 14 px whatever the canvas's scale. 1 until the first measurement.
 */
function useUnitsPerPx(ref: RefObject<HTMLDivElement | null>): number {
  const [unit, setUnit] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setUnit(CANVAS_W / w);
    };
    measure();
    if (typeof ResizeObserver !== "function") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return unit;
}

export function MoneyMap({ lang }: SlotProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const unit = useUnitsPerPx(canvasRef);
  return (
    <Panel
      title={t(strings.title, lang)}
      sourceKeys={["b04-bank", "b16-bank-books"]}
      lang={lang}
      className="[&>div]:flex [&>div]:flex-col"
      style={{ height: "100%", boxSizing: "border-box" }}
    >
      <div style={bodyStyle}>
        <div style={{ flex: `0 0 ${BALANCE_W}px`, minWidth: 0 }}>
          <AccountBalance lang={lang} />
        </div>
        <div style={stageStyle}>
          <div ref={canvasRef} data-testid="money-map-canvas" role="img" aria-label={t(strings.canvasLabel, lang)} style={canvasStyle}>
            <svg
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              width="100%"
              height="100%"
              style={{ position: "absolute", inset: 0, overflow: "visible" }}
              aria-hidden="true"
            >
              <MoveThreads lang={lang} unit={unit} />
            </svg>
            <PartyNodes lang={lang} />
          </div>
        </div>
      </div>
    </Panel>
  );
}

export default MoneyMap;
