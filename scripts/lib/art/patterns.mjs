// The patterns the piece illustrations use (I2-art T1). Plain geometry only: stripes, bands, steps,
// diamonds, triangles, squares, zigzags, chevrons, arcs, checks, dots and fine parallel lines. The
// five floral builders (flowers, leaves, vines, berries, buds) draw plain shapes and are used only
// on com_ojibwe floral beadwork whose motifs name them (A2 R15). The surfaces enforce that.
//
// There is no builder for anything under the plan's "Never drawn": no figure, face, animal, bird,
// feather, cross of any kind, whirling-log shape, sandpainting design, arrow, dreamcatcher, tipi,
// headdress or thunderbird, and nothing that reproduces a real piece or a named design. Flowers
// always have five petals, so no flower reads as a cross. `npm run art -- --check` reads
// PATTERN_NAMES and the module's exports and fails on any name outside the allowed list.
//
// MOTIF_PATTERNS maps every motif word in S3-catalog's R14 lists to its pattern. A motif word it
// doesn't know draws nothing and the run prints it. The pattern is never a guess.
//
// Every builder has the signature (region, colors, rng, opts) and returns SVG. Geometric builders
// draw in the region's (u, v) space (see svg.mjs), so the same builder bends around a pot or lies
// flat on a weaving. Floral builders take their anchor points in pixels, in `opts.at`.
import { batch, el, mapPoly, n, pd, smooth, uvPoly } from './svg.mjs';
import { shade } from './colors.mjs';

const pick = (colors, i) => colors[((i % colors.length) + colors.length) % colors.length];

/** How many units of about `unitPx` fit along the region. */
function repeats(region, unitPx, min = 3) {
  return Math.max(min, Math.round(region.lenPx / Math.max(4, unitPx)));
}

/** A stepped diamond (stair-step edges) centered at (cx, cy), half-width a, half-height b, k steps. */
function steppedDiamondPoints(cx, cy, a, b, stepCount) {
  // At least four steps: with two or three, a small stepped diamond reads as a plus sign, and no
  // cross is ever drawn. diamonds() also draws small ones plain (see MIN_STEPPED_PX).
  const k = Math.max(4, Math.round(stepCount));
  const rows = 2 * k - 1;
  const rowH = (2 * b) / rows;
  const top = cy - b;
  const width = (i) => (a * (k - Math.abs(i - (k - 1)))) / k;
  const pts = [];
  for (let i = 0; i < rows; i++) {
    pts.push([cx + width(i), top + i * rowH], [cx + width(i), top + (i + 1) * rowH]);
  }
  for (let i = rows - 1; i >= 0; i--) {
    pts.push([cx - width(i), top + (i + 1) * rowH], [cx - width(i), top + i * rowH]);
  }
  return pts;
}

/** A stepped diamond shorter than this (half-height, in px) is drawn plain, so it never reads as a cross. */
const MIN_STEPPED_PX = 44;

const plainDiamondPoints = (cx, cy, a, b) => [
  [cx, cy - b],
  [cx + a, cy],
  [cx, cy + b],
  [cx - a, cy],
];

/** Stripes across the region (along u), mirrored top to bottom. opts: count, weights. */
function stripes(region, colors, rng, opts = {}) {
  const count = opts.count ?? rng.int(3, 5) * 2 + 1;
  const half = Math.ceil(count / 2);
  const weights = opts.weights ?? [1, 0.45, 1.7, 0.35];
  const w = Array.from({ length: half }, () => rng.pick(weights));
  const seq = count % 2 ? [...w, ...w.slice(0, half - 1).toReversed()] : [...w, ...w.toReversed()];
  const total = seq.reduce((s, x) => s + x, 0);
  const out = batch();
  let v = 0;
  seq.forEach((wi, i) => {
    const v1 = v + wi / total;
    const ci = Math.min(i, seq.length - 1 - i);
    out.add(region, [[0, v], [1, v], [1, v1], [0, v1]], pick(colors, ci));
    v = v1;
  });
  return out.toString();
}

