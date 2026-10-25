// Finds every feature module with import.meta.glob and loads each one lazily. Which feature fills
// which slot comes from the Slots table in ui-contract.md, so the shell knows without loading code.
import { lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import type { FeatureModule, SlotId, SlotProps } from "../core/featureTypes";

/** The Slots table: the feature that fills each slot. */
export const SLOT_FEATURE: Record<SlotId, string> = {
  "buyer.main": "buyer",
  "studio.map.main": "money-map",
  "studio.month.main": "reconcile",
  "studio.month.side": "scenario",
  "studio.close.main": "close",
  "studio.close.side": "impact",
  "studio.proof.main": "proof",
  "studio.dashboard.main": "dashboard",
  "studio.drawer.ask": "ask-cindy",
  "studio.drawer.audit": "audit",
  "owner.main": "approvals",
  "maker.main": "maker-statement",
  // v2 slots. A slug whose folder doesn't exist yet renders the slot's placeholder.
  "process.bar": "process",
  "process.view": "process",
  "shop.home.main": "search",
  "shop.home.communities": "communities",
  "shop.search.main": "search",
  "shop.piece.main": "buyer",
  "shop.piece.side": "support",
  "shop.community.main": "communities",
  "shop.projects.main": "communities",
  "shop.receipt.main": "buyer",
  "shop.drawer.support": "support",
  "store.main": "storefront",
  "studio.overview.main": "seller-hub",
  "studio.listings.main": "seller-hub",
  "studio.storefront.main": "storefront",
  "studio.projects.main": "communities",
  "studio.proof.side": "search",
  "studio.watch.main": "watch",
  "studio.drawer.support": "support",
  "maker.side": "seller-hub",
};

const modules = import.meta.glob<{ default?: FeatureModule }>("../features/*/index.ts");

function pathFor(slug: string): string {
  return `../features/${slug}/index.ts`;
}

/** Feature slugs found on disk. */
export function featureSlugs(): string[] {
  return Object.keys(modules).map((p) => p.split("/")[2]);
}

const loaded = new Map<string, Promise<FeatureModule | null>>();

/** Loads one feature module once. A module whose id doesn't match its folder is skipped with a warning. */
export function loadFeature(slug: string): Promise<FeatureModule | null> {
  const hit = loaded.get(slug);
  if (hit) return hit;
  const importer = modules[pathFor(slug)];
  const p = importer
    ? importer().then((mod) => {
        const fm = mod.default;
        if (!fm || typeof fm !== "object" || !fm.slots) {
          console.warn(`[cindia shell] src/features/${slug}/index.ts has no FeatureModule default export, skipped`);
          return null;
        }
        if (fm.id !== slug) {
          console.warn(`[cindia shell] feature id "${fm.id}" doesn't match its folder "${slug}", skipped`);
          return null;
        }
        for (const s of Object.keys(fm.slots) as SlotId[]) {
          if (SLOT_FEATURE[s] !== slug) console.warn(`[cindia shell] feature "${slug}" fills slot ${s}, which belongs to "${SLOT_FEATURE[s] ?? "nobody"}", ignored`);
        }
        return fm;
      })
    : Promise.resolve(null);
  loaded.set(slug, p);
  return p;
}

/** True when the feature that fills this slot exists on disk. */
export function slotHasFeature(slot: SlotId): boolean {
  return pathFor(SLOT_FEATURE[slot]) in modules;
}

export interface SlotRenderers {
  filled: (C: ComponentType<SlotProps>, props: SlotProps) => ReactNode;
  empty: (props: SlotProps) => ReactNode;
}

const lazyCache = new Map<SlotId, LazyExoticComponent<ComponentType<SlotProps>>>();

/**
 * A lazy component for a slot whose feature exists on disk. It resolves to the feature's slot
 * component wrapped by `renderers.filled`, or to `renderers.empty` when the feature doesn't fill it.
 */
export function lazySlot(slot: SlotId, renderers: SlotRenderers): LazyExoticComponent<ComponentType<SlotProps>> {
  const hit = lazyCache.get(slot);
  if (hit) return hit;
  const L = lazy(async () => {
    const fm = await loadFeature(SLOT_FEATURE[slot]);
    const C = fm?.slots[slot];
    const Resolved: ComponentType<SlotProps> = C
      ? (props) => renderers.filled(C, props)
      : (props) => renderers.empty(props);
    return { default: Resolved };
  });
  lazyCache.set(slot, L);
  return L;
}
