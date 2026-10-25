// Drawers on routes live in the URL: ?drawer=support, ?drawer=ask, or ?drawer=audit&ref=<entity id>.
// One drawer at a time. Which kinds a page takes depends on its surface (drawerKindsFor). The pure
// helpers here build the next query; useDrawerParams reads the current one and closes it.
import { useCallback } from "react";
import { useSearchParams } from "react-router";
import type { DrawerKind } from "../core/events";
import type { SurfaceId } from "../core/featureTypes";

const ALL_DRAWERS: readonly DrawerKind[] = ["support", "ask", "audit"];
const SUPPORT_ONLY: readonly DrawerKind[] = ["support"];

/** The drawers a surface takes: Sell views take all three, Shop, store and maker pages only Help. */
export function drawerKindsFor(surface: SurfaceId): readonly DrawerKind[] {
  return surface === "studio" || surface === "owner" ? ALL_DRAWERS : SUPPORT_ONLY;
}

/** The open drawer in a query, or null when there's none or the page doesn't take that kind. */
export function parseDrawer(params: URLSearchParams, allowed: readonly DrawerKind[] = ALL_DRAWERS): DrawerKind | null {
  const raw = params.get("drawer");
  return raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as DrawerKind) : null;
}

/** ?ref=: the audit drawer's entity, or on /sell/approvals the approval it selects. */
export function parseRef(params: URLSearchParams): string | undefined {
  const ref = params.get("ref");
  return ref ? ref : undefined;
}

/**
 * The query with one drawer open. `ref` belongs to the audit drawer: it's set for audit, and an
 * audit drawer's ref goes when another drawer replaces it. Any other ?ref= (an approval) stays.
 */
export function withDrawer(params: URLSearchParams, drawer: DrawerKind, ref?: string): URLSearchParams {
  const next = new URLSearchParams(params);
  const wasAudit = params.get("drawer") === "audit";
  next.set("drawer", drawer);
  if (drawer === "audit") {
    if (ref) next.set("ref", ref);
    else next.delete("ref");
  } else if (wasAudit) next.delete("ref");
  return next;
}

/** The query with no drawer. An audit drawer takes its ref with it. */
export function withoutDrawer(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  if (params.get("drawer") === "audit") next.delete("ref");
  next.delete("drawer");
  return next;
}

/** A query as "?a=1&b=2", or "" when it's empty. */
export function searchString(params: URLSearchParams): string {
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** The route's open drawer for a surface, its ref, and a close that removes them from the URL. */
export function useDrawerParams(surface: SurfaceId) {
  const [params, setParams] = useSearchParams();
  const drawer = parseDrawer(params, drawerKindsFor(surface));
  const refId = parseRef(params);
  const close = useCallback(() => setParams((prev) => withoutDrawer(prev)), [setParams]);
  return { drawer, refId, close };
}
