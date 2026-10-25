// Surfaces for the piece illustrations (I2-art T1), picked from `facets.techniques` and
// `facets.materials`, falling back by `communityId`:
//   - woven: flat wool with plain bands, stripes, steps and diamonds,
//   - silver: flat metal shading with one plain stone, an oval or a circle, in turquoise or coral,
//   - beaded: a dotted bead texture, with plain floral beadwork on com_ojibwe pieces,
//   - painted: painted pottery, a slip ground with fine-line bands,
//   - patchwork: bands of small pieced squares, triangles, diamonds and zigzags.
//
// Each surface has a palette (which facet color is the ground, which are accents) and painters the
// silhouette kinds call to fill their regions. Painters only draw patterns the piece's motifs name
// (through MOTIF_PATTERNS), plus the surface's own plain structure: a weaving's end bands, a pot's
// framing lines, a patchwork band's edge strips, a bead row along an edge, rickrack where the
// materials list it.
import { COLORS, KIT, MATERIAL_COLORS, colorHex, isLight, luminance, shade, tint } from './colors.mjs';
import { PATTERNS } from './patterns.mjs';
import { boxRegion, el, n, pdRel, seeded } from './svg.mjs';

export const SURFACE_NAMES = Object.freeze(['woven', 'silver', 'beaded', 'painted', 'patchwork']);

const COMMUNITY_SURFACE = { com_dine: 'woven', com_ojibwe: 'beaded', com_acoma: 'painted', com_seminole: 'patchwork' };

const lowerList = (xs) => (Array.isArray(xs) ? xs.map((x) => String(x).trim().toLowerCase()) : []);
const hasAny = (list, ...words) => words.some((w) => list.includes(w));
/** A stem from base to tip, bowed sideways by `bend` pixels at its middle. */
const stemTo = (base, tip, bend) => [base, [(base[0] + tip[0]) / 2 + bend, (base[1] + tip[1]) / 2], tip];

/** { name, fallback, why } for one piece. */
export function pickSurface(piece) {
  const facets = piece?.facets ?? {};
  const mats = lowerList(facets.materials);
  const techs = lowerList(facets.techniques);
  const has = hasAny;
  if (has(techs, 'beadwork') || has(mats, 'glass beads')) return { name: 'beaded', fallback: false, why: 'beadwork' };
  if (has(techs, 'patchwork') || has(mats, 'rickrack')) return { name: 'patchwork', fallback: false, why: 'patchwork' };
  if (has(mats, 'clay', 'slip') || has(techs, 'coil-built', 'hand-painted', 'stone-polished')) return { name: 'painted', fallback: false, why: 'clay and slip' };
  if (has(mats, 'silver') || has(techs, 'stone setting', 'hand-stamped', 'soldered')) return { name: 'silver', fallback: false, why: 'silver' };
  if (has(mats, 'wool') || has(techs, 'handwoven', 'hand-spun', 'hand-dyed')) return { name: 'woven', fallback: false, why: 'wool' };
  if (has(mats, 'cotton')) return { name: 'patchwork', fallback: false, why: 'cotton' };
  const byCommunity = COMMUNITY_SURFACE[piece?.communityId];
  if (byCommunity) return { name: byCommunity, fallback: true, why: `community ${piece.communityId}` };
  return { name: 'woven', fallback: true, why: 'no technique, material or community matched' };
}

/**
 * The palette: every facet color resolved to hex, the ground and the accents.
 * Returns { names, hex(name), ground, groundName, accents, accentNames, dark, light, unknown, ... }.
 */
