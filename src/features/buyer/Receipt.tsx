// The buyer's receipt (F5): the latest order from order.placed, and a status line that follows
// receipt.updated. "Received" at d04-pay, then "Paid to the maker" at d11-receipt with the maker's
// name, share and paid date. Share and paid date come from the receipt.updated payload, never the
// order, because a live B10 recomputes them.
import type { CSSProperties, ReactNode } from "react";
import type { BuyerState } from "../../core/state";
import type { Person, Piece } from "../../core/types";
import { useCindia } from "../../core/store";
import { getById } from "../../mock";
import { Money } from "../../ui/Money";
import { formatDate } from "../../ui/formatDate";
import { label, tr, ui, type Lang } from "./strings";

export interface ReceiptProps {
  lang: Lang;
}

const selectOrder = (s: { buyer: BuyerState }) => {
  const id = s.buyer.orderIds.at(-1);
  return id !== undefined ? (s.buyer.orders[id] ?? null) : null;
};
const selectReceipts = (s: { buyer: BuyerState }) => s.buyer.receipts;

const softText: CSSProperties = { fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" };
const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: "var(--c-space-8)",
  margin: 0,
};

function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div style={rowStyle}>
      <dt style={softText}>{name}</dt>
      <dd style={{ margin: 0, fontSize: "var(--c-text-16)", color: "var(--c-color-ink)", textAlign: "right" }}>{children}</dd>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false" style={{ flex: "none" }}>
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 8.2l2.3 2.3 4.7-4.9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Receipt({ lang }: ReceiptProps) {
  const order = useCindia(selectOrder);
  const receipts = useCindia(selectReceipts);

  if (order === null) {
    return (
      <p data-testid="buyer-receipt" style={{ ...softText, margin: 0 }}>
        {tr(ui.noReceipt, lang)}
      </p>
    );
  }

  const piece = getById<Piece>(order.pieceId);
  const receipt = receipts[order.orderId] ?? null;
  const paid = receipt !== null && receipt.status === "paid_to_maker";
  const maker = receipt !== null ? getById<Person>(receipt.makerId) : undefined;

  return (
    <section
      data-testid="buyer-receipt"
      data-order-id={order.orderId}
      style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}
    >
      <dl style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-4)", margin: 0 }}>
        <Row name={tr(label.piece, lang)}>{piece ? tr(piece.title, lang) : order.pieceId}</Row>
        <Row name={tr(ui.amount, lang)}>
          <Money cents={order.grossCents} />
        </Row>
        <Row name={tr(ui.date, lang)}>{formatDate(order.date, lang)}</Row>
        <Row name={tr(label.order, lang)}>
          <code style={{ fontSize: "var(--c-text-14)" }}>{order.orderId}</code>
        </Row>
      </dl>

      {receipt !== null && (
        <div
          data-testid="buyer-receipt-status"
          data-status={receipt.status}
          role="status"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--c-space-4)",
            padding: "var(--c-space-8) var(--c-space-12)",
            borderRadius: "var(--c-radius-control)",
            border: `1px solid ${paid ? "var(--c-color-jade)" : "var(--c-color-line)"}`,
            background: paid ? "var(--c-color-jade-wash)" : "transparent",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--c-space-8)",
              fontSize: "var(--c-text-16)",
              fontWeight: 600,
              color: paid ? "var(--c-color-jade)" : "var(--c-color-ink)",
            }}
          >
            {tr(paid ? label.paidToMaker : label.received, lang)}
            {paid && <CheckIcon />}
          </span>
          {paid ? (
            <>
              <span style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink)" }}>
                {tr(label.maker, lang)} {maker ? tr(maker.name, lang) : receipt.makerId} · {tr(label.makerShare, lang)}{" "}
                <Money cents={receipt.makerShareCents} tone="in" />
              </span>
              {receipt.paidDate !== undefined && (
                <span style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink)" }}>
                  {tr(ui.paidOn, lang)} {formatDate(receipt.paidDate, lang)}
                </span>
              )}
              <span style={softText}>{tr(ui.paidNote, lang)}</span>
            </>
          ) : (
            <span style={softText}>{tr(ui.receivedNote, lang)}</span>
          )}
        </div>
      )}
    </section>
  );
}
