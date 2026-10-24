// The simulated checkout (F4): the pay button, then the card number turning into a token.
// A plain line always says the checkout is simulated and no card is charged.
import type { BuyerState } from "../../core/state";
import { emit, useCindia } from "../../core/store";
import { userEvent } from "../../core/events";
import { Button } from "../../ui/Button";
import { tr, ui, label, type Lang } from "./strings";

export interface CheckoutProps {
  lang: Lang;
}

const selectSplit = (s: { buyer: BuyerState }) =>
  s.buyer.latestSplitPieceId !== null ? (s.buyer.splits[s.buyer.latestSplitPieceId] ?? null) : null;
const selectCheckout = (s: { buyer: BuyerState }) => s.buyer.checkout;
const selectCard = (s: { buyer: BuyerState }) => s.buyer.card;

const MASK = "••••";

const lineStyle = { margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" } as const;

export function Checkout({ lang }: CheckoutProps) {
  const split = useCindia(selectSplit);
  const checkout = useCindia(selectCheckout);
  const card = useCindia(selectCard);

  const pending = checkout !== null && card === null;
  const masked = `${MASK} ${MASK} ${MASK} ${card ? card.last4 : MASK}`;

  function pay() {
    if (split === null || checkout !== null) return;
    emit(userEvent("checkout.started", { pieceId: split.pieceId, grossCents: split.grossCents }));
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}>
      {card === null ? (
        <>
          <p style={lineStyle}>
            {tr(ui.cardNumber, lang)} <span style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "0.05em" }}>{masked}</span>
          </p>
          <Button testId="buyer-pay-button" onClick={pay} disabled={split === null || checkout !== null} aria-busy={pending}>
            {pending ? tr(ui.paying, lang) : tr(ui.pay, lang)}
          </Button>
        </>
      ) : (
        <div
          data-testid="buyer-token"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--c-space-4)",
            padding: "var(--c-space-8) var(--c-space-12)",
            border: "1px solid var(--c-color-line)",
            borderRadius: "var(--c-radius-control)",
          }}
        >
          <span style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>
            {tr(label.token, lang)} · {tr(ui.cardEnding, lang)} {card.last4}
          </span>
          <code style={{ fontSize: "var(--c-text-16)", color: "var(--c-color-ink)", overflowWrap: "anywhere" }}>{card.token}</code>
          <span style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>{tr(ui.tokenNote, lang)}</span>
        </div>
      )}
      <p data-testid="buyer-simulated-note" style={lineStyle}>
        {tr(ui.simulatedNote, lang)}
      </p>
    </section>
  );
}
