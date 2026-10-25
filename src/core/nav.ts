// Navigation for features (ui-contract.md). Features build paths with the route builders and move
// with navigate(), setProcess() and openDrawer(). They never touch window.location. The shell
// registers the real navigator with registerNavigator(): a router version on every route, and a
// stage version on /demo. Until one is registered, the three calls are safe no-ops.
import type { DrawerKind, ProcessId } from "./events";
import type { SellView } from "./featureTypes";

/** What the shell registers. Named so it never shadows the DOM's own Navigator type. */
export interface CindiaNavigator {
  navigate(path: string): void;
  setProcess(processId: ProcessId | null): void;
  openDrawer(drawer: DrawerKind, ref?: string): void;
}

const enc = encodeURIComponent;

/** Joins query pairs into "?a=1&b=2", or "" when there are none. Values are URI-encoded. */
function query(pairs: [string, string][]): string {
  return pairs.length ? `?${pairs.map(([k, v]) => `${k}=${enc(v)}`).join("&")}` : "";
}

export function shopRoute(): string {
  return "/shop";
}

/** /shop/search with ?q= and one ?k= per keyword, in order. */
export function searchRoute({ q, k = [] }: { q?: string; k?: string[] }): string {
  const pairs: [string, string][] = [];
  if (q) pairs.push(["q", q]);
  for (const word of k) pairs.push(["k", word]);
  return `/shop/search${query(pairs)}`;
}

export function pieceRoute(pieceId: string): string {
  return `/shop/piece/${enc(pieceId)}`;
}

export function communityRoute(communityId: string): string {
  return `/shop/community/${enc(communityId)}`;
}

/** /shop/projects, or /shop/projects/<id> for a prj_ or a wip_. */
export function projectsRoute(id?: string): string {
  return id ? `/shop/projects/${enc(id)}` : "/shop/projects";
}

export function receiptRoute(orderId: string): string {
  return `/shop/receipt/${enc(orderId)}`;
}

export function storeRoute(slug: string): string {
  return `/store/${enc(slug)}`;
}

/** /sell/<view>, with ?drawer= and ?ref= when given (?ref= alone selects an approval on /sell/approvals). */
export function sellRoute(view: SellView, { drawer, ref }: { drawer?: DrawerKind; ref?: string } = {}): string {
  const pairs: [string, string][] = [];
  if (drawer) pairs.push(["drawer", drawer]);
  if (ref) pairs.push(["ref", ref]);
  return `/sell/${view}${query(pairs)}`;
}

export function makerRoute(makerId: string): string {
  return `/maker/${enc(makerId)}`;
}

let current: CindiaNavigator | null = null;

/**
 * Registers the shell's navigator. Returns a function that unregisters it; that function does
 * nothing once another navigator has taken its place.
 */
export function registerNavigator(impl: CindiaNavigator): () => void {
  current = impl;
  return () => {
    if (current === impl) current = null;
  };
}

/** Goes to a path. A no-op until the shell registers a navigator, and on /demo. */
export function navigate(path: string): void {
  current?.navigate(path);
}

/** Opens a process view (?process=), or closes it with null. A no-op until the shell registers a navigator. */
export function setProcess(processId: ProcessId | null): void {
  current?.setProcess(processId);
}

/** Opens a drawer, with ref for the audit drawer. A no-op until the shell registers a navigator. */
export function openDrawer(drawer: DrawerKind, ref?: string): void {
  current?.openDrawer(drawer, ref);
}
