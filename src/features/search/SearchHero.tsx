// The top of Shop home (T1): "Describe a feeling", the kit SearchBar with search-input,
// search-submit and the chips (search-chip-<n>), the kit's Rule-based badge beside the chips, the
// four example vibes and the waiting line.
// - As the person types, the chips are a preview from extractKeywords(): code picks them, no model.
// - When a query lands in the store (the tour's d01-vibe, or the person's own), the box shows its
//   text as if typed and the chips show the payload's keywords, until the person types again.
// - Submit emits search.queried (requests.ts) and goes to the results route with q and k.
import { useMemo, useState } from "react";
import { searchRoute, navigate } from "../../core/nav";
import { useCindia } from "../../core/store";
import { extractKeywords } from "../../sources";
import { Badge, Button, SearchBar } from "../../ui";
import { emitQuery } from "./requests";
import { EXAMPLES, HERO, t, type Lang } from "./strings";

export interface SearchHeroProps {
  lang: Lang;
}

/** The latest query's ID, text and keywords, and whether it has an answer yet. */
function useLatestQuery() {
  return useCindia((s) => {
    const id = s.search.latestQueryId;
    const q = id ? s.search.queries[id] : undefined;
    if (!id || !q) return null;
    return { id, text: q.text, keywords: q.keywords, answered: Boolean(s.search.answers[id]) };
  });
}

export function SearchHero({ lang }: SearchHeroProps) {
  const latest = useLatestQuery();
  const [text, setText] = useState("");
  /** The latest query's keywords while its text is in the box; null means the chips are a preview. */
  const [queryChips, setQueryChips] = useState<string[] | null>(null);

  // A query that lands in the store fills the box as if typed, with its own chips. When the store
  // drops it (a reset or a seek before it), the box empties too, so a seek always shows the same.
  // The state follows the store during render (React's "adjust state when a value changes").
  const latestKey = latest ? JSON.stringify([latest.id, latest.text, latest.keywords]) : null;
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  if (syncedKey !== latestKey) {
    setSyncedKey(latestKey);
    setText(latest ? latest.text : "");
    setQueryChips(latest ? [...latest.keywords] : null);
  }

  const preview = useMemo(() => (text.trim() ? extractKeywords(text) : { keywords: [], filters: {} }), [text]);
  const chips = queryChips ?? preview.keywords;

  function onChange(value: string) {
    setText(value);
    setQueryChips(null);
  }

  function submit(value: string) {
    const words = value.trim();
    if (!words) return;
    const keywords = queryChips ?? extractKeywords(words).keywords;
    const filters = extractKeywords(words).filters;
    emitQuery({ text: words, keywords, lang, filters });
    navigate(searchRoute({ q: words, k: keywords }));
  }

  const working = latest !== null && !latest.answered;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-12)", minWidth: 0 }} lang={lang}>
      <h1
        style={{
          margin: 0,
          fontFamily: lang === "zh" ? "var(--c-font-heading-zh)" : "var(--c-font-heading-en)",
          fontSize: "var(--c-text-36)",
          fontWeight: 700,
          lineHeight: "var(--c-leading-heading)",
          color: "var(--c-color-ink)",
        }}
      >
        {t(HERO.title, lang)}
      </h1>
      <p style={{ margin: 0, fontSize: "var(--c-text-16)", color: "var(--c-color-ink-soft)" }}>{t(HERO.sub, lang)}</p>
      <SearchBar
        testIds={{ input: "search-input", submit: "search-submit", chipPrefix: "search-chip-" }}
        value={text}
        onChange={onChange}
        chips={chips}
        onSubmit={submit}
        placeholder={HERO.placeholder}
        lang={lang}
        chipsAside={chips.length > 0 ? <Badge variant="rule" title={t(HERO.chipsNote, lang)} /> : undefined}
      />
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--c-space-8)" }}>
        <span style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>{t(HERO.examplesLabel, lang)}</span>
        {EXAMPLES.map((ex, i) => (
          <Button key={ex.text} variant="quiet" size="small" testId={`search-example-${i + 1}`} onClick={() => onChange(ex.text)}>
            {t(ex.label, lang)}
          </Button>
        ))}
      </div>
      {working && (
        <p data-testid="search-working" role="status" style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-amber)" }}>
          {t(HERO.working, lang)}
        </p>
      )}
    </section>
  );
}
