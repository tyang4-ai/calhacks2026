// The pure parts of the agent and data views (I2-kit T3), kept apart so views.test.ts can check them
// without a DOM: the agent graph's layout and its state on the player clock, the embedding map's
// scaling, and the event log's rows.
import { clamp01, easeOut } from "./motion";

// ---- AgentGraph ----

export type AgentNodeKind = "claude" | "code" | "tool";

export interface GraphNodeIn {
  id: string;
  kind: AgentNodeKind;
}

export interface GraphEdgeIn {
  from: string;
  to: string;
}

export interface GraphStepIn {
  stepId: string;
  agentId: string;
  /** Player time (ms). */
  at: number;
}

export interface PlacedNode {
  id: string;
  x: number;
  y: number;
  r: number;
  /** center, ring (a specialist), or tool (beside the node it serves). */
  place: "center" | "ring" | "tool";
  /** The direction from the center, for placing the label on the outer side. */
  angle: number;
}

export interface GraphLayout {
  width: number;
  height: number;
  ringRadius: number;
  nodes: PlacedNode[];
}

/** An edge after a handoff animates this long on the player clock. */
export const HANDOFF_MS = 600;

const CENTER_R = 40;
const RING_R_MAX = 32;
const RING_R_MIN = 12;
/** Room outside a ring node for its name and kind lines. */
const LABEL_ROOM = 40;

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Lays the graph out the same way for the same inputs: the orchestrator (`centerId`, or the first
 * agent) at the center, the other agents on a ring in the order given, clockwise from the top, and
 * each tool just outside the ring beside the agent it shares an edge with.
 */
export function graphLayout(nodes: readonly GraphNodeIn[], edges: readonly GraphEdgeIn[], width: number, height: number, centerId?: string): GraphLayout {
  const agents = nodes.filter((n) => n.kind !== "tool");
  const tools = nodes.filter((n) => n.kind === "tool");
  const center = agents.find((n) => n.id === centerId) ?? agents[0];
  const ring = agents.filter((n) => n !== center);
  const cx = width / 2;
  const cy = height / 2;
  const half = Math.min(width, height) / 2;
  const ringRadius = Math.max(0, half - RING_R_MAX - LABEL_ROOM);
  const n = ring.length;
  const chord = n > 1 ? 2 * ringRadius * Math.sin(Math.PI / n) : Infinity;
  const ringR = Math.max(RING_R_MIN, Math.min(RING_R_MAX, Math.floor(chord * 0.38)));
  const centerR = Math.max(RING_R_MIN, Math.min(CENTER_R, ringRadius - ringR - 8));

  const placed: PlacedNode[] = [];
  if (center) placed.push({ id: center.id, x: round1(cx), y: round1(cy), r: centerR, place: "center", angle: Math.PI / 2 });
  ring.forEach((node, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(n, 1);
    placed.push({ id: node.id, x: round1(cx + ringRadius * Math.cos(angle)), y: round1(cy + ringRadius * Math.sin(angle)), r: ringR, place: "ring", angle });
  });

  const byId = new Map(placed.map((p) => [p.id, p]));
  const toolR = Math.min(ringR, 20);
  const perPartner = new Map<string, number>();
  tools.forEach((tool, i) => {
    const link = edges.find((e) => (e.from === tool.id && byId.has(e.to)) || (e.to === tool.id && byId.has(e.from)));
    const partner = link ? byId.get(link.from === tool.id ? link.to : link.from) : undefined;
    const k = perPartner.get(partner?.id ?? "") ?? 0;
    perPartner.set(partner?.id ?? "", k + 1);
    let x: number;
    let y: number;
    if (partner && partner.place === "ring") {
      // Beside its agent, clockwise along the ring and a little outward, so it sits between ring
      // neighbours and clear of the agent's label on the outer side.
      const a = partner.angle;
      const along = ringR + toolR + 10 + k * (2 * toolR + 8);
      x = partner.x - Math.sin(a) * along + Math.cos(a) * ringR * 0.5;
      y = partner.y + Math.cos(a) * along + Math.sin(a) * ringR * 0.5;
    } else {
      // Beside the center, or with no agent: down the right side, one under another.
      x = cx + (partner ? partner.r : 0) + toolR + 24;
      y = cy + (i - (tools.length - 1) / 2) * (2 * toolR + 12);
    }
    x = Math.min(width - toolR, Math.max(toolR, x));
    y = Math.min(height - toolR, Math.max(toolR, y));
    placed.push({ id: tool.id, x: round1(x), y: round1(y), r: toolR, place: "tool", angle: Math.atan2(y - cy, x - cx) });
  });
  return { width, height, ringRadius, nodes: placed };
}

