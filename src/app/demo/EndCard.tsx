// The end card, demo-end-card (ui-contract.md, Modes and starts; demo-script.md, The end card). It
// shows after d12-receipt in presenter and video mode, and at the end of plain /demo, where it
// stays. It covers the stage, so no top bar shows: L1 sits at its foot. English only.
// - "Cindia" and the tagline, the first line of the Cindia pitch card,
// - the seats line (SEATS_LINE, which D-sponsors copies into the README, the Devpost and
//   sponsors/hyphenate/),
// - the planted-error proof from proof.scored,
// - the search model's recall at 5 for each system from proof.search_scored, with L28, or "Search
//   model: not trained yet",
// - what's live and what's simulated, from the store's sources, with L29 under both lists,
// - L30, the repo URL and L1.
import { SOURCE_KEYS, type SourceKey } from "../../core/events";
import { useCindia } from "../../core/store";
import { L1 } from "../strings";
import { TAGLINE } from "./pitch";
import styles from "./stage.module.css";

export const REPO_URL = "https://github.com/tyang4-ai/calhacks2026";

/** The seats line (C-12), word for word from contracts section 4. One constant, so copies stay the same. */
export const SEATS_LINE = "Cindy's agents fill three seats: bookkeeper, collections and support. A person approves anything that moves money.";

/** L28 (glossary.md, on-screen labels). */
export const L28 = "50 test queries over the same 54 fictional pieces, written separately by our data agent and never used for training. A small test, not a benchmark.";
/** L29 (glossary.md, on-screen labels). */
export const L29 = "Live means a real service answered in this run. Nessie is a sandbox bank, so no real money moved.";
/** L30 (glossary.md, on-screen labels). */
export const L30 =
  "Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.";

/** What each source key stands for, in the order of events.md. */
export const SOURCE_NAMES: Record<SourceKey, string> = {
  "b01-match": "Payout matching",
  "b02-explain": "Cindy's explanations",
  "b03-proof": "The planted-error proof",
  "b04-bank": "Bank account and money moves",
  "b05-scenario": "Your own statement",
  "b06-workbook": "Excel report",
  "b07-ask": "Ask Cindy",
  "b08-approvals": "Manager approvals",
  "b09-concierge": "Gift finder",
  "b10-derived": "Splits, receipts, statements and impact",
  "b11-embed": "Our search model and its map",
  "b12-search": "Vibe search and Surprise me (Elastic)",
  "b13-live": "The shared database (SpacetimeDB)",
  "b14-swarm": "The agent swarm (Claude)",
  "b15-watch": "Counterfeit watch (Apify)",
  "b16-bank-books": "Bank books (Nessie)",
};

/** The search systems' names in the score table. */
const SYSTEM_NAMES: Record<string, string> = {
  keyword: "Keyword search",
  base: "Base model",
  custom: "Our model",
  hybrid: "Hybrid",
};

function percent(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export function EndCard() {
  const sources = useCindia((s) => s.sources);
  const score = useCindia((s) => s.proof.score);
  const scored = useCindia((s) => s.model.scored);
  const live = SOURCE_KEYS.filter((k) => sources[k] === "live");
  const simulated = SOURCE_KEYS.filter((k) => sources[k] !== "live");
  return (
    <div className={styles.endCard} data-testid="demo-end-card" lang="en">
      <div className={styles.endInner}>
        <header className={styles.endHead}>
          <h2 className={styles.endTitle}>Cindia</h2>
          <p className={styles.endTagline}>{TAGLINE}</p>
        </header>
        <p className={styles.endSeats} data-end="seats">
          {SEATS_LINE}
        </p>
        <div className={styles.endColumns}>
          <section>
            <h3 className={styles.endHeading}>Proof</h3>
            <p className={styles.endScore} data-end="score">
              {score ? `Caught ${score.caught} of ${score.total} planted errors` : "Planted-error proof: not run yet"}
            </p>
            {scored ? (
              <div data-end="search">
                <p className={styles.endCaption}>Search model: recall at {scored.k} on {scored.queries} test queries</p>
                <table className={styles.endTable}>
                  <tbody>
                    {scored.systems.map((s) => (
                      <tr key={s.system}>
                        <th scope="row">{SYSTEM_NAMES[s.system] ?? s.system}</th>
                        <td>{percent(s.recallAtK)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className={styles.endNote}>{L28}</p>
              </div>
            ) : (
              <p className={styles.endScore} data-end="search">
                Search model: not trained yet
              </p>
            )}
          </section>
          <section>
            <h3 className={styles.endHeading}>Live</h3>
            <ul className={styles.endList} data-end="live">
              {live.length === 0 ? (
                // Gordon's approved line, Oct 25 4:58 AM (docs/v2/video-brief.md).
                <li>The tour is scripted, so it always plays. In live mode, real services answer your own questions.</li>
              ) : (
                live.map((k) => <li key={k}>{SOURCE_NAMES[k]}</li>)
              )}
            </ul>
          </section>
          <section>
            <h3 className={styles.endHeading}>Simulated</h3>
            <ul className={styles.endList} data-end="simulated">
              {simulated.map((k) => (
                <li key={k}>{SOURCE_NAMES[k]}</li>
              ))}
              <li>Checkout: demo only, no real charge</li>
            </ul>
          </section>
        </div>
        <p className={styles.endNote} data-end="l29">
          {L29}
        </p>
        <footer className={styles.endFoot}>
          <p className={styles.endL30} data-end="l30">
            {L30}
          </p>
          <p className={styles.endUrl}>{REPO_URL}</p>
          <p className={styles.endL1}>{L1.en}</p>
        </footer>
      </div>
    </div>
  );
}
