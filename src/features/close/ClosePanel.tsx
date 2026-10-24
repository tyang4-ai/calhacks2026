// The month close: totals from month.closed, the Excel workbook card from workbook.ready, the
// download, and a preview of the Profit and loss sheet. The preview shows once workbook.ready has
// arrived, because it previews the file. Nothing is fetched: with a `url` the download is a plain
// link, otherwise the file is built and saved in the browser.
import { writeFile } from "xlsx";
import type { SlotProps } from "../../core/featureTypes";
import { useCindia } from "../../core/store";
import { Button, LedgerTable, Money, Panel, formatMonth, type LedgerColumn, type LedgerRow } from "../../ui";
import { buildWorkbook, profitAndLossLines } from "./buildWorkbook";
import { CloseTotals } from "./CloseTotals";
import { GLOSSARY, PNL_LABELS, UI, t } from "./strings";
import { WorkbookCard } from "./WorkbookCard";

export function ClosePanel({ lang }: SlotProps) {
  const closed = useCindia((s) => s.month.closed);
  const workbook = useCindia((s) => s.close.workbook);
  const monthId = closed?.monthId ?? workbook?.monthId ?? null;
  const title = monthId ? `${t(UI.panelTitle, lang)} · ${formatMonth(monthId, lang)}` : t(UI.panelTitle, lang);

  const download = () => {
    if (!workbook) return;
    writeFile(buildWorkbook(workbook.sheets), workbook.fileName);
  };

  const columns: LedgerColumn[] = [
    { key: "line", label: t(UI.previewLine, lang) },
    { key: "amount", label: t(UI.previewAmount, lang), numeric: true },
  ];
  const rows: LedgerRow[] = workbook
    ? profitAndLossLines().map((l) => ({
        id: l.key,
        cells: {
          line: l.total ? <strong>{t(PNL_LABELS[l.key], lang)}</strong> : t(PNL_LABELS[l.key], lang),
          amount: <Money cents={l.cents} style={l.total ? { fontWeight: 600 } : undefined} />,
        },
      }))
    : [];

  return (
    <Panel title={title} sourceKeys={["b06-workbook"]} lang={lang}>
      <CloseTotals closed={closed} lang={lang} />

      <section style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: "1rem" }}>{t(GLOSSARY.workbook, lang)}</h3>
        {workbook ? (
          <WorkbookCard workbook={workbook} lang={lang} />
        ) : (
          <p style={{ color: "var(--c-color-ink-soft)", margin: "0 0 12px" }}>{t(UI.downloadNotReady, lang)}</p>
        )}
        {workbook?.url ? (
          <a className="c-button c-button--primary" data-testid="close-download" href={workbook.url} download={workbook.fileName}>
            {t(UI.download, lang)}
          </a>
        ) : (
          <Button testId="close-download" disabled={!workbook} onClick={download}>
            {t(UI.download, lang)}
          </Button>
        )}
      </section>

      {workbook && <LedgerTable testId="close-preview" caption={t(UI.previewTitle, lang)} columns={columns} rows={rows} />}
    </Panel>
  );
}
