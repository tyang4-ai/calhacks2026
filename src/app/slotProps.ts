// Each slot's props, from the page it sits on (the route on a route, the stage's page on /demo) and
// the shell's state. A pure function, so the table in docs/plans/I2-shell.md (Slot props) has unit
// tests. Slot.tsx forwards the whole result to the feature and writes it to data-slot-props.
import type { ProcessId } from "../core/events";
import type { SellView, SlotId, SlotProps, SurfaceId } from "../core/featureTypes";

/** The Shop site's pages, legacy being the Phase A page /shop/legacy. */
export type ShopPage = "home" | "search" | "piece" | "community" | "projects" | "receipt" | "legacy";

/** The four surfaces with a frame. owner renders inside the Sell frame. */
export type FrameSurface = Exclude<SurfaceId, "owner">;

/** Where a slot sits: its frame, the page's route IDs and the shell's state. */
export interface SlotContext {
  surface: FrameSurface;
  /** The frame's resolved language. owner.main uses it too: the Sell site's language. */
  lang: "en" | "zh";
  publicSite: boolean;
  shopPage?: ShopPage;
  sellView?: SellView;
  pieceId?: string;
  orderId?: string;
  communityId?: string;
  /** A prj_ or a wip_, undefined on the projects list. */
  projectId?: string;
  slug?: string;
  makerId?: string;
  searchParams?: { q?: string; k: string[] };
  /** ?ref=: the audit drawer's entity, or the approval /sell/approvals selects. */
  refId?: string;
  /** The open process view, or null. */
  processId?: ProcessId | null;
}

/** Drops the keys whose value is undefined, so the props and their JSON hold only what's set. */
function compact(p: SlotProps): SlotProps {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) if (v !== undefined) out[k] = v;
  return out as unknown as SlotProps;
}

/** shop.search.main's searchParams: q only when it has text, k always an array. */
function normalSearch(sp: SlotContext["searchParams"]): { q?: string; k: string[] } {
  const k = [...(sp?.k ?? [])];
  return sp?.q ? { q: sp.q, k } : { k };
}

/** The props the shell passes to one slot, beyond surface and lang as the table sets them. */
export function slotProps(slot: SlotId, ctx: SlotContext): SlotProps {
  const base: SlotProps = { surface: slot === "owner.main" ? "owner" : ctx.surface, lang: ctx.lang };
  if (ctx.publicSite) base.publicSite = true;
  const processId = ctx.processId ?? undefined;
  switch (slot) {
    case "shop.search.main":
      return compact({ ...base, searchParams: normalSearch(ctx.searchParams) });
    case "shop.piece.main":
    case "shop.piece.side":
      return compact({ ...base, pieceId: ctx.pieceId });
    case "shop.community.main":
      return compact({ ...base, communityId: ctx.communityId });
    case "shop.projects.main":
      return compact({ ...base, projectId: ctx.projectId });
    case "shop.receipt.main":
      return compact({ ...base, orderId: ctx.orderId });
    case "shop.drawer.support":
      return compact({
        ...base,
        side: "buyer",
        pieceId: ctx.surface === "buyer" && ctx.shopPage === "piece" ? ctx.pieceId : undefined,
        orderId: ctx.surface === "buyer" && ctx.shopPage === "receipt" ? ctx.orderId : undefined,
        slug: ctx.surface === "store" ? ctx.slug : undefined,
      });
    case "studio.drawer.support":
      return compact({ ...base, side: "seller", makerId: ctx.surface === "maker" ? ctx.makerId : undefined });
    case "studio.drawer.audit":
      return compact({ ...base, refId: ctx.refId });
    case "owner.main":
      return compact({ ...base, refId: ctx.sellView === "approvals" ? ctx.refId : undefined });
    case "process.bar":
    case "process.view":
      return compact({ ...base, processId });
    case "maker.main":
    case "maker.side":
      return compact({ ...base, makerId: ctx.makerId });
    case "store.main":
      return compact({ ...base, slug: ctx.slug });
    default:
      return compact(base);
  }
}

/** A slot's props as data-slot-props shows them: the JSON of every prop but functions. */
export function slotPropsJson(props: SlotProps): string {
  return JSON.stringify(props, (_k, v: unknown) => (typeof v === "function" ? undefined : v));
}
