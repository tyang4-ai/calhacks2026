// B11's adapter (B11-embed T7): the pure checks on health, the model status, the map request and
// the map answer, then the calls with a fake fetch. produce() never calls, health() gives up at
// 3 seconds, and liveMap() resolves null on anything but a valid search.mapped.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CindiaEvent, Payloads } from "../../core/events";
import adapter, { healthListsModel, liveMap, mapRequest, modelIsReady, modelReady, readMapped } from "./b11-embed";

const query = {
  id: "evt_user_1",
  type: "search.queried",
  at: 1200,
  source: "user",
  payload: { queryId: "qry_user_1", text: "a warm gift for my mom", keywords: ["warm", "gift for mom"], lang: "en" },
} as unknown as CindiaEvent;

const mapped = (over: Record<string, unknown> = {}, payload: Record<string, unknown> = {}) => ({
  id: "evt_live_111234560001",
  type: "search.mapped",
  at: 1200,
  source: "live",
  key: "b11-embed",
  payload: {
    queryId: "qry_user_1",
    modelId: "cindia-embed-v1",
    points: [
      { pieceId: "pc_01", x: 0.1, y: 0.2 },
      { pieceId: "pc_02", x: -0.3, y: 0.4 },
    ],
    query: { x: 0.0, y: 0.1 },
    method: "pca",
    ...payload,
  },
  ...over,
});

function respond(map: Record<string, unknown>) {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${url}`);
    const body = map[url];
    if (body instanceof Error) throw body;
    if (body === undefined) return new Response("{}", { status: 404 });
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("pure checks", () => {
  it("reads health and the model status", () => {
    expect(healthListsModel({ routers: ["b01", "b11"], services: { model: true } })).toBe(true);
    expect(healthListsModel({ routers: ["b01"], services: { model: true } })).toBe(false);
    expect(healthListsModel({ routers: ["b11"], services: { model: false } })).toBe(false);
    expect(healthListsModel(null)).toBe(false);
    expect(modelIsReady({ trained: true, warm: true })).toBe(true);
    expect(modelIsReady({ trained: true, warm: false })).toBe(false);
    expect(modelIsReady({ trained: false, warm: true })).toBe(false);
  });

  it("builds the map body only for a search with words or chips", () => {
    expect(mapRequest(query)).toEqual({ trigger: query, queryId: "qry_user_1", text: "a warm gift for my mom", keywords: ["warm", "gift for mom"] });
    const empty = { ...query, payload: { ...(query.payload as Payloads["search.queried"]), text: "  ", keywords: [] } } as CindiaEvent;
    expect(mapRequest(empty)).toBeNull();
    expect(mapRequest({ ...query, type: "model.trained" } as CindiaEvent)).toBeNull();
  });

  it("keeps only a valid, keyed search.mapped for the request", () => {
    expect(readMapped({ events: [mapped()] }, "qry_user_1")?.payload.points).toHaveLength(2);
    expect(readMapped({ events: [] }, "qry_user_1")).toBeNull();
    expect(readMapped({ events: [mapped()] }, "qry_user_2")).toBeNull();
    expect(readMapped({ events: [mapped({ key: "b12-search" })] }, "qry_user_1")).toBeNull();
    expect(readMapped({ events: [mapped({ id: "evt_123" })] }, "qry_user_1")).toBeNull();
    expect(readMapped({ events: [mapped({}, { method: "umap" })] }, "qry_user_1")).toBeNull();
    expect(readMapped({ events: [mapped({}, { points: [] })] }, "qry_user_1")).toBeNull();
    const dup = [
      { pieceId: "pc_01", x: 0, y: 0 },
      { pieceId: "pc_01", x: 1, y: 1 },
    ];
    expect(readMapped({ events: [mapped({}, { points: dup })] }, "qry_user_1")).toBeNull();
    expect(readMapped({ events: [mapped({}, { query: { x: "a" } })] }, "qry_user_1")).toBeNull();
  });
});

describe("calls", () => {
  it("produce() returns [] with no call, for every event", async () => {
    const calls = respond({});
    expect(await adapter.produce(mapped() as unknown as CindiaEvent, {} as never)).toEqual([]);
    expect(await adapter.produce(query, {} as never)).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("health() needs b11 listed with the model, then trained and warm", async () => {
    let calls = respond({ "/api/health": { routers: ["b11"], services: { model: true } }, "/api/b11/model": { trained: true, warm: true } });
    expect(await adapter.health()).toBe(true);
    expect(calls).toEqual(["GET /api/health", "GET /api/b11/model"]);
    calls = respond({ "/api/health": { routers: ["b11"], services: { model: true } }, "/api/b11/model": { trained: true, warm: false } });
    expect(await adapter.health()).toBe(false);
    calls = respond({ "/api/health": { routers: ["b01"], services: { model: true } } });
    expect(await adapter.health()).toBe(false);
    expect(calls).toEqual(["GET /api/health"]);
    respond({ "/api/health": new Error("down") });
    expect(await modelReady()).toBe(false);
  });

  it("health() gives up at 3 seconds", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))),
      ),
    );
    const p = adapter.health();
    await vi.advanceTimersByTimeAsync(2999);
    let done = false;
    void p.then(() => {
      done = true;
    });
    await Promise.resolve();
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(await p).toBe(false);
  });

  it("liveMap() posts the request and returns its search.mapped, or null", async () => {
    let calls = respond({ "/api/b11/map": { events: [mapped()] } });
    const got = await liveMap(query);
    expect(got?.type).toBe("search.mapped");
    expect(calls).toEqual(["POST /api/b11/map"]);
    respond({ "/api/b11/map": { events: [] } });
    expect(await liveMap(query)).toBeNull();
    respond({ "/api/b11/map": new Error("refused") });
    expect(await liveMap(query)).toBeNull();
    calls = respond({});
    expect(await liveMap({ ...query, type: "surprise.asked" } as CindiaEvent)).toBeNull();
    expect(calls).toEqual([]);
  });
});
