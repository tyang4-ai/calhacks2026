// The data view (T7), process-pane-data: the platform's one database (fix-plan 1.4, pillar 3).
// - process-data-tables lists the eight SpacetimeDB tables (process-data-table-<table>), each with
//   its row count and its newest rows, in the kit's LedgerTable;
// - process-data-index: cindia-pieces and cindia-drafts with their counts, and the newest
//   listing.indexed with its pieceId and modelId;
// - process-data-model: the model ID, then trained (with dims) or "Not trained yet", and what the model does.
// Each group reads live values only while its own key is live (tables b13-live, index b12-search,
// model b11-embed), and shows the kit's Live badge then. The view's own badge is the host's.
import { useCallback } from "react";
import type { ProcessId } from "../../core/events";
import type { CindiaState } from "../../core/state";
import { useCindia } from "../../core/store";
import type { Lang } from "../../core/types";
import { Badge, LedgerTable } from "../../ui";
import { dataTables, indexGroup, modelGroup, rowText } from "./dataRows";
import { processStatus, usePlaying } from "./processes";
import { Quiet, SectionHead, Tag } from "./parts";
import { DATA, TABLE_LABELS, t } from "./strings";

function dataView(s: CindiaState, playing: boolean) {
  const tables = dataTables(s, (id: ProcessId) => processStatus(s, id, playing));
  return { ...tables, index: indexGroup(s), model: modelGroup(s) };
}

const box = { border: "1px solid var(--c-color-line)", borderRadius: "var(--c-radius-panel)" };

export function DataProcess({ lang }: { lang: Lang }) {
  const playing = usePlaying();
  const v = useCindia(useCallback((s: CindiaState) => dataView(s, playing), [playing]));
  return (
    <div data-testid="process-pane-data" className="flex flex-wrap gap-6">
      <section data-testid="process-data-tables" data-live={v.live} className="min-w-0" style={{ flex: "3 1 600px" }}>
        <SectionHead
          title={DATA.database}
          lang={lang}
          right={
            <span className="flex items-center gap-2">
              <Quiet>{t(DATA.databaseNote, lang)}</Quiet>
              {v.live && <Badge variant="live" />}
            </span>
          }
        />
        {/* Eight rows and a header fit the overlay in Chinese too, at 6 px of cell padding instead of 8. */}
        <div className="[&_td]:!py-1.5 [&_th]:!py-1.5">
        <LedgerTable
          columns={[
            { key: "table", label: t(DATA.tableCol, lang) },
            { key: "rows", label: t(DATA.rowsCol, lang), numeric: true },
            { key: "newest", label: t(DATA.newestCol, lang) },
          ]}
          rows={v.tables.map((row) => ({
            id: row.table,
            testId: `process-data-table-${row.table}`,
            cells: {
              table: (
                <span className="whitespace-nowrap" title={t(TABLE_LABELS[row.table], lang)}>
                  <span className="font-semibold">{row.table}</span>
                  {lang === "zh" && <Quiet className="ml-1.5">{t(TABLE_LABELS[row.table], lang)}</Quiet>}
                </span>
              ),
              rows: (
                <span data-role="rows" data-rows={row.rows} className="font-semibold">
                  {row.rows}
                </span>
              ),
              newest: (
                // At most three, newest first. Chips wrap to a second line rather than being cut.
                <span className="flex flex-wrap gap-1.5" data-role="newest">
                  {row.newest.length === 0 ? (
                    <Quiet>{t(DATA.none, lang)}</Quiet>
                  ) : (
                    row.newest.map((r, i) => (
                      <span
                        key={`${r.id}-${i}`}
                        data-row-id={r.id || undefined}
                        className="inline-block px-1.5"
                        style={{
                          maxWidth: "100%",
                          overflowWrap: "anywhere",
                          border: "1px solid var(--c-color-line)",
                          borderRadius: "var(--c-radius-panel)",
                          color: i === 0 ? "var(--c-color-ink)" : "var(--c-color-ink-soft)",
                          lineHeight: "20px",
                        }}
                      >
                        {rowText(r, lang)}
                      </span>
                    ))
                  )}
                </span>
              ),
            },
          }))}
        />
        </div>
        {!v.live && (
          <p className="mt-1">
            <Quiet>{t(DATA.scriptedNote, lang)}</Quiet>
          </p>
        )}
      </section>

      <div className="flex min-w-0 flex-col gap-3" style={{ flex: "2 1 300px" }}>
        <section data-testid="process-data-index" data-live={v.index.live} className="flex flex-col gap-1.5 px-4 py-2.5" style={box}>
          <SectionHead title={DATA.elastic} lang={lang} right={v.index.live ? <Badge variant="live" /> : undefined} />
          <div data-index="cindia-pieces" data-docs={v.index.pieces} className="flex flex-col">
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">cindia-pieces</span>
              <span className="tabular-nums">
                <span data-role="docs" className="font-semibold">
                  {v.index.pieces}
                </span>{" "}
                {t(DATA.docs, lang)}
              </span>
            </span>
            <Quiet>{t(DATA.piecesNote, lang)}</Quiet>
          </div>
          <div
            data-index="cindia-drafts"
            data-docs={v.index.drafts}
            className="flex flex-col px-2 py-1"
            style={{ background: v.index.drafts > 0 ? "var(--c-color-jade-wash)" : undefined, borderRadius: "var(--c-radius-panel)" }}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">cindia-drafts</span>
              <span className="tabular-nums">
                <span data-role="docs" className="font-semibold">
                  {v.index.drafts}
                </span>{" "}
                {t(DATA.docs, lang)}
              </span>
            </span>
            <Quiet>{t(DATA.draftsNote, lang)}</Quiet>
          </div>
          {v.index.newest && (
            <p data-role="newest-indexed" data-piece-id={v.index.newest.pieceId} data-model-id={v.index.newest.modelId} className="flex flex-wrap items-center gap-2">
              <Quiet>{t(DATA.newest, lang)}:</Quiet>
              <Tag>{v.index.newest.pieceId}</Tag>
              <Quiet>
                {v.index.newest.listingId} → {v.index.newest.index} · {t(DATA.embedded, lang)}
              </Quiet>
              <Tag tone="soft">{v.index.newest.modelId}</Tag>
            </p>
          )}
        </section>

        <section data-testid="process-data-model" data-live={v.model.live} data-trained={v.model.trained} className="flex flex-col gap-1.5 px-4 py-2.5" style={box}>
          <SectionHead
            title={{ en: v.model.modelId, zh: v.model.modelId }}
            lang={lang}
            right={
              <span className="flex items-center gap-2">
                <span className="font-semibold" style={{ color: v.model.trained ? "var(--c-color-jade)" : "var(--c-color-amber)" }}>
                  {v.model.trained ? `${t(DATA.trained, lang)} · ${v.model.dims} ${t(DATA.dims, lang)}` : t(DATA.notTrained, lang)}
                </span>
                {v.model.live && <Badge variant="live" />}
              </span>
            }
          />
          <Quiet>{t(DATA.modelNote, lang)}</Quiet>
        </section>
      </div>
    </div>
  );
}

export default DataProcess;
