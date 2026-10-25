// The buyer's receipt on the desktop receipt page (F5, M-buyer T5): one order and a status line that
// follows receipt.updated. "Received" after the sale, then "Paid to the maker" with the maker's name,
// share and paid date. Share and paid date come from the receipt.updated payload, never the order,
// because a live B10 recomputes them. It shows the piece with its illustration and maker, the
// promise under the received status ("We'll show you when Grace N. is paid."), the maker's own note
// once she's paid, in her own words and language, with the Demo data badge, L10 in place of both for
// a person's own order, and the contribution that names this order.
// `orderId` picks the order, and defaults to the newest order in the store when the route sets none.
// A person's ord_user_<n> lives only in the store, and a mock order such as ord_001 is found with
// getById() when the store doesn't hold it yet (D1-33). v1's phone layout went with the phone flow
// (M-buyer T7).
import type { CSSProperties } from "react";
import type { CindiaState } from "../../core/state";
import type { Community, Order, Person, Piece, Project } from "../../core/types";
import { useCindia } from "../../core/store";
import { getById, receiptNotes } from "../../mock";
import { Badge } from "../../ui/Badge";
import { MakerMark } from "../../ui/MakerMark";
import { Money } from "../../ui/Money";
import { formatDate } from "../../ui/formatDate";
import { ILLUSTRATION_WORD } from "../../ui/strings";
import { isUserOrder } from "./checkoutRules";
import { fill, label, onScreen, page, tr, ui, type Lang } from "./strings";

export interface ReceiptProps {
  lang: Lang;
  /** The order to show. Defaults to the newest order in the store. */
  orderId?: string;
}

/** What the receipt shows of an order, from the store's order.placed or the mock's order. */
export interface ReceiptOrder {
  orderId: string;
  pieceId: string;
  grossCents: number;
  date: string;
}

/** The order for a receipt: the store's, or else a mock order through getById(). */
function findOrder(orders: CindiaState["buyer"]["orders"], orderId: string): ReceiptOrder | null {
  const placed = orders[orderId];
  if (placed) return { orderId, pieceId: placed.pieceId, grossCents: placed.grossCents, date: placed.date };
  const mock = orderId.startsWith("ord_") ? getById<Order>(orderId) : undefined;
  if (mock && mock.id === orderId && typeof mock.pieceId === "string") {
    return { orderId, pieceId: mock.pieceId, grossCents: mock.grossCents, date: mock.date };
  }
  return null;
}

const selectNewestOrderId = (s: CindiaState) => s.buyer.orderIds.at(-1) ?? null;
const selectOrders = (s: CindiaState) => s.buyer.orders;
const selectReceipts = (s: CindiaState) => s.buyer.receipts;
const selectContributions = (s: CindiaState) => s.projects.contributions;

