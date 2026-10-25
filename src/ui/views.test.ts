// I2-kit T3: agents and data views. The graph layout and its state on the player clock, the map's
// scaling, the log's ordering, the view's close button and the side-by-side labels. Components
// render with react-dom/server, and the hook-free ones are walked as element trees so a test can
// press their controls without a DOM.
import { createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AgentGraph, type AgentGraphNode } from "./AgentGraph";
import { BlockEditor } from "./BlockEditor";
import { ChatBubble } from "./ChatBubble";
import { ChatThread } from "./ChatThread";
import { EmbeddingMap } from "./EmbeddingMap";
import { EventLog, type EventLogRow } from "./EventLog";
import { ProcessView } from "./ProcessView";
import { SideBySide } from "./SideBySide";
import { blockMoves, edgeKey, graphLayout, graphState, HANDOFF_MS, logRows, logSeconds, MAP_PAD, mapLayout } from "./views";

function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** The markup of the element carrying `attr`, found by a balanced walk over its tag. */
function elementWith(html: string, attr: string): string {
  const at = html.indexOf(attr);
  if (at < 0) return "";
  const open = html.lastIndexOf("<", at);
  const tag = /^<([a-z0-9]+)/.exec(html.slice(open))?.[1] ?? "";
  let depth = 0;
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "g");
  re.lastIndex = open;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(open, m.index + m[0].length);
  }
  return html.slice(open);
}

type AnyProps = Record<string, unknown> & { children?: ReactNode };

function findElement(node: ReactNode, match: (props: AnyProps) => boolean): ReactElement<AnyProps> | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = findElement(n, match);
      if (hit) return hit;
    }
    return null;
  }
  if (!isValidElement<AnyProps>(node)) return null;
  if (typeof node.type === "function") return findElement((node.type as (p: AnyProps) => ReactNode)(node.props), match);
  if (typeof node.type === "string" && match(node.props)) return node;
  return findElement(node.props.children, match);
}

const byTestId = (id: string) => (p: AnyProps) => p["data-testid"] === id;
const t = (en: string, zh: string) => ({ en, zh });

/** A stand-in roster of 21 agents, the first the orchestrator and every fourth rule-based. */
const ROSTER: AgentGraphNode[] = Array.from({ length: 21 }, (_, i) => ({
  id: i === 0 ? "lead" : `agent_${String(i).padStart(2, "0")}`,
  label: t(i === 0 ? "Lead" : `Agent ${i}`, i === 0 ? "领队" : `智能体${i}`),
  kind: i > 0 && i % 4 === 0 ? "code" : "claude",
}));

describe("agent graph layout", () => {
  const edges = ROSTER.slice(1).map((n) => ({ from: "lead", to: n.id }));

  it("is the same on every render for the same inputs", () => {
    const a = graphLayout(ROSTER, edges, 520, 420);
    const b = graphLayout(ROSTER.map((n) => ({ ...n })), edges.map((e) => ({ ...e })), 520, 420);
    expect(a).toEqual(b);
    const html1 = renderToStaticMarkup(createElement(AgentGraph, { nodes: ROSTER, edges, steps: [], now: 0, lang: "en" }));
    const html2 = renderToStaticMarkup(createElement(AgentGraph, { nodes: ROSTER, edges, steps: [], now: 0, lang: "en" }));
    expect(html1).toBe(html2);
  });

  it("puts the orchestrator at the center and the others on one ring in roster order, clockwise from the top", () => {
    const layout = graphLayout(ROSTER, edges, 520, 420);
    expect(layout.nodes).toHaveLength(21);
    const [center, ...ring] = layout.nodes;
    expect(center).toMatchObject({ id: "lead", x: 260, y: 210, place: "center" });
    expect(ring.map((n) => n.id)).toEqual(ROSTER.slice(1).map((n) => n.id));
    for (const n of ring) expect(Math.hypot(n.x - 260, n.y - 210)).toBeCloseTo(layout.ringRadius, 0);
    expect(ring[0].x).toBeCloseTo(260, 5);
    expect(ring[0].y).toBeLessThan(210);
    expect(ring[1].x).toBeGreaterThan(ring[0].x);
    for (const n of layout.nodes) {
      expect(n.x - n.r).toBeGreaterThanOrEqual(0);
      expect(n.x + n.r).toBeLessThanOrEqual(520);
      expect(n.y - n.r).toBeGreaterThanOrEqual(0);
      expect(n.y + n.r).toBeLessThanOrEqual(420);
    }
    // Ring neighbours never overlap.
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
    }
  });

  it("honors centerId, and puts a tool beside the agent it serves, outside the ring", () => {
    const nodes = [
      { id: "a", kind: "claude" as const },
      { id: "b", kind: "claude" as const },
      { id: "c", kind: "claude" as const },
      { id: "tool_x", kind: "tool" as const },
    ];
    const layout = graphLayout(nodes, [{ from: "c", to: "tool_x" }], 520, 420, "b");
    const byId = Object.fromEntries(layout.nodes.map((n) => [n.id, n]));
    expect(byId.b.place).toBe("center");
    expect(byId.tool_x.place).toBe("tool");
    const tool = byId.tool_x;
    const dist = (n: { x: number; y: number }) => Math.hypot(tool.x - n.x, tool.y - n.y);
    expect(Math.hypot(tool.x - 260, tool.y - 210)).toBeGreaterThan(layout.ringRadius);
    expect(dist(byId.c)).toBeLessThan(dist(byId.a));
    for (const n of layout.nodes.filter((x) => x.id !== "tool_x")) expect(dist(n)).toBeGreaterThan(n.r + tool.r);
    expect(tool.x + tool.r).toBeLessThanOrEqual(520);
    expect(tool.y + tool.r).toBeLessThanOrEqual(420);
  });
});

