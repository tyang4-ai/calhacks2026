// Every result the newest scan checked (F-watch T4, C-6), watch-checked, under the hits, from
// watch.scans[scanId].results in the payload's order: watch-checked-<n> from 1, each with the title,
// the URL as text, the text match (no number when its similarity is null) and the verdict in plain
// words. A claim-only result carries L22 in watch-claim-only-<n> and never gets a report button.
// Before the scan's watch.scanned the list shows nothing; a watch.scanned with no results list
// shows only the count.
import type { WatchScanState } from "../../core/state";
import type { CopyVerdict } from "../../core/types";
import { ScoreBar } from "../../ui";
import { isScanned } from "./model";
import { CHECKED, GLOSSARY, t, tf, type Lang } from "./strings";
import styles from "./watch.module.css";

const VERDICT_WORDS: Record<Exclude<CopyVerdict, "claim_only">, { en: string; zh: string }> = {
  possible_copy: CHECKED.possibleCopy,
  neither: CHECKED.neither,
};

export function CheckedList({ scan, lang }: { scan: (WatchScanState & { scanId: string }) | null; lang: Lang }) {
  if (!scan || !isScanned(scan)) return null;
  const results = scan.results;
  const count = scan.candidates ?? results?.length ?? 0;
  return (
    <section data-testid="watch-checked" className={styles.checked} data-scan-id={scan.scanId}>
      <h3 className={styles.h3}>{tf(CHECKED.title, lang, { n: results?.length ?? count })}</h3>
      {!results ? (
        <p className={styles.soft}>{tf(CHECKED.countOnly, lang, { n: count })}</p>
      ) : (
        <ol className={styles.checkedList}>
          {results.map((r, i) => {
            const n = i + 1;
            return (
              <li key={`${n}-${r.url}`} data-testid={`watch-checked-${n}`} data-verdict={r.verdict} className={styles.checkedRow}>
                <span className={styles.checkedTitle} title={r.title} data-role="title">
                  {r.title}
                </span>
                <span className={`${styles.mono} ${styles.checkedUrl}`} title={r.url} data-role="url">
                  {r.url}
                </span>
                <span className={styles.checkedScore} data-role="similarity">
                  {r.similarity === null ? (
                    <span className={styles.soft}>{t(CHECKED.notScored, lang)}</span>
                  ) : (
                    <ScoreBar value={r.similarity} label={t(GLOSSARY.textMatch, lang)} width={72} />
                  )}
                </span>
                {r.verdict === "claim_only" ? (
                  <span data-testid={`watch-claim-only-${n}`} className={`${styles.verdict} ${styles.verdictClaim}`} data-role="verdict">
                    {t(CHECKED.claimOnly, lang)}
                  </span>
                ) : (
                  <span className={`${styles.verdict}${r.verdict === "possible_copy" ? ` ${styles.verdictCopy}` : ""}`} data-role="verdict">
                    {t(VERDICT_WORDS[r.verdict], lang)}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
