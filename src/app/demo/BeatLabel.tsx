// demo-beat-label: a quiet caption on the stage with the current beat's short title, numbered in
// tour order, at the bottom left, or the top right while sell-catch fills the stage.
import styles from "./stage.module.css";

/** Short titles for the tour's beats in demo-script.md, in tour order. */
const BEAT_TITLES: readonly [string, string][] = [
  ["p01-what", "What Cindia is"],
  ["p02-why", "Why"],
  ["p03-how", "How it works"],
  ["d01-vibe", "Vibe search"],
  ["d03-piece", "The piece and where the money goes"],
  ["d04-support", "Ask the agents"],
  ["d05-pay", "Pay with a token"],
  ["d15-listing", "A maker's new listing"],
  ["d06-money", "Follow the money"],
  ["d07-month", "The co-op's month"],
  ["d08-catch", "The catch"],
  ["d09-approve", "Only the manager approves"],
  ["d10-close", "Close the month"],
  ["d11-maker", "The maker's statement"],
  ["d12-receipt", "Paid to the maker"],
  ["d02-surprise", "Surprise me"],
  ["d13-proof", "The proofs"],
  ["d14-watch", "Counterfeit watch"],
  ["d16-store", "The storefront"],
  ["d17-ask-maker", "Ask the maker"],
];

export function beatTitle(beatId: string | null): string {
  if (!beatId) return "Ready · press play";
  const i = BEAT_TITLES.findIndex(([id]) => id === beatId);
  return i < 0 ? beatId : `${i + 1} · ${BEAT_TITLES[i][1]}`;
}

/**
 * sell-catch fills the stage with the zoomed Sell view, so the bottom left would sit on the
 * month's records, and the pitch cards keep their foot for L1: there the label moves to the top
 * right. The store page's piece cards reach the bottom edge, so there it sits under the beam on the
 * right (the G4v2 review's F2: it covered the first card's verification line).
 */
function labelPlace(camera: string | null): "left" | "right" | "under-beam" {
  if (camera === "sell-catch" || camera === "pitch") return "right";
  if (camera === "store") return "under-beam";
  return "left";
}

export function BeatLabel({ beatId, camera = null }: { beatId: string | null; camera?: string | null }) {
  return (
    <div className={styles.beatLabel} data-testid="demo-beat-label" data-beat={beatId ?? ""} data-place={labelPlace(camera)}>
      {beatTitle(beatId)}
    </div>
  );
}
