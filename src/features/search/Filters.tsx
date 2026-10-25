// The results page's filters (T3): a max price (search-filter-price) and one toggle per community
// (search-filter-community-<communityId>), the communities in their data order with each one's kind
// as a word. Every change emits a new search.queried with the latest query's text and keywords and
// the edited filters (requests.ts).
import type { SearchFilters } from "../../core/events";
import { useCindia } from "../../core/store";
import { communities } from "../../mock";
import { Chip, COMMUNITY_KIND_WORDS, formatCents } from "../../ui";
import { emitQuery } from "./requests";
import { REFINE, t, tf, type Lang } from "./strings";

export interface FiltersProps {
  lang: Lang;
}

/** The price caps on offer, in cents. A query's own cap, when it isn't one of these, is added. */
const PRICE_CAPS = [5000, 10000, 20000, 50000, 100000];

export function Filters({ lang }: FiltersProps) {
  const latest = useCindia((s) => {
    const id = s.search.latestQueryId;
    const q = id ? s.search.queries[id] : undefined;
    return id && q ? { text: q.text, keywords: q.keywords, filters: q.filters } : null;
  });
  const filters: SearchFilters = latest?.filters ?? {};
  const cap = filters.maxPriceCents;
  const caps = cap !== undefined && !PRICE_CAPS.includes(cap) ? [...PRICE_CAPS, cap].toSorted((a, b) => a - b) : PRICE_CAPS;
  const picked = new Set(filters.communityIds ?? []);
  const disabled = latest === null;

  function send(next: SearchFilters) {
    if (!latest) return;
    emitQuery({ text: latest.text, keywords: latest.keywords, lang, filters: next });
  }

  function onPrice(value: string) {
    const cents = value === "" ? undefined : Number(value);
    send({ ...(filters.communityIds ? { communityIds: filters.communityIds } : {}), ...(cents ? { maxPriceCents: cents } : {}) });
  }

  function onCommunity(id: string) {
    const ids = communities.map((c) => c.id).filter((c) => (c === id ? !picked.has(c) : picked.has(c)));
    send({ ...(cap !== undefined ? { maxPriceCents: cap } : {}), ...(ids.length > 0 ? { communityIds: ids } : {}) });
  }

  const labelStyle = { fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" } as const;

  return (
    <section
      aria-label={t(REFINE.filters, lang)}
      style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--c-space-8) var(--c-space-16)" }}
      lang={lang}
    >
      <label style={{ display: "flex", alignItems: "center", gap: "var(--c-space-8)" }}>
        <span style={labelStyle}>{t(REFINE.maxPrice, lang)}</span>
        <select
          data-testid="search-filter-price"
          value={cap !== undefined ? String(cap) : ""}
          disabled={disabled}
          onChange={(e) => onPrice(e.target.value)}
          style={{
            font: "inherit",
            fontSize: "var(--c-text-14)",
            minHeight: 32,
            padding: "0 var(--c-space-8)",
            border: "1px solid var(--c-color-line)",
            borderRadius: "var(--c-radius-control)",
            background: "var(--c-color-paper)",
            color: "var(--c-color-ink)",
          }}
        >
          <option value="">{t(REFINE.anyPrice, lang)}</option>
          {caps.map((c) => (
            <option key={c} value={String(c)}>
              {tf(REFINE.upTo, lang, { price: formatCents(c) })}
            </option>
          ))}
        </select>
      </label>
      <div role="group" aria-label={t(REFINE.communities, lang)} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--c-space-8)" }}>
        <span style={labelStyle}>
          {t(REFINE.communities, lang)} · {t(COMMUNITY_KIND_WORDS.native_american, lang)}
        </span>
        {communities.map((c) => (
          <Chip
            key={c.id}
            testId={`search-filter-community-${c.id}`}
            label={c.people}
            lang={lang}
            selected={picked.has(c.id)}
            onClick={disabled ? undefined : () => onCommunity(c.id)}
          />
        ))}
      </div>
    </section>
  );
}