export function makePalette(piece, surface, hints) {
  const facets = piece?.facets ?? {};
  const names = lowerList(facets.colors);
  const mats = lowerList(facets.materials);
  const unknown = [];
  const table = {};
  for (const name of names) {
    const { hex, known } = colorHex(name);
    table[name] = hex;
    if (!known) unknown.push(name);
  }
  const hex = (name) => table[name] ?? colorHex(name).hex;
  const nonMetal = names.filter((c) => c !== 'silver');
  const all = nonMetal.length ? nonMetal : names;

  let groundName = null;
  let ground = null;
  if (hints.ground && names.includes(hints.ground) && hints.ground !== 'silver') groundName = hints.ground;
  if (surface === 'painted') {
    groundName ??= ['white', 'cream', 'natural'].find((c) => names.includes(c)) ?? all[0] ?? null;
  } else if (surface === 'beaded') {
    if (!groundName && names.includes('black') && mats.includes('cloth')) groundName = 'black';
    if (!groundName && mats.includes('leather')) ground = MATERIAL_COLORS.leather;
    if (!groundName && !ground && mats.includes('cloth')) groundName = names.includes('cream') ? 'cream' : (all[0] ?? null);
    if (!groundName && !ground) groundName = hints.roles.band?.[0] ?? (names.includes('black') ? 'black' : (all[0] ?? null));
  } else {
    groundName ??= all[0] ?? null;
  }
  ground ??= groundName ? hex(groundName) : KIT.paper;

  const accentNames = all.filter((c) => c !== groundName);
  const accents = accentNames.map(hex);
  const byLum = all.map(hex).toSorted((a, b) => luminance(a) - luminance(b));
  const dark = byLum[0] ?? KIT.ink;
  const light = byLum[byLum.length - 1] ?? KIT.paper;

  const stoneName = ['turquoise', 'coral'].find((c) => names.includes(c) || mats.includes(c)) ?? null;
  return {
    names,
    unknown,
    hex,
    ground,
    groundName,
    accents: accents.length ? accents : [ground === dark ? light : dark],
    accentNames,
    dark,
    light,
    stone: stoneName ? (table[stoneName] ?? MATERIAL_COLORS[stoneName]) : null,
    metal: COLORS.silver,
  };
}

/** The accent with the most contrast against a color. */
function contrasting(palette, against) {
  const pool = [...palette.accents, palette.ground].filter((c) => c !== against);
  const lum = luminance(against);
  return pool.toSorted((a, b) => Math.abs(luminance(b) - lum) - Math.abs(luminance(a) - lum))[0] ?? (isLight(against) ? KIT.ink : KIT.paper);
}

const has = (ctx, name) => ctx.patterns.includes(name);

// ---------------------------------------------------------------- woven

