// The watch view (T6), process-pane-watch:
// - process-watch-chain runs search (the queries from watch.started), then compare (the engine and the
//   count from watch.scanned), then check the claim (each counterfeit.flagged with its text match and
//   claim), then propose a report (the report_listing approval and its status);
// - process-watch-results lists every result the scan checked, hits or not, with its verdict, as
//   watch.scanned carries them (C-6).
import { useCallback, type ReactNode } from "react";
import type { CindiaState } from "../../core/state";
import { useCindia } from "../../core/store";
import type { Lang, Text } from "../../core/types";
import { ScoreBar } from "../../ui";
import { approvalInfo } from "./processes";
import { Empty, Quiet, SectionHead, Tag } from "./parts";
import { pieceObject } from "./readers";
import { APPROVAL_STATUS_LABELS, EMPTY, ENGINE_WATCH_LABELS, GLOSSARY, VERDICT_LABELS, WATCH, t } from "./strings";

function watchView(s: CindiaState) {
  const scanId = s.watch.latestScanId;
  const scan = scanId ? (s.watch.scans[scanId] ?? null) : null;
  const hits = s.watch.hitIds.map((id) => s.watch.hits[id]).filter((h) => h && h.scanId === scanId);
  const hitIds = new Set(hits.map((h) => h.cftId));
  const reports = s.approvals.approvalIds
    .filter((id) => s.approvals.items[id]?.requested)
    .map((id) => ({ id, info: approvalInfo(s, id), status: s.approvals.items[id].status }))
    .filter((a) => a.info?.kind === "report_listing" && a.info.subjectIds.some((sub) => hitIds.has(sub)))
    .map((a) => ({ approvalId: a.id, status: a.status, subjectIds: a.info!.subjectIds }));
  return { scanId, scan, hits, reports };
}

function ChainStep({ step, n, title, lit, lang, children }: { step: string; n: number; title: Text; lit: boolean; lang: Lang; children?: ReactNode }) {
  return (
    <li
      data-step={step}
      data-lit={lit}
      className="flex min-w-0 flex-col gap-1 px-3 py-2"
      style={{
        flex: "1 1 220px",
        border: `1px ${lit ? "solid" : "dashed"} ${lit ? "var(--c-color-ink)" : "var(--c-color-line)"}`,
        borderRadius: "var(--c-radius-panel)",
      }}
    >
      <span className="font-semibold">
        {n} · {t(title, lang)}
      </span>
      {lit ? children : <Quiet>{t(WATCH.waiting, lang)}</Quiet>}
    </li>
  );
}

export function WatchProcess({ lang }: { lang: Lang }) {
  const v = useCindia(useCallback((s: CindiaState) => watchView(s), []));
  if (!v.scan) {
    return (
      <div data-testid="process-pane-watch">
        <Empty text={EMPTY.watch} lang={lang} />
      </div>
    );
  }
  const scan = v.scan;
  const scanned = scan.scannedAt !== undefined;
  return (
    <div data-testid="process-pane-watch" data-scan-id={v.scanId ?? undefined} className="flex flex-col gap-4">
      <ol data-testid="process-watch-chain" className="m-0 flex list-none flex-wrap items-stretch gap-2 p-0">
        <ChainStep step="search" n={1} title={WATCH.search} lit lang={lang}>
          <Quiet>
            {scan.queries.length} {t(WATCH.queries, lang)}
          </Quiet>
          <ul className="m-0 flex list-none flex-col p-0" style={{ fontSize: "var(--c-text-14)" }}>
            {scan.queries.map((q) => (
              <li key={q} style={{ overflowWrap: "anywhere" }}>
                “{q}”
              </li>
            ))}
          </ul>
        </ChainStep>
        <ChainStep step="compare" n={2} title={WATCH.compare} lit={scanned} lang={lang}>
          {scan.engine && <span>{t(ENGINE_WATCH_LABELS[scan.engine], lang)}</span>}
          <Quiet>
            {scan.candidates ?? 0} {t(WATCH.results, lang)}
          </Quiet>
        </ChainStep>
        <ChainStep step="claim" n={3} title={WATCH.checkClaim} lit={scanned} lang={lang}>
          {v.hits.length === 0 ? (
            <Quiet>{t(WATCH.noHit, lang)}</Quiet>
          ) : (
            v.hits.map((h) => (
              <span key={h.cftId} className="flex flex-col gap-0.5" data-cft-id={h.cftId} style={{ fontSize: "var(--c-text-14)" }}>
                <span className="flex flex-wrap items-center gap-2">
                  <Tag tone="seal">{t(GLOSSARY.possibleCopy, lang)}</Tag>
                  <Quiet>
                    → {h.pieceId} · {pieceObject(h.pieceId, lang)}
                  </Quiet>
                </span>
                <span style={{ overflowWrap: "anywhere" }}>{h.title}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <Quiet>{t(GLOSSARY.textMatch, lang)}</Quiet>
                  <ScoreBar value={h.similarity} tone="amber" width={80} />
                </span>
                <Quiet>{t(h.claim, lang)}</Quiet>
              </span>
            ))
          )}
        </ChainStep>
        <ChainStep step="report" n={4} title={WATCH.propose} lit={v.reports.length > 0} lang={lang}>
          {v.reports.map((r) => (
            <span key={r.approvalId} className="flex flex-wrap items-center gap-2" data-approval-id={r.approvalId} data-status={r.status}>
              <Tag tone="soft">{r.approvalId}</Tag>
              <span className="font-semibold">{t(APPROVAL_STATUS_LABELS[r.status], lang)}</span>
            </span>
          ))}
        </ChainStep>
      </ol>
      <section data-testid="process-watch-results">
        <SectionHead title={WATCH.resultsTitle} lang={lang} />
        {scan.results && scan.results.length > 0 ? (
          <ol className="m-0 flex list-none flex-col p-0" style={{ fontSize: "var(--c-text-14)" }}>
            {scan.results.map((r, i) => (
              <li
                key={`${i}-${r.url}`}
                data-verdict={r.verdict}
                data-n={i + 1}
                className="grid items-center gap-3 py-1"
                style={{ gridTemplateColumns: "24px minmax(0, 3fr) minmax(0, 2fr) 120px 110px", borderBottom: "1px solid var(--c-color-line)" }}
              >
                <span className="tabular-nums" style={{ color: "var(--c-color-ink-soft)" }}>
                  {i + 1}
                </span>
                <span style={{ overflowWrap: "anywhere" }}>{r.title}</span>
                <span style={{ color: "var(--c-color-ink-soft)", overflowWrap: "anywhere" }}>{r.url}</span>
                <span>{r.similarity === null ? <Quiet>{t(WATCH.notScored, lang)}</Quiet> : <ScoreBar value={r.similarity} tone="amber" width={60} />}</span>
                <span className="font-semibold" style={{ color: r.verdict === "possible_copy" ? "var(--c-color-seal)" : r.verdict === "claim_only" ? "var(--c-color-amber)" : "var(--c-color-ink-soft)" }}>
                  {t(VERDICT_LABELS[r.verdict], lang)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <Quiet>{t(WATCH.noResults, lang)}</Quiet>
        )}
      </section>
    </div>
  );
}

export default WatchProcess;
