// The Surprise me block (T4), on home and on the results page: the mode picker
// (search-surprise-mode: keyword, pure random, fair random, fair random first), the keyword box in
// keyword mode (search-surprise-keyword, starting with the latest query's first chip), the button
// (search-surprise), then the drawn piece (SurpriseResult) and the rule line (SurpriseRule).
// Pressing it emits surprise.asked with the next srp_user_ ID and the seed rule (requests.ts):
// nothing reads the wall clock, and every press gives a new draw.
import { useId, useState } from "react";
import type { SurpriseMethod } from "../../core/events";
import { useCindia } from "../../core/store";
import { isPriceChip } from "../../sources";
import { Button } from "../../ui";
import { emitSurprise } from "./requests";
import { SURPRISE, SURPRISE_METHODS, t, type Lang } from "./strings";
import { SurpriseResult, SurpriseRule } from "./SurpriseResult";

export interface SurpriseButtonProps {
  lang: Lang;
  /** The one-line intro under the title. The results page's narrow column leaves it out. Default true. */
  intro?: boolean;
}

const METHODS: SurpriseMethod[] = ["keyword_random", "pure_random", "fair_random"];

export function SurpriseButton({ lang, intro = true }: SurpriseButtonProps) {
  const groupName = useId();
  const [method, setMethod] = useState<SurpriseMethod>("fair_random");
  /** What the person typed in the keyword box; null until they type, so it follows the latest query. */
  const [typed, setTyped] = useState<string | null>(null);
  const firstChip = useCindia((s) => {
    const id = s.search.latestQueryId;
    const words = id ? (s.search.queries[id]?.keywords ?? []) : [];
    return words.find((w) => !isPriceChip(w)) ?? "";
  });
  const keyword = typed ?? firstChip;

  function press() {
    emitSurprise({ method, keyword: method === "keyword_random" ? keyword : undefined });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-12)", minWidth: 0 }} lang={lang}>
      <h2
        style={{
          margin: 0,
          fontFamily: lang === "zh" ? "var(--c-font-heading-zh)" : "var(--c-font-heading-en)",
          fontSize: "var(--c-text-21)",
          fontWeight: 600,
          lineHeight: "var(--c-leading-heading)",
        }}
      >
        {t(SURPRISE.title, lang)}
      </h2>
      {intro && <p style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>{t(SURPRISE.intro, lang)}</p>}
      <div
        data-testid="search-surprise-mode"
        role="radiogroup"
        aria-label={t(SURPRISE.title, lang)}
        style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", border: "1px solid var(--c-color-line)", borderRadius: "var(--c-radius-control)" }}
      >
        {METHODS.map((m, i) => {
          const on = m === method;
          return (
            <label
              key={m}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 36,
                padding: "0 2px",
                whiteSpace: "nowrap",
                textAlign: "center",
                fontSize: "var(--c-text-14)",
                fontWeight: on ? 600 : 400,
                background: on ? "var(--c-color-mat)" : "var(--c-color-paper)",
                color: "var(--c-color-ink)",
                borderLeft: i > 0 ? "1px solid var(--c-color-line)" : undefined,
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name={groupName}
                value={m}
                checked={on}
                onChange={() => setMethod(m)}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", margin: 0, opacity: 0, cursor: "pointer" }}
              />
              {t(SURPRISE_METHODS[m], lang)}
            </label>
          );
        })}
      </div>
      {method === "keyword_random" && (
        <input
          data-testid="search-surprise-keyword"
          type="text"
          value={keyword}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={t(SURPRISE.keywordPlaceholder, lang)}
          aria-label={t(SURPRISE.keywordPlaceholder, lang)}
          autoComplete="off"
          style={{
            font: "inherit",
            fontSize: "var(--c-text-14)",
            minHeight: 36,
            padding: "0 var(--c-space-12)",
            border: "1px solid var(--c-color-line)",
            borderRadius: "var(--c-radius-control)",
            background: "var(--c-color-paper)",
            color: "var(--c-color-ink)",
          }}
        />
      )}
      <Button testId="search-surprise" variant="primary" onClick={press}>
        {t(SURPRISE.button, lang)}
      </Button>
      <SurpriseResult lang={lang} />
      <SurpriseRule lang={lang} picked={method} />
    </div>
  );
}
