// The receipt page (M-buyer T5, slot shop.receipt.main): the Receipt centered in the Shop frame, for
// SlotProps.orderId, or the newest order in the store when the route sets none. One kit Panel with
// the receipt's source key, so it shows the Simulated badge while b10-derived is scripted, and a
// link back to Shop under it.
import type { SourceKey } from "../../core/events";
import type { SlotProps } from "../../core/featureTypes";
import { shopRoute } from "../../core/nav";
import { Link } from "../../ui/Link";
import { Panel } from "../../ui/Panel";
import { Receipt } from "./Receipt";
import { page, tr } from "./strings";

/** The receipt page renders receipt.updated, keyed b10-derived (ui-contract.md, Slots). */
const RECEIPT_KEYS: SourceKey[] = ["b10-derived"];

export function ReceiptPage({ lang, orderId }: SlotProps) {
  return (
    <div data-testid="buyer-receipt-page" className="flex min-h-0 w-full flex-col items-center gap-3">
      <Panel sourceKeys={RECEIPT_KEYS} lang={lang} title={tr(page.receiptHeading, lang)} style={{ width: "100%", maxWidth: 720 }}>
        <Receipt lang={lang} orderId={orderId} layout="page" />
      </Panel>
      <div className="w-full max-w-[720px] text-sm">
        <Link to={shopRoute()}>← {tr(page.backToShop, lang)}</Link>
      </div>
    </div>
  );
}
