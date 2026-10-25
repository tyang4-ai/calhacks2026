// The simulated checkout (F4, M-buyer T4): the pay button, then the card number turning into a
// token. A plain line always says the checkout is simulated and no card is charged. The checkout and
// the card come from buyer.checkouts and buyer.cards for one piece, never from the latest one, so a
// checkout of another piece never changes this one (D1-46).
// - layout "phone" (the default) is v1's, in the buyer phone: the piece is the latest split's, pay
//   waits for the split, and the token takes the pay button's place.
// - layout "page" is the desktop piece page's price column: the project add-on (off until the buyer
//   switches it on), pay for every piece until its own checkout starts, the token under the pay
//   button, then the order's status with a link to the receipt and the promise (or L10 for a
//   person's own order), and the contribution once one belongs to this checkout.
// With `publicSite`, buyer-pay-blocked shows L6 in pay's place on both layouts, and nothing here can
// emit a checkout or a contribution. The tour's own token and status still render from its events.
// M-buyer T7 retired the phone flow, but kept the phone layout here: checkoutRules.test.ts still
// checks the public build's block on it.
import type { CSSProperties } from "react";
import { userEvent } from "../../core/events";
import { receiptRoute } from "../../core/nav";
import type { CindiaState } from "../../core/state";
import { emit, useCindia } from "../../core/store";
import type { Community, Order, Person, Piece, Project } from "../../core/types";
import { getById } from "../../mock";
import { Button } from "../../ui/Button";
import { Link } from "../../ui/Link";
import { Money } from "../../ui/Money";
import {
  addOnCanEmit,
  addOnLocked,
  addOnOn,
  contributionFor,
  isUserOrder,
  newestOrderFor,
  nextContributionId,
  payState,
} from "./checkoutRules";
import { ProjectAddOn } from "./ProjectAddOn";
import { fill, label, onScreen, page, tr, ui, type Lang } from "./strings";
import { useEpochState } from "./useEpoch";

export interface CheckoutProps {
  lang: Lang;
  /** The piece to check out. Defaults to the latest split's piece, as v1's buyer phone reads it. */
  pieceId?: string;
  /** SlotProps.publicSite: L6 in place of pay, and nothing can be bought. */
  publicSite?: boolean;
  layout?: "phone" | "page";
}

/** The buyer every checkout and contribution names in this demo. */
const DEMO_BUYER_ID = "buy_01";

const MASK = "••••";

const lineStyle = { margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" } as const;

const selectLatestSplitPiece = (s: CindiaState) => s.buyer.latestSplitPieceId;

/** The piece an order is for: the store's order (a person's lives only there), else the mock's. */
function pieceOfOrderIn(orders: CindiaState["buyer"]["orders"]) {
  return (orderId: string) => orders[orderId]?.pieceId ?? getById<Order>(orderId)?.pieceId;
}

export function Checkout({ lang, pieceId, publicSite = false, layout = "phone" }: CheckoutProps) {
  const latestSplitPiece = useCindia(selectLatestSplitPiece);
  const id = pieceId ?? latestSplitPiece;
  if (layout === "page" && id !== null) return <PageCheckout lang={lang} pieceId={id} publicSite={publicSite} />;
  return <PhoneCheckout lang={lang} pieceId={id} publicSite={publicSite} />;
}

interface InnerProps {
  lang: Lang;
  pieceId: string | null;
  publicSite: boolean;
}

function MaskedCard({ lang, last4 }: { lang: Lang; last4?: string }) {
  const masked = `${MASK} ${MASK} ${MASK} ${last4 ?? MASK}`;
  return (
    <p style={lineStyle}>
      {tr(ui.cardNumber, lang)} <span style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "0.05em" }}>{masked}</span>
    </p>
  );
}

