// The buyer phone: one step at a time, chosen from the store. Concierge and grid, then the maker's
// story, then the split and checkout, then the receipt. Once an order exists the receipt step stays,
// so d11-receipt finds it. The step comes only from events, so seek() lands on the same screen.
// On the public build the checkout shows L6 in pay's place here too (M-buyer T4).
import type { SourceKey } from "../../core/events";
import type { SlotProps } from "../../core/featureTypes";
import type { BuyerState } from "../../core/state";
import { useCindia } from "../../core/store";
import { Panel } from "../../ui/Panel";
import { Checkout } from "./Checkout";
import { ConciergeChat } from "./ConciergeChat";
import { CuratedGrid } from "./CuratedGrid";
import { PriceSplit } from "./PriceSplit";
import { Receipt } from "./Receipt";
import { StoryCard } from "./StoryCard";
import { label, tr } from "./strings";

const SOURCE_KEYS: SourceKey[] = ["b09-concierge", "b10-derived", "b04-bank"];

export type BuyerStep = "ask" | "story" | "pay" | "receipt";

/** Which step the phone shows, from the buyer state alone. */
export function buyerStep(b: BuyerState): BuyerStep {
  if (b.orderIds.length > 0) return "receipt";
  if (b.latestSplitPieceId !== null || b.checkout !== null) return "pay";
  if (b.openPieceId !== null) return "story";
  return "ask";
}

const TITLES = {
  ask: label.concierge,
  story: label.maker,
  pay: label.priceSplit,
  receipt: label.receipt,
} as const;

const selectStep = (s: { buyer: BuyerState }) => buyerStep(s.buyer);
const selectOpenPiece = (s: { buyer: BuyerState }) => s.buyer.openPieceId;

export function BuyerFlow({ lang, publicSite = false }: SlotProps) {
  const step = useCindia(selectStep);
  const openPieceId = useCindia(selectOpenPiece);

  return (
    <Panel
      sourceKeys={SOURCE_KEYS}
      density="phone"
      lang={lang}
      title={tr(TITLES[step], lang)}
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div
        data-step={step}
        style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-16)", minHeight: 0 }}
      >
        {step === "ask" && (
          <>
            <ConciergeChat lang={lang} />
            <CuratedGrid lang={lang} />
          </>
        )}
        {step === "story" && openPieceId !== null && <StoryCard lang={lang} pieceId={openPieceId} />}
        {step === "pay" && (
          <>
            <PriceSplit lang={lang} />
            <Checkout lang={lang} publicSite={publicSite} />
          </>
        )}
        {step === "receipt" && (
          <>
            <Receipt lang={lang} />
            <Checkout lang={lang} publicSite={publicSite} />
          </>
        )}
      </div>
    </Panel>
  );
}
