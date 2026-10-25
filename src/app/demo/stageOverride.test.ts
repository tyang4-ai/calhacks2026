import { describe, expect, it } from "vitest";
import type { LogEntry } from "../../core/state";
import {
  NO_OVERRIDE,
  currentOverride,
  newestBeatId,
  shownDrawer,
  shownProcess,
  stageNavigator,
  withClosedDrawer,
  withOpenDrawer,
  withProcessOverride,
  type StageOverride,
} from "./stageOverride";

const entry = (id: string, type: LogEntry["type"], at = 0): LogEntry => ({ id, type, at, source: "scripted" });

describe("the stage override", () => {
  it("finds the newest beat.started in the log", () => {
    expect(newestBeatId([])).toBeNull();
    expect(newestBeatId([entry("e1", "beat.started"), entry("e2", "piece.opened"), entry("e3", "beat.started"), entry("e4", "split.shown")])).toBe("e3");
    expect(newestBeatId([entry("e2", "piece.opened")])).toBeNull();
  });

  it("holds only while the newest beat.started and the player's epoch are unchanged", () => {
    const held = { value: { drawer: "support" as const }, stamp: { beatEventId: "e3", epoch: 4 } };
    expect(currentOverride(held, { beatEventId: "e3", epoch: 4 })).toEqual({ drawer: "support" });
    // The next beat.started clears it.
    expect(currentOverride(held, { beatEventId: "e9", epoch: 4 })).toBe(NO_OVERRIDE);
    // A seek or a reset clears it.
    expect(currentOverride(held, { beatEventId: "e3", epoch: 5 })).toBe(NO_OVERRIDE);
    expect(currentOverride(null, { beatEventId: null, epoch: 0 })).toBe(NO_OVERRIDE);
  });

  it("gives the shown frame the override, or else the beat's drawer and process", () => {
    expect(shownDrawer(NO_OVERRIDE, null)).toBeNull();
    expect(shownDrawer(NO_OVERRIDE, "support")).toBe("support");
    expect(shownDrawer(withOpenDrawer(NO_OVERRIDE, "ask"), "support")).toBe("ask");
    // A person closing the beat's drawer keeps it closed until the next beat.
    expect(shownDrawer(withClosedDrawer(withOpenDrawer(NO_OVERRIDE, "ask")), "support")).toBeNull();
    expect(shownProcess(NO_OVERRIDE, "swarm")).toBe("swarm");
    expect(shownProcess(withProcessOverride(NO_OVERRIDE, "money"), "swarm")).toBe("money");
    expect(shownProcess(withProcessOverride(NO_OVERRIDE, null), "swarm")).toBeNull();
  });

  it("keeps ref only for the audit drawer", () => {
    expect(withOpenDrawer(NO_OVERRIDE, "audit", "flg_01")).toEqual({ drawer: "audit", ref: "flg_01" });
    expect(withOpenDrawer({ drawer: "audit", ref: "flg_01" }, "support", "x")).toEqual({ drawer: "support", ref: undefined });
  });

  it("makes navigate() do nothing, and openDrawer() and setProcess() set the override", () => {
    let o: StageOverride = NO_OVERRIDE;
    let calls = 0;
    const nav = stageNavigator((fn) => {
      calls++;
      o = fn(o);
    });
    nav.navigate("/sell/overview");
    expect(calls).toBe(0);
    nav.openDrawer("support");
    nav.setProcess("swarm");
    expect(o).toEqual({ drawer: "support", ref: undefined, process: "swarm" });
    nav.setProcess(null);
    expect(o.process).toBeNull();
  });
});
