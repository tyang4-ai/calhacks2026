// The model view (T6), process-pane-model: process-model-card shows the newest model.trained (base
// model, training pairs, epochs, dimensions, and the model card link when hubUrl is set) and the
// proof.search_scored table, with process-model-test-note under it reading L28. With neither event
// it says "Not trained yet" and what the card will show.
import { useCallback } from "react";
import type { CindiaState } from "../../core/state";
import { useCindia } from "../../core/store";
import type { Lang } from "../../core/types";
import { modelId as mockModelId } from "../../mock";
import { Figure, Quiet, SectionHead, Tag } from "./parts";
import { SearchScoreTable } from "./ProofProcess";
import { GLOSSARY, L28, MODEL, PROOF, t } from "./strings";

function modelView(s: CindiaState) {
  return { trained: s.model.trained, scored: s.model.scored };
}

export function ModelProcess({ lang }: { lang: Lang }) {
  const v = useCindia(useCallback((s: CindiaState) => modelView(s), []));
  const id = v.trained?.modelId ?? v.scored?.modelId ?? mockModelId;
  return (
    <div data-testid="process-pane-model">
      <section
        data-testid="process-model-card"
        data-trained={v.trained !== null}
        className="flex flex-col gap-4 px-5 py-4"
        style={{ border: "1px solid var(--c-color-line)", borderRadius: "var(--c-radius-panel)" }}
      >
        <SectionHead
          title={GLOSSARY.searchModel}
          lang={lang}
          right={
            <span className="flex items-center gap-2">
              <Tag>{id}</Tag>
              <span data-role="state" className="font-semibold" style={{ color: v.trained ? "var(--c-color-jade)" : "var(--c-color-amber)" }}>
                {t(v.trained ? MODEL.trained : PROOF.notTrained, lang)}
              </span>
            </span>
          }
        />
        <div className="flex flex-wrap gap-6">
          <div className="flex min-w-0 flex-col gap-3" style={{ flex: "1 1 380px" }}>
            {v.trained ? (
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }} data-role="training">
                {/* The base model's name is long, so it takes the whole first row. */}
                <Figure label={MODEL.baseModel} lang={lang} value={v.trained.baseModel} attr={{ "data-field": "baseModel" }} style={{ gridColumn: "1 / -1" }} />
                <Figure label={MODEL.pairs} lang={lang} value={v.trained.pairs} attr={{ "data-field": "pairs" }} />
                <Figure label={MODEL.epochs} lang={lang} value={v.trained.epochs} attr={{ "data-field": "epochs" }} />
                <Figure label={MODEL.dims} lang={lang} value={v.trained.dims} attr={{ "data-field": "dims" }} />
              </div>
            ) : (
              <p data-role="not-trained">
                <span className="font-semibold">{t(PROOF.notTrained, lang)}. </span>
                <Quiet>{t(MODEL.willShow, lang)}</Quiet>
              </p>
            )}
            {v.trained?.hubUrl && (
              <a href={v.trained.hubUrl} target="_blank" rel="noreferrer" data-role="hub-link" style={{ color: "var(--c-color-ink)", textDecoration: "underline" }}>
                {t(MODEL.card, lang)}
              </a>
            )}
          </div>
          {v.scored && (
            <div data-role="scores" data-queries={v.scored.queries} className="min-w-0" style={{ flex: "1 1 380px" }}>
              <SectionHead title={PROOF.searchTitle} lang={lang} right={<Quiet>{`${v.scored.queries} ${t(GLOSSARY.testQueries, lang).toLowerCase()}`}</Quiet>} />
              <SearchScoreTable scored={v.scored} lang={lang} />
            </div>
          )}
        </div>
        <p data-testid="process-model-test-note">
          <Quiet>{t(L28, lang)}</Quiet>
        </p>
      </section>
    </div>
  );
}

export default ModelProcess;
