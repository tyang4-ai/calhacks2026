// B06 live adapter: the month-close workbook is built on the server with openpyxl, with formula
// totals and a native bar chart on Makers (api-contract.md, B06). On the scripted workbook.ready it
// posts September's records from src/mock and returns the server's workbook.ready with `url` set to
// /api/b06/files/<fileName>, so close-download fetches the server's file. Anything missing, invalid
// or failed throws or returns [], and the registry plays the scripted event, which makes the
// browser build its own SheetJS copy.
import type { CindiaEvent } from "../../core/events";
import { validateEvent } from "../../core/validate";
import { bankTxns, ledger, makerStatements, monthId, orders, payouts, statements } from "../../mock/month";
import type { LiveAdapter } from "../types";

/** The registry gives produce() 8 seconds, so the fetch gives up at 7.5. */
const FETCH_TIMEOUT_MS = 7500;
const HEALTH_TIMEOUT_MS = 3000;
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]*\.xlsx$/;

async function fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(t);
  }
}

function isWorkbookEvent(e: unknown): e is CindiaEvent<"workbook.ready"> {
  if (!e || typeof e !== "object") return false;
  const ev = e as { type?: unknown; payload?: unknown };
  if (ev.type !== "workbook.ready" || !ev.payload || typeof ev.payload !== "object") return false;
  const p = ev.payload as { fileName?: unknown };
  return typeof p.fileName === "string" && FILE_NAME.test(p.fileName) && validateEvent(e).length === 0;
}

const adapter: LiveAdapter = {
  key: "b06-workbook",

  async health() {
    const body = (await fetchJson("/api/health", {}, HEALTH_TIMEOUT_MS)) as { routers?: unknown };
    return Array.isArray(body.routers) && body.routers.includes("b06");
  },

  async produce(event) {
    if (event.type !== "workbook.ready") return [];
    const trigger = event as CindiaEvent<"workbook.ready">;
    if (trigger.payload.monthId !== monthId) return [];
    const body = {
      trigger: event,
      monthId,
      records: { orders, payouts, statements, bankTxns, ledger, makerStatements },
    };
    const out = (await fetchJson(
      "/api/b06/workbook",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      FETCH_TIMEOUT_MS,
    )) as { events?: unknown };
    if (!Array.isArray(out.events)) return [];
    return out.events.filter(isWorkbookEvent).map((e) => ({
      ...e,
      at: event.at,
      key: "b06-workbook" as const,
      payload: { ...e.payload, url: `/api/b06/files/${encodeURIComponent(e.payload.fileName)}` },
    }));
  },
};

export default adapter;
