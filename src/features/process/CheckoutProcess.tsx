// The checkout view (T4), process-pane-checkout. checkout has no source keys: the card is always
// simulated, so the view always shows the Simulated badge.
// - process-checkout-flow: the card, then its token (card.tokenized), then the order (order.placed),
//   with the split from split.shown and any project.funded add-on. Each stage lights when its event
//   is in the store;
// - process-checkout-stored: what Cindia keeps. process-checkout-never: what it never keeps.
import { useCallback, type ReactNode } from "react";
import type { CindiaState } from "../../core/state";
import { useCindia } from "../../core/store";
import type { Lang, Text } from "../../core/types";
import { Money, ShareBar } from "../../ui";
import { Empty, Quiet, SectionHead, Tag } from "./parts";
import { pieceTitle, projectTitle } from "./readers";
import { CHECKOUT, EMPTY, GLOSSARY, NEVER_ITEMS, STORED_ITEMS, t } from "./strings";

function checkoutView(s: CindiaState) {
  const b = s.buyer;
  const orderId = b.orderIds.length ? b.orderIds[b.orderIds.length - 1] : null;
  const order = orderId ? b.orders[orderId] : null;
  const card = b.card;
  const pieceId = order?.pieceId ?? card?.pieceId ?? b.checkout?.pieceId ?? b.latestSplitPieceId ?? null;
  const split = pieceId ? (b.splits[pieceId] ?? null) : null;
  const contributions = Object.values(s.projects.contributions);
  const addOn = (order && contributions.find((c) => c.orderId === order.orderId)) ?? contributions.at(-1) ?? null;
  return { order, card, checkout: b.checkout, pieceId, split, addOn, any: Boolean(b.checkout || card || order || split || addOn) };
}

function Stage({ title, lit, lang, children, role }: { title: Text; lit: boolean; lang: Lang; children: ReactNode; role: string }) {
  return (
    <div
      data-role={role}
      data-lit={lit}
      className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-2"
      style={{
        border: `1px ${lit ? "solid" : "dashed"} ${lit ? "var(--c-color-jade)" : "var(--c-color-line)"}`,
        borderRadius: "var(--c-radius-panel)",
        background: lit ? "var(--c-color-jade-wash)" : "transparent",
      }}
    >
      <span className="font-semibold">{t(title, lang)}</span>
      {lit ? children : <Quiet>{t(CHECKOUT.waiting, lang)}</Quiet>}
    </div>
  );
}

function Arrow() {
  return (
    <svg width="28" height="16" viewBox="0 0 28 16" aria-hidden="true" className="shrink-0 self-center">
      <path d="M2 8 H24 M18 3 L24 8 L18 13" fill="none" stroke="var(--c-color-ink-soft)" strokeWidth="1.5" />
    </svg>
  );
}

function ItemList({ testId, title, items, lang, tone }: { testId: string; title: Text; items: Text[]; lang: Lang; tone: "jade" | "seal" }) {
  return (
    <section data-testid={testId} className="min-w-0 px-4 py-3" style={{ border: "1px solid var(--c-color-line)", borderRadius: "var(--c-radius-panel)" }}>
      <SectionHead title={title} lang={lang} />
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {items.map((item) => (
          <li key={item.en} className="flex items-center gap-2">
            <span aria-hidden="true" style={{ color: tone === "jade" ? "var(--c-color-jade)" : "var(--c-color-seal)" }}>
              {tone === "jade" ? "✓" : "✕"}
            </span>
            {t(item, lang)}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CheckoutProcess({ lang }: { lang: Lang }) {
  const v = useCindia(useCallback((s: CindiaState) => checkoutView(s), []));
  return (
    // The flow on the left, what Cindia keeps and never keeps on the right, so the view fits the
    // overlay without scrolling in both languages.
    <div data-testid="process-pane-checkout" className="flex flex-wrap gap-6">
      <section data-testid="process-checkout-flow" className="flex min-w-0 flex-col gap-3" style={{ flex: "2 1 600px" }}>
        {!v.any && <Empty text={EMPTY.checkout} lang={lang} />}
        {v.pieceId && (
          <p className="font-semibold">
            {pieceTitle(v.pieceId, lang)}
          </p>
        )}
        <div className="flex items-stretch gap-2">
          <Stage title={CHECKOUT.cardSimulated} lit={Boolean(v.card || v.checkout)} lang={lang} role="card">
            <span>
              {v.card ? `${v.card.brand.toUpperCase()} •••• ${v.card.last4}` : ""}
              {v.checkout ? (
                <>
                  {v.card ? " · " : ""}
                  <Money cents={v.checkout.grossCents} />
                </>
              ) : null}
            </span>
          </Stage>
          <Arrow />
          <Stage title={GLOSSARY.token} lit={Boolean(v.card)} lang={lang} role="token">
            <span data-role="token-value" className="break-all tabular-nums">
              {v.card?.token}
            </span>
          </Stage>
          <Arrow />
          <Stage title={CHECKOUT.orderWord} lit={Boolean(v.order)} lang={lang} role="order">
            {v.order && (
              <span className="flex flex-wrap items-center gap-2">
                <Tag>{v.order.orderId}</Tag>
                <Money cents={v.order.grossCents} />
                <Quiet>{v.order.channelId}</Quiet>
              </span>
            )}
          </Stage>
        </div>
        {v.split && (
          <div className="flex flex-col gap-1" data-role="split">
            <Quiet>{t(CHECKOUT.split, lang)}</Quiet>
            <ShareBar
              parts={[
                { kind: "maker", label: t(GLOSSARY.makerShare, lang), cents: v.split.makerShareCents },
                { kind: "materials", label: t(GLOSSARY.materials, lang), cents: v.split.materialsCents },
                { kind: "platform", label: t(GLOSSARY.cindiaFee, lang), cents: v.split.platformFeeCents },
                { kind: "card", label: t(GLOSSARY.cardFee, lang), cents: v.split.cardFeeCents },
              ]}
            />
          </div>
        )}
        {v.addOn && (
          <p data-role="add-on" className="flex flex-wrap items-center gap-2">
            <Quiet>{t(CHECKOUT.addOn, lang)}:</Quiet>
            <Money cents={v.addOn.amountCents} tone="in" />
            <span>→ {projectTitle(v.addOn.projectId, lang)}</span>
            <Tag tone="soft">{v.addOn.contributionId}</Tag>
          </p>
        )}
      </section>
      <div className="flex min-w-0 flex-col gap-4" style={{ flex: "1 1 260px" }}>
        <ItemList testId="process-checkout-stored" title={CHECKOUT.stored} items={STORED_ITEMS} lang={lang} tone="jade" />
        <ItemList testId="process-checkout-never" title={CHECKOUT.never} items={NEVER_ITEMS} lang={lang} tone="seal" />
      </div>
    </div>
  );
}

export default CheckoutProcess;
