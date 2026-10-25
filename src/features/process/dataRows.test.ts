// dataRows.ts: the data view's rows on a fresh store, lst_01's states in order, the index counts
// before and after a listing.indexed and a grant, a person's records, and B13's tables in live mode.
import { describe, expect, it } from "vitest";
import type { CindiaEvent, EventType, Payloads, ProcessId, ProcessStatus } from "../../core/events";
import { rootReducer } from "../../core/reducers";
import { initialState, type CindiaState } from "../../core/state";
import { allApprovals, demoDataSync, orders, pieces, report, swarmRuns } from "../../mock";
import { DATA_TABLES, dataTables, indexGroup, listingState, liveTables, modelGroup, scriptedTables, type TableRow } from "./dataRows";
import { indexDocs } from "./processes";

let n = 0;
function ev<T extends EventType>(type: T, payload: Payloads[T], at = 1000, extra: Partial<CindiaEvent> = {}): CindiaEvent {
  n += 1;
  return { id: `evt_t${n}`, type, at, source: "scripted", payload, ...extra } as CindiaEvent;
}

function apply(s: CindiaState, ...events: CindiaEvent[]): CindiaState {
  return events.reduce((acc, e) => rootReducer(acc, e), s);
}

const idle = (): ProcessStatus => "idle";
const statusOf = (id: ProcessId): ProcessStatus => (id === "data" ? "working" : id === "approvals" ? "attention" : "done");
const row = (tables: TableRow[], table: string) => tables.find((x) => x.table === table)!;

const run02 = swarmRuns.find((r) => r.runId === "run_02")!;
const drafted = run02.final.find((f) => f.type === "listing.drafted")!.payload as Payloads["listing.drafted"];
const indexed = run02.final.find((f) => f.type === "listing.indexed")!.payload as Payloads["listing.indexed"];

describe("scripted tables on a fresh store", () => {
  const tables = scriptedTables(initialState(), idle);

  it("lists the eight tables in order", () => {
    expect(tables.map((x) => x.table)).toEqual([...DATA_TABLES]);
  });

  it("counts 54 catalog rows, the last three pieces by ID newest first", () => {
    expect(row(tables, "catalog").rows).toBe(54);
    expect(row(tables, "catalog").rows).toBe(pieces.length);
    const ids = pieces.map((p) => p.id).toSorted();
    expect(row(tables, "catalog").newest.map((r) => r.id)).toEqual(ids.slice(-3).toReversed());
  });

  it("counts the five approvals from allApprovals, never the approvals export", () => {
    expect(row(tables, "approvals").rows).toBe(5);
    expect(row(tables, "approvals").rows).toBe(allApprovals.length);
  });

  it("counts the 30 orders, one listing, 11 processes and one screen, and no runs or steps yet", () => {
    expect(row(tables, "orders").rows).toBe(orders.length);
    expect(row(tables, "orders").rows).toBe(30);
    expect(row(tables, "listings").rows).toBe(1);
    expect(row(tables, "processes").rows).toBe(11);
    expect(row(tables, "screens").rows).toBe(1);
    expect(row(tables, "runs").rows).toBe(0);
    expect(row(tables, "steps").rows).toBe(0);
  });
});

describe("lst_01's states", () => {
  it("moves from requested to drafted to indexed to approved, and lists lst_01 first", () => {
    let s = initialState();
    expect(listingState(s, "lst_01")).toBeNull();
    s = apply(s, ev("listing.requested", { listingId: "lst_01", makerId: "mkr_02", notes: "notes", lang: "en" }, 1000));
    expect(listingState(s, "lst_01")).toBe("requested");
    s = apply(s, ev("listing.drafted", drafted, 2000));
    expect(listingState(s, "lst_01")).toBe("drafted");
    s = apply(s, ev("listing.indexed", indexed, 3000));
    expect(listingState(s, "lst_01")).toBe("indexed");
    expect(row(scriptedTables(s, idle), "listings").newest[0]).toMatchObject({ id: "lst_01", label: { en: "indexed" } });
    s = apply(s, ev("approval.requested", { approvalId: "apr_04" }, 4000), ev("approval.granted", { approvalId: "apr_04", by: "own_01", date: "2026-10-01" }, 5000));
    expect(listingState(s, "lst_01")).toBe("approved");
    expect(row(scriptedTables(s, idle), "listings").rows).toBe(1);
  });
});