/** The key of an edge, the same in both directions. */
export function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export interface GraphState {
  /** The steps the player clock has reached, in order. */
  reached: GraphStepIn[];
  /** The latest reached step, whose node lights. */
  latest: GraphStepIn | null;
  /** Agents with a reached step. */
  usedNodes: Set<string>;
  /** Edges a reached handoff went along, by edgeKey. */
  usedEdges: Set<string>;
  /** The edge into the latest step, and how far it has drawn (0 to 1) in the HANDOFF_MS after it. */
  handoff: { key: string; from: string; to: string; progress: number } | null;
  /** Each agent's reached step numbers, from 1, in the order of all the steps. */
  stepNumbers: Map<string, { stepId: string; n: number }[]>;
}

/**
 * The graph at player time `now`: which steps are reached, which node lights and which edges were
 * used. The edge into the latest step draws over HANDOFF_MS after that step, finished at once under
 * reduced motion. Never wall time.
 */
export function graphState(edges: readonly GraphEdgeIn[], steps: readonly GraphStepIn[], now: number, reduced = false): GraphState {
  const numbered = steps.map((s, i) => ({ step: s, n: i + 1 }));
  const reachedNumbered = numbered.filter((x) => x.step.at <= now).toSorted((a, b) => a.step.at - b.step.at || a.n - b.n);
  const reached = reachedNumbered.map((x) => x.step);
  const latest = reached.length ? reached[reached.length - 1] : null;
  const edgeKeys = new Set(edges.map((e) => edgeKey(e.from, e.to)));
  const usedNodes = new Set(reached.map((s) => s.agentId));
  const usedEdges = new Set<string>();
  for (let i = 1; i < reached.length; i++) {
    const a = reached[i - 1].agentId;
    const b = reached[i].agentId;
    if (a !== b && edgeKeys.has(edgeKey(a, b))) usedEdges.add(edgeKey(a, b));
  }
  let handoff: GraphState["handoff"] = null;
  if (reached.length >= 2 && latest) {
    const prev = reached[reached.length - 2];
    const key = edgeKey(prev.agentId, latest.agentId);
    if (prev.agentId !== latest.agentId && edgeKeys.has(key)) {
      const t = reduced ? 1 : easeOut(clamp01((now - latest.at) / HANDOFF_MS));
      handoff = { key, from: prev.agentId, to: latest.agentId, progress: t };
    }
  }
  // Each agent's numbers in step order, whatever order the clock reached them in.
  const stepNumbers = new Map<string, { stepId: string; n: number }[]>();
  for (const x of reachedNumbered.toSorted((a, b) => a.n - b.n)) {
    const list = stepNumbers.get(x.step.agentId) ?? [];
    list.push({ stepId: x.step.stepId, n: x.n });
    stepNumbers.set(x.step.agentId, list);
  }
  return { reached, latest, usedNodes, usedEdges, handoff, stepNumbers };
}