/**
 * Solid bands across the region. opts: count, height (each band's share of v), edge (a color for
 * thin edge lines), inner(subRegion, i) to draw inside each band, at (band centers in v).
 */
function bands(region, colors, rng, opts = {}) {
  const count = opts.count ?? 3;
  const h = opts.height ?? Math.min(0.6 / count, 0.22);
  const out = [];
  for (let i = 0; i < count; i++) {
    const c = opts.at ? opts.at[i] : (i + 1) / (count + 1);
    const v0 = c - h / 2;
    const v1 = c + h / 2;
    out.push(uvPoly(region, [[0, v0], [1, v0], [1, v1], [0, v1]], pick(colors, i)));
    if (opts.edge) {
      const e = Math.min(0.12, 3 / Math.max(1, region.hPx * h)) * h;
      out.push(uvPoly(region, [[0, v0], [1, v0], [1, v0 + e], [0, v0 + e]], opts.edge));
      out.push(uvPoly(region, [[0, v1 - e], [1, v1 - e], [1, v1], [0, v1]], opts.edge));
    }
    if (opts.inner) out.push(opts.inner(region.sub(v0, v1), i));
  }
  return out.join('');
}

/**
 * Diamonds. mode "row": a row of diamonds along the band. mode "center": `count` diamonds stacked
 * down the middle, each with `layers` nested diamonds. opts: stepped, steps, count, layers.
 */
function diamonds(region, colors, rng, opts = {}) {
  const out = [];
  const stepped = Boolean(opts.stepped);
  const shape = (cx, cy, a, b, k) => (stepped && b * region.hPx >= MIN_STEPPED_PX ? steppedDiamondPoints(cx, cy, a, b, k) : plainDiamondPoints(cx, cy, a, b));
  if ((opts.mode ?? 'row') === 'center') {
    const count = opts.count ?? 1;
    const layers = opts.layers ?? 3;
    const cellV = 1 / count;
    const b = cellV * 0.44;
    const aPx = Math.min(b * region.hPx * (count > 1 ? 1.3 : 0.95), region.w * 0.42);
    const a = aPx / region.lenPx;
    for (let i = 0; i < count; i++) {
      const cy = (i + 0.5) * cellV;
      for (let j = 0; j < layers; j++) {
        const s = 1 - j / layers;
        const k = Math.max(4, (opts.steps ?? 5) - j);
        out.push(uvPoly(region, shape(0.5, cy, a * s, b * s, k), pick(colors, j + (i % 2))));
      }
    }
    return out.join('');
  }
  const count = opts.count ?? repeats(region, region.hPx * 1.25);
  const du = Math.min(0.46 / count, (0.4 * region.hPx) / region.lenPx);
  const outer = batch();
  const cores = batch();
  for (let i = 0; i < count; i++) {
    const cu = (i + 0.5) / count;
    outer.add(region, shape(cu, 0.5, du, 0.4, opts.steps ?? 3), pick(colors, i));
    if ((opts.layers ?? 1) > 1) cores.add(region, plainDiamondPoints(cu, 0.5, du * 0.42, 0.17), pick(colors, i + 1));
  }
  return `${outer}${cores}`;
}

