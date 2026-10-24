// The mode switch and source health. ui-contract.md defines no URL parameter for the mode, so
// tests switch it with demo-mode-toggle.
import { useEffect, useSyncExternalStore } from "react";
import type { SourceKey } from "../core/events";
import type { Mode } from "../core/state";
import { getState, setStoreMode, useCindia } from "../core/store";
import { getRegistry } from "./registry";

/** How often useSourceHealth() polls each adapter's health() while live mode is on. */
export const HEALTH_POLL_MS = 5000;

/** Sets the store's mode. The registry starts adapters in live mode and stops them in scripted mode. */
export function setMode(mode: Mode): void {
  setStoreMode(mode);
}

export function toggleMode(): Mode {
  const next: Mode = getState().mode === "live" ? "scripted" : "live";
  setMode(next);
  return next;
}

export function useMode(): Mode {
  return useCindia((s) => s.mode);
}

/** Each key's adapter health, polled while live mode is on. A key with no adapter is false. */
export function useSourceHealth(): Record<SourceKey, boolean> {
  const registry = getRegistry();
  const mode = useMode();
  useEffect(() => {
    if (mode !== "live") return;
    void registry.refreshHealth();
    const t = setInterval(() => void registry.refreshHealth(), HEALTH_POLL_MS);
    return () => clearInterval(t);
  }, [mode, registry]);
  return useSyncExternalStore(registry.onHealth, registry.health, registry.health);
}
