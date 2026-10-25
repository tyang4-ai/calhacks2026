// The Phase A legacy boxes (ui-contract.md, Camera states): a v1 view at its v1 size, centered in
// the space the v2 page gives it and scaled down to fit, never up. The stage uses them while the
// camera is a legacy one, and /shop/legacy always uses the 480 px column. Routes never use the
// console and phone boxes. I2-tour removes them with the legacy cameras.
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { legacyScale, type BoxSize } from "./views";
import styles from "./surfaces.module.css";

export interface LegacyBoxProps {
  size: BoxSize;
  /** console: v1's view grid, with a side column when `side` is set. phone and column: a scrolling column like v1's phone screen. */
  kind: "console" | "phone" | "column";
  /** The console grid's columns: two thirds and one third when there's a side slot. */
  side?: boolean;
  children?: ReactNode;
}

export function LegacyBox({ size, kind, side, children }: LegacyBoxProps) {
  const spaceRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Measured in the frame's own pixels (client sizes ignore the stage's transforms).
  useLayoutEffect(() => {
    const el = spaceRef.current;
    if (!el) return;
    const fit = () => setScale(legacyScale(size, { w: el.clientWidth, h: el.clientHeight }));
    fit();
    if (typeof ResizeObserver !== "function") return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [size]);

  const inner =
    kind === "console"
      ? { className: styles.legacyConsole, style: { width: size.w, height: size.h, gridTemplateColumns: side ? "2fr 1fr" : "1fr", transform: `scale(${scale})` } }
      : { className: styles.legacyPhone, style: { width: size.w, height: size.h, transform: `scale(${scale})` } };

  return (
    <div ref={spaceRef} className={styles.legacySpace}>
      <div style={{ width: size.w * scale, height: size.h * scale, position: "relative", flexShrink: 0 }}>
        <div className={inner.className} style={inner.style} data-legacy-box={kind}>
          {children}
        </div>
      </div>
    </div>
  );
}
