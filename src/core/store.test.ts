import { afterEach, describe, expect, it } from "vitest";
import { SOURCE_KEYS, userEvent } from "./events";
import { cycleLang, emit, getState, onEvent, reset, resetEvents, setStoreMode, subscribe } from "./store";
import { sample } from "./testFixtures";

afterEach(() => reset());

describe("store", () => {
  it("starts with lang auto, mode scripted and every source scripted", () => {
    const s = getState();
    expect(s.lang).toBe("auto");
    expect(s.mode).toBe("scripted");
    expect(Object.keys(s.sources).toSorted()).toEqual([...SOURCE_KEYS].toSorted());
    expect(Object.values(s.sources).every((v) => v === "scripted")).toBe(true);
  });

  it("cycles the language auto, en, zh, auto", () => {
    expect([cycleLang(), cycleLang(), cycleLang()]).toEqual(["en", "zh", "auto"]);
  });

  it("notifies subscribers and event listeners", () => {
    let calls = 0;
    const seen: string[] = [];
    const un1 = subscribe(() => calls++);
    const un2 = onEvent((e) => seen.push(e.type));
    emit(sample("piece.opened"));
    expect(calls).toBe(1);
    expect(seen).toEqual(["piece.opened"]);
    un1();
    un2();
  });

  it("a live account.synced clears only b04-bank", () => {
    emit(sample("account.synced", {}, { source: "live", id: "evt_live_0001" }));
    const s = getState().sources;
    expect(s["b04-bank"]).toBe("live");
    expect(SOURCE_KEYS.filter((k) => s[k] === "live")).toEqual(["b04-bank"]);
  });

  it("resetEvents keeps the mode and the language", () => {
    setStoreMode("live");
    cycleLang();
    emit(sample("piece.opened"));
    resetEvents();
    const s = getState();
    expect(s.mode).toBe("live");
    expect(s.lang).toBe("en");
    expect(s.buyer.openPieceId).toBeNull();
  });

  it("userEvent builds a person's event", () => {
    const a = userEvent("ask.asked", { questionId: "ask_user_1", text: "hi", lang: "en" });
    const b = userEvent("ask.asked", { questionId: "ask_user_2", text: "hi", lang: "en" });
    expect(a.source).toBe("user");
    expect(a.id).toMatch(/^evt_user_\d{4}$/);
    expect(b.id).not.toBe(a.id);
    expect(a.key).toBeUndefined();
    expect(typeof a.at).toBe("number");
  });
});