/** A line from the edge of one circle to the edge of the other. */
export function edgeSegment(a: { x: number; y: number; r: number }, b: { x: number; y: number; r: number }): { x1: number; y1: number; x2: number; y2: number; length: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  const x1 = round1(a.x + ux * a.r);
  const y1 = round1(a.y + uy * a.r);
  const x2 = round1(b.x - ux * b.r);
  const y2 = round1(b.y - uy * b.r);
  return { x1, y1, x2, y2, length: Math.max(0, d - a.r - b.r) };
}

// ---- EmbeddingMap ----

export interface MapPointIn {
  id: string;
  x: number;
  y: number;
}

export interface MapLayout {
  points: { id: string; cx: number; cy: number }[];
  query: { cx: number; cy: number } | null;
  /** From the star to each linked point that exists, in the order of `linkIds`, once each. */
  links: { id: string; x1: number; y1: number; x2: number; y2: number }[];
}

/** Room at the edge for the star and the dots, so nothing is clipped. */
export const MAP_PAD = 16;

/**
 * Scales the points and the query to fit `width` by `height` inside MAP_PAD, keeping the aspect so
 * distances read true, centered. Larger y is drawn higher. Points that all share one place sit in
 * the middle.
 */
export function mapLayout(points: readonly MapPointIn[], query: { x: number; y: number } | undefined, linkIds: readonly string[], width: number, height: number, pad = MAP_PAD): MapLayout {
  const all = query ? [...points, query] : [...points];
  const finite = all.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const minX = finite.length ? Math.min(...finite.map((p) => p.x)) : 0;
  const maxX = finite.length ? Math.max(...finite.map((p) => p.x)) : 0;
  const minY = finite.length ? Math.min(...finite.map((p) => p.y)) : 0;
  const maxY = finite.length ? Math.max(...finite.map((p) => p.y)) : 0;
  const innerW = Math.max(0, width - 2 * pad);
  const innerH = Math.max(0, height - 2 * pad);
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const scale = Math.min(spanX > 0 ? innerW / spanX : Infinity, spanY > 0 ? innerH / spanY : Infinity);
  const k = Number.isFinite(scale) ? scale : 0;
  const offX = pad + (innerW - spanX * k) / 2;
  const offY = pad + (innerH - spanY * k) / 2;
  const place = (p: { x: number; y: number }) =>
    Number.isFinite(p.x) && Number.isFinite(p.y) ? { cx: round1(offX + (p.x - minX) * k), cy: round1(offY + (maxY - p.y) * k) } : { cx: round1(width / 2), cy: round1(height / 2) };
  const placed = points.map((p) => ({ id: p.id, ...place(p) }));
  const q = query ? place(query) : null;
  const byId = new Map(placed.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const links: MapLayout["links"] = [];
  if (q) {
    for (const id of linkIds) {
      const p = byId.get(id);
      if (!p || seen.has(id)) continue;
      seen.add(id);
      links.push({ id, x1: q.cx, y1: q.cy, x2: p.cx, y2: p.cy });
    }
  }
  return { points: placed, query: q, links };
}

/** A five-point star's path around (cx, cy). */
export function starPath(cx: number, cy: number, outer = 12, inner = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${round1(cx + r * Math.cos(a))},${round1(cy + r * Math.sin(a))}`);
  }
  return `M${pts.join(" L")} Z`;
}

// ---- EventLog ----

/** The rows the log shows: the last `maxRows`, in the order given (arrival order, newest last). */
export function logRows<T>(rows: readonly T[], maxRows = 50): T[] {
  const n = Math.max(0, Math.floor(maxRows));
  return n === 0 ? [] : rows.slice(-n);
}

/** Player time as seconds to one place: 12345 to "12.3". */
export function logSeconds(at: number): string {
  return (Math.max(0, at) / 1000).toFixed(1);
}

// ---- BlockEditor ----

/** Which moves a block at `index` of `count` can make. */
export function blockMoves(index: number, count: number): { up: boolean; down: boolean } {
  return { up: index > 0, down: index >= 0 && index < count - 1 };
}
