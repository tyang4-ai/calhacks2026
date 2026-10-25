import type { Lang, Text } from "../core/types";
import { useReducedMotion } from "./motion";
import { pickText, RULE_BASED_WORD, TOOL_WORD } from "./strings";
import { edgeKey, edgeSegment, graphLayout, graphState, type AgentNodeKind, type GraphEdgeIn, type GraphStepIn, type PlacedNode } from "./views";

export interface AgentGraphNode {
  id: string;
  label: Text;
  /** claude or code (rule-based), from the roster. A tool, such as Elastic Agent Builder, sits beside its agent. */
  kind: AgentNodeKind;
}

export interface AgentGraphProps {
  testId?: string;
  /** In roster order. The first agent is the orchestrator, unless `centerId` names another. */
  nodes: AgentGraphNode[];
  edges: GraphEdgeIn[];
  /** In run order. A step lights its node once the player clock reaches its `at`. */
  steps: GraphStepIn[];
  /** Each reached step's number inside its node gets `<stepTestIdPrefix><stepId>`. */
  stepTestIdPrefix?: string;
  /** Each node gets `<nodeTestIdPrefix><id>`. */
  nodeTestIdPrefix?: string;
  /** Player time (ms). */
  now: number;
  lang: Lang;
  centerId?: string;
  /** Default 520 by 420. */
  width?: number;
  height?: number;
}

/**
 * The agent swarm as SVG: the orchestrator at the center, specialists on a ring in roster order.
 * The latest step's node lights (a thick ring and a bold name, not color alone), used edges and
 * nodes turn jade, and the edge into the latest step draws over 600 ms on the player clock.
 * A rule-based agent says so under its name.
 */
export function AgentGraph({ testId, nodes, edges, steps, stepTestIdPrefix, nodeTestIdPrefix, now, lang, centerId, width = 520, height = 420 }: AgentGraphProps) {
  const reduced = useReducedMotion();
  const layout = graphLayout(nodes, edges, width, height, centerId);
  const state = graphState(edges, steps, now, reduced);
  const placed = new Map(layout.nodes.map((p) => [p.id, p]));
  const activeId = state.latest?.agentId;

  return (
    <svg
      className="c-agentgraph"
      data-testid={testId}
      data-latest-step={state.latest?.stepId}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={nodes.map((n) => pickText(n.label, lang)).join(", ")}
      lang={lang}
    >
      <g className="c-agentgraph__edges">
        {edges.map((e) => {
          const a = placed.get(e.from);
          const b = placed.get(e.to);
          if (!a || !b) return null;
          const key = edgeKey(e.from, e.to);
          const seg = edgeSegment(a, b);
          const handoff = state.handoff?.key === key ? state.handoff : null;
          const status = handoff ? "latest" : state.usedEdges.has(key) ? "used" : "idle";
          // The handoff draws from the agent that passed it to the one that took it.
          const forward = handoff ? handoff.from === e.from : true;
          const { x1, y1, x2, y2 } = forward ? seg : { x1: seg.x2, y1: seg.y2, x2: seg.x1, y2: seg.y1 };
          const drawing = handoff !== null && handoff.progress < 1;
          const dash = drawing ? { strokeDasharray: `${seg.length} ${seg.length}`, strokeDashoffset: seg.length * (1 - handoff.progress) } : undefined;
          return (
            <g key={key}>
              {/* While the handoff draws, the edge already shows as used under it, so a paused clock never hides it. */}
              {drawing && <line className="c-agentgraph__edge c-agentgraph__edge--used" data-role="base" x1={x1} y1={y1} x2={x2} y2={y2} />}
              <line className={`c-agentgraph__edge c-agentgraph__edge--${status}`} data-edge={key} data-status={status} x1={x1} y1={y1} x2={x2} y2={y2} style={dash} />
            </g>
          );
        })}
      </g>
      {layout.nodes.map((p) => {
        const node = nodes.find((n) => n.id === p.id)!;
        const status = p.id === activeId ? "active" : state.usedNodes.has(p.id) ? "used" : "idle";
        const numbers = state.stepNumbers.get(p.id) ?? [];
        return (
          <g
            key={p.id}
            className={`c-agentgraph__node c-agentgraph__node--${status} c-agentgraph__node--${node.kind}`}
            data-testid={nodeTestIdPrefix ? `${nodeTestIdPrefix}${p.id}` : undefined}
            data-node-id={p.id}
            data-kind={node.kind}
            data-status={status}
          >
            {node.kind === "tool" ? (
              <rect className="c-agentgraph__shape" x={p.x - p.r} y={p.y - p.r} width={p.r * 2} height={p.r * 2} />
            ) : (
              <circle className="c-agentgraph__shape" cx={p.x} cy={p.y} r={p.r} />
            )}
            {numbers.length > 0 && (
              <text className="c-agentgraph__steps" x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central">
                {numbers.map((s, i) => (
                  <tspan key={s.stepId} data-testid={stepTestIdPrefix ? `${stepTestIdPrefix}${s.stepId}` : undefined}>
                    {i > 0 ? `,${s.n}` : String(s.n)}
                  </tspan>
                ))}
              </text>
            )}
            <NodeLabel p={p} label={pickText(node.label, lang)} kindWord={node.kind === "code" ? pickText(RULE_BASED_WORD, lang) : node.kind === "tool" ? pickText(TOOL_WORD, lang) : undefined} height={height} />
          </g>
        );
      })}
    </svg>
  );
}

/** The name on the outer side of a ring node (under the center node), and the kind line under it. */
function NodeLabel({ p, label, kindWord, height }: { p: PlacedNode; label: string; kindWord?: string; height: number }) {
  const below = p.place === "center" || Math.sin(p.angle) >= -0.2;
  const lines = kindWord ? 2 : 1;
  let y = below ? p.y + p.r + 16 : p.y - p.r - 6 - (lines - 1) * 16;
  // Keep both lines inside the drawing.
  y = Math.max(14, Math.min(height - 4 - (lines - 1) * 16, y));
  const anchor = p.place === "center" ? "middle" : Math.cos(p.angle) > 0.45 ? "start" : Math.cos(p.angle) < -0.45 ? "end" : "middle";
  const x = anchor === "start" ? p.x - p.r * 0.4 : anchor === "end" ? p.x + p.r * 0.4 : p.x;
  return (
    <text className="c-agentgraph__label" x={x} y={y} textAnchor={anchor}>
      <tspan className="c-agentgraph__name">{label}</tspan>
      {kindWord && (
        <tspan className="c-agentgraph__kind" x={x} dy={16} data-role="kind">
          {kindWord}
        </tspan>
      )}
    </text>
  );
}