describe("agent graph on the player clock", () => {
  const edges = [
    { from: "lead", to: "agent_01" },
    { from: "lead", to: "agent_04" },
  ];
  const steps = [
    { stepId: "stp_a", agentId: "lead", at: 1000 },
    { stepId: "stp_b", agentId: "agent_01", at: 2000 },
    { stepId: "stp_c", agentId: "lead", at: 3000 },
    { stepId: "stp_d", agentId: "agent_04", at: 4000 },
  ];

  it("lights the latest reached step's node, never one the clock hasn't reached", () => {
    expect(graphState(edges, steps, 500).latest).toBeNull();
    expect(graphState(edges, steps, 2500).latest?.agentId).toBe("agent_01");
    const s = graphState(edges, steps, 9000);
    expect(s.latest?.stepId).toBe("stp_d");
    expect([...s.usedNodes].toSorted()).toEqual(["agent_01", "agent_04", "lead"]);
    expect([...s.usedEdges].toSorted()).toEqual([edgeKey("lead", "agent_01"), edgeKey("lead", "agent_04")].toSorted());
    expect(s.stepNumbers.get("lead")).toEqual([
      { stepId: "stp_a", n: 1 },
      { stepId: "stp_c", n: 3 },
    ]);
  });

  it("draws the handoff edge over 600 ms after the step, finished at once under reduced motion", () => {
    expect(graphState(edges, steps, 4000).handoff).toMatchObject({ from: "lead", to: "agent_04", progress: 0 });
    const mid = graphState(edges, steps, 4000 + HANDOFF_MS / 2).handoff!.progress;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(graphState(edges, steps, 4000 + HANDOFF_MS).handoff!.progress).toBe(1);
    expect(graphState(edges, steps, 4000, true).handoff!.progress).toBe(1);
    // A step by the same agent, or along no edge, is no handoff.
    expect(graphState(edges, [...steps, { stepId: "stp_e", agentId: "agent_04", at: 5000 }], 5000).handoff).toBeNull();
  });

  it("still shows the latest edge as used when the clock stops at the step's own time", () => {
    // seekToEvent pauses exactly at an event's `at`, where the handoff has drawn nothing yet.
    const html = renderToStaticMarkup(createElement(AgentGraph, { nodes: ROSTER, edges, steps, now: 4000, lang: "en" }));
    expect(html).toMatch(/data-role="base" x1="[^"]+" y1="[^"]+" x2="[^"]+" y2="[^"]+"/);
    expect(html).toMatch(/c-agentgraph__edge--latest" data-edge="agent_04\|lead"/);
    expect(html).not.toContain("length=");
    const done = renderToStaticMarkup(createElement(AgentGraph, { nodes: ROSTER, edges, steps, now: 4000 + HANDOFF_MS, lang: "en" }));
    expect(done).not.toContain('data-role="base"');
  });

  it("marks the active node, the step numbers' test IDs and a rule-based agent's kind word in the markup", () => {
    const html = renderToStaticMarkup(
      createElement(AgentGraph, { testId: "process-swarm-graph", nodes: ROSTER, edges, steps, stepTestIdPrefix: "kit-graph-step-", nodeTestIdPrefix: "kit-graph-node-", now: 4100, lang: "en" }),
    );
    expect(html).toContain('data-testid="process-swarm-graph"');
    expect(elementWith(html, 'data-testid="kit-graph-node-agent_04"')).toContain('data-status="active"');
    expect(elementWith(html, 'data-testid="kit-graph-node-lead"')).toContain('data-status="used"');
    expect(elementWith(html, 'data-testid="kit-graph-node-agent_02"')).toContain('data-status="idle"');
    for (const id of ["stp_a", "stp_b", "stp_c", "stp_d"]) expect(html).toContain(`data-testid="kit-graph-step-${id}"`);
    const code = textOf(elementWith(html, 'data-testid="kit-graph-node-agent_04"'));
    expect(code).toContain("Agent 4");
    expect(code).toContain("Rule-based");
    expect(textOf(elementWith(html, 'data-testid="kit-graph-node-agent_01"'))).not.toContain("Rule-based");
  });
});

describe("embedding map scaling", () => {
  // 54 points from a seeded generator, spread over an odd range, with the query outside them.
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const points = Array.from({ length: 54 }, (_, i) => ({ id: `pt_${i + 1}`, x: -3 + rand() * 11, y: 40 + rand() * 0.5, group: `g${i % 4}` }));
  const query = { x: 9.5, y: 40.6 };
  const linkIds = ["pt_3", "pt_9", "pt_27", "pt_54", "pt_9", "nope"];

  it("puts every point and the star inside the given width and height", () => {
    const layout = mapLayout(points, query, linkIds, 600, 400);
    expect(layout.points).toHaveLength(54);
    for (const p of [...layout.points, layout.query!]) {
      expect(p.cx).toBeGreaterThanOrEqual(MAP_PAD);
      expect(p.cx).toBeLessThanOrEqual(600 - MAP_PAD);
      expect(p.cy).toBeGreaterThanOrEqual(MAP_PAD);
      expect(p.cy).toBeLessThanOrEqual(400 - MAP_PAD);
    }
  });

  it("keeps the aspect, so distances read true, and draws larger y higher", () => {
    const layout = mapLayout(
      [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 10, y: 0 },
        { id: "c", x: 0, y: 5 },
      ],
      undefined,
      [],
      400,
      400,
    );
    const [a, b, c] = layout.points;
    expect(b.cx - a.cx).toBeCloseTo(2 * (a.cy - c.cy), 5);
    expect(c.cy).toBeLessThan(a.cy);
    const same = mapLayout([{ id: "s", x: 3, y: 3 }], undefined, [], 200, 100);
    expect(same.points[0]).toEqual({ id: "s", cx: 100, cy: 50 });
  });

  it("links the star to exactly the linkIds that exist, once each, and none without a query", () => {
    const layout = mapLayout(points, query, linkIds, 600, 400);
    expect(layout.links.map((l) => l.id)).toEqual(["pt_3", "pt_9", "pt_27", "pt_54"]);
    for (const l of layout.links) {
      const p = layout.points.find((x) => x.id === l.id)!;
      expect([l.x1, l.y1, l.x2, l.y2]).toEqual([layout.query!.cx, layout.query!.cy, p.cx, p.cy]);
    }
    expect(mapLayout(points, undefined, linkIds, 600, 400).links).toEqual([]);
    const html = renderToStaticMarkup(createElement(EmbeddingMap, { testId: "kit-map", points, query, linkIds, width: 600, height: 400, lang: "en" }));
    expect(html.match(/data-link-to="/g)).toHaveLength(4);
    expect(html.match(/data-point-id="/g)).toHaveLength(54);
  });

  it("draws an approximate query hollow and labels it", () => {
    const filled = renderToStaticMarkup(createElement(EmbeddingMap, { points, query, width: 600, height: 400, lang: "en" }));
    expect(filled).not.toContain("approximate");
    const approx = renderToStaticMarkup(createElement(EmbeddingMap, { points, query: { ...query, approx: true }, width: 600, height: 400, lang: "en" }));
    expect(elementWith(approx, 'data-role="query"')).toContain('fill="none"');
    expect(textOf(elementWith(approx, 'data-role="query"'))).toBe("Your request · approximate");
    const zh = renderToStaticMarkup(createElement(EmbeddingMap, { points, query: { ...query, approx: true }, width: 600, height: 400, lang: "zh" }));
    expect(textOf(elementWith(zh, 'data-role="query"'))).toBe("您的请求 · 近似");
  });
});

describe("event log ordering", () => {
  const rows: EventLogRow[] = Array.from({ length: 60 }, (_, i) => ({ id: `evt_${i + 1}`, at: i < 30 ? 1000 : 1000 + i * 100, type: "search.queried", source: i % 3 === 0 ? "live" : "scripted" }));

  it("keeps arrival order, newest last, and only the newest maxRows", () => {
    expect(logRows(rows).map((r) => r.id)).toEqual(rows.slice(10).map((r) => r.id));
    expect(logRows(rows, 5).map((r) => r.id)).toEqual(["evt_56", "evt_57", "evt_58", "evt_59", "evt_60"]);
    expect(logRows(rows, 0)).toEqual([]);
    // Rows with one time (a paused player) keep the order they came in.
    const tied = [rows[2], rows[0], rows[1]];
    expect(logRows(tied).map((r) => r.id)).toEqual(["evt_3", "evt_1", "evt_2"]);
  });

  it("shows times as seconds on the player clock", () => {
    expect(logSeconds(0)).toBe("0.0");
    expect(logSeconds(12345)).toBe("12.3");
    expect(logSeconds(-5)).toBe("0.0");
    const html = renderToStaticMarkup(createElement(EventLog, { testId: "process-log", rows: [{ id: "e1", at: 1500, type: "flag.raised", source: "user", key: "b01-reconcile" }] }));
    expect(html).toContain('data-testid="process-log"');
    expect(textOf(elementWith(html, 'data-event-id="e1"'))).toBe("1.5 sflag.raiseduserb01-reconcile");
    const last = renderToStaticMarkup(createElement(EventLog, { rows, maxRows: 3 }));
    expect([...last.matchAll(/data-event-id="([^"]+)"/g)].map((m) => m[1])).toEqual(["evt_58", "evt_59", "evt_60"]);
    expect(textOf(renderToStaticMarkup(createElement(EventLog, { rows: [], lang: "zh" })))).toBe("事件日志暂无事件");
  });
});

describe("process view", () => {
  const base = { testId: "process-view", title: t("Sample process", "示例流程"), lang: "en" as const, children: "body" };

  it("calls onClose once when its close button is pressed", () => {
    const onClose = vi.fn();
    const close = findElement(ProcessView({ ...base, live: false, onClose, closeTestId: "process-view-close" }), byTestId("process-view-close"));
    expect(close).not.toBeNull();
    (close!.props.onClick as () => void)();
    expect(onClose).toHaveBeenCalledTimes(1);
    const html = renderToStaticMarkup(createElement(ProcessView, { ...base, live: false, onClose, closeTestId: "process-view-close" }));
    expect(textOf(elementWith(html, 'data-testid="process-view-close"'))).toBe("Close");
  });

  it("shows no close button without onClose", () => {
    const html = renderToStaticMarkup(createElement(ProcessView, { ...base, live: false, closeTestId: "process-view-close" }));
    expect(html).not.toContain("process-view-close");
    expect(html).not.toContain("c-pview__close");
  });

  it("shows the Simulated badge when scripted and the Live badge when live, with the log under the body", () => {
    const sim = renderToStaticMarkup(createElement(ProcessView, { ...base, live: false, log: createElement("div", { "data-testid": "process-log" }) }));
    expect(sim).toContain('data-testid="simulated-badge"');
    expect(sim).not.toContain('data-variant="live"');
    expect(sim.indexOf("body")).toBeLessThan(sim.indexOf("process-log"));
    const live = renderToStaticMarkup(createElement(ProcessView, { ...base, live: true }));
    expect(live).toContain('data-variant="live"');
    expect(live).not.toContain("simulated-badge");
    expect(textOf(live)).toContain("Live");
    expect(textOf(live)).not.toContain("实时");
  });
});

describe("side by side", () => {
  it("holds the label and the hint inside the similarity element, and no other word", () => {
    const label = t("Text match 0.42.", "文本相似度 0.42。");
    const hint = t("A sample hint.", "示例提示。");
    for (const lang of ["en", "zh"] as const) {
      const html = renderToStaticMarkup(
        createElement(SideBySide, {
          testId: "kit-sbs",
          similarityTestId: "kit-sbs-similarity",
          left: createElement("p", null, "LEFT"),
          right: createElement("p", null, "RIGHT"),
          similarity: 0.42,
          similarityLabel: label,
          similarityHint: hint,
          lang,
        }),
      );
      expect(textOf(elementWith(html, 'data-testid="kit-sbs-similarity"'))).toBe(`${label[lang]}${hint[lang]}`);
      expect(textOf(html)).toBe(`LEFT${label[lang]}${hint[lang]}RIGHT`);
      expect(elementWith(html, 'data-testid="kit-sbs-similarity"')).toContain("width:42%");
    }
  });
});

describe("block editor", () => {
  const blocks = ["hero", "story", "pieces"].map((kind, i) => ({ blockId: `blk_${i + 1}`, kind, title: t(`Block ${i + 1}`, `区块${i + 1}`), summary: t("Sample", "示例") }));

  it("lets the first block not move up and the last not move down", () => {
    expect(blockMoves(0, 3)).toEqual({ up: false, down: true });
    expect(blockMoves(1, 3)).toEqual({ up: true, down: true });
    expect(blockMoves(2, 3)).toEqual({ up: true, down: false });
    expect(blockMoves(0, 1)).toEqual({ up: false, down: false });
  });

  it("puts each block's ID on its row and controls, and calls back with the block and direction", () => {
    const onMove = vi.fn();
    const onEdit = vi.fn();
    const props = { testIdPrefix: "storefront-block-", blocks, selectedId: "blk_2", onSelect: () => {}, onMove, onEdit, lang: "en" as const };
    const html = renderToStaticMarkup(createElement(BlockEditor, props));
    expect(elementWith(html, 'data-testid="storefront-block-blk_2"')).toContain('data-selected="true"');
    expect(html).toMatch(/data-testid="storefront-block-blk_1-up" disabled=""/);
    expect(html).toMatch(/data-testid="storefront-block-blk_3-down" disabled=""/);
    (findElement(BlockEditor(props), byTestId("storefront-block-blk_1-down"))!.props.onClick as () => void)();
    (findElement(BlockEditor(props), byTestId("storefront-block-blk_3-edit"))!.props.onClick as () => void)();
    expect(onMove).toHaveBeenCalledWith("blk_1", "down");
    expect(onEdit).toHaveBeenCalledWith("blk_3");
  });
});

describe("chat", () => {
  it("shows the agent's name, and Rule-based beside it for a code agent", () => {
    const code = renderToStaticMarkup(createElement(ChatBubble, { role: "agent", agentName: t("Sample checker", "示例检查"), agentKind: "code", text: t("Checked.", "已检查。"), nameTestId: "kit-agent", lang: "en" }));
    expect(textOf(elementWith(code, 'data-testid="kit-agent"'))).toBe("Sample checker");
    expect(textOf(code)).toMatch(/^Sample checkerRule-basedChecked\.$/);
    const model = renderToStaticMarkup(createElement(ChatBubble, { role: "agent", agentName: t("Sample writer", "示例写手"), agentKind: "claude", text: t("Hi.", "你好。"), lang: "en" }));
    expect(textOf(model)).not.toContain("Rule-based");
    const maker = renderToStaticMarkup(createElement(ChatBubble, { role: "agent", agentName: t("Sample Maker", "示例匠人"), text: t("In her words.", "In her words."), lang: "zh" }));
    expect(textOf(maker)).toBe("示例匠人In her words.");
  });

  it("lists the messages in order, the person's marked as theirs, then the input row", () => {
    const html = renderToStaticMarkup(
      createElement(ChatThread, {
        testId: "kit-chat",
        lang: "en",
        messages: [
          { id: "m1", role: "person", text: t("Is it wool?", "是羊毛吗？"), testId: "kit-msg-1" },
          { id: "m2", role: "agent", agentName: t("Sample writer", "示例写手"), agentKind: "claude", text: t("Yes.", "是的。"), testId: "kit-msg-2" },
          { id: "m3", role: "note", text: t("Sample note.", "示例说明。"), testId: "kit-msg-3" },
        ],
        footer: createElement("input", { "data-testid": "kit-chat-input" }),
      }),
    );
    expect(html.indexOf("kit-msg-1")).toBeLessThan(html.indexOf("kit-msg-2"));
    expect(html.indexOf("kit-msg-3")).toBeLessThan(html.indexOf("kit-chat-input"));
    expect(textOf(elementWith(html, 'data-testid="kit-msg-1"'))).toBe("YouIs it wool?");
    expect(textOf(renderToStaticMarkup(createElement(ChatThread, { messages: [], lang: "en", emptyText: t("Nothing yet.", "暂无。") })))).toBe("Nothing yet.");
  });
});