/** A weaving's face: ground, end bands and the motif patterns, inside the box region R. */
export function paintWoven(R, ctx) {
  const P = ctx.palette;
  const { rng } = ctx;
  const g = P.ground;
  const acc = P.accents;
  const cycle = [g, ...acc];
  const out = [el('rect', { x: R.x, y: R.y, width: R.w, height: R.h, fill: g })];
  const endBands = (color) => {
    out.push(PATTERNS.bands(R, [color], rng, { count: 2, at: [0.045, 0.955], height: 0.022 }));
  };
  const darkAccent = acc.includes(P.dark) ? P.dark : acc[acc.length - 1];
  const stepped = has(ctx, 'steps');

  if (has(ctx, 'stripes') && !has(ctx, 'diamonds') && !has(ctx, 'zigzags')) {
    out.push(PATTERNS.stripes(R, cycle, rng, { count: rng.pick([9, 11, 13]) }));
  } else if (has(ctx, 'stripes') && has(ctx, 'diamonds')) {
    const seed = `${ctx.piece.id}:stripes`;
    out.push(PATTERNS.stripes(R.sub(0, 0.36), cycle, seeded(seed), { count: 7 }));
    out.push(PATTERNS.stripes(R.sub(0.64, 1), cycle, seeded(seed), { count: 7 }));
    // The middle band in the lightest color, with diamonds in the piece's main color.
    const band = R.sub(0.39, 0.61);
    const diamondColor = [g, ...acc].find((c) => c !== P.light) ?? acc[0];
    out.push(PATTERNS.bands(band, [P.light], rng, { count: 1, at: [0.5], height: 1, edge: diamondColor }));
    out.push(PATTERNS.diamonds(band.sub(0.12, 0.88), [diamondColor], rng, { mode: 'row', count: ctx.hints.counts.diamonds ?? 5, stepped, steps: 3 }));
  } else if (has(ctx, 'diamonds') && has(ctx, 'bands')) {
    endBands(darkAccent);
    const rowColors = acc.length > 1 ? [acc[1], g] : [g];
    out.push(
      PATTERNS.bands(R, [acc[0]], rng, {
        count: ctx.hints.counts.bands ?? 3,
        height: 0.14,
        edge: acc[1] ?? g,
        inner: (sub) => PATTERNS.diamonds(sub.sub(0.16, 0.84), rowColors, rng, { mode: 'row', stepped, layers: 1 }),
      }),
    );
  } else if (has(ctx, 'diamonds')) {
    endBands(darkAccent);
    const layerColors = [darkAccent, ...acc.filter((c) => c !== darkAccent), g];
    const count = ctx.hints.counts.diamonds ?? 1;
    out.push(PATTERNS.diamonds(R.sub(0.1, 0.9), layerColors, rng, { mode: 'center', count, stepped, steps: count > 1 ? 4 : 6, layers: Math.min(4, layerColors.length + (count > 1 ? 0 : 1)) }));
  } else if (has(ctx, 'zigzags')) {
    out.push(PATTERNS.zigzags(R, cycle, rng, { field: true, rows: 8, count: Math.max(3, Math.round(R.w / 110)) }));
    if (has(ctx, 'bands')) endBands(darkAccent);
  } else if (has(ctx, 'steps')) {
    endBands(darkAccent);
    out.push(PATTERNS.bands(R, [acc[0]], rng, { count: 3, height: 0.12, inner: (sub) => PATTERNS.steps(sub, [darkAccent, g], rng, {}) }));
  } else if (has(ctx, 'bands')) {
    out.push(PATTERNS.bands(R, acc, rng, { count: ctx.hints.counts.bands ?? 5, height: 0.08 }));
  } else {
    endBands(darkAccent);
  }
  return out.join('\n');
}

// ---------------------------------------------------------------- silver

/** Flat metal tones from the silver color. */
export function metalTones(palette) {
  const m = palette.metal;
  return { base: m, light: tint(m, 0.55), mid: shade(m, 0.12), shadow: shade(m, 0.3), deep: shade(m, 0.5) };
}

/** One plain stone in a bezel: an oval or a circle. */
export function stone(cx, cy, rx, ry, color, tones) {
  return [
    el('ellipse', { cx, cy, rx: rx + 8, ry: ry + 8, fill: tones.deep }),
    el('ellipse', { cx, cy, rx: rx + 4, ry: ry + 4, fill: tones.mid }),
    el('ellipse', { cx, cy, rx, ry, fill: color }),
    el('path', { d: `M${n(cx + rx * 0.72)} ${n(cy - ry * 0.55)}A${n(rx)} ${n(ry)} 0 0 1 ${n(cx - rx * 0.4)} ${n(cy + ry * 0.92)}A${n(rx * 1.1)} ${n(ry * 1.1)} 0 0 0 ${n(cx + rx * 0.72)} ${n(cy - ry * 0.55)}Z`, fill: shade(color, 0.22) }),
    el('ellipse', { cx: cx - rx * 0.35, cy: cy - ry * 0.4, rx: rx * 0.22, ry: ry * 0.14, fill: '#FFFFFF', 'fill-opacity': '0.5' }),
  ].join('');
}

/** Stamped marks from the silver motifs (dots, lines, chevrons, arcs) in a region. */
export function stamps(region, ctx, opts = {}) {
  const tones = metalTones(ctx.palette);
  const color = [tones.deep];
  const names = ctx.patterns.filter((p) => ['dots', 'fineLines', 'chevrons', 'arcs'].includes(p));
  if (names.length === 0) return '';
  const draw = (name, sub) => {
    if (name === 'dots') return PATTERNS.dots(sub, color, ctx.rng, { r: opts.dotR ?? Math.min(6, sub.hPx * 0.3), count: opts.count });
    if (name === 'fineLines') return PATTERNS.fineLines(sub, color, ctx.rng, { dir: 'v', gap: opts.lineGap ?? 14, width: 3 });
    if (name === 'chevrons') return PATTERNS.chevrons(sub, color, ctx.rng, { width: 3.2, count: opts.count });
    return PATTERNS.arcs(sub, color, ctx.rng, { width: 3.2, count: opts.count });
  };
  if (names.length === 1) return draw(names[0], region.sub(opts.v0 ?? 0.18, opts.v1 ?? 0.82));
  return [draw(names[0], region.sub(0.04, 0.3)), draw(names[0], region.sub(0.7, 0.96)), draw(names[1], region.sub(0.34, 0.66))].join('');
}

