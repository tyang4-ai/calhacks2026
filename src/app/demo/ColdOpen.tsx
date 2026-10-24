// The video's cold open: one line over the studio-catch camera, with the short payment from the
// flag in the store, so the figure is always the one the evidence shows.
import { useCindia } from "../../core/store";
import styles from "./stage.module.css";

/** Whole dollars when there are no cents: 34000 to "$340". */
function dollars(cents: number): string {
  const c = Math.abs(Math.round(cents));
  return c % 100 === 0 ? `$${(c / 100).toLocaleString("en-US")}` : `$${(c / 100).toFixed(2)}`;
}

export function ColdOpen() {
  const delta = useCindia((s) => {
    const id = s.month.flagIds[0];
    return id !== undefined ? s.month.flags[id]?.deltaCents ?? null : null;
  });
  return (
    <div className={styles.overlay} data-video-phase="cold-open">
      <p className={styles.line}>
        {delta === null ? "The gallery paid less than the contract says." : `The gallery paid ${dollars(delta)} less than the contract says.`}
      </p>
    </div>
  );
}
