// Composes one piece's illustration (I2-art T2): read its facets, pick the kind, surface, palette
// and patterns, and write the SVG: an 800 by 800 square on the mat ground, one object silhouette
// centered with soft flat shading, its surface and pattern, and the stitch line along the edges.
//
// drawPiece(piece) returns { svg, report }. The report says what was picked and everything the run
// should print: fallbacks, motif words the table doesn't know, unknown color names, floral motifs
// kept off a piece that isn't com_ojibwe beadwork, and the file's size.
// The same piece always gives the same bytes: the only randomness is seeded from the piece ID.
import { KIT } from './colors.mjs';
import { KINDS, pickKind } from './kinds.mjs';
import { FLORAL_PATTERNS, PATTERNS, patternsFor } from './patterns.mjs';
import { readHints } from './hints.mjs';
import { makePalette, pickSurface } from './surfaces.mjs';
import { el, seeded } from './svg.mjs';

// The stitch rect is 752 by 752, so its perimeter (3008) is 94 stitches of 18 + 14: the running
// stitch closes at the corner without a short dash. The same line as the placeholder's.
const STITCH = el('rect', { x: 24, y: 24, width: 752, height: 752, fill: 'none', stroke: KIT.inkSoft, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-dasharray': '18 14' });

export function drawPiece(piece) {
  const facets = piece?.facets ?? {};
  const kindPick = pickKind(facets.object?.en);
  const surface = pickSurface(piece);
  const hints = readHints(piece);
  const { names, unknown: unknownMotifs } = patternsFor(facets.motifs);
  const floralAllowed = piece?.communityId === 'com_ojibwe' && surface.name === 'beaded';
  const keptOff = floralAllowed ? [] : names.filter((p) => FLORAL_PATTERNS.includes(p));
  const patterns = names.filter((p) => !keptOff.includes(p));
  const palette = makePalette(piece, surface.name, hints);

  const defs = new Map();
  const shapes = new Map();
  let clips = 0;
  // A long outline is defined once and reused by its fill, its clip and its stroke.
  const shapeRef = (d) => {
    if (!shapes.has(d)) {
      const id = `s${shapes.size + 1}`;
      shapes.set(d, id);
      defs.set(id, el('path', { id, d }));
    }
    return `#${shapes.get(d)}`;
  };
  const SHORT = 160;
  const ctx = {
    piece,
    kind: kindPick.kind,
    surface: surface.name,
    hints,
    palette,
    patterns,
    materials: (facets.materials ?? []).map((m) => String(m).trim().toLowerCase()),
    rng: seeded(piece?.id ?? 'piece'),
    defsHas: (id) => defs.has(id),
    addDef: (id, svg) => {
      if (!defs.has(id)) defs.set(id, svg);
    },
    use: (d, attrs) => (d.length < SHORT ? el('path', { d, ...attrs }) : el('use', { href: shapeRef(d), ...attrs })),
    clip: (d) => {
      clips += 1;
      const id = `c${clips}`;
      defs.set(id, el('clipPath', { id }, d.length < SHORT ? el('path', { d }) : el('use', { href: shapeRef(d) })));
      return id;
    },
    pattern: (name, at) => PATTERNS[name](null, palette.accents, seeded(`${piece?.id}:${name}`), { at }),
  };

  const body = KINDS[kindPick.kind](ctx);
  // Shapes first, then clip paths, then patterns, then the groups <use> copies, so every reference points back.
  const order = [...defs.entries()].toSorted(([a], [b]) => rank(a) - rank(b));
  const lines = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">',
    order.length ? `<defs>\n${order.map(([, svg]) => svg).join('\n')}\n</defs>` : null,
    el('rect', { width: 800, height: 800, fill: KIT.mat }),
    body,
    STITCH,
    '</svg>',
    '',
  ].filter((x) => x !== null);
  const svg = lines.join('\n');

  return {
    svg,
    report: {
      id: piece?.id,
      kind: kindPick.kind,
      kindWord: kindPick.word,
      kindFallback: kindPick.fallback,
      object: facets.object?.en ?? '',
      surface: surface.name,
      surfaceFallback: surface.fallback,
      surfaceWhy: surface.why,
      patterns,
      unknownMotifs,
      unknownColors: palette.unknown,
      floralKeptOff: keptOff,
      bytes: Buffer.byteLength(svg, 'utf8'),
    },
  };
}

function rank(id) {
  if (/^s\d+$/.test(id)) return 0;
  if (/^c\d+$/.test(id)) return 1;
  if (id === 'beads') return 2;
  return 3;
}