// ---------------------------------------------------------------- beaded

/** The bead texture: dark gaps between round beads and a small shine on each. Goes in <defs> once. */
export function beadDefs(ctx) {
  if (ctx.defsHas('beads')) return;
  ctx.addDef(
    'beads',
    el(
      'pattern',
      { id: 'beads', width: 11, height: 11, patternUnits: 'userSpaceOnUse' },
      el('path', { d: 'M0 0h11v11H0zM1.2 5.5a4.3 4.3 0 1 0 8.6 0a4.3 4.3 0 1 0-8.6 0z', fill: KIT.ink, 'fill-opacity': '0.2', 'fill-rule': 'evenodd' }) +
        el('circle', { cx: 4, cy: 4, r: 1.3, fill: '#FFFFFF', 'fill-opacity': '0.4' }),
    ),
  );
}

/** A rect of bead texture over a box (clip it to the shape). */
export function beadOverlay(ctx, x, y, w, h) {
  beadDefs(ctx);
  return el('rect', { x, y, width: w, height: h, fill: 'url(#beads)' });
}

/** A row of beads along a path: round dots from a dashed stroke. */
export function beadRow(d, color, size = 9, gap = 12.5) {
  return el('path', { d, fill: 'none', stroke: color, 'stroke-width': size, 'stroke-linecap': 'round', 'stroke-dasharray': `0 ${n(gap)}` });
}

/** Who gets which color in floral beadwork: facet colors only, from the alt's own words where it gives them. */
export function floralColors(ctx) {
  const P = ctx.palette;
  const roles = ctx.hints.roles;
  const ofNames = (list) => (list ?? []).map(P.hex);
  const nonGround = P.accentNames;
  const green = P.names.includes('green') ? P.hex('green') : null;
  const leaf = ofNames(roles.leaves)[0] ?? green ?? P.hex(nonGround[nonGround.length - 1] ?? P.groundName ?? 'green');
  const flowerNames = roles.flowers ?? nonGround.filter((c) => c !== 'green' && P.hex(c) !== leaf);
  const flowers = ofNames(flowerNames.length ? flowerNames : nonGround);
  const vine = ofNames(roles.vines)[0] ?? ofNames(roles.stems)[0] ?? leaf;
  const berries = ofNames(roles.berries).length ? ofNames(roles.berries) : flowers;
  const buds = ofNames(roles.buds).length ? ofNames(roles.buds) : flowers;
  const others = P.accents.filter((c) => !flowers.includes(c) && c !== leaf);
  const center = ofNames(roles.center)[0] ?? (flowers.length > 1 ? flowers[1] : (others[0] ?? shade(flowers[0] ?? leaf, 0.35)));
  const edges = ofNames(roles.edges)[0] ?? contrasting(P, P.ground);
  return { leaf, flowers: flowers.length ? flowers : [leaf], vine, berries, buds, center, edges };
}

/**
 * Plain floral beadwork inside a box, from the motifs the piece names (flowers, leaves, vines,
 * berries, buds). `scale` sizes the elements to the panel.
 */
