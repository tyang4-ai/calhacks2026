// The scripted data.synced snapshot the tour plays at 127.0 in d15-listing (B13's shape, events.md
// Status), the tour's one event keyed b13-live. It is a scripted snapshot, shown under the Simulated
// badge: in live mode the B13 adapter answers it with [] at once, so this one plays.
//
// Nothing here is typed. Every table's row count is counted from the mock data: the 54 pieces, the
// one listing lst_01, the 30 orders, the five approvals, the ten scripted runs, every scripted step,
// the eleven processes and one screen, the tour's. Each table's newest rows are its last three
// records by ID, newest first (the processes' last three in process-bar order), each labeled in
// code from the record's kind, state, status, amount or catalog title, never from a person's words.
// The swarm and data processes are working, because the listing run and this sync are under way at
// 127.0, and the rest are done.
import { PROCESS_IDS, type DataTable, type Payloads, type ProcessStatus } from "../core/events";
import type { Approval } from "../core/types";
import { pieces } from "./catalog";
import { apr_04, listings } from "./listings";
import { approvals, orders } from "./month";
import { apr_05 } from "./projects";
import { swarmRuns } from "./swarm";
import { usd } from "./util";
import { apr_03 } from "./watch";

type Row = { id: string; label: string };

/**
 * A table's last three rows, newest first. Every list below is in ID order (the processes in
 * PROCESS_IDS order), so these are the last three records by ID.
 */
function newest(rows: Row[]): Row[] {
  return rows.slice(-3).toReversed();
}

function table(name: DataTable, rows: Row[]): Payloads["data.synced"]["tables"][number] {
  return { table: name, rows: rows.length, newest: newest(rows) };
}

/** apr_01 to apr_05, as index.ts gathers them into allApprovals. */
const everyApproval: Approval[] = [...approvals, apr_03, apr_04, apr_05];

/** A listing's state: "draft" until a listing_publish approval naming it is granted. */
const listingState = (listingId: string) =>
  everyApproval.some((a) => a.kind === "listing_publish" && a.subjectIds.includes(listingId) && a.status === "granted") ? "published" : "draft";

const WORKING: ProcessStatus = "working";
const DONE: ProcessStatus = "done";
/** The processes under way at 127.0: the listing run in the swarm, and this sync. */
const WORKING_AT_D15 = new Set(["swarm", "data"]);

const processes = PROCESS_IDS.map((processId) => ({ processId, status: WORKING_AT_D15.has(processId) ? WORKING : DONE }));

/** The tour's own screen, in B13's screen ID format (scr_ and 6 to 12 letters or digits). */
const TOUR_SCREEN: Row = { id: "scr_tour01", label: "tour" };

const steps = swarmRuns.flatMap((r) => r.steps);

export const demoDataSync: Payloads["data.synced"] = {
  tables: [
    table(
      "catalog",
      pieces.map((p) => ({ id: p.id, label: p.title.en })),
    ),
    table(
      "listings",
      listings.map((l) => ({ id: l.id, label: listingState(l.id) })),
    ),
    table(
      "orders",
      orders.map((o) => ({ id: o.id, label: `${o.status} · ${usd(o.grossCents)}` })),
    ),
    table(
      "approvals",
      everyApproval.map((a) => ({ id: a.id, label: `${a.kind} · ${a.status}` })),
    ),
    table(
      "runs",
      swarmRuns.map((r) => ({ id: r.runId, label: `${r.side} · ${r.trigger.kind}` })),
    ),
    table(
      "steps",
      steps.map((s) => ({ id: s.stepId, label: `${s.agentId} · ${s.kind}` })),
    ),
    table(
      "processes",
      processes.map((p) => ({ id: p.processId, label: p.status })),
    ),
    table("screens", [TOUR_SCREEN]),
  ],
  screens: 1,
  processes,
};
