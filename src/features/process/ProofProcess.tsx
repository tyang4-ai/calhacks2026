// The proof view (T6), process-pane-proof: process-proof-errors lists each planted error from
// proof.scored and whether it was caught, and process-proof-search shows the four systems from
// proof.search_scored, or "Not trained yet".
import { useCallback } from "react";
import type { CindiaState } from "../../core/state";
import { useCindia } from "../../core/store";
import type { Lang, PlantedError } from "../../core/types";
import { getById } from "../../mock";
import { LedgerTable, ScoreBar } from "../../ui";
import { Empty, Quiet, SectionHead, Tag } from "./parts";
import { caughtOf, EMPTY, PLANTED_KIND_LABELS, PROOF, SYSTEM_LABELS, t } from "./strings";

function proofView(s: CindiaState) {
  return { score: s.proof.score, scored: s.model.scored };
}

/** Our model and the hybrid in jade, the two baselines in ink. */
const tone = (system: string) => (system === "custom" || system === "hybrid" ? "jade" : "neutral");

/** The four systems' scores from proof.search_scored, in the kit's LedgerTable. */
export function SearchScoreTable({ scored, lang }: { scored: NonNullable<CindiaState["model"]["scored"]>; lang: Lang }) {
  return (
    <div data-model-id={scored.modelId}>
      <LedgerTable
        columns={[
          { key: "system", label: t(PROOF.system, lang) },
          { key: "recall", label: t(PROOF.recall, lang) },
          { key: "mrr", label: t(PROOF.mrr, lang) },
        ]}
        rows={scored.systems.map((row) => ({
          id: row.system,
          cells: {
            system: <span data-system={row.system}>{t(SYSTEM_LABELS[row.system], lang)}</span>,
            recall: <ScoreBar value={row.recallAtK} tone={tone(row.system)} width={100} />,
            mrr: <ScoreBar value={row.mrr} tone={tone(row.system)} width={100} />,
          },
        }))}
      />
    </div>
  );
}

export function ProofProcess({ lang }: { lang: Lang }) {
  const v = useCindia(useCallback((s: CindiaState) => proofView(s), []));
  return (
    <div data-testid="process-pane-proof" className="flex flex-wrap gap-6">
      {!v.score && !v.scored && (
        <div style={{ flex: "1 1 100%" }}>
          <Empty text={EMPTY.proof} lang={lang} />
        </div>
      )}
      <section data-testid="process-proof-errors" data-caught={v.score?.caught} data-total={v.score?.total} className="min-w-0" style={{ flex: "1 1 360px" }}>
        <SectionHead title={PROOF.errorsTitle} lang={lang} right={v.score ? <span className="font-semibold">{t(caughtOf(v.score.caught, v.score.total), lang)}</span> : undefined} />
        {v.score ? (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {v.score.results.map((r) => {
              const err = getById<PlantedError>(r.errorId);
              const kind = err && "kind" in err ? PLANTED_KIND_LABELS[err.kind] : undefined;
              return (
                <li key={r.errorId} data-error-id={r.errorId} data-caught={r.caught} className="flex flex-wrap items-center gap-2">
                  <Tag tone="soft">{r.errorId}</Tag>
                  <span>{kind ? t(kind, lang) : r.errorId}</span>
                  <span className="font-semibold" style={{ color: r.caught ? "var(--c-color-jade)" : "var(--c-color-seal)" }}>
                    {r.caught ? "✓ " : "✕ "}
                    {t(r.caught ? PROOF.caught : PROOF.missed, lang)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          v.scored && <Quiet>{t(EMPTY.proof, lang)}</Quiet>
        )}
      </section>
      <section data-testid="process-proof-search" className="min-w-0" style={{ flex: "1 1 360px" }}>
        <SectionHead title={PROOF.searchTitle} lang={lang} right={v.scored ? <Tag tone="soft">{v.scored.modelId}</Tag> : undefined} />
        {v.scored ? <SearchScoreTable scored={v.scored} lang={lang} /> : <Quiet>{t(PROOF.notTrained, lang)}</Quiet>}
      </section>
    </div>
  );
}

export default ProofProcess;