export function paintFloral(box, ctx, opts = {}) {
  const { rng } = ctx;
  const C = floralColors(ctx);
  const { x, y, w, h } = box;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const m = Math.min(w, h);
  const F = has(ctx, 'flowers');
  const L = has(ctx, 'leaves');
  const V = has(ctx, 'vines');
  const B = has(ctx, 'berries');
  const U = has(ctx, 'buds');
  const stems = Boolean(ctx.hints.roles.stems);
  const out = [];
  const flowersAt = [];
  const leavesAt = [];
  const berriesAt = [];
  const budsAt = [];
  const stemPaths = [];
  const flowerColor = (i) => C.flowers[i % C.flowers.length];
  const centerFor = (petal) => (C.center !== petal ? C.center : (C.flowers.find((c) => c !== petal) ?? shade(petal, 0.35)));

  if (V) {
    // One vine curving across the panel, with leaves along it and flowers, berries or buds on it.
    const pts = [
      [x + w * 0.06, y + h * 0.8],
      [x + w * 0.3, y + h * (0.62 + rng.range(-0.04, 0.04))],
      [x + w * 0.52, y + h * (0.5 + rng.range(-0.04, 0.04))],
      [x + w * 0.74, y + h * 0.36],
      [x + w * 0.9, y + h * 0.2],
    ];
    stemPaths.push(pts);
    if (L) {
      [pts[1], pts[2], pts[3]].forEach(([px, py], i) => {
        const up = i % 2 === 0;
        leavesAt.push({ x: px, y: py, len: m * 0.34, angle: up ? -100 : 20, color: C.leaf });
      });
    }
    const ends = [pts[4], pts[0], pts[2]];
    const kinds = [F && 'flower', B && 'berry', U && 'bud'].filter(Boolean);
    ends.forEach(([px, py], i) => {
      const k = kinds[i % Math.max(1, kinds.length)];
      if (k === 'flower') flowersAt.push({ x: px, y: py, r: m * (i === 2 ? 0.2 : 0.25), color: flowerColor(i) });
      else if (k === 'berry') berriesAt.push({ x: px, y: py, r: m * 0.075, color: C.berries[i % C.berries.length] });
      else if (k === 'bud') budsAt.push({ x: px, y: py, len: m * 0.28, angle: -60 - i * 40, color: C.buds[i % C.buds.length], sepal: C.vine });
    });
    if (!F && !B && !U && !L) leavesAt.push({ x: pts[4][0], y: pts[4][1], len: m * 0.3, angle: -30, color: C.leaf });
  } else if (F) {
    const count = ctx.hints.counts.flowers ?? (opts.small ? Math.min(2, C.flowers.length) : 3);
    const base = [cx, y + h * 0.98];
    if (count === 1) {
      const fr = m * (opts.fill ? 0.44 : 0.3);
      const fy = opts.fill ? cy : y + h * 0.36;
      if (!opts.fill && (L || U || stems)) stemPaths.push(stemTo(base, [cx, fy], w * 0.03));
      if (L) {
        const nL = ctx.hints.counts.leaves ?? 2;
        for (let i = 0; i < nL; i++) {
          const right = i % 2 === 0;
          leavesAt.push({ x: cx, y: y + h * (0.74 - 0.08 * Math.floor(i / 2)), len: m * 0.4, angle: right ? -30 : 210, color: C.leaf });
        }
      }
      if (U) budsAt.push({ x: cx, y: y + h * 0.8, len: m * 0.32, angle: -150, color: C.buds[0], sepal: C.vine });
      flowersAt.push({ x: cx, y: fy, r: fr, color: flowerColor(0) });
    } else {
      // A spray of two or three flowers on stems from one base.
      const tips =
        count === 2
          ? [
              [x + w * 0.34, y + h * 0.3],
              [x + w * 0.68, y + h * 0.5],
            ]
          : [
              [cx, y + h * 0.24],
              [x + w * 0.22, y + h * 0.5],
              [x + w * 0.78, y + h * 0.46],
            ];
      if (L || U || stems || B) tips.forEach((t, i) => stemPaths.push(stemTo(base, t, (i % 2 ? 1 : -1) * w * 0.05)));
      tips.forEach(([tx, ty], i) => flowersAt.push({ x: tx, y: ty, r: m * (i === 0 ? 0.25 : 0.21), color: flowerColor(i) }));
      if (L) {
        leavesAt.push({ x: cx, y: y + h * 0.76, len: m * 0.34, angle: -32, color: C.leaf });
        leavesAt.push({ x: cx, y: y + h * 0.82, len: m * 0.34, angle: 212, color: C.leaf });
      }
      if (U) {
        budsAt.push({ x: cx, y: y + h * 0.72, len: m * 0.28, angle: count === 2 ? -150 : -78, color: C.buds[1 % C.buds.length], sepal: C.vine });
        if (count > 2) budsAt.push({ x: cx, y: y + h * 0.76, len: m * 0.28, angle: 258, color: C.buds[0], sepal: C.vine });
      }
      if (B) {
        berriesAt.push({ x: x + w * 0.3, y: y + h * 0.78, r: m * 0.06, color: C.berries[0] });
        berriesAt.push({ x: x + w * 0.7, y: y + h * 0.76, r: m * 0.06, color: C.berries[1 % C.berries.length] });
      }
    }
  } else if (L) {
    // Leaves alone: a fan of leaves from one base.
    const nL = ctx.hints.counts.leaves ?? 3;
    const base = [cx, y + h * 0.9];
    const angles = nL === 1 ? [-90] : nL === 2 ? [-122, -58] : [-142, -90, -38];
    angles.forEach((a, i) => leavesAt.push({ x: base[0], y: base[1], len: m * 0.62, angle: a, color: i % 2 && P2(ctx) ? P2(ctx) : C.leaf, width: 0.34 }));
    if (B) berriesAt.push({ x: base[0], y: base[1] - m * 0.05, r: m * 0.06, color: C.berries[0] });
  } else if (B) {
    // Berry clusters on curved stems.
    const base = [cx, y + h * 0.98];
    const tips = [
      [x + w * 0.28, y + h * 0.28],
      [x + w * 0.72, y + h * 0.34],
      [cx + w * 0.02, y + h * 0.6],
    ];
    tips.forEach((t, i) => {
      stemPaths.push(stemTo(base, t, (i === 1 ? 1 : -1) * w * 0.07));
      berriesAt.push({ x: t[0], y: t[1], r: m * 0.085, color: C.berries[i % C.berries.length] });
    });
  } else if (U) {
    const base = [cx, y + h * 0.92];
    [-124, -90, -56].forEach((a, i) => budsAt.push({ x: base[0], y: base[1], len: m * 0.5, angle: a, color: C.buds[i % C.buds.length], sepal: C.vine }));
  }

  if (stemPaths.length) out.push(PATTERNS.vines(box, [C.vine], rng, { paths: stemPaths, color: C.vine, width: Math.max(4, m * 0.04) }));
  if (leavesAt.length) out.push(PATTERNS.leaves(box, [C.leaf], rng, { at: leavesAt }));
  if (budsAt.length) out.push(PATTERNS.buds(box, C.buds, rng, { at: budsAt }));
  if (berriesAt.length) out.push(PATTERNS.berries(box, C.berries, rng, { at: berriesAt }));
  if (flowersAt.length) out.push(PATTERNS.flowers(box, C.flowers, rng, { at: flowersAt.map((f) => ({ ...f, center: centerFor(f.color) })) }));
  return out.join('\n');
}

