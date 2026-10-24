// validateEvent(e) checks an event's envelope, type and payload against docs/common/events.md,
// with no schema library. It returns a list of problems, empty when the event is valid.
import { CAMERA_IDS } from "./featureTypes";
import { EVENT_TYPES, SOURCE_KEYS, type EventType } from "./events";

type Spec =
  | "string"
  | "int"
  | "number"
  | "boolean"
  | "text"
  | "date"
  | "party"
  | "chart"
  | { enum: readonly (string | boolean)[] }
  | { array: Spec }
  | { object: Fields }
  | { record: Spec };

/** Field name to spec. A name ending in "?" is optional. */
type Fields = Record<string, Spec>;

const LANG = { enum: ["en", "zh"] } as const;
const PARTY_KINDS = ["buyer", "cindia", "card_network", "studio", "maker", "gallery", "processor", "supplier"] as const;

const SCHEMAS: Record<EventType, Fields> = {
  "concierge.asked": { query: "string", lang: LANG },
  "concierge.answered": { query: "string", pieceIds: { array: "string" }, reasons: { record: "text" } },
  "piece.opened": { pieceId: "string" },
  "split.shown": {
    pieceId: "string",
    grossCents: "int",
    cardFeeCents: "int",
    platformFeeCents: "int",
    materialsCents: "int",
    makerShareCents: "int",
  },
  "checkout.started": { pieceId: "string", grossCents: "int" },
  "card.tokenized": { token: "string", brand: { enum: ["visa"] }, last4: "string" },
  "order.placed": {
    orderId: "string",
    pieceId: "string",
    channelId: "string",
    buyerId: "string",
    grossCents: "int",
    date: "date",
  },
  "receipt.updated": {
    orderId: "string",
    status: { enum: ["received", "paid_to_maker"] },
    makerId: "string",
    makerShareCents: "int",
    "paidDate?": "date",
  },
  "money.moved": {
    moveId: "string",
    kind: { enum: ["sale", "fee", "settlement", "payout_in", "materials", "maker_pay", "refund"] },
    from: "party",
    to: "party",
    amountCents: "int",
    refId: "string",
    date: "date",
    "nessieId?": "string",
  },
  "account.synced": { accountId: "string", balanceCents: "int", asOf: "date" },
  "month.started": { monthId: "string" },
  "record.arrived": {
    recordId: "string",
    recordType: { enum: ["order", "payout", "refund", "statement", "bank_txn"] },
    date: "date",
  },
  "match.made": {
    matchId: "string",
    kind: { enum: ["one_to_one", "bundled", "refund_netted", "carried_over"] },
    recordIds: { array: "string" },
    "intoMonthId?": "string",
  },
  "flag.raised": {
    flagId: "string",
    kind: { enum: ["short_payment"] },
    recordIds: { array: "string" },
    expectedCents: "int",
    actualCents: "int",
    deltaCents: "int",
  },
  "flag.explained": { flagId: "string", trustRecordId: "string", explanation: "text" },
  "ledger.posted": { entryIds: { array: "string" } },
  "month.closed": {
    monthId: "string",
    salesCents: "int",
    feesCents: "int",
    makerPayCents: "int",
    heldCents: "int",
  },
  "agent.acted": {
    actId: "string",
    kind: { enum: ["match", "flag", "explain", "draft", "propose", "close", "answer", "score"] },
    text: "text",
    "refId?": "string",
  },
  "approval.requested": { approvalId: "string" },
  "approval.granted": { approvalId: "string", by: { enum: ["own_01"] }, date: "date" },
  "approval.declined": { approvalId: "string", by: { enum: ["own_01"] }, reason: "text" },
  "followup.drafted": { followUpId: "string", approvalId: "string", to: "text", subject: "text", body: "text" },
  "followup.sent": { followUpId: "string", approvalId: "string" },
  "payout.sent": { makerPayoutId: "string", makerId: "string", amountCents: "int", date: "date" },
  "workbook.ready": { monthId: "string", fileName: "string", sheets: { array: "string" }, "url?": "string" },
  "statement.issued": {
    makerStatementId: "string",
    makerId: "string",
    lines: { array: { object: { orderId: "string", pieceId: "string", makerShareCents: "int" } } },
    totalCents: "int",
    heldCents: "int",
    payoutDate: "date",
  },
  "impact.updated": {
    impactId: "string",
    makerShareBps: "int",
    daysCloseToPayout: "number",
    daysCloseToPayoutBefore: "number",
    bookkeepingHoursSaved: "number",
    estimate: "boolean",
  },
  "proof.scored": {
    caught: "int",
    total: "int",
    results: { array: { object: { errorId: "string", caught: "boolean" } } },
  },
  "ask.asked": { questionId: "string", text: "string", lang: LANG },
  "ask.answered": { questionId: "string", answer: "text", "chart?": "chart", refIds: { array: "string" } },
  "scenario.loaded": {
    scenarioId: "string",
    fileName: "string",
    "recordIds?": { array: "string" },
    "content?": "string",
  },
  "beat.started": { beatId: "string", camera: { enum: CAMERA_IDS } },
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CONTENT = 200 * 1024;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function describe(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function checkFields(value: unknown, fields: Fields, path: string, out: string[]): void {
  if (!isObj(value)) {
    out.push(`${path}: expected an object, got ${describe(value)}`);
    return;
  }
  const known = new Set<string>();
  for (const [rawName, spec] of Object.entries(fields)) {
    const optional = rawName.endsWith("?");
    const name = optional ? rawName.slice(0, -1) : rawName;
    known.add(name);
    const v = value[name];
    if (v === undefined) {
      if (!optional) out.push(`${path}.${name}: missing`);
      continue;
    }
    checkSpec(v, spec, `${path}.${name}`, out);
  }
  for (const name of Object.keys(value)) {
    if (!known.has(name)) out.push(`${path}.${name}: not a field in events.md`);
  }
}

function checkText(v: unknown, path: string, out: string[]): void {
  if (!isObj(v) || typeof v.en !== "string" || typeof v.zh !== "string") {
    out.push(`${path}: expected Text { en, zh }`);
    return;
  }
  for (const k of Object.keys(v)) if (k !== "en" && k !== "zh") out.push(`${path}.${k}: not a Text field`);
}

function checkSpec(v: unknown, spec: Spec, path: string, out: string[]): void {
  if (typeof spec === "string") {
    switch (spec) {
      case "string":
        if (typeof v !== "string") out.push(`${path}: expected string, got ${describe(v)}`);
        return;
      case "int":
        if (typeof v !== "number" || !Number.isInteger(v)) out.push(`${path}: expected an integer, got ${describe(v)} ${String(v)}`);
        return;
      case "number":
        if (typeof v !== "number" || !Number.isFinite(v)) out.push(`${path}: expected a number, got ${describe(v)}`);
        return;
      case "boolean":
        if (typeof v !== "boolean") out.push(`${path}: expected boolean, got ${describe(v)}`);
        return;
      case "date":
        if (typeof v !== "string" || !DATE_RE.test(v)) out.push(`${path}: expected a YYYY-MM-DD date`);
        return;
      case "text":
        checkText(v, path, out);
        return;
      case "party":
        checkFields(v, { kind: { enum: PARTY_KINDS }, "id?": "string" }, path, out);
        return;
      case "chart":
        checkFields(
          v,
          {
            type: { enum: ["bar", "line"] },
            title: "text",
            labels: { array: "string" },
            series: { array: { object: { name: "text", valuesCents: { array: "int" } } } },
          },
          path,
          out,
        );
        return;
    }
  }
  if ("enum" in spec) {
    if (!spec.enum.includes(v as string)) out.push(`${path}: expected one of ${spec.enum.join(", ")}, got ${String(v)}`);
    return;
  }
  if ("array" in spec) {
    if (!Array.isArray(v)) {
      out.push(`${path}: expected an array, got ${describe(v)}`);
      return;
    }
    v.forEach((item, i) => checkSpec(item, spec.array, `${path}[${i}]`, out));
    return;
  }
  if ("object" in spec) {
    checkFields(v, spec.object, path, out);
    return;
  }
  if ("record" in spec) {
    if (!isObj(v)) {
      out.push(`${path}: expected an object map, got ${describe(v)}`);
      return;
    }
    for (const [k, item] of Object.entries(v)) checkSpec(item, spec.record, `${path}.${k}`, out);
  }
}

const ENVELOPE = new Set(["id", "type", "at", "source", "key", "payload"]);

/** Checks the envelope, the type and every payload field. Returns the problems found. */
export function validateEvent(e: unknown): string[] {
  const out: string[] = [];
  if (!isObj(e)) return [`event: expected an object, got ${describe(e)}`];
  const label = typeof e.id === "string" ? e.id : "event";

  if (typeof e.id !== "string" || !e.id.startsWith("evt_")) out.push(`${label}.id: expected a string starting with evt_`);
  if (typeof e.at !== "number" || !Number.isFinite(e.at) || e.at < 0) out.push(`${label}.at: expected a number of ms, 0 or more`);
  if (e.source !== "scripted" && e.source !== "live" && e.source !== "user") {
    out.push(`${label}.source: expected scripted, live or user, got ${String(e.source)}`);
  }
  if (e.key !== undefined && !SOURCE_KEYS.includes(e.key as never)) out.push(`${label}.key: unknown source key ${String(e.key)}`);
  if (typeof e.id === "string") {
    if (e.source === "live" && !e.id.startsWith("evt_live_")) out.push(`${label}.id: a live event's ID starts with evt_live_`);
    if (e.source === "user" && !e.id.startsWith("evt_user_")) out.push(`${label}.id: a person's event ID starts with evt_user_`);
  }
  for (const k of Object.keys(e)) if (!ENVELOPE.has(k)) out.push(`${label}.${k}: not an envelope field`);

  if (typeof e.type !== "string" || !EVENT_TYPES.includes(e.type as EventType)) {
    out.push(`${label}.type: unknown event type ${String(e.type)}`);
    return out;
  }
  const type = e.type as EventType;
  checkFields(e.payload, SCHEMAS[type], `${label}.payload`, out);

  if (isObj(e.payload)) {
    const p = e.payload;
    if (type === "card.tokenized") {
      if (typeof p.token === "string" && !/^tok_[A-Za-z0-9]{12}$/.test(p.token)) out.push(`${label}.payload.token: expected tok_ and 12 letters or digits`);
      if (typeof p.last4 === "string" && !/^\d{4}$/.test(p.last4)) out.push(`${label}.payload.last4: expected 4 digits`);
    }
    if (type === "concierge.answered" && Array.isArray(p.pieceIds) && p.pieceIds.length !== 3) {
      out.push(`${label}.payload.pieceIds: expected three pieces`);
    }
    if (type === "scenario.loaded" && typeof p.content === "string" && p.content.length > MAX_CONTENT) {
      out.push(`${label}.payload.content: more than 200 KB`);
    }
  }
  return out;
}

/** Validates a list of events. Returns every problem, each prefixed with the event's index. */
export function validateEvents(events: unknown[]): string[] {
  const out: string[] = [];
  events.forEach((e, i) => {
    for (const p of validateEvent(e)) out.push(`[${i}] ${p}`);
  });
  return out;
}
