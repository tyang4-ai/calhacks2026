// The three maker payouts inside apr_02's card: each maker's mark, name, amount, held amount and
// the over-limit mark, then the total held. On payout.sent a line reads sent with its date.
import { useCindia } from "../../core/store";
import type { Approval, MakerPayout, Person, Studio } from "../../core/types";
import { getById } from "../../mock";
import { Badge, MakerMark, Money, formatDate } from "../../ui";
import { GLOSSARY, UI, t, type Lang } from "./strings";

export interface PayoutLinesProps {
  approvalId: string;
  lang: Lang;
}

const softStyle = { color: "var(--c-color-ink-soft)", fontSize: "var(--c-text-14)" } as const;

export function PayoutLines({ approvalId, lang }: PayoutLinesProps) {
  const sentPayouts = useCindia((s) => s.approvals.payouts);
  const approval = getById<Approval>(approvalId);
  const limitCents = getById<Studio>("std_gu")?.payoutLimitCents;
  if (!approval) return null;

  const payouts = approval.subjectIds.map((id) => getById<MakerPayout>(id)).filter((p): p is MakerPayout => Boolean(p));
  const heldTotal = payouts.reduce((acc, p) => acc + p.heldCents, 0);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-8)", fontSize: "var(--c-text-16)" }}>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}>
        {payouts.map((p) => {
          const maker = getById<Person>(p.makerId);
          const sent = sentPayouts[p.id];
          const over = limitCents !== undefined && p.amountCents > limitCents;
          return (
            <li
              key={p.id}
              data-testid={`approvals-payout-${p.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--c-space-12)",
                padding: "var(--c-space-4) 0",
                borderBottom: "1px solid var(--c-color-line)",
              }}
            >
              {maker && <MakerMark char={maker.surnameChar} label={t(maker.name, lang)} size={36} />}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--c-space-4)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--c-space-8)" }}>
                  <span style={{ fontWeight: 600 }}>{maker ? t(maker.name, lang) : p.makerId}</span>
                  <Money cents={p.amountCents} />
                </div>
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "var(--c-space-8)" }}>
                  {p.heldCents > 0 && (
                    <span style={softStyle}>
                      {t(GLOSSARY.held, lang)} <Money cents={p.heldCents} tone="pending" />
                    </span>
                  )}
                  {over && <Badge variant="seal">{t(GLOSSARY.overLimit, lang)}</Badge>}
                  {sent && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--c-space-8)" }}>
                      <Badge variant="jade">{t(GLOSSARY.sent, lang)}</Badge>
                      <span style={softStyle}>
                        {t(GLOSSARY.payoutDate, lang)} {formatDate(sent.date, lang)}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {heldTotal > 0 && (
        <div data-part="held-total" style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--c-space-8)" }}>
            <span style={{ fontWeight: 600 }}>{t(UI.heldTotal, lang)}</span>
            <Money cents={heldTotal} tone="pending" />
          </div>
          <span style={softStyle}>{t(GLOSSARY.heldNote, lang)}</span>
        </div>
      )}
    </section>
  );
}
