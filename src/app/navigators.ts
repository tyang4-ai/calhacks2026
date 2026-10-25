// The router navigator (src/core/nav.ts, registerNavigator): on every route but /demo, navigate()
// is a react-router navigation with no page load, openDrawer() sets ?drawer= (and ?ref= for audit),
// and setProcess() sets or clears ?process=. The stage registers its own navigator on /demo
// (src/app/demo/stageOverride.ts).
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { registerNavigator, type CindiaNavigator } from "../core/nav";
import { searchString, withDrawer } from "./useDrawer";
import { withProcess } from "./useProcessParam";

export interface Where {
  pathname: string;
  search: string;
}

/** The router navigator over a `go` (react-router's navigate) and the current location. */
export function routerNavigator(go: (to: string) => void, where: () => Where): CindiaNavigator {
  const at = (next: URLSearchParams) => `${where().pathname}${searchString(next)}`;
  return {
    navigate: (path) => go(path),
    setProcess: (processId) => go(at(withProcess(new URLSearchParams(where().search), processId))),
    openDrawer: (drawer, ref) => go(at(withDrawer(new URLSearchParams(where().search), drawer, ref))),
  };
}

/** Registers the router navigator while `enabled` (every route but /demo). */
export function useRouterNavigator(enabled: boolean): void {
  const go = useNavigate();
  const location = useLocation();
  const goRef = useRef(go);
  const whereRef = useRef<Where>(location);
  useEffect(() => {
    goRef.current = go;
    whereRef.current = location;
  });
  useEffect(() => {
    if (!enabled) return;
    return registerNavigator(
      routerNavigator(
        (to) => {
          void goRef.current(to);
        },
        () => whereRef.current,
      ),
    );
  }, [enabled]);
}
