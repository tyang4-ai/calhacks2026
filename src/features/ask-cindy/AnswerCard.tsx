// F-ask-cindy T1: one of Cindy's answers. The answer text in the current language, the chart when the
// answer has one, and the records it names in refIds with short labels from the mock entities.
import type { ReactNode } from "react";
import type { AskAnswer } from "../../core/state";
import type {
  BankTxn,
  ChannelPayout,
  Contract,
  Flag,
  MakerPayout,
  MakerStatement,
  Order,
  Person,
  Piece,
  Refund,
  Statement,
} from "../../core/types";
import { getById } from "../../mock";
import { MakerMark, Money, formatBps, formatDate } from "../../ui";
import { AnswerChart } from "./AnswerChart";
import { STRINGS, recordKind, t, type Lang } from "./strings";

export interface AnswerCardProps {
  answer: AskAnswer;
  lang: Lang;
  /** Only the latest answer carries the ask-cindy-answer, ask-cindy-chart and ask-cindy-refs test IDs. */
  latest: boolean;
}

interface RefLabel {
  /** The maker the record belongs to, for the MakerMark. */
  maker?: Person;
  label: ReactNode;
}

const sep = <span aria-hidden="true"> · </span>;

const makerOf = (id: string | undefined) => (id ? getById<Person>(id) : undefined);
const pieceTitle = (pieceId: string, lang: Lang) => getById<Piece>(pieceId)?.title[lang] ?? pieceId;

/** A short human label for one record, built from its mock entity. Unknown IDs show the ID itself. */
function refLabel(id: string, lang: Lang): RefLabel {
  const e = getById(id);
  if (!e) return { label: id };
  if (id.startsWith("pc_")) {
    const p = e as Piece;
    return { maker: makerOf(p.makerId), label: p.title[lang] };
  }
  if (id.startsWith("ord_")) {
    const o = e as Order;
    const p = getById<Piece>(o.pieceId);
    return {
      maker: makerOf(p?.makerId),
      label: (
        <>
          {pieceTitle(o.pieceId, lang)}
          {sep}
          {formatDate(o.date, lang)}
          {sep}
          <Money cents={o.grossCents} />
        </>
      ),
    };
  }
  if (id.startsWith("ctr_")) {
    const c = e as Contract;
    return {
      label: (
        <>
          {formatBps(c.commissionBps)}
          {sep}
          {formatDate(c.signedDate, lang)}
        </>
      ),
    };
  }
  if (id.startsWith("stm_")) {
    const s = e as Statement;
    return {
      label: (
        <>
          {formatDate(s.issuedDate, lang)}
          {sep}
          <Money cents={s.totalNetCents} />
        </>
      ),
    };
  }
  if (id.startsWith("txn_")) {
    const b = e as BankTxn;
    return {
      label: (
        <>
          {b.counterparty[lang]}
          {sep}
          {formatDate(b.date, lang)}
          {sep}
          <Money cents={b.direction === "out" ? -b.amountCents : b.amountCents} tone={b.direction === "in" ? "in" : "neutral"} />
        </>
      ),
    };
  }
  if (id.startsWith("pay_")) {
    const p = e as ChannelPayout;
    return {
      label: (
        <>
          {formatDate(p.date, lang)}
          {sep}
          <Money cents={p.netCents} />
        </>
      ),
    };
  }
  if (id.startsWith("rfd_")) {
    const r = e as Refund;
    return {
      label: (
        <>
          {formatDate(r.date, lang)}
          {sep}
          <Money cents={-r.amountCents} />
        </>
      ),
    };
  }
  if (id.startsWith("mpo_")) {
    const m = e as MakerPayout;
    const maker = makerOf(m.makerId);
    return {
      maker,
      label: (
        <>
          {maker?.name[lang] ?? m.makerId}
          {sep}
          <Money cents={m.amountCents} />
        </>
      ),
    };
  }
  if (id.startsWith("mst_")) {
    const m = e as MakerStatement;
    const maker = makerOf(m.makerId);
    return {
      maker,
      label: (
        <>
          {maker?.name[lang] ?? m.makerId}
          {sep}
          <Money cents={m.totalCents} />
        </>
      ),
    };
  }
  if (id.startsWith("flg_")) {
    const f = e as Flag;
    return { label: <Money cents={-f.deltaCents} tone="out" /> };
  }
  return { label: id };
}

export function AnswerCard({ answer, lang, latest }: AnswerCardProps) {
  const bodyFont = lang === "zh" ? "var(--c-font-body-zh)" : "var(--c-font-body)";
  return (
    <div
      data-testid={latest ? "ask-cindy-answer" : undefined}
      lang={lang === "zh" ? "zh-CN" : "en"}
      style={{ fontFamily: bodyFont, color: "var(--c-color-ink)" }}
    >
      <p style={{ margin: 0, lineHeight: lang === "zh" ? "var(--c-leading-body-zh)" : "var(--c-leading-body)" }}>{answer.answer[lang]}</p>
      {answer.chart && latest && <AnswerChart chart={answer.chart} lang={lang} />}
      {answer.refIds.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: "0 0 4px", fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>{t(STRINGS.refsHeading, lang)}</p>
          <ul data-testid={latest ? "ask-cindy-refs" : undefined} style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {answer.refIds.map((id) => {
              const kind = recordKind(id);
              const { maker, label } = refLabel(id, lang);
              return (
                <li
                  key={id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 0",
                    borderTop: "1px solid var(--c-color-line)",
                    fontSize: "var(--c-text-14)",
                  }}
                >
                  {maker && <MakerMark char={maker.surnameChar} size={20} label={maker.name[lang]} />}
                  {kind && <strong style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{t(kind, lang)}</strong>}
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
