// The results (F-watch T4), watch-results: the newest scan's hits as HitCards, highest similarity
// first, then every result the scan checked (CheckedList).
// Under each hit, two buttons of the same kit Button variant and size:
// - watch-report-<cftId> moves to /sell/approvals?ref=<approvalId> through navigate() once Cindy's
//   report_listing approval for the hit is requested (reportLink), is disabled with "Waiting for
//   Cindy's draft" before that, and reads approved or declined after the owner's decision,
// - watch-dismiss-<cftId> (L23) folds the card to one line with Undo. That is local UI state:
//   nothing is emitted, and the report approval stays as it is.
// watch-empty says the finished scan found no possible copies.
import { useState } from "react";
import { navigate } from "../../core/nav";
import type { CindiaState } from "../../core/state";
import { useCindia } from "../../core/store";
import { Button } from "../../ui";
import { CheckedList } from "./CheckedList";
import { HitCard } from "./HitCard";
import { followedScan, hitsOf, isLiveHit, isScanned, possibleCopies, selectLiveHitEvents, useHitEvents } from "./model";
import { reportLink, type ReportLink } from "./reportLink";
import { ACTIONS, GLOSSARY, RESULTS, SEP, t, type Lang } from "./strings";
import styles from "./watch.module.css";

const selectResults = (s: CindiaState) => {
  const scan = followedScan(s);
  const hits = hitsOf(s, scan?.scanId ?? null);
  return {
    scan,
    hits,
    links: hits.map((h) => reportLink(h.cftId, s.approvals)),
    liveEvents: selectLiveHitEvents(s),
  };
};

function reportWords(link: ReportLink | null) {
  if (!link) return ACTIONS.waiting;
  if (link.status === "granted") return ACTIONS.reportApproved;
  if (link.status === "declined") return ACTIONS.reportDeclined;
  return ACTIONS.review;
}

export function WatchResults({ lang }: { lang: Lang }) {
  const { scan, hits, links, liveEvents } = useCindia(selectResults);
  const noted = useHitEvents();
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const live = new Set(liveEvents);
  const scanned = isScanned(scan);
  const found = possibleCopies(scan, hits);

  const setFolded = (cftId: string, folded: boolean) => setDismissed((prev) => ({ ...prev, [cftId]: folded }));

  return (
    <section data-testid="watch-results" className={styles.results} data-scan-id={scan?.scanId ?? ""}>
      {hits.map((hit, i) => {
        const link = links[i];
        const folded = dismissed[hit.cftId] === true;
        const actions = (
          <div className={styles.actionsBlock}>
            <div className={styles.actions}>
              <Button
                testId={`watch-report-${hit.cftId}`}
                variant="quiet"
                className={styles.actionButton}
                disabled={!link}
                data-status={link?.status ?? "waiting"}
                onClick={() => {
                  if (link) navigate(link.to);
                }}
              >
                {t(reportWords(link), lang)}
              </Button>
              <Button testId={`watch-dismiss-${hit.cftId}`} variant="quiet" className={styles.actionButton} onClick={() => setFolded(hit.cftId, true)}>
                {t(ACTIONS.dismiss, lang)}
              </Button>
            </div>
            {link && (
              <p className={styles.proposed}>
                {t(GLOSSARY.proposedByCindy, lang)}
                {link.status === "pending" ? `${SEP}${t(GLOSSARY.approval, lang)}` : ""}
              </p>
            )}
          </div>
        );
        return (
          <HitCard
            key={hit.cftId}
            hit={hit}
            live={isLiveHit(hit.cftId, noted, live)}
            lang={lang}
            folded={folded}
            onUndo={() => setFolded(hit.cftId, false)}
            actions={actions}
          />
        );
      })}
      {scanned && hits.length === 0 && found === 0 && (
        <p data-testid="watch-empty" className={styles.empty}>
          {t(RESULTS.empty, lang)}
        </p>
      )}
      {scanned && hits.length === 0 && found > 0 && <p className={styles.soft}>{t(RESULTS.waitingHits, lang)}</p>}
      <CheckedList scan={scan} lang={lang} />
    </section>
  );
}
