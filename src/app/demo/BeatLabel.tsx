// demo-beat-label: a quiet caption at the top left of the stage with the current beat's short title.
import styles from "./stage.module.css";

/** Short titles for the beats in demo-script.md. */
const BEAT_TITLES: Record<string, string> = {
  "d01-ask": "1 · The gift request",
  "d02-story": "2 · The maker's story",
  "d03-split": "3 · Where your money goes",
  "d04-pay": "4 · Pay with a token",
  "d05-money": "5 · Follow the money",
  "d06-month": "6 · The co-op's month",
  "d07-catch": "7 · The catch",
  "d08-approve": "8 · Only the owner approves",
  "d09-close": "9 · Close the month",
  "d10-statement": "10 · The maker's statement",
  "d11-receipt": "11 · Paid to the maker",
};

function beatTitle(beatId: string | null): string {
  if (!beatId) return "Ready · press play";
  return BEAT_TITLES[beatId] ?? beatId;
}

/**
 * studio-catch fills the stage with the studio at 1.35, so the top left would cover the rail's
 * first nav item. There the label moves to the top right, above the empty top of the side panel.
 */
function labelPlace(camera: string | null): "left" | "right" {
  return camera === "studio-catch" ? "right" : "left";
}

export function BeatLabel({ beatId, camera = null }: { beatId: string | null; camera?: string | null }) {
  return (
    <div className={styles.beatLabel} data-testid="demo-beat-label" data-beat={beatId ?? ""} data-place={labelPlace(camera)}>
      {beatTitle(beatId)}
    </div>
  );
}
