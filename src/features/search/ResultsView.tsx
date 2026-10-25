// The results page (shop.search.main, T7, D1-7): the search bar with its editable chips and the
// filters above the grid, the engine line at the top of the grid, and Surprise me in a column on
// the right, in one kit Panel that declares b12-search and b11-embed. Everything the tour's
// d01-vibe and d02-surprise put on screen sits inside the 1440 by 900 frame; the grid scrolls in
// its own column.
import type { SourceKey } from "../../core/events";
import type { SlotProps } from "../../core/featureTypes";
import { Panel } from "../../ui";
import { Filters } from "./Filters";
import { RefineBar } from "./RefineBar";
import { EngineLine, ResultsGrid } from "./ResultsGrid";
import { GLOSSARY, t } from "./strings";
import { SurpriseButton } from "./SurpriseButton";

const SOURCE_KEYS: SourceKey[] = ["b12-search", "b11-embed"];

export function ResultsView({ lang, searchParams }: SlotProps) {
  return (
    <Panel
      sourceKeys={SOURCE_KEYS}
      title={t(GLOSSARY.vibeSearch, lang)}
      lang={lang}
      className="[&>div]:flex [&>div]:flex-col"
      style={{ flex: "1 1 auto", minHeight: 0, boxSizing: "border-box" }}
    >
      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          gap: "var(--c-space-24)",
        }}
      >
        <div style={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", gap: "var(--c-space-12)" }}>
          <RefineBar lang={lang} />
          <Filters lang={lang} />
          <EngineLine lang={lang} />
          <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
            <ResultsGrid lang={lang} searchParams={searchParams} />
          </div>
        </div>
        <section
          style={{
            minWidth: 0,
            minHeight: 0,
            overflowY: "auto",
            borderLeft: "1px solid var(--c-color-line)",
            paddingLeft: "var(--c-space-24)",
          }}
        >
          <SurpriseButton lang={lang} intro={false} />
        </section>
      </div>
    </Panel>
  );
}

export default ResultsView;