/** A row of stepped terraces. With `interlock`, a second row hangs down between them in the next color. */
function steps(region, colors, rng, opts = {}) {
  const count = opts.count ?? repeats(region, region.hPx * 1.7);
  const levels = opts.levels ?? 3;
  const du = 1 / count;
  const unit = (u0, up) => {
    const pts = [];
    const vb = up ? 1 : 0;
    const dir = up ? -1 : 1;
    const rise = 0.86 / levels;
    const run = du / 2 / (levels + 0.5);
    pts.push([u0, vb]);
    for (let j = 0; j < levels; j++) {
      pts.push([u0 + j * run, vb + dir * (j + 1) * rise]);
      pts.push([u0 + (j + 1) * run, vb + dir * (j + 1) * rise]);
    }
    for (let j = levels - 1; j >= 0; j--) {
      pts.push([u0 + du - (j + 1) * run, vb + dir * (j + 1) * rise]);
      pts.push([u0 + du - j * run, vb + dir * (j + 1) * rise]);
    }
    pts.push([u0 + du, vb]);
    return pts;
  };
  const out = batch();
  for (let i = 0; i < count; i++) out.add(region, unit(i * du, true), pick(colors, 0));
  if (opts.interlock !== false && colors.length > 1) {
    for (let i = 0; i <= count; i++) out.add(region, unit((i - 0.5) * du, false), pick(colors, 1));
  }
  return out.toString();
}

/** A band of triangles: up in the first color, down in the second. */
function triangles(region, colors, rng, opts = {}) {
  const count = opts.count ?? repeats(region, region.hPx * 1.1);
  const du = 1 / count;
  const out = batch();
  for (let i = 0; i < count; i++) {
    const u0 = i * du;
    out.add(region, [[u0, 1], [u0 + du / 2, 0], [u0 + du, 1]], pick(colors, 0));
  }
  if (colors.length > 1) {
    for (let i = 0; i <= count; i++) {
      const c = i * du;
      out.add(region, [[Math.max(0, c - du / 2), 0], [Math.min(1, c + du / 2), 0], [c, 1]], pick(colors, 1));
    }
  }
  return out.toString();
}

/** A row of small squares, colors in turn. opts: count, size (share of the band's height). */
function squares(region, colors, rng, opts = {}) {
  const size = opts.size ?? 0.62;
  const count = opts.count ?? repeats(region, region.hPx * (size + 0.4));
  const du = 1 / count;
  const half = Math.min(du * 0.42, (size * region.hPx) / region.lenPx / 2);
  const out = batch();
  for (let i = 0; i < count; i++) {
    const cu = (i + 0.5) * du;
    const v0 = 0.5 - size / 2;
    const v1 = 0.5 + size / 2;
    out.add(region, [[cu - half, v0], [cu + half, v0], [cu + half, v1], [cu - half, v1]], pick(colors, i));
  }
  return out.toString();
}

/**
 * Zigzags. Default: one zigzag strip along the band. With `field`, the whole region is filled with
 * zigzag stripes in turn (a weaving whose bands bend into zigzags). opts: count, rows, thickness.
 */
function zigzags(region, colors, rng, opts = {}) {
  const out = batch();
  if (opts.field) {
    const rows = opts.rows ?? 7;
    const count = opts.count ?? 6;
    const amp = opts.amp ?? 0.6 / rows;
    const line = (j) => {
      const pts = [];
      for (let i = 0; i <= count * 2; i++) pts.push([i / (count * 2), j / rows + (i % 2 ? amp : -amp)]);
      return pts;
    };
    for (let j = -1; j <= rows; j++) {
      const a = line(j);
      const b = line(j + 1).toReversed();
      out.add(region, [...a, ...b], pick(colors, j + 1));
    }
    return out.toString();
  }
  const count = opts.count ?? repeats(region, region.hPx * 1.2);
  const t = opts.thickness ?? 0.32;
  const lo = 0.06;
  const hi = 0.94 - t;
  const top = [];
  for (let i = 0; i <= count * 2; i++) top.push([i / (count * 2), i % 2 ? hi : lo]);
  const bottom = top.map(([u, v]) => [u, v + t]).toReversed();
  out.add(region, [...top, ...bottom], pick(colors, 0));
  return out.toString();
}