function Token({ lang, card, compact = false }: { lang: Lang; card: { token: string; last4: string }; compact?: boolean }) {
  const box: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: compact ? 2 : "var(--c-space-4)",
    padding: compact ? "var(--c-space-4) var(--c-space-12)" : "var(--c-space-8) var(--c-space-12)",
    border: "1px solid var(--c-color-line)",
    borderRadius: "var(--c-radius-control)",
  };
  const soft: CSSProperties = { fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" };
  const code = <code style={{ fontSize: "var(--c-text-16)", color: "var(--c-color-ink)", overflowWrap: "anywhere" }}>{card.token}</code>;
  if (compact) {
    // The desktop price column: the token and the card on one row, then what the token is.
    return (
      <div data-testid="buyer-token" style={box}>
        <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--c-space-8)" }}>
          {code}
          <span style={soft}>
            {tr(ui.cardEnding, lang)} {card.last4}
          </span>
        </span>
        <span style={soft}>
          {tr(label.token, lang)}
          {lang === "zh" ? "：" : ". "}
          {tr(ui.tokenNote, lang)}
        </span>
      </div>
    );
  }
  return (
    <div data-testid="buyer-token" style={box}>
      <span style={soft}>
        {tr(label.token, lang)} · {tr(ui.cardEnding, lang)} {card.last4}
      </span>
      {code}
      <span style={soft}>{tr(ui.tokenNote, lang)}</span>
    </div>
  );
}

function PayBlocked({ lang }: { lang: Lang }) {
  return (
    <p
      data-testid="buyer-pay-blocked"
      role="note"
      style={{
        margin: 0,
        padding: "var(--c-space-8) var(--c-space-12)",
        border: "1px dashed var(--c-color-ink-soft)",
        borderRadius: "var(--c-radius-control)",
        fontSize: "var(--c-text-14)",
        color: "var(--c-color-ink)",
        textAlign: "center",
      }}
    >
      {tr(onScreen.L6, lang)}
    </p>
  );
}

/** v1's checkout in the buyer phone, with L6 in pay's place on the public build. */
function PhoneCheckout({ lang, pieceId, publicSite }: InnerProps) {
  const split = useCindia((s: CindiaState) => (pieceId !== null ? (s.buyer.splits[pieceId] ?? null) : null));
  const checkout = useCindia((s: CindiaState) => (pieceId !== null ? (s.buyer.checkouts[pieceId] ?? null) : null));
  const card = useCindia((s: CindiaState) => (pieceId !== null ? (s.buyer.cards[pieceId] ?? null) : null));

  const pending = checkout !== null && card === null;

  function pay() {
    if (publicSite || split === null || checkout !== null) return;
    emit(userEvent("checkout.started", { pieceId: split.pieceId, grossCents: split.grossCents }));
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}>
      {card === null ? (
        <>
          <MaskedCard lang={lang} />
          {publicSite ? (
            <PayBlocked lang={lang} />
          ) : (
            <Button testId="buyer-pay-button" onClick={pay} disabled={split === null || checkout !== null} aria-busy={pending}>
              {pending ? tr(ui.paying, lang) : tr(ui.pay, lang)}
            </Button>
          )}
        </>
      ) : (
        <Token lang={lang} card={card} />
      )}
      <p data-testid="buyer-simulated-note" style={lineStyle}>
        {tr(ui.simulatedNote, lang)}
      </p>
    </section>
  );
}

