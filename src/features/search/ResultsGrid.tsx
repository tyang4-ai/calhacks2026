// The results grid (T2): the latest search.answered in payload order, as ResultCards inside
// search-results, with "No close matches" above when the answer says so, the provenance note under
// it, and the waiting line while the latest query has no answer. It also turns the query a URL
// brings (?q= and ?k=) into one search.queried (B1-29), and exports EngineLine: search-engine,
// with search-model-line inside it when the store holds a search score.
import { useEffect, useRef } from "react";
import { useCindia, getState } from "../../core/store";
import { extractKeywords } from "../../sources";
import { emitQuery } from "./requests";
import { ResultCard } from "./ResultCard";
import { ENGINE_MODEL, ENGINES, MODEL_LINE, RESULTS, figure, t, tf, type Lang } from "./strings";

export interface ResultsGridProps {
  lang: Lang;
  /** SlotProps.searchParams on /shop/search: q and repeated k. */
  searchParams?: { q?: string; k: string[] };
}

/**
 * Emits one search.queried for a URL's q when it differs from the latest query's text. The dev
 * server runs <StrictMode>, which runs every effect twice, so the q already handled stays in a ref
 * and the latest query is read through getState() inside the effect, never captured at render.
 */
function useUrlQuery(lang: Lang, searchParams: ResultsGridProps["searchParams"]) {
  const handled = useRef<string | null>(null);
  const q = searchParams?.q?.trim() ?? "";
  const kKey = JSON.stringify(searchParams?.k ?? []);
  useEffect(() => {
    if (!q || handled.current === q) return;
    handled.current = q;
    const s = getState();
    const latestId = s.search.latestQueryId;
    const latestText = latestId ? s.search.queries[latestId]?.text : undefined;
    if (latestText !== undefined && latestText.trim() === q) return;
    const k = JSON.parse(kKey) as string[];
    const extracted = extractKeywords(q);
    emitQuery({ text: q, keywords: k.length > 0 ? k : extracted.keywords, lang, filters: k.length > 0 ? undefined : extracted.filters });
  }, [q, kKey, lang]);
}

export function ResultsGrid({ lang, searchParams }: ResultsGridProps) {
  useUrlQuery(lang, searchParams);
  const view = useCindia((s) => {
    const id = s.search.latestQueryId;
    if (!id || !s.search.queries[id]) return null;
    const a = s.search.answers[id];
    return { id, answer: a ? { results: a.results, closeMatches: a.closeMatches } : null };
  });

  if (!view) return null;
  if (!view.answer) {
    return (
      <p data-testid="search-working" role="status" style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-amber)" }}>
        {t(RESULTS.working, lang)}
      </p>
    );
  }

  const { results, closeMatches } = view.answer;
  const n = results.length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-12)" }} lang={lang}>
      <p style={{ margin: 0, fontSize: "var(--c-text-16)" }}>
        <strong style={{ fontWeight: 600 }}>{n === 1 ? t(RESULTS.countOne, lang) : tf(RESULTS.countMany, lang, { n })}</strong>
        {n > 1 && <span style={{ color: "var(--c-color-ink-soft)", fontSize: "var(--c-text-14)" }}> · {t(RESULTS.sorted, lang)}</span>}
      </p>
      {closeMatches === false && (
        <p data-testid="search-no-close" style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-amber)" }}>
          {t(RESULTS.noClose, lang)}
        </p>
      )}
      <div
        data-testid="search-results"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "var(--c-space-16)", alignItems: "start" }}
      >
        {n === 0 ? (
          <p style={{ gridColumn: "1 / -1", margin: 0, fontSize: "var(--c-text-16)", color: "var(--c-color-ink-soft)" }}>{t(RESULTS.none, lang)}</p>
        ) : (
          results.map((r) => <ResultCard key={r.pieceId} result={r} lang={lang} />)
        )}
      </div>
      {n > 0 && (
        <p data-testid="search-provenance-note" style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>
          {t(RESULTS.provenanceNote, lang)}
        </p>
      )}
    </div>
  );
}

export interface EngineLineProps {
  lang: Lang;
}

/**
 * search-engine: the engine that answered the latest query, in plain words, with the model ID when
 * the answer carries one. With a proof.search_scored in the store, search-model-line follows the
 * engine's name, built from that payload only.
 */
export function EngineLine({ lang }: EngineLineProps) {
  const view = useCindia((s) => {
    const id = s.search.latestQueryId;
    const a = id ? s.search.answers[id] : undefined;
    if (!a) return null;
    return { engine: a.engine, modelId: a.modelId, scored: s.model.scored };
  });
  if (!view) return null;
  const { engine, modelId, scored } = view;

  let modelLine: string | null = null;
  if (scored) {
    const custom = scored.systems.find((x) => x.system === "custom");
    const keyword = scored.systems.find((x) => x.system === "keyword");
    if (custom && keyword) {
      const values = { modelId: scored.modelId, k: scored.k, queries: scored.queries, custom: figure(custom.recallAtK), keyword: figure(keyword.recallAtK) };
      const tpl = custom.recallAtK > keyword.recallAtK ? MODEL_LINE.better : custom.recallAtK < keyword.recallAtK ? MODEL_LINE.worse : MODEL_LINE.same;
      modelLine = tf(tpl, lang, values);
    }
  }

  return (
    <p data-testid="search-engine" style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }} lang={lang}>
      <span>{t(ENGINES[engine], lang)}</span>
      {modelId && <span> · {tf(ENGINE_MODEL, lang, { modelId })}</span>}
      {modelLine && (
        <>
          {" "}
          <span data-testid="search-model-line" style={{ color: "var(--c-color-ink)" }}>
            {modelLine}
          </span>
        </>
      )}
    </p>
  );
}