const softText: CSSProperties = { fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" };

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false" style={{ flex: "none" }}>
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 8.2l2.3 2.3 4.7-4.9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Receipt({ lang, orderId }: ReceiptProps) {
  const newestId = useCindia(selectNewestOrderId);
  const orders = useCindia(selectOrders);
  const receipts = useCindia(selectReceipts);
  const contributions = useCindia(selectContributions);

  const id = orderId ?? newestId;
  const order = id !== null ? findOrder(orders, id) : null;

  if (order === null) {
    return (
      <p data-testid="buyer-receipt" style={{ ...softText, margin: 0 }}>
        {tr(id !== null ? page.receiptMissing : ui.noReceipt, lang)}
      </p>
    );
  }

  const piece = getById<Piece>(order.pieceId);
  const receipt = receipts[order.orderId] ?? null;
  const paid = receipt !== null && receipt.status === "paid_to_maker";
  const maker = receipt !== null ? getById<Person>(receipt.makerId) : undefined;
  const makerName = maker ? tr(maker.name, lang) : (receipt?.makerId ?? "");

  const status =
    receipt !== null ? (
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
        {paid && (
          <>
            <span style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink)" }}>
              {tr(label.maker, lang)} {makerName} · {tr(label.makerShare, lang)} <Money cents={receipt.makerShareCents} tone="in" />
            </span>
            {receipt.paidDate !== undefined && (
              <span style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink)" }}>
                {tr(ui.paidOn, lang)} {formatDate(receipt.paidDate, lang)}
              </span>
            )}
            <span style={softText}>{tr(ui.paidNote, lang)}</span>
          </>
        )}
      </div>
    ) : null;

  const userOrder = isUserOrder(order.orderId);
  const pieceMaker = piece ? getById<Person>(piece.makerId) : undefined;
  const community = piece ? getById<Community>(piece.communityId) : undefined;
  const note = maker ? receiptNotes[maker.id] : undefined;
  const contribution = Object.values(contributions).find((c) => c.orderId === order.orderId) ?? null;
  const project = contribution ? getById<Project>(contribution.projectId) : undefined;

  return (
    <section data-testid="buyer-receipt" data-order-id={order.orderId} data-layout="page" className="flex flex-col gap-4">
      <dl className="m-0 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-ink-soft">
        <div className="flex items-baseline gap-1.5">
          <dt>{tr(label.order, lang)}</dt>
          <dd className="m-0 text-ink">
            <code>{order.orderId}</code>
          </dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt>{tr(ui.date, lang)}</dt>
          <dd className="m-0 text-ink">{formatDate(order.date, lang)}</dd>
        </div>
      </dl>

      <div className="flex items-center gap-4 border-y border-line py-3">
        {piece && (
          <figure className="relative m-0 h-[96px] w-[72px] shrink-0 overflow-hidden rounded-panel border border-line bg-mat">
            <img src={piece.image} alt={tr(piece.imageAlt, lang)} draggable={false} className="h-full w-full object-cover" />
            <span className="sr-only">{tr(ILLUSTRATION_WORD, lang)}</span>
          </figure>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-lg font-semibold text-ink">{piece ? tr(piece.title, lang) : order.pieceId}</span>
          {pieceMaker && (
            <span className="flex items-center gap-2 text-sm text-ink-soft">
              <MakerMark char={pieceMaker.surnameChar} size={22} label={pieceMaker.surnameChar} />
              {tr(pieceMaker.name, lang)}
              {community && <> · {tr(community.name, lang)}</>}
            </span>
          )}
        </div>
        <dl className="m-0 flex flex-col items-end">
          <dt className="text-sm text-ink-soft">{tr(ui.amount, lang)}</dt>
          <dd className="m-0 text-xl font-semibold text-ink">
            <Money cents={order.grossCents} />
          </dd>
        </dl>
      </div>

      {contribution !== null && (
        <p data-testid="buyer-contribution" data-contribution-id={contribution.contributionId} className="m-0 flex items-baseline justify-between gap-3 text-sm text-ink">
          <span>
            {tr(page.project, lang)} · {project ? tr(project.title, lang) : contribution.projectId}
            <span className="text-ink-soft"> · {tr(page.addOnFund, lang)}</span>
          </span>
          <Money cents={contribution.amountCents} />
        </p>
      )}

      {status}

      {userOrder ? (
        <p data-testid="buyer-receipt-demo-note" className="m-0 text-sm text-ink-soft">
          {tr(onScreen.L10, lang)}
        </p>
      ) : (
        <>
          {receipt !== null && !paid && (
            <p data-testid="buyer-receipt-promise" className="m-0 text-base text-ink">
              {fill(tr(page.promise, lang), { maker: makerName })}
            </p>
          )}
          {paid && maker && note && (
            <figure data-testid="buyer-receipt-maker-note" className="m-0 flex flex-col gap-2 rounded-panel border border-line bg-paper px-4 py-3">
              <figcaption className="flex flex-wrap items-center gap-2">
                <MakerMark char={maker.surnameChar} size={28} label={maker.surnameChar} />
                <span className="text-base font-semibold text-ink">{fill(tr(page.noteHeading, lang), { maker: makerName })}</span>
                <Badge variant="demo" />
              </figcaption>
              {/* Her own words, in her own language, never translated by the page. */}
              <blockquote lang={maker.lang} className="m-0 text-base whitespace-pre-line text-ink">
                {note[maker.lang]}
              </blockquote>
            </figure>
          )}
        </>
      )}
    </section>
  );
}
