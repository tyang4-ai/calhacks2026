// Sell › Proof, right third (studio.proof.side, T6): the search model's score, in a kit Panel
// (search-proof) that declares b11-embed. With a proof.search_scored in the store: one row per
// system (search-proof-row-<system>) with recall at k as a ScoreBar and MRR, the best row marked
// by a word, the eval query count and modelId, and L28 under the table (search-proof-note) with the
// payload's query count and the catalog's piece count. With model.trained: the base model, the
// training pairs and the epochs. With neither and report null: "Not trained yet"
// (search-proof-empty). It never shows a number the event didn't carry.
import type { SearchSystem, SourceKey } from "../../core/events";
import type { SlotProps } from "../../core/featureTypes";
import { useCindia } from "../../core/store";
import { pieces, report } from "../../mock";
import { Panel, ScoreBar } from "../../ui";
import { GLOSSARY, PROOF, SYSTEMS, figure, l28, t, tf } from "./strings";

const SOURCE_KEYS: SourceKey[] = ["b11-embed"];
const ORDER: SearchSystem[] = ["keyword", "base", "custom", "hybrid"];

export function SearchProof({ lang }: SlotProps) {
  const { scored, trained } = useCindia((s) => ({ scored: s.model.scored, trained: s.model.trained }));

  const rows = scored ? ORDER.map((sys) => scored.systems.find((x) => x.system === sys)).filter((x) => x !== undefined) : [];
  let best: SearchSystem | null = null;
  for (const r of rows) {
    const b = rows.find((x) => x.system === best);
    if (!b || r.recallAtK > b.recallAtK || (r.recallAtK === b.recallAtK && r.mrr > b.mrr)) best = r.system;
  }

  const small = { margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" } as const;

  return (
    <Panel
      testId="search-proof"
      sourceKeys={SOURCE_KEYS}
      title={t(PROOF.title, lang)}
      lang={lang}
      className="[&>div]:flex [&>div]:flex-col"
      style={{ height: "100%", boxSizing: "border-box" }}
    >
      <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--c-space-12)" }}>
        <p style={small}>{t(PROOF.intro, lang)}</p>
        {trained && (
          <p style={{ ...small, color: "var(--c-color-ink)" }}>
            {tf(PROOF.trained, lang, { baseModel: trained.baseModel, pairs: trained.pairs, epochs: trained.epochs })}
          </p>
        )}
        {scored && (
          <>
            <p style={small}>{tf(PROOF.scoredOn, lang, { modelId: scored.modelId, queries: scored.queries })}</p>
            <div role="table" aria-label={t(GLOSSARY.searchModel, lang)} style={{ display: "flex", flexDirection: "column" }}>
              <div role="row" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "var(--c-space-8)", padding: "var(--c-space-4) var(--c-space-8)", background: "var(--c-color-mat)", fontSize: "var(--c-text-14)" }}>
                <span role="columnheader">{t(PROOF.system, lang)}</span>
                <span role="columnheader">
                  {tf(PROOF.recallAt, lang, { k: scored.k })} · {t(PROOF.mrr, lang)}
                </span>
              </div>
              {rows.map((r) => {
                const isBest = r.system === best;
                return (
                  <div
                    key={r.system}
                    role="row"
                    data-testid={`search-proof-row-${r.system}`}
                    data-best={isBest || undefined}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--c-space-4)",
                      padding: "var(--c-space-8)",
                      borderBottom: "1px solid var(--c-color-line)",
                      background: isBest ? "var(--c-color-jade-wash)" : undefined,
                    }}
                  >
                    <span role="cell" style={{ display: "flex", alignItems: "baseline", gap: "var(--c-space-8)", fontSize: "var(--c-text-14)", fontWeight: isBest ? 600 : 500 }}>
                      {t(SYSTEMS[r.system], lang)}
                      {isBest && <span style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-jade)", fontWeight: 600 }}>{t(PROOF.best, lang)}</span>}
                    </span>
                    <span role="cell" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "var(--c-space-12)", fontSize: "var(--c-text-14)" }}>
                      <ScoreBar value={r.recallAtK} tone={isBest ? "jade" : "neutral"} width={96} />
                      <span>
                        {t(PROOF.mrr, lang)} <strong style={{ fontWeight: 600 }}>{figure(r.mrr)}</strong>
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
            <p data-testid="search-proof-note" style={small}>
              {l28(lang, scored.queries, pieces.length)}
            </p>
          </>
        )}
        {!scored && !trained && report === null && (
          <>
            <p data-testid="search-proof-empty" style={{ margin: 0, fontSize: "var(--c-text-18)", fontWeight: 600, color: "var(--c-color-ink)" }}>
              {t(PROOF.empty, lang)}
            </p>
            <p style={small}>{t(PROOF.emptyNote, lang)}</p>
          </>
        )}
      </div>
    </Panel>
  );
}

export default SearchProof;
