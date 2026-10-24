// Event-schema validation of every scripted timeline in src/mock/timelines/ and of the scenario
// replies. `npm run check` runs this as its own step. Before S2 there is nothing to validate.
import { describe, expect, it } from "vitest";
import { validateEvents } from "../core/validate";
import { mockAnswers } from "./mockAnswers";
import { loadTimeline, timelineIds } from "./timelines";

describe("scripted timelines validate against events.md", () => {
  const ids = timelineIds();

  it("finds the timelines folder (or none yet)", () => {
    expect(Array.isArray(ids)).toBe(true);
  });

  for (const id of ids) {
    it(`timeline ${id}: every event is valid`, () => {
      const t = loadTimeline(id);
      expect(t.events.length, `src/mock/timelines/${id}.ts exports no Timeline with events`).toBeGreaterThan(0);
      expect(validateEvents(t.events)).toEqual([]);
    });

    it(`timeline ${id}: IDs are unique and at never goes backwards`, () => {
      const t = loadTimeline(id);
      const seen = new Set<string>();
      const dupes = t.events.filter((e) => (seen.has(e.id) ? true : (seen.add(e.id), false))).map((e) => e.id);
      expect(dupes).toEqual([]);
      const back = t.events.filter((e, i) => i > 0 && e.at < t.events[i - 1].at).map((e) => e.id);
      expect(back).toEqual([]);
      expect(t.events.every((e) => e.at <= t.durationMs)).toBe(true);
    });
  }

  const replies = mockAnswers().scenarioReplies;
  if (replies) {
    it("scenarioReplies: every event is valid", () => {
      expect(validateEvents(replies)).toEqual([]);
    });
  }
});