/** The desktop piece page's checkout (M-buyer T4). */
function PageCheckout({ lang, pieceId, publicSite }: InnerProps & { pieceId: string }) {
  const split = useCindia((s: CindiaState) => s.buyer.splits[pieceId] ?? null);
  const checkout = useCindia((s: CindiaState) => s.buyer.checkouts[pieceId] ?? null);
  const card = useCindia((s: CindiaState) => s.buyer.cards[pieceId] ?? null);
  const orderIds = useCindia((s: CindiaState) => s.buyer.orderIds);
  const orders = useCindia((s: CindiaState) => s.buyer.orders);
  const receipts = useCindia((s: CindiaState) => s.buyer.receipts);
  const contributions = useCindia((s: CindiaState) => s.projects.contributions);
  // The buyer's own switch and the contribution this page's pay click emitted. Both reset on a seek,
  // which drops the store's person-made records.
  const [switchedOn, setSwitchedOn] = useEpochState(false);
  const [ownId, setOwnId] = useEpochState<string | null>(null);

  const piece = getById<Piece>(pieceId);
  if (!piece) return null;
  const community = getById<Community>(piece.communityId);
  const projectId = community?.projectIds[0];
  const project = projectId !== undefined ? getById<Project>(projectId) : undefined;

  const checkedOut = checkout !== null;
  const rules = { publicSite, checkedOut };
  const state = payState(rules);
  const contribution = contributionFor(contributions, { pieceId, ownId, pieceOfOrder: pieceOfOrderIn(orders) });
  const on = addOnOn({ ...rules, switchedOn, funded: contribution !== null });
  const grossCents = split?.grossCents ?? piece.priceCents;
  const totalCents = grossCents + (project && on && !checkedOut ? project.addOnCents : 0);
  const pending = checkedOut && card === null;

  const orderId = newestOrderFor(orderIds, orders, pieceId);
  const receipt = orderId !== null ? (receipts[orderId] ?? null) : null;
  const userOrder = orderId !== null && isUserOrder(orderId);
  const maker = receipt !== null ? getById<Person>(receipt.makerId) : undefined;
  const paid = receipt?.status === "paid_to_maker";
  const contributedProject = contribution !== null ? getById<Project>(contribution.projectId) : undefined;

  function pay() {
    if (state !== "open") return;
    emit(userEvent("checkout.started", { pieceId, grossCents }));
    if (project && addOnCanEmit({ ...rules, switchedOn })) {
      const contributionId = nextContributionId(contributions);
      emit(
        userEvent("project.funded", {
          contributionId,
          projectId: project.id,
          amountCents: project.addOnCents,
          buyerId: DEMO_BUYER_ID,
        }),
      );
      setOwnId(contributionId);
    }
  }

  return (
    <section aria-label={tr(page.checkout, lang)} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="m-0 text-xl font-semibold text-ink">{tr(page.checkout, lang)}</h3>
        <span className="c-tag">{tr(label.simulatedCheckout, lang)}</span>
      </div>

      {project && (
        <ProjectAddOn lang={lang} project={project} on={on} locked={addOnLocked(rules)} onChange={(v) => setSwitchedOn(v)} />
      )}

      {card === null && <MaskedCard lang={lang} />}

      {state === "blocked" ? (
        <PayBlocked lang={lang} />
      ) : (
        <Button testId="buyer-pay-button" onClick={pay} disabled={state !== "open"} aria-busy={pending}>
          {state === "open" && fill(tr(page.payTotal, lang), { amount: <Money cents={totalCents} /> })}
          {state === "done" && (pending ? tr(ui.paying, lang) : tr(page.payDone, lang))}
        </Button>
      )}

      {card !== null && <Token lang={lang} card={card} compact />}

      {orderId !== null && receipt !== null && (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-3">
            <span
              data-testid="buyer-receipt-status"
              data-status={receipt.status}
              data-order-id={orderId}
              role="status"
              className={`text-base font-semibold ${paid ? "text-jade" : "text-amber"}`}
            >
              {tr(paid ? label.paidToMaker : label.received, lang)}
            </span>
            <Link to={receiptRoute(orderId)} className="text-sm">
              {tr(page.viewReceipt, lang)} →
            </Link>
          </div>
          {userOrder ? (
            <p data-testid="buyer-receipt-demo-note" className="m-0 text-sm text-ink-soft">
              {tr(onScreen.L10, lang)}
            </p>
          ) : (
            !paid && (
              <p data-testid="buyer-receipt-promise" className="m-0 text-base text-ink">
                {fill(tr(page.promise, lang), { maker: maker ? tr(maker.name, lang) : receipt.makerId })}
              </p>
            )
          )}
        </div>
      )}

      {contribution !== null && (
        <p data-testid="buyer-contribution" data-contribution-id={contribution.contributionId} className="m-0 text-sm text-ink">
          {fill(tr(page.contribution, lang), {
            amount: <Money cents={contribution.amountCents} tone="in" />,
            project: contributedProject ? tr(contributedProject.title, lang) : contribution.projectId,
          })}
        </p>
      )}

      <p data-testid="buyer-simulated-note" style={lineStyle}>
        {tr(ui.simulatedNote, lang)}
      </p>
    </section>
  );
}