/** Chevrons. Default: a row of small stamped V marks (strokes). With `filled`, a band of filled chevrons. */
function chevrons(region, colors, rng, opts = {}) {
  const count = opts.count ?? repeats(region, region.hPx * 0.9);
  const du = 1 / count;
  if (opts.filled) {
    const out = batch();
    for (let i = 0; i < count; i++) {
      const u0 = i * du;
      out.add(region, [[u0, 0.15], [u0 + du / 2, 0.55], [u0 + du, 0.15], [u0 + du, 0.45], [u0 + du / 2, 0.85], [u0, 0.45]], pick(colors, i));
    }
    return out.toString();
  }
  const d = [];
  for (let i = 0; i < count; i++) {
    const cu = (i + 0.5) * du;
    const half = du * 0.3;
    d.push(pd(mapPoly(region, [[cu - half, 0.22], [cu, 0.78], [cu + half, 0.22]], false), false));
  }
  return el('path', { d: d.join(''), fill: 'none', stroke: colors[0], 'stroke-width': opts.width ?? 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
}

/** A row of small stamped arcs (strokes). */
function arcs(region, colors, rng, opts = {}) {
  const count = opts.count ?? repeats(region, region.hPx * 0.9);
  const du = 1 / count;
  const d = [];
  for (let i = 0; i < count; i++) {
    const cu = (i + 0.5) * du;
    const half = du * 0.32;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const a = Math.PI * (k / 6);
      pts.push([cu - half * Math.cos(a), 0.25 + 0.5 * Math.sin(a)]);
    }
    d.push(pd(mapPoly(region, pts, false), false));
  }
  return el('path', { d: d.join(''), fill: 'none', stroke: colors[0], 'stroke-width': opts.width ?? 3, 'stroke-linecap': 'round' });
}

/** A checkerboard band. opts: rows, count. */
function checks(region, colors, rng, opts = {}) {
  const rows = opts.rows ?? 2;
  const count = opts.count ?? repeats(region, region.hPx / rows);
  const out = batch();
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < count; i++) {
      const u0 = i / count;
      const u1 = (i + 1) / count;
      out.add(region, [[u0, r / rows], [u1, r / rows], [u1, (r + 1) / rows], [u0, (r + 1) / rows]], pick(colors, i + r));
    }
  }
  return out.toString();
}

/** Rows of dots, colors in turn. opts: count, rows, r (radius in px), stagger. */
function dots(region, colors, rng, opts = {}) {
  const rows = opts.rows ?? 1;
  const r = opts.r ?? Math.max(2.5, (region.hPx / rows) * 0.26);
  const count = opts.count ?? repeats(region, r * 3.4, 4);
  const out = [];
  for (let row = 0; row < rows; row++) {
    const cv = (row + 0.5) / rows;
    const shift = opts.stagger && row % 2 ? 0.5 : 0;
    for (let i = 0; i < count; i++) {
      const cu = (i + 0.5 + shift) / count;
      if (cu >= 1 && !region.closed) continue;
      const [x, y] = region.map(cu % 1, cv);
      const fs = region.fs(cu % 1);
      const fill = pick(colors, i + row);
      out.push(fs > 0.97 ? el('circle', { cx: x, cy: y, r, fill }) : el('ellipse', { cx: x, cy: y, rx: r * fs, ry: r, fill }));
    }
  }
  return out.join('');
}

/** Fine parallel lines. dir "v" runs each line across the band (hatching), "h" along it. opts: gap (px), width. */
function fineLines(region, colors, rng, opts = {}) {
  const dir = opts.dir ?? 'v';
  const width = opts.width ?? 1.8;
  const d = [];
  if (dir === 'v') {
    const count = opts.count ?? repeats(region, opts.gap ?? 8, 6);
    const vs = region.curved ? [0, 0.25, 0.5, 0.75, 1] : [0, 1];
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count;
      d.push(pd(vs.map((v) => region.map(u, v)), false));
    }
  } else {
    const count = opts.count ?? Math.max(2, Math.round(region.hPx / (opts.gap ?? 8)));
    const us = region.curved ? Array.from({ length: 25 }, (_, k) => k / 24) : [0, 1];
    for (let j = 0; j < count; j++) {
      const v = (j + 0.5) / count;
      d.push(pd(us.map((u) => region.map(u, v)), false));
    }
  }
  return el('path', { d: d.join(''), fill: 'none', stroke: colors[0], 'stroke-width': width, 'stroke-linecap': 'round' });
}

