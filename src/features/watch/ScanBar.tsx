// The scan bar (F-watch T2): the maker picker, the queries, Scan now, the status and the engine.
// - The picker (watch-maker) lists std_dine's makers and starts at mkr_01.
// - The queries (watch-queries) are the newest watch.started's own once one is in the store for the
//   picked maker (D1-51), so the tour's scan shows the queries it sent. Before that, the queries
//   Scan now would send for the picked maker.
// - Scan now (watch-scan) emits a person's watch.started (wsc_user_<n>, counted from the store), and
//   is disabled while the newest scan has no watch.scanned yet.
// - watch-status says the check is under way until watch.scanned, then how many results were
//   checked and how many possible copies were found. watch-engine names watch.scanned's engine.
import { useState } from "react";
import { userEvent } from "../../core/events";
import type { CindiaState } from "../../core/state";
import { emit, getState, useCindia } from "../../core/store";
import type { Person, Studio } from "../../core/types";
import { getById } from "../../mock";
import { Button } from "../../ui";
import { checkedCount, followedScan, hitsOf, isScanned, nextScanId, possibleCopies } from "./model";
import { scanQueries } from "./scanQueries";
import { checkedWords, ENGINE, foundWords, SCAN, SEP, t, type Lang } from "./strings";
import styles from "./watch.module.css";

/** The co-op the watch looks after. */
const STUDIO_ID = "std_dine";

const selectBar = (s: CindiaState) => {
  const scan = followedScan(s);
  const hits = hitsOf(s, scan?.scanId ?? null);
  return { scan, found: possibleCopies(scan, hits), checked: checkedCount(scan) };
};

export function ScanBar({ lang }: { lang: Lang }) {
  const makerIds = getById<Studio>(STUDIO_ID)?.makerIds ?? [];
  const [makerId, setMakerId] = useState<string>(makerIds[0] ?? "");
  const { scan, found, checked } = useCindia(selectBar);
  const scanned = isScanned(scan);
  const busy = scan !== null && !scanned;
  const showSent = scan !== null && scan.makerId === makerId;
  const queries = showSent ? scan.queries : scanQueries(makerId);
  const next = scanQueries(makerId);

  const startScan = () => {
    const scanId = nextScanId(Object.keys(getState().watch.scans));
    emit(userEvent("watch.started", { scanId, makerId, queries: next }));
  };

  let status: string;
  if (!scan) status = t(SCAN.statusIdle, lang);
  else if (!scanned) status = t(SCAN.statusChecking, lang);
  else status = `${t(checkedWords(checked), lang)}${SEP}${t(foundWords(found), lang)}`;

  return (
    <div className={styles.scanBar}>
      <div className={styles.scanRow}>
        <label className={styles.makerField}>
          <span className={styles.fieldLabel}>{t(SCAN.makerLabel, lang)}</span>
          <select
            data-testid="watch-maker"
            className={styles.select}
            value={makerId}
            onChange={(e) => setMakerId(e.target.value)}
          >
            {makerIds.map((id) => (
              <option key={id} value={id}>
                {getById<Person>(id)?.name[lang] ?? id}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.queriesField}>
          <span className={styles.fieldLabel}>{t(showSent ? SCAN.queriesSent : SCAN.queriesNext, lang)}</span>
          {queries.length > 0 ? (
            <ol data-testid="watch-queries" className={styles.queries} data-sent={showSent ? "true" : "false"}>
              {queries.map((q, i) => (
                <li key={`${i}-${q}`} className={styles.query} data-role="query" title={q}>
                  {q}
                </li>
              ))}
            </ol>
          ) : (
            <p data-testid="watch-queries" className={styles.soft} data-sent="false">
              {t(SCAN.noQueries, lang)}
            </p>
          )}
        </div>
        <Button testId="watch-scan" variant="primary" className={styles.scanButton} disabled={busy || next.length === 0} onClick={startScan}>
          {t(busy ? SCAN.scanning : SCAN.scanNow, lang)}
        </Button>
      </div>
      <div className={styles.statusRow}>
        <p data-testid="watch-status" className={styles.status} data-state={!scan ? "idle" : scanned ? "done" : "checking"} aria-live="polite">
          {status}
        </p>
        {scan?.engine && (
          <p className={styles.engine}>
            <span className={styles.fieldLabel}>{t(SCAN.engineLabel, lang)}</span>
            <span data-testid="watch-engine" data-engine={scan.engine}>
              {t(ENGINE[scan.engine], lang)}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