describe("the index counts", () => {
  it("reads 54 and 0 at the start, 54 and 1 after the listing is indexed, then 55 and 0 after the grant", () => {
    let s = initialState();
    expect(indexGroup(s)).toMatchObject({ live: false, pieces: 54, drafts: 0, newest: null });
    expect(indexDocs(s)).toBe(54);
    s = apply(s, ev("listing.indexed", indexed, 3000));
    expect(indexGroup(s)).toMatchObject({ pieces: 54, drafts: 1, newest: { listingId: "lst_01", pieceId: indexed.pieceId, modelId: indexed.modelId } });
    expect(indexDocs(s)).toBe(55);
    s = apply(s, ev("approval.requested", { approvalId: "apr_04" }, 4000), ev("approval.granted", { approvalId: "apr_04", by: "own_01", date: "2026-10-01" }, 5000));
    expect(indexGroup(s)).toMatchObject({ pieces: 55, drafts: 0 });
    expect(indexDocs(s)).toBe(55);
  });
});

describe("a person's records", () => {
  it("adds each ord_user_ and apr_user_ to its table, newest first", () => {
    let s = initialState();
    s = apply(
      s,
      ev("order.placed", { orderId: "ord_user_1", pieceId: "pc_02", channelId: "ch_cindia", buyerId: "buy_01", grossCents: 12000, date: "2026-10-01" }, 1000, { source: "scripted", key: undefined }),
      ev(
        "approval.requested",
        {
          approvalId: "apr_user_1",
          approval: { kind: "listing_publish", subjectIds: ["lst_user_1"], overLimit: false, proposedBy: "cindy", summary: { en: "s", zh: "s" }, decisionDate: "2026-10-01" },
        },
        1200,
      ),
    );
    const tables = scriptedTables(s, idle);
    expect(row(tables, "orders").rows).toBe(31);
    expect(row(tables, "orders").newest[0].id).toBe("ord_user_1");
    expect(row(tables, "approvals").rows).toBe(6);
    expect(row(tables, "approvals").newest[0]).toMatchObject({ id: "apr_user_1", label: { en: "pending" } });
  });

  it("counts runs and steps from the store's swarm key", () => {
    let s = initialState();
    const run01 = swarmRuns.find((r) => r.runId === "run_01")!;
    s = apply(s, ...run01.steps.map((st, i) => ev("swarm.step", { ...st, threadId: run01.threadId }, 1000 + i * 100)));
    const tables = scriptedTables(s, idle);
    expect(row(tables, "runs")).toMatchObject({ rows: 1, newest: [{ id: "run_01" }] });
    expect(row(tables, "steps").rows).toBe(run01.steps.length);
    expect(row(tables, "steps").newest[0].id).toBe(run01.steps.at(-1)!.stepId);
  });

  it("lists the busiest processes first by the status the caller gives", () => {
    const p = row(scriptedTables(initialState(), statusOf), "processes");
    expect(p.newest.map((r) => r.id)).toEqual(["data", "approvals", "search"]);
  });
});

describe("live mode", () => {
  it("keeps the scripted values while b13-live, b12-search and b11-embed are scripted", () => {
    const s = apply(initialState(), ev("data.synced", demoDataSync, 1000, { key: "b13-live" }));
    expect(dataTables(s, idle).live).toBe(false);
    expect(row(dataTables(s, idle).tables, "catalog").rows).toBe(54);
    expect(modelGroup(s).live).toBe(false);
  });

  it("reads the tables from data.synced while b13-live is live", () => {
    const payload: Payloads["data.synced"] = {
      ...demoDataSync,
      tables: demoDataSync.tables.map((x) => (x.table === "orders" ? { ...x, rows: 31 } : x)),
      screens: 2,
    };
    const s = apply(initialState(), ev("data.synced", payload, 1000, { source: "live", key: "b13-live" }));
    const out = dataTables(s, idle);
    expect(out.live).toBe(true);
    expect(row(out.tables, "orders").rows).toBe(31);
    expect(row(out.tables, "catalog").newest[0].label).toEqual({ en: demoDataSync.tables[0].newest[0].label, zh: demoDataSync.tables[0].newest[0].label });
    expect(liveTables(payload, []).map((x) => x.table)).toEqual([...DATA_TABLES]);
  });

  it("reads the index counts from index.synced while b12-search is live", () => {
    const s = apply(initialState(), ev("index.synced", { indexed: 56, drafts: 2, elastic: true, agentBuilder: true }, 1000, { source: "live", key: "b12-search" }));
    expect(indexGroup(s)).toMatchObject({ live: true, pieces: 56, drafts: 2, elastic: true });
    expect(indexDocs(s)).toBe(58);
  });

  it("says not trained until a model.trained arrives, while there's no report", () => {
    let s = initialState();
    expect(modelGroup(s)).toMatchObject({ trained: report !== null });
    s = apply(s, ev("model.trained", { modelId: "cindia-embed-v1", baseModel: "intfloat/multilingual-e5-small", pairs: 1000, epochs: 2, dims: 384 }, 1000));
    expect(modelGroup(s)).toMatchObject({ trained: true, dims: 384, modelId: "cindia-embed-v1" });
  });
});
