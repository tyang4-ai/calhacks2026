// M-maker-statement T4: the maker's page, main column (maker.main, the left two thirds beside
// seller-hub's maker.side), in the slot's language. One kit Panel that declares b10-derived holds
// the maker's header, then maker-statement-empty until statement.issued arrives for this maker, then
// the lines and the held note. Every figure renders from the statement.issued payload, never from
// mst_01 (a live B10 recomputes it).
//
// The page is laid out for 1440 by 900. Until I2-tour, the Phase A stage also shows maker.main in
// v1's 390 by 844 phone column, so the view measures its own width and stacks when it's that narrow.
import { useLayoutEffect, useRef, useState } from "react";
import type { SlotProps } from "../../core/featureTypes";
import { useCindia } from "../../core/store";
import { Panel } from "../../ui";
import { HeldNote } from "./HeldNote";
import { StatementHeader } from "./StatementHeader";
import { StatementLines } from "./StatementLines";
import { GLOSSARY, UI, t } from "./strings";

const SOURCE_KEYS = ["b10-derived"] as const;
const DEFAULT_MAKER = "mkr_01";

/** Narrower than this is v1's phone column, not the desktop page's main column (880 px). */
const COMPACT_BELOW_PX = 600;
/** In the phone column: the panel's border, mat and padding, the cells' padding and the amount. */
const COMPACT_TITLE_ALLOWANCE_PX = 190;

/** The root's width in its own pixels (client sizes ignore the stage's scale). */
function useOwnWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setWidth(el.clientWidth);
    fit();
    if (typeof ResizeObserver !== "function") return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

export function MakerStatementView({ lang, makerId }: SlotProps) {
  const maker = makerId ?? DEFAULT_MAKER;
  const statement = useCindia((s) => {
    const id = s.close.statementByMaker[maker];
    return id ? s.close.statements[id] : undefined;
  });
  const { ref, width } = useOwnWidth();
  const compact = width !== null && width < COMPACT_BELOW_PX;
  const titleMaxPx = width !== null ? Math.max(120, width - COMPACT_TITLE_ALLOWANCE_PX) : undefined;

  return (
    <div
      ref={ref}
      lang={lang}
      style={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        fontFamily: lang === "zh" ? "var(--c-font-body-zh)" : "var(--c-font-body)",
        lineHeight: lang === "zh" ? "var(--c-leading-body-zh)" : "var(--c-leading-body)",
      }}
    >
      <Panel
        sourceKeys={[...SOURCE_KEYS]}
        density={compact ? "phone" : "console"}
        lang={lang}
        className="[&>div]:flex [&>div]:flex-col"
        style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: compact ? "var(--c-space-16)" : "var(--c-space-24)",
          }}
        >
          <StatementHeader makerId={maker} lang={lang} statement={statement} compact={compact} />
          {statement ? (
            <>
              <StatementLines lang={lang} lines={statement.lines} compact={compact} titleMaxPx={titleMaxPx} />
              <HeldNote lang={lang} heldCents={statement.heldCents} compact={compact} />
            </>
          ) : (
            <div data-testid="maker-statement-empty">
              <p style={{ margin: 0, fontSize: "var(--c-text-18)", fontWeight: 600 }}>{t(GLOSSARY.noSalesYet, lang)}</p>
              <p style={{ margin: "var(--c-space-8) 0 0", color: "var(--c-color-ink-soft)", fontSize: "var(--c-text-16)" }}>
                {t(UI.emptyHint, lang)}
              </p>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
