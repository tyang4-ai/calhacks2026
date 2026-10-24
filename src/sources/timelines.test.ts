import { describe, expect, it } from "vitest";
import { loadTimeline, timelineIds } from "./timelines";

describe("timelines", () => {
  it("a missing timeline gives an empty one, the same object every time", () => {
    const t = loadTimeline("no-such-timeline");
    expect(t.id).toBe("no-such-timeline");
    expect(t.events).toEqual([]);
    expect(loadTimeline("no-such-timeline")).toBe(t);
  });

  it("every timeline found has events sorted by at", () => {
    for (const id of timelineIds()) {
      const t = loadTimeline(id);
      expect(t.id).toBe(id);
      for (let i = 1; i < t.events.length; i++) expect(t.events[i].at).toBeGreaterThanOrEqual(t.events[i - 1].at);
    }
  });
});
