// window.__cindia = { player, store, emit } in every build, so Playwright can read the clock,
// seek and check state. Nothing else is exposed.
import type { CindiaEvent } from "./events";
import { player, type Player } from "./player";
import type { CindiaState } from "./state";
import { emit, store } from "./store";

export interface CindiaTestHooks {
  player: Player;
  store: { getState: () => CindiaState; subscribe: (l: () => void) => () => void; reset: () => void };
  emit: (e: CindiaEvent) => void;
}

declare global {
  interface Window {
    __cindia?: CindiaTestHooks;
  }
}

export function installTestHooks(): void {
  if (typeof window === "undefined") return;
  window.__cindia = { player, store, emit };
}
