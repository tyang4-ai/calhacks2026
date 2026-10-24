// The maker's phone: this month's income, in her language. Empty until statement.issued arrives for
// this maker, then the header, the lines and the held note inside one Panel that declares b10-derived.
// Every figure renders from the statement.issued payload, never from mst_01 (a live B10 recomputes it).
import type { SlotProps } from "../../core/featureTypes";
import { useCindia } from "../../core/store";
import { Panel } from "../../ui";
import { HeldNote } from "./HeldNote";
import { StatementHeader } from "./StatementHeader";
import { StatementLines } from "./StatementLines";
import { GLOSSARY, UI, t } from "./strings";

const SOURCE_KEYS = ["b10-derived"] as const;
const DEFAULT_MAKER = "mkr_01";

export function MakerStatementView({ lang, makerId }: SlotProps) {
  const maker = makerId ?? DEFAULT_MAKER;
  const statement = useCindia((s) => {
    const id = s.close.statementByMaker[maker];
    return id ? s.close.statements[id] : undefined;
  });

  return (
    <div
      lang={lang}
      style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", lineHeight: lang === "zh" ? 1.7 : 1.5 }}
    >
      <Panel
        sourceKeys={[...SOURCE_KEYS]}
        density="phone"
        lang={lang}
        style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      >
        <div
          style={{
            overflowY: "auto",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--c-space-16)",
            paddingBottom: "var(--c-space-16)",
          }}
        >
          {statement ? (
            <>
              <StatementHeader makerId={maker} lang={lang} statement={statement} />
              <StatementLines lang={lang} lines={statement.lines} />
              <HeldNote lang={lang} heldCents={statement.heldCents} />
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
