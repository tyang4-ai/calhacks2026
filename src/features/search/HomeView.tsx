// Shop home (shop.home.main, T7): the hero and Surprise me side by side, then the featured grid,
// in one kit Panel that declares b12-search and b11-embed, so it shows the Simulated badge while
// either is scripted. The panel scrolls inside its slot, so the hero always sits at the top.
import type { SourceKey } from "../../core/events";
import type { SlotProps } from "../../core/featureTypes";
import { Panel } from "../../ui";
import { Featured } from "./Featured";
import { SearchHero } from "./SearchHero";
import { GLOSSARY, t } from "./strings";
import { SurpriseButton } from "./SurpriseButton";

const SOURCE_KEYS: SourceKey[] = ["b12-search", "b11-embed"];

export function HomeView({ lang }: SlotProps) {
  return (
    <Panel
      sourceKeys={SOURCE_KEYS}
      title={t(GLOSSARY.vibeSearch, lang)}
      lang={lang}
      className="[&>div]:flex [&>div]:flex-col"
      style={{ flex: "1 1 auto", minHeight: 0, boxSizing: "border-box" }}
    >
      <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--c-space-32)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
            gap: "var(--c-space-32)",
            alignItems: "start",
          }}
        >
          <SearchHero lang={lang} />
          <section
            style={{
              borderLeft: "1px solid var(--c-color-line)",
              paddingLeft: "var(--c-space-24)",
              minWidth: 0,
            }}
          >
            <SurpriseButton lang={lang} />
          </section>
        </div>
        <Featured lang={lang} />
      </div>
    </Panel>
  );
}

export default HomeView;
