// The process overlay: ?process=<processId> on a route, or the stage's process view on /demo. A
// centered 1200 by 720 panel over a scrim, holding the slot process.view (its placeholder
// slot-process-view until F-process lands). The panel and the scrim carry no process- test ID.
// Esc and a click on the scrim call setProcess(null), so the overlay closes while F-process is cut.
import { useEffect, useRef } from "react";
import { setProcess } from "../../core/nav";
import { SlotFor } from "../Slot";
import type { SlotContext } from "../slotProps";
import { PROCESS_LABELS } from "../strings";
import styles from "./chrome.module.css";

export function ProcessOverlay({ ctx }: { ctx: SlotContext }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // An open drawer above the overlay handles its own Esc first and marks it with preventDefault.
      if (e.key !== "Escape" || e.defaultPrevented || e.isComposing) return;
      // An overlay in a frame the stage doesn't show is inert and leaves the key alone.
      if (ref.current?.closest("[inert]")) return;
      e.preventDefault();
      setProcess(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const label = ctx.processId ? PROCESS_LABELS[ctx.processId][ctx.lang] : undefined;
  return (
    <div ref={ref} className={styles.overlay} data-process-overlay={ctx.processId ?? ""}>
      <div className={styles.scrim} aria-hidden="true" onClick={() => setProcess(null)} />
      <div className={styles.panel} role="dialog" aria-label={label}>
        <SlotFor slot="process.view" ctx={ctx} />
      </div>
    </div>
  );
}