// ---- Floral beadwork only (com_ojibwe, A2 R15). Anchor points are in pixels. ----

/** Five-petal flowers. at: [{ x, y, r, color, center, rot }]. */
function flowers(region, colors, rng, opts = {}) {
  const out = [];
  for (const f of opts.at ?? []) {
    const petal = f.color ?? colors[0];
    const center = f.center ?? pick(colors, 1);
    const rot = f.rot ?? rng.range(0, 72);
    const pr = f.r * 0.44;
    const edge = shade(petal, 0.28);
    for (let k = 0; k < 5; k++) {
      const a = ((rot + k * 72) * Math.PI) / 180;
      out.push(el('circle', { cx: f.x + Math.cos(a) * f.r * 0.56, cy: f.y + Math.sin(a) * f.r * 0.56, r: pr, fill: petal, stroke: edge, 'stroke-width': 2 }));
    }
    out.push(el('circle', { cx: f.x, cy: f.y, r: f.r * 0.32, fill: center, stroke: shade(center, 0.3), 'stroke-width': 2 }));
  }
  return out.join('');
}

/** Pointed leaves with a center vein. at: [{ x, y, len, angle, color, width }]: the base at (x, y). */
function leaves(region, colors, rng, opts = {}) {
  const out = [];
  for (const l of opts.at ?? []) {
    const color = l.color ?? colors[0];
    const w = (l.width ?? 0.36) * l.len;
    const d = `M0 0Q${n(l.len * 0.45)} ${n(-w)} ${n(l.len)} 0Q${n(l.len * 0.45)} ${n(w)} 0 0Z`;
    const vein = `M${n(l.len * 0.08)} 0L${n(l.len * 0.78)} 0`;
    const t = `translate(${n(l.x)} ${n(l.y)}) rotate(${n(l.angle)})`;
    out.push(
      el('g', { transform: t }, el('path', { d, fill: color, stroke: shade(color, 0.3), 'stroke-width': 2 }) + el('path', { d: vein, fill: 'none', stroke: shade(color, 0.32), 'stroke-width': 2, 'stroke-linecap': 'round' })),
    );
  }
  return out.join('');
}

/** Curving vines and stems. paths: [[x, y], ...] lists, drawn as smooth strokes. opts: color, width. */
function vines(region, colors, rng, opts = {}) {
  return (opts.paths ?? [])
    .map((pts) => el('path', { d: smooth(pts), fill: 'none', stroke: opts.color ?? colors[0], 'stroke-width': opts.width ?? 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }))
    .join('');
}

/** Berry clusters of three. at: [{ x, y, r, color }]. */
function berries(region, colors, rng, opts = {}) {
  const out = [];
  for (const b of opts.at ?? []) {
    const color = b.color ?? colors[0];
    const spots = [
      [0, -0.9],
      [-0.85, 0.5],
      [0.85, 0.5],
    ];
    for (const [dx, dy] of spots) {
      const cx = b.x + dx * b.r;
      const cy = b.y + dy * b.r;
      out.push(el('circle', { cx, cy, r: b.r, fill: color, stroke: shade(color, 0.3), 'stroke-width': 2 }));
      out.push(el('circle', { cx: cx - b.r * 0.35, cy: cy - b.r * 0.35, r: b.r * 0.24, fill: '#FFFFFF', 'fill-opacity': '0.55' }));
    }
  }
  return out.join('');
}