/** A second leaf color when the alt gives leaves two colors ("green and yellow beaded leaves"). */
const P2 = (ctx) => {
  const names = ctx.hints.roles.leaves;
  return names && names.length > 1 ? ctx.palette.hex(names[1]) : null;
};

// ---------------------------------------------------------------- painted pottery

/**
 * A pot's painted zone: framing fine-line bands, then one band per motif pattern, top to bottom.
 * `zone` is a wrap region around the body. opts.meridians draws fine lines from the top of the zone
 * down (a seed pot's lines from the opening).
 */
export function paintPotZone(zone, ctx, opts = {}) {
  const P = ctx.palette;
  const { rng } = ctx;
  const paints = P.accents.toSorted((a, b) => luminance(a) - luminance(b));
  const black = paints[0] ?? KIT.ink;
  const second = paints[1] ?? black;
  const frame = (v0, v1) => PATTERNS.bands(zone, [black], rng, { count: 1, at: [(v0 + v1) / 2], height: v1 - v0 });
  const items = ctx.patterns.filter((p) => ['bands', 'steps', 'fineLines', 'dots'].includes(p));
  const out = [];
  const lineV = Math.min(0.03, 5 / zone.hPx);

  if (opts.meridians && items.includes('fineLines')) {
    out.push(PATTERNS.fineLines(zone, [black], rng, { dir: 'v', count: opts.meridianCount ?? 26, width: 2.2 }));
  }
  const banded = items.filter((p) => !(opts.meridians && p === 'fineLines'));
  if (banded.length === 1 && banded[0] === 'dots' && !ctx.hints.rows) {
    // One ring of dots, just below the rim or around the opening.
    const ring = zone.sub(0.05, 0.27);
    out.push(PATTERNS.dots(ring, [second === black ? black : second], rng, { rows: 1, r: Math.min(9, ring.hPx * 0.3) }));
    return out.join('\n');
  }
  if (banded.length === 0) {
    if (!opts.meridians) out.push(frame(0, lineV), frame(1 - lineV, 1));
    return out.join('\n');
  }
  const weight = { steps: 1, fineLines: 0.9, dots: ctx.hints.rows ? 1.1 : 0.45, bands: 0.4 };
  const total = banded.reduce((s, p) => s + weight[p], 0);
  const gap = lineV * 3.2;
  const usable = 1 - gap * (banded.length + 1);
  let v = 0;
  if (!opts.meridians) out.push(frame(0, lineV));
  v = gap;
  banded.forEach((p, i) => {
    const h = (usable * weight[p]) / total;
    const sub = zone.sub(v, v + h);
    if (p === 'steps') out.push(PATTERNS.steps(sub, [black, second === black ? black : second], rng, { levels: 3, interlock: second !== black }));
    else if (p === 'fineLines') out.push(PATTERNS.fineLines(sub, [black], rng, { dir: 'v', gap: 7, width: 1.8 }), frame(v - lineV * 0.2, v + lineV * 0.6), frame(v + h - lineV * 0.6, v + h + lineV * 0.2));
    else if (p === 'dots') out.push(PATTERNS.dots(sub, [second === black ? black : second], rng, { rows: ctx.hints.rows ? 3 : 1, stagger: true, r: Math.min(9, (sub.hPx / (ctx.hints.rows ? 3 : 1)) * 0.3) }));
    else if (p === 'bands') out.push(PATTERNS.bands(sub, second === black ? [black] : [black, second], rng, { count: second === black ? 1 : 2, height: second === black ? 0.6 : 0.36 }));
    v += h + gap;
    if (i < banded.length - 1 || !opts.meridians) out.push(frame(v - gap * 0.6, v - gap * 0.6 + lineV));
  });
  return out.join('\n');
}

