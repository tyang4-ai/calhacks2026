// The search view (T2), process-pane-search:
// - the kit EmbeddingMap (process-search-map) draws the newest search.mapped: every piece as a mark
//   in its community's color and shape, the query as a star, and lines to the newest search.answered's
//   top six. Hovering a mark names the piece. Before any search.mapped the map area keeps its test ID
//   and shows the waiting line, or "Not trained yet" while there's no report and no model.trained;
// - process-search-scores lists those six with their scores, matched keywords, the engine and modelId;
// - process-search-surprise lists the newest surprise.drawn's candidates in the payload's order, each
//   with its weight, the drawn piece marked by a word. The only place the weights show.
import { useCallback } from "react";
import type { CindiaState } from "../../core/state";
import { useCindia } from "../../core/store";
import type { Lang } from "../../core/types";
import { communities, modelId as mockModelId, report } from "../../mock";
import { EmbeddingMap, ScoreBar, type MapPoint } from "../../ui";
import { Empty, Quiet, SectionHead, Tag } from "./parts";
import { newestOf, pieceCommunity, pieceObject, pieceTitle } from "./readers";
import { EMPTY, ENGINE_LABELS, SEARCH, SURPRISE_METHOD_LABELS, t } from "./strings";

const TOP = 6;
const MAP_W = 420;
const MAP_H = 220;

function searchView(s: CindiaState) {
  const map = newestOf(s.search.maps);
  const answer = newestOf(s.search.answers);
  const query = answer ? s.search.queries[answer.queryId] : null;
  const draw = s.surprise.latestSurpriseId ? (s.surprise.draws[s.surprise.latestSurpriseId] ?? newestOf(s.surprise.draws)) : newestOf(s.surprise.draws);
  return {
    map,
    answer,
    queryText: query?.text ?? null,
    draw,
    trained: s.model.trained !== null || report !== null,
  };
}

const GROUPS = communities.map((c) => ({ id: c.id, label: c.name }));

export function SearchProcess({ lang }: { lang: Lang }) {
  const v = useCindia(useCallback((s: CindiaState) => searchView(s), []));
  const top = v.answer ? v.answer.results.slice(0, TOP) : [];
  const topIds = top.map((r) => r.pieceId);

  const points: MapPoint[] = v.map
    ? v.map.points.map((p) => {
        const group = pieceCommunity(p.pieceId);
        const point: MapPoint = { id: p.pieceId, x: p.x, y: p.y, label: { en: pieceTitle(p.pieceId, "en"), zh: pieceTitle(p.pieceId, "zh") } };
        if (group) point.group = group;
        return point;
      })
    : [];
  const linked = topIds.filter((id) => points.some((p) => p.id === id));

  return (
    // Three columns that fit the overlay's body at 1440 by 900 without scrolling: the map, the six
    // results, then the surprise draw. On a narrow host they wrap under each other.
    <div data-testid="process-pane-search" className="flex flex-wrap gap-5">
      <div className="flex min-w-0 flex-col gap-2 [&_figure]:max-w-full [&_svg]:h-auto [&_svg]:max-w-full" style={{ flex: `0 1 ${MAP_W}px`, maxWidth: MAP_W }}>
        {v.map ? (
          <>
            <EmbeddingMap
              testId="process-search-map"
              points={points}
              query={{ x: v.map.query.x, y: v.map.query.y, approx: v.map.approx === true }}
              highlightIds={linked}
              linkIds={linked}
              width={MAP_W}
              height={MAP_H}
              lang={lang}
              groups={GROUPS}
            />
            <Quiet>{t(SEARCH.mapNote, lang)}</Quiet>
          </>
        ) : (
          <div
            data-testid="process-search-map"
            className="flex items-center justify-center px-6 text-center"
            style={{ width: "100%", aspectRatio: `${MAP_W} / ${MAP_H}`, border: "1px dashed var(--c-color-line)", borderRadius: "var(--c-radius-panel)" }}
          >
            <Empty text={v.trained ? EMPTY.search : SEARCH.notTrained} lang={lang} />
          </div>
        )}
      </div>

      <section data-testid="process-search-scores" data-engine={v.answer?.engine} className="min-w-0" style={{ flex: "1 1 360px" }}>
        <SectionHead title={SEARCH.scoresTitle} lang={lang} />
        {v.queryText && (
          <p className="mb-2">
            <Quiet>“{v.queryText}”</Quiet>
          </p>
        )}
        {v.answer ? (
          <>
            <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
              {top.map((r, i) => (
                <li key={r.pieceId} data-piece-id={r.pieceId} data-score={r.score} className="flex flex-col">
                  <span className="font-semibold">
                    {i + 1} · {pieceTitle(r.pieceId, lang)}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2">
                    <ScoreBar value={r.score} tone="jade" width={72} />
                    {r.matched.length > 0 && <Quiet>{r.matched.join(", ")}</Quiet>}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-2 flex flex-wrap gap-x-3" style={{ fontSize: "var(--c-text-14)" }}>
              <span data-role="engine">
                {t(SEARCH.engine, lang)}: {t(ENGINE_LABELS[v.answer.engine], lang)}
              </span>
              <span data-role="model">
                {t(SEARCH.model, lang)}: {v.answer.modelId ?? v.map?.modelId ?? mockModelId}
                {v.trained ? "" : ` · ${t(SEARCH.notTrainedShort, lang)}`}
              </span>
            </p>
          </>
        ) : (
          <Quiet>{t(SEARCH.scoresWaiting, lang)}</Quiet>
        )}
      </section>

      {v.draw && (
        <section data-testid="process-search-surprise" data-method={v.draw.method} className="min-w-0" style={{ flex: "0 1 250px" }}>
          <SectionHead title={SEARCH.surpriseTitle} lang={lang} />
          <p className="mb-1">
            <Quiet>
              {t(SURPRISE_METHOD_LABELS[v.draw.method], lang)} · {t(SEARCH.seed, lang)} {v.draw.seed}
            </Quiet>
          </p>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {v.draw.candidates.map((c) => {
              const drawn = c.pieceId === v.draw!.pieceId;
              return (
                <li
                  key={c.pieceId}
                  data-piece-id={c.pieceId}
                  data-weight={c.weight}
                  data-drawn={drawn || undefined}
                  className="grid items-center gap-x-2"
                  style={{ gridTemplateColumns: "minmax(0, 1fr) auto auto", fontWeight: drawn ? 700 : undefined }}
                  title={pieceTitle(c.pieceId, lang)}
                >
                  {/* An ID and one short word, so the nine rows fit: the full title is the row's hint. */}
                  <span style={{ overflowWrap: "anywhere" }}>
                    {c.pieceId} · {pieceObject(c.pieceId, lang)}
                  </span>
                  <ScoreBar value={c.weight} tone={drawn ? "jade" : "neutral"} width={48} />
                  <span className="whitespace-nowrap">{drawn ? <Tag tone="jade">{t(SEARCH.drawn, lang)}</Tag> : null}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

export default SearchProcess;
