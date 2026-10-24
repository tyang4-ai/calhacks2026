import { describe, expect, it } from "vitest";
import { EVENT_TYPES, type EventType } from "./events";
import { SAMPLE_PAYLOADS, sample } from "./testFixtures";
import { validateEvent } from "./validate";

describe("validateEvent", () => {
  it("covers every event type in events.md", () => {
    expect(Object.keys(SAMPLE_PAYLOADS).toSorted()).toEqual([...EVENT_TYPES].toSorted());
  });

  for (const type of EVENT_TYPES) {
    describe(type, () => {
      it("accepts a good event", () => {
        expect(validateEvent(sample(type))).toEqual([]);
      });

      it("rejects a bad event", () => {
        const e = sample(type as EventType) as unknown as { payload: Record<string, unknown> };
        const first = Object.keys(e.payload)[0];
        // Wrong type for the first field: a number becomes a string, anything else becomes a number.
        e.payload[first] = typeof e.payload[first] === "number" ? "oops" : 42;
        expect(validateEvent(e).length).toBeGreaterThan(0);
      });

      it("rejects a missing field and an unknown field", () => {
        const e = sample(type as EventType) as unknown as { payload: Record<string, unknown> };
        const first = Object.keys(e.payload)[0];
        delete e.payload[first];
        expect(validateEvent(e).some((p) => p.includes(`${first}: missing`))).toBe(true);
        const f = sample(type as EventType) as unknown as { payload: Record<string, unknown> };
        f.payload.notInContract = 1;
        expect(validateEvent(f).some((p) => p.includes("notInContract"))).toBe(true);
      });
    });
  }

  it("rejects an unknown type, a bad envelope and a bad key", () => {
    expect(validateEvent({ id: "evt_1", type: "nope.done", at: 0, source: "scripted", payload: {} })).not.toEqual([]);
    expect(validateEvent({ ...sample("piece.opened"), at: -1 })).not.toEqual([]);
    expect(validateEvent({ ...sample("piece.opened"), source: "robot" })).not.toEqual([]);
    expect(validateEvent({ ...sample("piece.opened"), key: "b99-nope" })).not.toEqual([]);
    expect(validateEvent({ ...sample("piece.opened"), id: "x" })).not.toEqual([]);
    expect(validateEvent({ ...sample("piece.opened"), extra: 1 })).not.toEqual([]);
    expect(validateEvent(null)).not.toEqual([]);
  });

  it("checks cents are integers, dates are dates, and the token's shape", () => {
    expect(validateEvent(sample("split.shown", { grossCents: 180.5 }))).not.toEqual([]);
    expect(validateEvent(sample("order.placed", { date: "Sep 1" }))).not.toEqual([]);
    expect(validateEvent(sample("card.tokenized", { token: "tok_short" }))).not.toEqual([]);
    expect(validateEvent(sample("concierge.answered", { pieceIds: ["pc_01"] }))).not.toEqual([]);
    expect(validateEvent(sample("beat.started", { camera: "drone" as never }))).not.toEqual([]);
  });

  it("checks the ID prefix for live and user events", () => {
    expect(validateEvent(sample("account.synced", {}, { source: "live", id: "evt_live_0001" }))).toEqual([]);
    expect(validateEvent(sample("account.synced", {}, { source: "live", id: "evt_0001" }))).not.toEqual([]);
    expect(validateEvent(sample("ask.asked", {}, { source: "user", id: "evt_user_0001" }))).toEqual([]);
    expect(validateEvent(sample("ask.asked", {}, { source: "user", id: "evt_0001" }))).not.toEqual([]);
  });
});
