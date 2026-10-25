// B08's owner screen (B13-live T7): start(emit) polls the pending list only on
// /sell/approvals?screen=owner, and after forwarding a person's decision produce() answers [], so
// the scripted answer to that decision plays. Runs with a fake window.location and a fake fetch.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent, type CindiaEvent } from "../../core/events";
import { initialState } from "../../core/state";
import adapter, { onOwnerRoute } from "./b08-approvals";

interface Call {
  url: string;
  init: RequestInit;
}

let calls: Call[] = [];

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

function pendingEvent(): CindiaEvent {
  return {
    id: "evt_live_0801",
    type: "approval.requested",
    at: 0,
    source: "live",
    key: "b08-approvals",
    payload: { approvalId: "apr_05" },
  };
}

function fakeFetch(url: string, init: RequestInit = {}) {
  calls.push({ url, init });
  if (url === "/api/b08/approvals?status=pending") return Promise.resolve(okResponse({ events: [pendingEvent()] }));
  if (url.endsWith("/decision")) {
    const body = JSON.parse(String(init.body)) as { trigger: CindiaEvent; decision: string };
    const type = body.decision === "granted" ? "approval.granted" : "approval.declined";
    // The server echoes the decision as live. The adapter must not hand it back.
    return Promise.resolve(
      okResponse({ events: [{ ...body.trigger, id: "evt_live_0802", type, source: "live", key: "b08-approvals" }] }),
    );
  }
  if (url === "/api/b08/status") return Promise.resolve(okResponse({ ownerConnected: false }));
  return Promise.reject(new Error(`unexpected ${url}`));
}

function setRoute(pathname: string, search = "") {
  vi.stubGlobal("window", { location: { pathname, search } });
}

function pendingPolls(): number {
  return calls.filter((c) => c.url === "/api/b08/approvals?status=pending").length;
}

/** Starts the adapter, lets two poll intervals pass, and stops it. */
async function pollFor(ms: number): Promise<CindiaEvent[]> {
  const emitted: CindiaEvent[] = [];
  const stop = adapter.start!((e) => emitted.push(e));
  await vi.advanceTimersByTimeAsync(ms);
  stop();
  return emitted;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
  calls = [];
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("b08-approvals owner route", () => {
  it("counts only /sell/approvals with screen=owner as the owner screen", () => {
    setRoute("/sell/approvals", "?screen=owner");
    expect(onOwnerRoute()).toBe(true);
    setRoute("/sell/approvals/", "?ref=apr_05&screen=owner");
    expect(onOwnerRoute()).toBe(true);
    setRoute("/sell/approvals", "");
    expect(onOwnerRoute()).toBe(false);
    setRoute("/sell/approvals", "?screen=console");
    expect(onOwnerRoute()).toBe(false);
    setRoute("/owner", "?screen=owner");
    expect(onOwnerRoute()).toBe(false);
    setRoute("/owner", "");
    expect(onOwnerRoute()).toBe(false);
    setRoute("/sell", "?screen=owner");
    expect(onOwnerRoute()).toBe(false);
    setRoute("/demo", "");
    expect(onOwnerRoute()).toBe(false);
  });

  it("polls the pending list on the owner screen and emits each request", async () => {
    setRoute("/sell/approvals", "?screen=owner");
    const emitted = await pollFor(4100);
    expect(pendingPolls()).toBeGreaterThanOrEqual(2);
    expect(emitted.length).toBeGreaterThanOrEqual(1);
    expect(emitted.every((e) => e.type === "approval.requested")).toBe(true);
  });

  it("fetches nothing on the plain Sell approvals page, the old /owner route or the tour", async () => {
    for (const [path, search] of [
      ["/sell/approvals", ""],
      ["/sell/approvals", "?ref=apr_05"],
      ["/owner", ""],
      ["/demo", ""],
    ] as const) {
      setRoute(path, search);
      calls = [];
      const emitted = await pollFor(4100);
      expect(calls, `${path}${search}`).toEqual([]);
      expect(emitted).toEqual([]);
    }
  });

  it("stops polling when the owner screen navigates away", async () => {
    setRoute("/sell/approvals", "?screen=owner");
    const stop = adapter.start!(() => undefined);
    await vi.advanceTimersByTimeAsync(100);
    const before = pendingPolls();
    expect(before).toBe(1);
    setRoute("/sell/approvals", "");
    await vi.advanceTimersByTimeAsync(6100);
    expect(pendingPolls()).toBe(before);
    stop();
  });
});

describe("b08-approvals decisions", () => {
  it("forwards a person's grant and answers [], so the scripted answer plays", async () => {
    setRoute("/sell/approvals", "?screen=owner");
    const grant = userEvent("approval.granted", { approvalId: "apr_05", by: "own_01", date: "2026-10-01" });
    const out = await adapter.produce(grant, initialState());
    expect(out).toEqual([]);
    const posts = calls.filter((c) => c.url === "/api/b08/approvals/apr_05/decision");
    expect(posts).toHaveLength(1);
    const body = JSON.parse(String(posts[0].init.body)) as { decision: string; trigger: CindiaEvent };
    expect(body.decision).toBe("granted");
    expect(body.trigger.id).toBe(grant.id);
  });

  it("forwards a person's decline with its reason and answers []", async () => {
    setRoute("/sell/approvals", "?screen=owner");
    const reason = { en: "Not this month", zh: "Not this month" };
    const decline = userEvent("approval.declined", { approvalId: "apr_04", by: "own_01", reason });
    const out = await adapter.produce(decline, initialState());
    expect(out).toEqual([]);
    const post = calls.find((c) => c.url === "/api/b08/approvals/apr_04/decision");
    const body = JSON.parse(String(post?.init.body)) as { decision: string; reason: unknown };
    expect(body.decision).toBe("declined");
    expect(body.reason).toEqual(reason);
  });

  it("answers a scripted grant with [] at once when no owner screen is connected", async () => {
    setRoute("/demo", "");
    const scripted: CindiaEvent = {
      id: "evt_0149",
      type: "approval.granted",
      at: 39800,
      source: "scripted",
      key: "b08-approvals",
      payload: { approvalId: "apr_01", by: "own_01", date: "2026-10-01" },
    };
    const out = await adapter.produce(scripted, initialState());
    expect(out).toEqual([]);
    expect(calls.map((c) => c.url)).toEqual(["/api/b08/status"]);
  });
});
