// The close view (T5), process-pane-close: process-close-chain runs ledger posted, month closed (with
// its totals), workbook ready, statements issued, and the receipt paid to the maker, each lit when
// its event is in the store.
import { useCallback, type ReactNode } from "react";
import type { CindiaState } from "../../core/state";
import { useCindia } from "../../core/store";
import type { Lang, Text } from "../../core/types";
import { formatDate, Money } from "../../ui";
import { Empty, Quiet, Tag } from "./parts";
import { personName } from "./readers";
import { BOOKS, EMPTY, GLOSSARY, t } from "./strings";

function closeView(s: CindiaState) {
  const statements = Object.values(s.close.statements);
  const paid = Object.values(s.buyer.receipts).filter((r) => r.status === "paid_to_maker");
  return {
    entries: s.month.ledgerEntryIds.length,
    closed: s.month.closed,
    workbook: s.close.workbook,
    statements,
    paid,
  };
}

function Link({ step, title, lit, lang, children, last = false }: { step: string; title: Text; lit: boolean; lang: Lang; children?: ReactNode; last?: boolean }) {
  return (
    <li data-step={step} data-lit={lit} className="grid gap-3" style={{ gridTemplateColumns: "28px minmax(0, 1fr)" }}>
      <div className="flex flex-col items-center">
        <span
          aria-hidden="true"
          className="flex items-center justify-center"
          style={{
            width: 22,
            height: 22,
            borderRadius: "var(--c-radius-chip)",
            border: `2px solid ${lit ? "var(--c-color-jade)" : "var(--c-color-line)"}`,
            background: lit ? "var(--c-color-jade)" : "var(--c-color-paper)",
            color: "var(--c-color-paper)",
            fontSize: "var(--c-text-14)",
          }}
        >
          {lit ? "✓" : ""}
        </span>
        {!last && <span aria-hidden="true" className="flex-1" style={{ width: 2, minHeight: 18, background: lit ? "var(--c-color-jade)" : "var(--c-color-line)" }} />}
      </div>
      <div className="flex min-w-0 flex-col gap-1 pb-3">
        <span className="font-semibold">{t(title, lang)}</span>
        {lit ? children : <Quiet>{t(BOOKS.waiting, lang)}</Quiet>}
      </div>
    </li>
  );
}

export function CloseProcess({ lang }: { lang: Lang }) {
  const v = useCindia(useCallback((s: CindiaState) => closeView(s), []));
  return (
    <div data-testid="process-pane-close">
      {v.entries === 0 && !v.closed && !v.workbook && v.statements.length === 0 && v.paid.length === 0 && <Empty text={EMPTY.close} lang={lang} />}
      <ol data-testid="process-close-chain" className="m-0 flex list-none flex-col p-0">
        <Link step="ledger" title={GLOSSARY.ledger} lit={v.entries > 0} lang={lang}>
          <Quiet>
            {v.entries} {t(BOOKS.entries, lang)}
          </Quiet>
        </Link>
        <Link step="month" title={GLOSSARY.close} lit={v.closed !== null} lang={lang}>
          {v.closed && (
            <span className="flex flex-wrap items-baseline gap-x-5 gap-y-1" data-role="totals">
              <Tag tone="soft">{v.closed.monthId}</Tag>
              <span>
                <Quiet>{t(GLOSSARY.sales, lang)} </Quiet>
                <Money cents={v.closed.salesCents} />
              </span>
              <span>
                <Quiet>{t(GLOSSARY.fees, lang)} </Quiet>
                <Money cents={v.closed.feesCents} />
              </span>
              <span>
                <Quiet>{t(GLOSSARY.makerPay, lang)} </Quiet>
                <Money cents={v.closed.makerPayCents} tone="in" />
              </span>
              <span>
                <Quiet>{t(GLOSSARY.held, lang)} </Quiet>
                <Money cents={v.closed.heldCents} tone="pending" />
              </span>
            </span>
          )}
        </Link>
        <Link step="workbook" title={GLOSSARY.workbook} lit={v.workbook !== null} lang={lang}>
          {v.workbook && (
            <span className="flex flex-wrap items-center gap-2">
              <span>{v.workbook.fileName}</span>
              <Quiet>
                {v.workbook.sheets.length} {t(BOOKS.sheets, lang)}: {v.workbook.sheets.join(", ")}
              </Quiet>
            </span>
          )}
        </Link>
        <Link step="statements" title={GLOSSARY.makerStatement} lit={v.statements.length > 0} lang={lang}>
          <span className="flex flex-col gap-0.5">
            {v.statements.map((st) => (
              <span key={st.makerStatementId} className="flex flex-wrap items-center gap-2" data-statement-id={st.makerStatementId}>
                <Tag tone="soft">{st.makerStatementId}</Tag>
                <span>{personName(st.makerId, lang)}</span>
                <Money cents={st.totalCents} tone="in" />
                {st.heldCents > 0 && (
                  <Quiet>
                    {t(GLOSSARY.held, lang)} <Money cents={st.heldCents} tone="pending" />
                  </Quiet>
                )}
                <Quiet>{formatDate(st.payoutDate, lang)}</Quiet>
              </span>
            ))}
          </span>
        </Link>
        <Link step="receipt" title={GLOSSARY.paidToMaker} lit={v.paid.length > 0} lang={lang} last>
          <span className="flex flex-col gap-0.5">
            {v.paid.map((r) => (
              <span key={r.orderId} className="flex flex-wrap items-center gap-2" data-order-id={r.orderId}>
                <Tag tone="soft">{r.orderId}</Tag>
                <span>{personName(r.makerId, lang)}</span>
                <Money cents={r.makerShareCents} tone="in" />
                {r.paidDate && <Quiet>{formatDate(r.paidDate, lang)}</Quiet>}
              </span>
            ))}
          </span>
        </Link>
      </ol>
    </div>
  );
}

export default CloseProcess;