/** Closed buds on a short stem, with two small sepals. at: [{ x, y, len, angle, color, sepal }]: the stem's base at (x, y). */
function buds(region, colors, rng, opts = {}) {
  const out = [];
  for (const b of opts.at ?? []) {
    const color = b.color ?? colors[0];
    const sepal = b.sepal ?? pick(colors, 1);
    const L = b.len;
    const bud = `M${n(L * 0.45)} 0C${n(L * 0.55)} ${n(-L * 0.26)} ${n(L * 0.95)} ${n(-L * 0.22)} ${n(L)} 0C${n(L * 0.95)} ${n(L * 0.22)} ${n(L * 0.55)} ${n(L * 0.26)} ${n(L * 0.45)} 0Z`;
    const stem = `M0 0L${n(L * 0.5)} 0`;
    const sep = `M${n(L * 0.42)} 0Q${n(L * 0.55)} ${n(-L * 0.2)} ${n(L * 0.66)} ${n(-L * 0.16)}M${n(L * 0.42)} 0Q${n(L * 0.55)} ${n(L * 0.2)} ${n(L * 0.66)} ${n(L * 0.16)}`;
    const t = `translate(${n(b.x)} ${n(b.y)}) rotate(${n(b.angle)})`;
    out.push(
      el(
        'g',
        { transform: t },
        el('path', { d: stem, fill: 'none', stroke: sepal, 'stroke-width': 4, 'stroke-linecap': 'round' }) +
          el('path', { d: bud, fill: color, stroke: shade(color, 0.3), 'stroke-width': 2 }) +
          el('path', { d: sep, fill: 'none', stroke: sepal, 'stroke-width': 4, 'stroke-linecap': 'round' }),
      ),
    );
  }
  return out.join('');
}

/** Every pattern builder, by name. Nothing outside the allowed list lives here. */
export const PATTERNS = Object.freeze({
  stripes,
  bands,
  steps,
  diamonds,
  triangles,
  squares,
  zigzags,
  chevrons,
  arcs,
  checks,
  dots,
  fineLines,
  flowers,
  leaves,
  vines,
  berries,
  buds,
});

/** The builder names, which `npm run art -- --check` compares against the allowed list. */
export const PATTERN_NAMES = Object.freeze(Object.keys(PATTERNS));

/** The floral builders, drawn only on com_ojibwe floral beadwork whose motifs name them. */
export const FLORAL_PATTERNS = Object.freeze(['flowers', 'leaves', 'vines', 'berries', 'buds']);

/**
 * Every motif word in S3-catalog's R14 lists, to its patterns. Weaving: diamond, stripe, zigzag,
 * step, band. Silver: dot, line, chevron, arc. Beadwork: flower, leaf, vine, berry, bud. Pottery:
 * geometric, fine line, band, step, dot. Patchwork: stripe, band, diamond, zigzag, square,
 * triangle. "line" and "fine line" are fine parallel lines, "geometric" is steps with fine-line bands.
 */
export const MOTIF_PATTERNS = Object.freeze({
  diamond: ['diamonds'],
  stripe: ['stripes'],
  zigzag: ['zigzags'],
  step: ['steps'],
  band: ['bands'],
  dot: ['dots'],
  line: ['fineLines'],
  chevron: ['chevrons'],
  arc: ['arcs'],
  flower: ['flowers'],
  leaf: ['leaves'],
  vine: ['vines'],
  berry: ['berries'],
  bud: ['buds'],
  geometric: ['steps', 'fineLines'],
  'fine line': ['fineLines'],
  square: ['squares'],
  triangle: ['triangles'],
});

/** A piece's motif words to pattern names, in order and without repeats, plus the words the table doesn't know. */
export function patternsFor(motifs) {
  const names = [];
  const unknown = [];
  for (const raw of motifs ?? []) {
    const word = String(raw).trim().toLowerCase();
    const mapped = Object.hasOwn(MOTIF_PATTERNS, word) ? MOTIF_PATTERNS[word] : null;
    if (!mapped) {
      unknown.push(String(raw));
      continue;
    }
    for (const name of mapped) if (!names.includes(name)) names.push(name);
  }
  return { names, unknown };
}
