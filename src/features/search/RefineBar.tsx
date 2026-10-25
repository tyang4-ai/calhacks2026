// The results page's search bar (T3, D1-7): the kit SearchBar with search-input holding the latest
// query's text, search-submit, and the latest query's keywords as its chips (search-chip-<n>), each
// removable (search-chip-remove-<n>), plus search-chip-add. These are the only chips on the results
// page. Every change emits a new search.queried with a new queryId (requests.ts): a removed or added
// chip keeps the text and filters, and a new text sent with search-submit gets its own chips.
// The scripted answer to an edited query comes from the keyword scorer (I2-core T5, B1-14).
import { useState } from "react";
import { navigate, searchRoute } from "../../core/nav";
import { useCindia } from "../../core/store";
import { extractKeywords } from "../../sources";
import { Badge, SearchBar } from "../../ui";
import { emitQuery } from "./requests";
import { HERO, REFINE, t, type Lang } from "./strings";

export interface RefineBarProps {
  lang: Lang;
}

export function RefineBar({ lang }: RefineBarProps) {
  const latest = useCindia((s) => {
    const id = s.search.latestQueryId;
    const q = id ? s.search.queries[id] : undefined;
    return id && q ? { id, text: q.text, keywords: q.keywords, filters: q.filters } : null;
  });
  const [text, setText] = useState(latest?.text ?? "");

  // A new latest query (the person's, or the tour's) puts its text in the box, during render.
  const latestKey = latest ? JSON.stringify([latest.id, latest.text]) : null;
  const [syncedKey, setSyncedKey] = useState<string | null>(latestKey);
  if (syncedKey !== latestKey) {
    setSyncedKey(latestKey);
    setText(latest?.text ?? "");
  }

  const chips = latest?.keywords ?? [];

  function onChipsChange(next: string[]) {
    if (!latest) return;
    emitQuery({ text: latest.text, keywords: next, lang, filters: latest.filters });
  }

  function onSubmit(value: string) {
    const words = value.trim();
    if (!words) return;
    if (latest && words === latest.text.trim()) {
      emitQuery({ text: latest.text, keywords: latest.keywords, lang, filters: latest.filters });
      return;
    }
    const extracted = extractKeywords(words);
    const filters = {
      ...(latest?.filters?.communityIds ? { communityIds: latest.filters.communityIds } : {}),
      ...(extracted.filters.maxPriceCents !== undefined
        ? { maxPriceCents: extracted.filters.maxPriceCents }
        : latest?.filters?.maxPriceCents !== undefined
          ? { maxPriceCents: latest.filters.maxPriceCents }
          : {}),
    };
    emitQuery({ text: words, keywords: extracted.keywords, lang, filters });
    navigate(searchRoute({ q: words, k: extracted.keywords }));
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-8)", minWidth: 0 }} lang={lang}>
      <SearchBar
        testIds={{ input: "search-input", submit: "search-submit", chipPrefix: "search-chip-", add: "search-chip-add" }}
        value={text}
        onChange={setText}
        chips={chips}
        onChipsChange={latest ? onChipsChange : undefined}
        onSubmit={onSubmit}
        placeholder={HERO.placeholder}
        addPlaceholder={REFINE.addKeyword}
        lang={lang}
        chipsAside={chips.length > 0 ? <Badge variant="rule" title={t(HERO.chipsNote, lang)} /> : undefined}
      />
    </section>
  );
}
