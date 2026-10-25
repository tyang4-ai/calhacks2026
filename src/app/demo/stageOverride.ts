// The stage navigator and its override (src/core/nav.ts, registerNavigator). On /demo the timeline
// drives the page, so navigate() does nothing, and openDrawer() and setProcess() set an override for
// the shown frame. The override clears at the next beat.started (the newest beat.started ID in
// store.log changes) and on every seek or reset (the player's epoch changes). The shown frame's
// drawer is the override, or else store.demo.drawer; its process view the override, or else
// store.demo.process. A person closing a beat's own drawer or view is an override too (null).
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { DrawerKind, ProcessId } from "../../core/events";
import { registerNavigator, type CindiaNavigator } from "../../core/nav";
import { player } from "../../core/player";
import type { LogEntry } from "../../core/state";
import { getState, useCindia } from "../../core/store";

/** undefined: no override, the beat decides. null: closed by a person. */
export interface StageOverride {
  drawer?: DrawerKind | null;
  /** The audit drawer's entity. */
  ref?: string;
  process?: ProcessId | null;
}

/** When an override was set: it holds only while both are unchanged. */
export interface OverrideStamp {
  beatEventId: string | null;
  epoch: number;
}

export const NO_OVERRIDE: StageOverride = {};

/** The ID of the newest beat.started in the log, or null. */
export function newestBeatId(entries: readonly LogEntry[]): string | null {
  for (let i = entries.length - 1; i >= 0; i--) if (entries[i].type === "beat.started") return entries[i].id;
  return null;
}

export function sameStamp(a: OverrideStamp, b: OverrideStamp): boolean {
  return a.beatEventId === b.beatEventId && a.epoch === b.epoch;
}

/** The override in force now: the one held, while its stamp still matches, or none. */
export function currentOverride(held: { value: StageOverride; stamp: OverrideStamp } | null, now: OverrideStamp): StageOverride {
  return held && sameStamp(held.stamp, now) ? held.value : NO_OVERRIDE;
}

export function withOpenDrawer(o: StageOverride, drawer: DrawerKind, ref?: string): StageOverride {
  return { ...o, drawer, ref: drawer === "audit" ? ref : undefined };
}

export function withClosedDrawer(o: StageOverride): StageOverride {
  return { ...o, drawer: null, ref: undefined };
}

export function withProcessOverride(o: StageOverride, processId: ProcessId | null): StageOverride {
  return { ...o, process: processId };
}

/** The shown frame's drawer: the override, or else the beat's. */
export function shownDrawer(o: StageOverride, beatDrawer: DrawerKind | null): DrawerKind | null {
  return o.drawer !== undefined ? o.drawer : beatDrawer;
}

/** The shown frame's process view: the override, or else the beat's. */
export function shownProcess(o: StageOverride, beatProcess: ProcessId | null): ProcessId | null {
  return o.process !== undefined ? o.process : beatProcess;
}

/** The stage navigator over an updater of the override. */
export function stageNavigator(update: (fn: (o: StageOverride) => StageOverride) => void): CindiaNavigator {
  return {
    // The timeline drives the page on /demo.
    navigate: () => {},
    openDrawer: (drawer, ref) => update((o) => withOpenDrawer(o, drawer, ref)),
    setProcess: (processId) => update((o) => withProcessOverride(o, processId)),
  };
}

function stampNow(): OverrideStamp {
  return { beatEventId: newestBeatId(getState().log.entries), epoch: player.epoch() };
}

/**
 * Registers the stage navigator while the stage is mounted and returns the override in force,
 * with a close for the shown frame's drawer.
 */
export function useStageOverride(): { override: StageOverride; closeDrawer: () => void } {
  const beatEventId = useCindia((s) => newestBeatId(s.log.entries));
  const epoch = useSyncExternalStore(
    player.subscribe,
    () => player.epoch(),
    () => 0,
  );
  const [held, setHeld] = useState<{ value: StageOverride; stamp: OverrideStamp } | null>(null);

  const update = useCallback((fn: (o: StageOverride) => StageOverride) => {
    const stamp = stampNow();
    setHeld((prev) => ({ value: fn(currentOverride(prev, stamp)), stamp }));
  }, []);

  useEffect(() => registerNavigator(stageNavigator(update)), [update]);

  const closeDrawer = useCallback(() => update(withClosedDrawer), [update]);
  return { override: currentOverride(held, { beatEventId, epoch }), closeDrawer };
}
