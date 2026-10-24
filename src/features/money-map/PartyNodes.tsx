// The parties on the money map, as HTML nodes laid over the SVG threads. The parent is
// position: relative with aspect ratio 1000/600, so nodes are placed by percentage.
import type { CSSProperties } from "react";
import { useCindia, type MoneyMove, type Party, type Person, type Studio } from "../../core";
import { MakerMark, Money } from "../../ui";
import { getById } from "../../mock";
import { CANVAS_H, CANVAS_W, NODE_W, partyKey, partyPoint, studioMakerIds } from "./partyLayout";
import { partyNames, strings, t, type Lang } from "./strings";

interface NodeInfo {
  key: string;
  party: Party;
  /** Money in minus money out, in cents. */
  netCents: number;
  /** Whether any money arrived at this party. */
  hasIn: boolean;
}

/** Order the nodes are drawn in, so the DOM is the same on every render. */
const KIND_ORDER: Party["kind"][] = ["buyer", "card_network", "cindia", "processor", "gallery", "studio", "supplier", "maker"];

/** Every node to draw: the studio and its makers always, plus each party named in a move. Pure. */
function collectNodes(moves: readonly MoneyMove[]): NodeInfo[] {
  const nodes = new Map<string, NodeInfo>();
  const add = (party: Party): NodeInfo => {
    const key = partyKey(party);
    let n = nodes.get(key);
    if (!n) {
      n = { key, party, netCents: 0, hasIn: false };
      nodes.set(key, n);
    }
    return n;
  };
  add({ kind: "studio", id: "std_gu" });
  for (const id of studioMakerIds()) add({ kind: "maker", id });
  for (const m of moves) {
    add(m.from).netCents -= m.amountCents;
    const to = add(m.to);
    to.netCents += m.amountCents;
    to.hasIn = true;
  }
  return [...nodes.values()].toSorted((a, b) => {
    const k = KIND_ORDER.indexOf(a.party.kind) - KIND_ORDER.indexOf(b.party.kind);
    return k !== 0 ? k : a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
}

function nodeName(p: Party, lang: Lang): string {
  if (p.kind === "studio") {
    const s = getById<Studio>(p.id ?? "std_gu");
    if (s) return s.name[lang];
  }
  if (p.kind === "maker" && p.id) {
    const m = getById<Person>(p.id);
    if (m) return m.name[lang];
  }
  return t(partyNames[p.kind], lang);
}

const nodeStyle = (x: number, y: number, lang: Lang, studio: boolean): CSSProperties => ({
  position: "absolute",
  left: `${(x / CANVAS_W) * 100}%`,
  top: `${(y / CANVAS_H) * 100}%`,
  width: `${(NODE_W / CANVAS_W) * 100}%`,
  transform: "translate(-50%, -50%)",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "var(--c-space-4)",
  padding: "var(--c-space-8)",
  background: "var(--c-color-paper)",
  border: `1px solid ${studio ? "var(--c-color-ink)" : "var(--c-color-line)"}`,
  borderRadius: "var(--c-radius-panel)",
  color: "var(--c-color-ink)",
  fontFamily: lang === "zh" ? "var(--c-font-body-zh)" : "var(--c-font-body)",
  fontSize: "var(--c-text-14)",
  lineHeight: lang === "zh" ? "var(--c-leading-body-zh)" : "var(--c-leading-body)",
  textAlign: "center",
  pointerEvents: "none",
});

export function PartyNodes({ lang }: { lang: Lang }) {
  const moveIds = useCindia((s) => s.money.moveIds);
  const movesById = useCindia((s) => s.money.moves);
  const moves = moveIds.map((id) => movesById[id]).filter((m): m is MoneyMove => Boolean(m));
  const nodes = collectNodes(moves);

  return (
    <>
      {nodes.map((n) => {
        const { x, y } = partyPoint(n.party);
        const name = nodeName(n.party, lang);
        const maker = n.party.kind === "maker" && n.party.id ? getById<Person>(n.party.id) : undefined;
        // A party money only left (the buyer) doesn't show a negative "kept" figure.
        const showKept = n.netCents !== 0 && n.hasIn;
        return (
          <div key={n.key} data-testid={`money-map-node-${n.key}`} style={nodeStyle(x, y, lang, n.party.kind === "studio")}>
            {maker ? <MakerMark char={maker.surnameChar} size={28} label={name} /> : null}
            <span style={{ fontWeight: 600 }}>{name}</span>
            {showKept ? (
              <span style={{ color: "var(--c-color-ink-soft)", fontSize: "var(--c-text-14)" }}>
                {t(strings.kept, lang)} <Money cents={n.netCents} tone="in" />
              </span>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export default PartyNodes;
