// F-proof T3: the real or simulated list. One row per source key, in the order events.md lists
// them, with what that part of the system is and whether its events are live or scripted right
// now. The state reads from the store's `sources`, so a row turns real the moment a live event
// with its key arrives. The state is a word in a badge with its own outline, never color alone.
import { SOURCE_KEYS, type SourceKey } from "../../core/events";
import { useCindia } from "../../core/store";
import { Badge } from "../../ui";
import { SOURCE_LABELS, UI, t, type Lang } from "./strings";

function SourceRow({ sourceKey, lang }: { sourceKey: SourceKey; lang: Lang }) {
  const state = useCindia((s) => s.sources[sourceKey]);
  const live = state === "live";
  return (
    <li
      data-testid={`proof-source-${sourceKey}`}
      data-source-state={live ? "live" : "scripted"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--c-space-12)",
        padding: "var(--c-space-8) 0",
        borderBottom: "1px solid var(--c-color-line)",
        breakInside: "avoid",
      }}
    >
      <span style={{ minWidth: 0 }}>{t(SOURCE_LABELS[sourceKey], lang)}</span>
      <Badge variant={live ? "jade" : "neutral"} title={sourceKey}>
        {live ? "● " : "○ "}
        {t(live ? UI.real : UI.simulated, lang)}
      </Badge>
    </li>
  );
}

export function SourceList({ lang }: { lang: Lang }) {
  return (
    <section data-testid="proof-sources" lang={lang} style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}>
      <h3 style={{ margin: 0, fontSize: "var(--c-text-18)" }}>{t(UI.sourcesTitle, lang)}</h3>
      <p style={{ margin: 0, color: "var(--c-color-ink-soft)", fontSize: "var(--c-text-14)" }}>{t(UI.sourcesHint, lang)}</p>
      {/* Two columns of parts on the desktop view, each with its own Part and State heading. */}
      <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", columnGap: "var(--c-space-24)" }}>
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "var(--c-text-14)",
              color: "var(--c-color-ink-soft)",
              borderBottom: "1px solid var(--c-color-line)",
              paddingBottom: "var(--c-space-4)",
            }}
          >
            <span>{t(UI.part, lang)}</span>
            <span>{t(UI.state, lang)}</span>
          </div>
        ))}
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, columns: 2, columnGap: "var(--c-space-24)" }}>
        {SOURCE_KEYS.map((key) => (
          <SourceRow key={key} sourceKey={key} lang={lang} />
        ))}
      </ul>
    </section>
  );
}

export default SourceList;
