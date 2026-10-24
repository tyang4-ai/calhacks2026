// The video's end card, demo-end-card: what's real and what's simulated (from the store's sources),
// the proof score and the repo URL.
import { SOURCE_KEYS, type SourceKey } from "../../core/events";
import { useCindia } from "../../core/store";
import styles from "./stage.module.css";

export const REPO_URL = "https://github.com/tyang4-ai/calhacks2026";

/** What each source key stands for, in the order of events.md. */
const SOURCE_NAMES: Record<SourceKey, string> = {
  "b01-match": "Payout matching",
  "b02-explain": "Cindy's explanations",
  "b03-proof": "The planted-error proof",
  "b04-bank": "Bank account and money moves",
  "b05-scenario": "Your own statement",
  "b06-workbook": "Excel report",
  "b07-ask": "Ask Cindy",
  "b08-approvals": "Owner approvals",
  "b09-concierge": "Gift finder",
  "b10-derived": "Splits, receipts, statements and impact",
};

export function EndCard() {
  const sources = useCindia((s) => s.sources);
  const score = useCindia((s) => s.proof.score);
  const live = SOURCE_KEYS.filter((k) => sources[k] === "live");
  const simulated = SOURCE_KEYS.filter((k) => sources[k] !== "live");
  return (
    <div className={styles.endCard} data-testid="demo-end-card">
      <div className={styles.endInner}>
        <h2 className={styles.endTitle}>Cindia · 顾绣</h2>
        {score && (
          <div className={styles.endScore} data-end="score">
            Proof: caught {score.caught} of {score.total} planted errors
          </div>
        )}
        <div className={styles.endColumns}>
          <section>
            <h3 className={styles.endHeading}>Live</h3>
            <ul className={styles.endList} data-end="live">
              {live.length === 0 ? <li>Nothing live in this run: every panel plays scripted events</li> : live.map((k) => <li key={k}>{SOURCE_NAMES[k]}</li>)}
            </ul>
          </section>
          <section>
            <h3 className={styles.endHeading}>Simulated 模拟</h3>
            <ul className={styles.endList} data-end="simulated">
              {simulated.map((k) => (
                <li key={k}>{SOURCE_NAMES[k]}</li>
              ))}
              <li>Checkout: demo only, no real charge</li>
            </ul>
          </section>
        </div>
        <div className={styles.endUrl}>{REPO_URL}</div>
      </div>
    </div>
  );
}
