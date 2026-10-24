// B07 live adapter: Ask Cindy answered by Claude on the server (api-contract.md, B07). The demo
// timeline holds no ask events, so this adapter only answers a person's `ask.asked`, which the
// registry passes on in live mode (events.md, Requests from people). It posts the question with the
// month's records from src/mock, and the server runs Claude's tool calls over them and checks every
// ID and chart value. Anything missing, invalid or failed throws or returns [], and the registry
// plays the canned answer from src/mock/ask.ts instead.
import type { CindiaEvent, Payloads } from "../../core/events";
import { validateEvent } from "../../core/validate";
import { pieces } from "../../mock/catalog";
import { channels, contracts } from "../../mock/channels";
import { bankTxns, flags, makerPayouts, makerStatements, orders, statements } from "../../mock/month";
import { makers } from "../../mock/people";
import type { LiveAdapter } from "../types";

/** The registry gives produce() 8 seconds, so the fetch gives up at 7.5. */
const FETCH_TIMEOUT_MS = 7500;
const HEALTH_TIMEOUT_MS = 3000;

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

const adapter: LiveAdapter = {
  key: "b07-ask",

  async health() {
    const body = (await fetchJson("/api/health", {}, HEALTH_TIMEOUT_MS)) as {
      routers?: unknown;
      keys?: { anthropic?: unknown };
    };
    return Array.isArray(body.routers) && body.routers.includes("b07") && body.keys?.anthropic === true;
  },

  async produce(event) {
    if (event.type !== "ask.asked") return [];
    const q = event.payload as Payloads["ask.asked"];
    const body = {
      trigger: event,
      questionId: q.questionId,
      text: q.text,
      lang: q.lang,
      records: {
        orders,
        catalog: pieces,
        makerStatements,
        flags,
        makerPayouts,
        contracts,
        statements,
        bankTxns,
        makers,
        channels,
      },
    };
    const out = (await fetchJson(
      "/api/b07/ask",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      FETCH_TIMEOUT_MS,
    )) as { events?: unknown };
    if (!Array.isArray(out.events)) return [];
    return (out.events as CindiaEvent[])
      .filter(
        (e) =>
          e &&
          e.type === "ask.answered" &&
          validateEvent(e).length === 0 &&
          (e.payload as Payloads["ask.answered"]).questionId === q.questionId,
      )
      .map((e) => ({ ...e, at: event.at, source: "live" as const, key: "b07-ask" as const }));
  },
};

export default adapter;