// ---------------------------------------------------------------- patchwork

const PIECED = ['squares', 'triangles', 'diamonds', 'zigzags', 'steps', 'checks', 'chevrons'];

/** Rickrack: a wavy trim along the band at v, drawn as one stroked line. */
function rickrack(region, v, color) {
  const count = Math.max(8, Math.round(region.lenPx / 15));
  const amp = Math.min(0.12, 4 / Math.max(1, region.hPx));
  const pts = [];
  for (let k = 0; k <= count * 2; k++) pts.push(region.map(k / (count * 2), v + (k % 2 ? amp : -amp)));
  return el('path', { d: pdRel(pts), fill: 'none', stroke: color, 'stroke-width': 3.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
}

/** One pieced row inside a band. */
function piecedRow(name, inner, pc, stripColor, rng) {
  if (name === 'squares') return PATTERNS.squares(inner, pc, rng, { size: 0.64 });
  if (name === 'triangles') return PATTERNS.triangles(inner, [pc[0], stripColor], rng, {});
  if (name === 'diamonds') return PATTERNS.diamonds(inner, pc, rng, { mode: 'row', layers: pc.length > 1 ? 2 : 1 });
  if (name === 'zigzags') return PATTERNS.zigzags(inner, [pc[0]], rng, { thickness: 0.36 });
  if (name === 'steps') return PATTERNS.steps(inner, [pc[0], pc[1] ?? stripColor], rng, { levels: 2 });
  if (name === 'checks') return PATTERNS.checks(inner, [pc[0], stripColor], rng, { rows: 2 });
  if (name === 'chevrons') return PATTERNS.chevrons(inner, pc, rng, { filled: true });
  return '';
}

/**
 * Patchwork band i of `count`: a strip of pieced shapes between thin edge strips, with rickrack
 * where the materials list it. Every pieced motif lands in some band: when there are more pieced
 * motifs than bands, band i takes every count-th one, each in its own row.
 */
export function paintPatchBand(region, ctx, i, count = 1) {
  const P = ctx.palette;
  const { rng } = ctx;
  const g = P.ground;
  const acc = P.accents;
  const pieced = ctx.patterns.filter((p) => PIECED.includes(p));
  const plain = ctx.patterns.filter((p) => ['stripes', 'bands', 'fineLines'].includes(p));
  const stripColor = acc[i % acc.length];
  const pieceColors = [...acc.filter((c) => c !== stripColor), ...(g !== stripColor ? [g] : [])];
  const pc = pieceColors.length ? pieceColors : [contrasting(P, stripColor)];
  const out = [PATTERNS.bands(region, [stripColor], rng, { count: 1, at: [0.5], height: 1 })];
  const mine = pieced.length <= count ? (pieced.length ? [pieced[i % pieced.length]] : []) : pieced.filter((_, k) => k % count === i);
  mine.forEach((name, r) => {
    const v0 = 0.15 + (0.7 * r) / mine.length;
    const v1 = 0.15 + (0.7 * (r + 1)) / mine.length;
    const pad = mine.length > 1 ? 0.025 : 0;
    out.push(piecedRow(name, region.sub(v0 + pad, v1 - pad), pc, stripColor, rng));
  });
  if (mine.length === 0 && plain.includes('stripes')) out.push(PATTERNS.stripes(region.sub(0.1, 0.9), [stripColor, pc[0]], rng, { count: 5, weights: [1] }));

  // Edge strips: one thin strip each side, two when the motifs name bands or fine lines.
  const edge = pc[0];
  const e = Math.min(0.1, 4 / Math.max(1, region.hPx));
  out.push(PATTERNS.bands(region, [edge], rng, { count: 2, at: [e / 2 + 0.02, 1 - e / 2 - 0.02], height: e }));
  if (plain.includes('bands') || plain.includes('fineLines') || (plain.includes('stripes') && mine.length)) {
    out.push(PATTERNS.bands(region, [stripColor === g ? edge : g], rng, { count: 2, at: [-0.07, 1.07], height: e * 1.6 }));
  }
  if (ctx.materials.includes('rickrack')) out.push(rickrack(region, 1.0, contrasting(P, stripColor)));
  return out.join('\n');
}

/** A flat panel for a fallback kind: the motif patterns as bands on the ground. */
export function paintFlat(box, ctx) {
  const P = ctx.palette;
  const names = ctx.patterns.filter((p) => !['flowers', 'leaves', 'vines', 'berries', 'buds'].includes(p));
  const out = [el('rect', { x: box.x, y: box.y, width: box.w, height: box.h, fill: P.ground })];
  if (ctx.surface === 'beaded' && ctx.patterns.some((p) => ['flowers', 'leaves', 'vines', 'berries', 'buds'].includes(p))) {
    out.push(paintFloral(box, ctx));
    return out.join('\n');
  }
  names.forEach((name, i) => {
    const v0 = (i + 0.5) / (names.length + 0.5) - 0.07;
    const sub = boxRegion(box.x, box.y + box.h * v0, box.w, box.h * 0.14);
    out.push(PATTERNS[name](sub, [P.accents[i % P.accents.length], P.ground], ctx.rng, name === 'diamonds' ? { mode: 'row' } : {}));
  });
  return out.join('\n');
}

