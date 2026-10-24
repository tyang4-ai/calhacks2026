// Drawers open and close from the URL only: ?drawer=ask, or ?drawer=audit&ref=<entity id>.
// No store state. One drawer at a time.
import { useCallback } from "react";
import { useSearchParams } from "react-router";
import type { DrawerId } from "./surfaces/views";

export function useDrawerParams() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("drawer");
  const drawer: DrawerId | null = raw === "ask" || raw === "audit" ? raw : null;
  const refId = drawer === "audit" ? (params.get("ref") ?? undefined) : undefined;

  const open = useCallback(
    (d: DrawerId, ref?: string) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("drawer", d);
        if (d === "audit" && ref) next.set("ref", ref);
        else next.delete("ref");
        return next;
      });
    },
    [setParams],
  );

  const close = useCallback(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("drawer");
      next.delete("ref");
      return next;
    });
  }, [setParams]);

  return { drawer, refId, open, close };
}

/** The current search params minus the drawer, for links that switch views. */
export function withoutDrawer(search: URLSearchParams): string {
  const next = new URLSearchParams(search);
  next.delete("drawer");
  next.delete("ref");
  const s = next.toString();
  return s ? `?${s}` : "";
}
