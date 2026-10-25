// The reconcile view (T5), process-pane-reconcile: the month's records counted by type, its matches
// counted by kind, and process-reconcile-flag with what was expected, what was paid, how short it is
// and the record Cindy says to trust, from flag.raised and flag.explained. The tour opens it late in
// d07-month (C-12).
import { useCallback } from "react";
import type { RecordType } from "../../core/events";
import type { CindiaState } from "../../core/state";
import { useCindia } from "../../core/store";
import type { Lang, MatchKind } from "../../core/types";
import { Flag, Money } from "../../ui";
import { Empty, Figure, Quiet, SectionHead, Tag } from "./parts";
import { BOOKS, EMPTY, GLOSSARY, MATCH_KIND_LABELS, RECORD_TYPE_LABELS, t } from "./strings";

const RECORD_TYPES: RecordType[] = ["order", "payout", "refund", "statement", "bank_txn"];
const MATCH_KINDS: MatchKind[] = ["one_to_one", "bundled", "refund_netted", "carried_over"];

function reconcileView(s: CindiaState) {
  const m = s.month;
  const records = Object.fromEntries(RECORD_TYPES.map((k) => [k, m.recordIds.filter((id) => m.records[id]?.recordType === k).length])) as Record<RecordType, number>;
  const matches = Object.fromEntries(MATCH_KINDS.map((k) => [k, m.matchIds.filter((id) => m.matches[id]?.kind === k).length])) as Record<MatchKind, number>;
  const flag = m.flagIds.length ? m.flags[m.flagIds[0]] : null;
  return { monthId: m.monthId, records, matches, flag, any: m.monthId !== null || m.recordIds.length > 0 || m.matchIds.length > 0 || m.flagIds.length > 0 };
}

export function ReconcileProcess({ lang }: { lang: Lang }) {
  const v = useCindia(useCallback((s: CindiaState) => reconcileView(s), []));
  if (!v.any) {
    return (
      <div data-testid="process-pane-reconcile">
        <Empty text={EMPTY.reconcile} lang={lang} />
      </div>
    );
  }
  return (
    <div data-testid="process-pane-reconcile" data-month-id={v.monthId ?? undefined} className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-6">
        <section className="min-w-0" style={{ flex: "5 1 420px" }}>
          <SectionHead title={BOOKS.records} lang={lang} right={v.monthId ? <Tag tone="soft">{v.monthId}</Tag> : undefined} />
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(84px, 1fr))" }}>
            {RECORD_TYPES.map((k) => (
              <Figure key={k} attr={{ "data-record-type": k, "data-count": v.records[k] }} label={RECORD_TYPE_LABELS[k]} value={v.records[k]} lang={lang} />
            ))}
          </div>
        </section>
        <section className="min-w-0" style={{ flex: "4 1 340px" }}>
          <SectionHead title={BOOKS.matches} lang={lang} />
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(84px, 1fr))" }}>
            {MATCH_KINDS.map((k) => (
              <Figure key={k} attr={{ "data-match-kind": k, "data-count": v.matches[k] }} label={MATCH_KIND_LABELS[k]} value={v.matches[k]} lang={lang} />
            ))}
          </div>
        </section>
      </div>
      {v.flag && (
        <section data-testid="process-reconcile-flag" data-flag-id={v.flag.flagId} data-trust={v.flag.trustRecordId}>
          <Flag reason={`${t(GLOSSARY.flag, lang)} · ${t(GLOSSARY.shortPayment, lang)}`}>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <span data-role="expected">
                  <Quiet>{t(BOOKS.expected, lang)} </Quiet>
                  <Money cents={v.flag.expectedCents} />
                </span>
                <span data-role="paid">
                  <Quiet>{t(BOOKS.paidAmount, lang)} </Quiet>
                  <Money cents={v.flag.actualCents} />
                </span>
                <span data-role="short">
                  <Quiet>{t(BOOKS.short, lang)} </Quiet>
                  <Money cents={v.flag.deltaCents} tone="out" />
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2" data-role="records">
                {v.flag.recordIds.map((id) => (
                  <Tag key={id} tone={id === v.flag!.trustRecordId ? "jade" : "soft"}>
                    {id}
                  </Tag>
                ))}
              </div>
              {v.flag.trustRecordId ? (
                <p data-role="trust">
                  <span className="font-semibold">{t(GLOSSARY.trust, lang)}: </span>
                  <Tag tone="jade">{v.flag.trustRecordId}</Tag>
                  {v.flag.explanation && <span> {t(v.flag.explanation, lang)}</span>}
                </p>
              ) : (
                <Quiet>{t(BOOKS.noTrustYet, lang)}</Quiet>
              )}
            </div>
          </Flag>
        </section>
      )}
    </div>
  );
}

export default ReconcileProcess;
