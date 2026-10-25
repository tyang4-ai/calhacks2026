// Silhouette kinds for the piece illustrations (I2-art T1). A kind is picked by the words in
// `facets.object.en` through KIND_WORDS, the object words S3-catalog's pieces use, each a sourced
// form of its craft:
//   - Diné weaving: wall weaving, rug,
//   - Diné silver and turquoise: earrings, ring, pendant necklace, cuff bracelet,
//   - Ojibwe beadwork: earrings, pouch, pendant necklace, bead necklace,
//   - Acoma pottery: jar, bowl, seed pot,
//   - Seminole patchwork: skirt, jacket.
// No kind is drawn for a word outside this list (no barrette, medallion, vase, vest, runner, belt
// buckle, bag or sash belt). An unmatched object falls back to a plain flat textile square, and
// the run prints the fallback.
//
// Each kind is an SVG path builder taking the piece's palette (through ctx): it draws one object
// silhouette, centered on the 800 by 800 square, with soft flat shading, and calls its surface's
// painters to fill it. Earrings are drawn as a pair, as they're sold.
import { KIT, edgeFor, mix, shade } from './colors.mjs';
import {
  beadOverlay,
  beadRow,
  floralColors,
  metalTones,
  paintFlat,
  paintFloral,
  paintPatchBand,
  paintPotZone,
  paintWoven,
  stamps,
  stone,
} from './surfaces.mjs';
import { boxRegion, clamp, cubic, el, lerp, n, pd, ringRegion, sampleSmooth, smooth, wrapRegion } from './svg.mjs';

/** Object words to kinds. Longer phrases are tried first, so "pendant necklace" wins over "necklace". */
export const KIND_WORDS = Object.freeze({
  'wall weaving': 'wallWeaving',
  rug: 'rug',
  earrings: 'earrings',
  ring: 'ring',
  'pendant necklace': 'pendantNecklace',
  'cuff bracelet': 'cuffBracelet',
  pouch: 'pouch',
  'bead necklace': 'beadNecklace',
  jar: 'jar',
  bowl: 'bowl',
  'seed pot': 'seedPot',
  skirt: 'skirt',
  jacket: 'jacket',
});

export const FALLBACK_KIND = 'textileSquare';

/** { kind, word, fallback } for an object phrase. */
export function pickKind(objectEn) {
  const text = ` ${String(objectEn ?? '').trim().toLowerCase().replace(/\s+/g, ' ')} `;
  const words = Object.keys(KIND_WORDS).toSorted((a, b) => b.length - a.length);
  for (const w of words) {
    if (text.includes(` ${w} `)) return { kind: KIND_WORDS[w], word: w, fallback: false };
  }
  return { kind: FALLBACK_KIND, word: null, fallback: true };
}

// ---------------------------------------------------------------- shared helpers

const CX = 400;

/** A group clipped to a path. */
function clipped(ctx, d, inner) {
  const id = ctx.clip(d);
  return el('g', { 'clip-path': `url(#${id})` }, `\n${inner}\n`);
}

/** Soft flat shade on the right side of a shape, as a curved-edged flat tone. */
function sideShade(cx, halfW, top, bottom, opacity = '0.1') {
  const x0 = cx + halfW * 0.36;
  const mid = (top + bottom) / 2;
  return el('path', {
    d: `M${n(x0)} ${n(top - 20)}Q${n(cx + halfW * 0.78)} ${n(mid)} ${n(x0)} ${n(bottom + 20)}L${n(cx + halfW + 40)} ${n(bottom + 20)}L${n(cx + halfW + 40)} ${n(top - 20)}Z`,
    fill: KIT.ink,
    'fill-opacity': opacity,
  });
}

/** A flat light streak on the left, for polished clay and metal. */
function highlight(cx, halfW, top, bottom, opacity = '0.2') {
  return el('ellipse', { cx: cx - halfW * 0.56, cy: top + (bottom - top) * 0.42, rx: Math.max(6, halfW * 0.08), ry: (bottom - top) * 0.26, fill: '#FFFFFF', 'fill-opacity': opacity });
}

const outline = (ctx, d, color, width = 3) => ctx.use(d, { fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linejoin': 'round' });

const groundShadow = (cx, y, rx, ry) => el('ellipse', { cx, cy: y, rx, ry, fill: mix(KIT.mat, KIT.ink, 0.1) });

function sizeOf(ctx, fallback) {
  const s = ctx.piece?.facets?.sizeCm;
  return s && s.w > 0 && s.h > 0 ? { w: s.w, h: s.h } : fallback;
}

/** An ellipse as path data, for clipping and outlines. */
const ellipseD = (cx, cy, rx, ry) => `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 0 ${n(2 * rx)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-2 * rx)} 0Z`;

/** A teardrop with its point up at (cx, top), round below with radius r centered at (cx, cy). */
const dropD = (cx, top, cy, r) =>
  `M${n(cx)} ${n(top)}C${n(cx + r * 0.3)} ${n(top + (cy - top) * 0.2)} ${n(cx + r)} ${n(top + (cy - top) * 0.55)} ${n(cx + r)} ${n(cy)}A${n(r)} ${n(r)} 0 0 1 ${n(cx - r)} ${n(cy)}C${n(cx - r)} ${n(top + (cy - top) * 0.55)} ${n(cx - r * 0.3)} ${n(top + (cy - top) * 0.2)} ${n(cx)} ${n(top)}Z`;

// ---------------------------------------------------------------- weaving

/** A small tassel of three short cords at a corner, pointing out along (sx, sy). */
const tuft = (cx, cy, sx, sy) => `M${n(cx)} ${n(cy)}l${n(sx * 14)} ${n(sy * 12)}M${n(cx)} ${n(cy)}l${n(sx * 5)} ${n(sy * 17)}M${n(cx)} ${n(cy)}l${n(sx * 17)} ${n(sy * 4)}`;

function weaving(ctx, wall) {
  const P = ctx.palette;
  const size = sizeOf(ctx, wall ? { w: 45, h: 60 } : { w: 60, h: 100 });
  const f = clamp(0.62 + (0.38 * Math.max(size.w, size.h)) / 60, 0.62, 1);
  const s = Math.min(470 / size.w, (wall ? 470 : 560) / size.h) * f;
  const W = size.w * s;
  const H = size.h * s;
  const x = CX - W / 2;
  const y = (wall ? 432 : 400) - H / 2;
  const d = `M${n(x)} ${n(y)}h${n(W)}v${n(H)}h${n(-W)}Z`;
  const edge = mix(P.dark, KIT.inkSoft, 0.4);
  const out = [];
  if (wall) {
    const peak = y - Math.min(110, 40 + H * 0.16);
    out.push(el('path', { d: `M${n(x + 6)} ${n(y - 4)}L${CX} ${n(peak)}L${n(x + W - 6)} ${n(y - 4)}`, fill: 'none', stroke: KIT.inkSoft, 'stroke-width': 3, 'stroke-linejoin': 'round' }));
    out.push(el('circle', { cx: CX, cy: peak, r: 7, fill: KIT.inkSoft }));
  }
  const edgeShade = el('rect', { x: x + W * 0.9, y, width: W * 0.1, height: H, fill: KIT.ink, 'fill-opacity': '0.06' });
  out.push(clipped(ctx, d, `${paintWoven(boxRegion(x, y, W, H), ctx)}\n${edgeShade}`));
  out.push(outline(ctx, d, edge, 3));
  if (wall) {
    out.push(el('rect', { x: x - 26, y: y - 12, width: W + 52, height: 14, rx: 7, fill: mix(KIT.inkSoft, P.ground, 0.15) }));
  } else {
    // Small tassels at the four corners, where the edge cords are tied off.
    const d2 = [tuft(x, y, -1, -1), tuft(x + W, y, 1, -1), tuft(x, y + H, -1, 1), tuft(x + W, y + H, 1, 1)].join('');
    out.push(el('path', { d: d2, fill: 'none', stroke: edge, 'stroke-width': 3.5, 'stroke-linecap': 'round' }));
  }
  return out.join('\n');
}

// ---------------------------------------------------------------- silver

function silverEarring(ctx, X) {
  const T = metalTones(ctx.palette);
  const shape = ctx.hints.shape === 'drop' ? 'drop' : ctx.hints.shape === 'round' ? 'round' : 'oval';
  const out = [];
  out.push(el('path', { d: `M${X} 266L${X} 238C${X} 180 ${X + 62} 176 ${X + 60} 234`, fill: 'none', stroke: T.shadow, 'stroke-width': 5, 'stroke-linecap': 'round' }));
  out.push(el('circle', { cx: X, cy: 272, r: 10, fill: 'none', stroke: T.mid, 'stroke-width': 4.5 }));
  let d;
  let c;
  let ring;
  let stoneAt;
  if (shape === 'drop') {
    d = dropD(X, 280, 392, 66);
    c = { cx: X, top: 280, bottom: 458, half: 66 };
    ring = ringRegion(X, 392, 54, 54, 14);
    stoneAt = [X, 396, 32, 40];
  } else if (shape === 'round') {
    d = ellipseD(X, 352, 70, 70);
    c = { cx: X, top: 282, bottom: 422, half: 70 };
    ring = ringRegion(X, 352, 58, 58, 14);
    stoneAt = [X, 352, 36, 36];
  } else {
    d = ellipseD(X, 376, 62, 94);
    c = { cx: X, top: 282, bottom: 470, half: 62 };
    ring = ringRegion(X, 376, 50, 50 * (94 / 62), 16);
    stoneAt = [X, 376, 30, 46];
  }
  out.push(ctx.use(d, { fill: T.base }));
  const inner = [sideShade(c.cx, c.half, c.top, c.bottom, '0.16'), highlight(c.cx, c.half, c.top, c.bottom, '0.35')];
  if (ctx.palette.stone) {
    inner.push(stone(...stoneAt, ctx.palette.stone, T));
    inner.push(stamps(ringRegion(stoneAt[0], stoneAt[1], stoneAt[2] + 22, stoneAt[3] + 22, 12), ctx, { v0: 0, v1: 1 }));
  } else {
    inner.push(stamps(ring, ctx, { v0: 0, v1: 1, dotR: 5.5 }));
  }
  out.push(clipped(ctx, d, inner.join('\n')));
  out.push(outline(ctx, d, T.deep, 3));
  return out.join('\n');
}

/** A point as "x y". */
const xy = (p) => `${n(p[0])} ${n(p[1])}`;

/** A loop seen from slightly above: the band's outer face at the front, its inner face at the back. */
function band(ctx, { cy, R, r, t, rim, gap = 0 }) {
  const T = metalTones(ctx.palette);
  const E1 = (a) => [CX + R * Math.cos(a), cy + r * Math.sin(a)];
  const E2 = (a) => [CX + R * Math.cos(a), cy + t + r * Math.sin(a)];
  const out = [];
  // The back half's inner face, seen through the opening, with a gap at the back for a cuff.
  const back = [];
  if (gap > 0) {
    const a1 = (3 * Math.PI) / 2 - gap;
    const a2 = (3 * Math.PI) / 2 + gap;
    back.push(`M${xy(E1(Math.PI))}A${n(R)} ${n(r)} 0 0 1 ${xy(E1(a1))}L${xy(E2(a1))}A${n(R)} ${n(r)} 0 0 0 ${xy(E2(Math.PI))}Z`);
    back.push(`M${xy(E1(a2))}A${n(R)} ${n(r)} 0 0 1 ${xy(E1(2 * Math.PI))}L${xy(E2(2 * Math.PI))}A${n(R)} ${n(r)} 0 0 0 ${xy(E2(a2))}Z`);
  } else {
    back.push(`M${xy(E1(Math.PI))}A${n(R)} ${n(r)} 0 0 1 ${xy(E1(0))}L${xy(E2(0))}A${n(R)} ${n(r)} 0 0 0 ${xy(E2(Math.PI))}Z`);
  }
  const backD = back.join('');
  out.push(ctx.use(backD, { fill: T.shadow }));
  out.push(clipped(ctx, backD, el('rect', { x: CX - R - 4, y: cy - r - 4, width: R * 0.7, height: t + 2 * r + 8, fill: KIT.ink, 'fill-opacity': '0.12' })));
  out.push(outline(ctx, backD, T.deep, 2.5));
  // The rim: the band's top edge, as a light ring.
  const rimD = gap > 0 ? `M${xy(E1(Math.PI))}A${n(R)} ${n(r)} 0 0 1 ${xy(E1((3 * Math.PI) / 2 - gap))}M${xy(E1((3 * Math.PI) / 2 + gap))}A${n(R)} ${n(r)} 0 0 1 ${xy(E1(0))}` : `M${xy(E1(Math.PI))}A${n(R)} ${n(r)} 0 0 1 ${xy(E1(0))}`;
  out.push(el('path', { d: rimD, fill: 'none', stroke: T.light, 'stroke-width': rim }));
  out.push(el('path', { d: rimD, fill: 'none', stroke: T.deep, 'stroke-width': 2 }));
  // The front half's outer face, with its stamps.
  const frontD = `M${xy(E1(0))}A${n(R)} ${n(r)} 0 0 1 ${xy(E1(Math.PI))}L${xy(E2(Math.PI))}A${n(R)} ${n(r)} 0 0 0 ${xy(E2(0))}Z`;
  out.push(ctx.use(frontD, { fill: T.base }));
  const face = wrapRegion({ cx: CX, top: cy, bottom: cy + t, rAt: () => R, tilt: r / R, a0: -Math.PI / 2 + 0.12, a1: Math.PI / 2 - 0.12 });
  const inner = [stamps(face, ctx, { count: undefined }), sideShade(CX, R, cy - r, cy + t + r, '0.14'), highlight(CX, R, cy, cy + t + r, '0.3')];
  out.push(clipped(ctx, frontD, inner.join('\n')));
  out.push(el('path', { d: `M${xy(E1(0))}A${n(R)} ${n(r)} 0 0 1 ${xy(E1(Math.PI))}`, fill: 'none', stroke: T.light, 'stroke-width': rim * 0.6 }));
  out.push(outline(ctx, frontD, T.deep, 3));
  return out.join('\n');
}

const KINDS_SILVER = {
  earrings: (ctx) => {
    const one = silverEarring(ctx, 290);
    ctx.addDef('ear', el('g', { id: 'ear' }, `\n${one}\n`));
    return el('g', { transform: 'translate(400 500) scale(1.3) translate(-400 -400)' }, `\n${el('use', { href: '#ear' })}\n${el('use', { href: '#ear', transform: 'translate(220 0)' })}\n`);
  },
  ring: (ctx) => band(ctx, { cy: 352, R: 142, r: 96, t: ctx.hints.thin ? 74 : 90, rim: 30 }),
  cuffBracelet: (ctx) => band(ctx, { cy: 330, R: 246, r: 92, t: ctx.hints.thin ? 92 : 124, rim: 12, gap: 0.2 }),
  pendantNecklace: (ctx) => {
    const T = metalTones(ctx.palette);
    const out = [];
    const chain = `M248 104C258 300 334 392 400 398C466 392 542 300 552 104`;
    out.push(el('path', { d: chain, fill: 'none', stroke: T.mid, 'stroke-width': 2 }));
    out.push(el('path', { d: chain, fill: 'none', stroke: T.shadow, 'stroke-width': 6.5, 'stroke-dasharray': '9 5', 'stroke-linecap': 'round' }));
    out.push(el('rect', { x: 388, y: 390, width: 24, height: 38, rx: 9, fill: T.base, stroke: T.deep, 'stroke-width': 2.5 }));
    const [cy, rx, ry] = [548, 94, 124];
    const d = ellipseD(CX, cy, rx, ry);
    out.push(ctx.use(d, { fill: T.base }));
    const inner = [sideShade(CX, rx, cy - ry, cy + ry, '0.16'), highlight(CX, rx, cy - ry, cy + ry, '0.32')];
    inner.push(stamps(ringRegion(CX, cy, rx - 9, ry - 9 * (ry / rx), 20), ctx, { v0: 0.05, v1: 0.95, lineGap: 13 }));
    if (ctx.palette.stone) inner.push(stone(CX, cy + 4, 42, 60, ctx.palette.stone, T));
    out.push(clipped(ctx, d, inner.join('\n')));
    out.push(outline(ctx, d, T.deep, 3));
    return out.join('\n');
  },
};

// ---------------------------------------------------------------- beadwork

function beadedEarring(ctx, X) {
  const P = ctx.palette;
  const C = floralColors(ctx);
  const shape = ctx.hints.shape ?? 'drop';
  const out = [];
  const metal = mix(P.metal, KIT.inkSoft, 0.35);
  out.push(el('path', { d: `M${X} 262L${X} 236C${X} 178 ${X + 62} 174 ${X + 60} 232`, fill: 'none', stroke: metal, 'stroke-width': 5, 'stroke-linecap': 'round' }));
  out.push(el('circle', { cx: X, cy: 268, r: 9, fill: 'none', stroke: metal, 'stroke-width': 4 }));
  let d;
  let box;
  let ground = P.ground;
  let c;
  if (shape === 'round') {
    d = ellipseD(X, 380, 92, 92);
    box = { x: X - 74, y: 306, w: 148, h: 148 };
    c = { top: 288, bottom: 472, half: 92 };
  } else if (shape === 'leaf') {
    d = `M${X} 284C${X + 98} 330 ${X + 96} 478 ${X} 540C${X - 96} 478 ${X - 98} 330 ${X} 284Z`;
    box = { x: X - 60, y: 320, w: 120, h: 190 };
    ground = C.leaf;
    c = { top: 284, bottom: 540, half: 74 };
  } else if (shape === 'oval') {
    d = ellipseD(X, 404, 84, 118);
    box = { x: X - 64, y: 318, w: 128, h: 172 };
    c = { top: 286, bottom: 522, half: 84 };
  } else {
    d = dropD(X, 282, 428, 92);
    box = { x: X - 72, y: 340, w: 144, h: 160 };
    c = { top: 282, bottom: 520, half: 92 };
  }
  out.push(el('circle', { cx: X, cy: 282, r: 9, fill: C.edges }));
  out.push(ctx.use(d, { fill: ground }));
  const inner = [];
  if (shape === 'leaf') {
    const vein = shade(ground, 0.32);
    const side = [0.3, 0.48, 0.66].map((t) => {
      const yy = lerp(284, 540, t);
      return `M${X} ${n(yy + 26)}L${n(X + 46)} ${n(yy)}M${X} ${n(yy + 26)}L${n(X - 46)} ${n(yy)}`;
    });
    inner.push(el('path', { d: `M${X} 300L${X} 528${side.join('')}`, fill: 'none', stroke: vein, 'stroke-width': 4, 'stroke-linecap': 'round' }));
  } else {
    inner.push(paintFloral(box, ctx, { small: true, fill: shape === 'round' && (ctx.hints.counts.flowers ?? 0) === 1 && !ctx.patterns.includes('leaves') }));
  }
  inner.push(beadOverlay(ctx, X - 110, 270, 220, 290));
  inner.push(sideShade(X, c.half, c.top, c.bottom, '0.12'));
  out.push(clipped(ctx, d, inner.join('\n')));
  out.push(outline(ctx, d, shade(ground, 0.45), 2.5));
  out.push(beadRow(d, C.edges, 9, 12.5));
  return out.join('\n');
}

function pouch(ctx) {
  const P = ctx.palette;
  const C = floralColors(ctx);
  const size = sizeOf(ctx, { w: 12, h: 15 });
  const f = clamp(0.72 + (0.28 * Math.max(size.w, size.h)) / 22, 0.72, 1);
  const s = Math.min(390 / size.w, 470 / size.h) * f;
  const W = size.w * s;
  const H = size.h * s;
  const x = CX - W / 2;
  const y = 410 - H / 2;
  const rb = W * 0.16;
  const rt = W * 0.05;
  const bodyD = `M${n(x + rt)} ${n(y)}H${n(x + W - rt)}Q${n(x + W)} ${n(y)} ${n(x + W)} ${n(y + rt)}V${n(y + H - rb)}Q${n(x + W)} ${n(y + H)} ${n(x + W - rb)} ${n(y + H)}H${n(x + rb)}Q${n(x)} ${n(y + H)} ${n(x)} ${n(y + H - rb)}V${n(y + rt)}Q${n(x)} ${n(y)} ${n(x + rt)} ${n(y)}Z`;
  const fy = y + H * 0.4;
  const flapD = `M${n(x - 5 + rt)} ${n(y - 5)}H${n(x + W + 5 - rt)}Q${n(x + W + 5)} ${n(y - 5)} ${n(x + W + 5)} ${n(y - 5 + rt)}V${n(y + H * 0.22)}Q${n(x + W * 0.82)} ${n(fy - H * 0.02)} ${n(CX)} ${n(fy)}Q${n(x + W * 0.18)} ${n(fy - H * 0.02)} ${n(x - 5)} ${n(y + H * 0.22)}V${n(y - 5 + rt)}Q${n(x - 5)} ${n(y - 5)} ${n(x - 5 + rt)} ${n(y - 5)}Z`;
  const out = [];
  out.push(ctx.use(bodyD, { fill: P.ground }));
  const onFlap = ctx.hints.onFlap;
  const bodyBox = { x: x + W * 0.08, y: fy + H * 0.02, w: W * 0.84, h: y + H - (fy + H * 0.02) - H * 0.05 };
  const bodyInner = [];
  if (!onFlap) bodyInner.push(paintFloral(bodyBox, ctx));
  bodyInner.push(beadOverlay(ctx, x - 10, y - 10, W + 20, H + 20));
  bodyInner.push(sideShade(CX, W / 2, y, y + H, '0.1'));
  out.push(clipped(ctx, bodyD, bodyInner.join('\n')));
  out.push(outline(ctx, bodyD, shade(P.ground, 0.45), 2.5));
  out.push(beadRow(`M${n(x + 2)} ${n(y + H * 0.3)}V${n(y + H - rb)}Q${n(x + 2)} ${n(y + H - 2)} ${n(x + rb)} ${n(y + H - 2)}H${n(x + W - rb)}Q${n(x + W - 2)} ${n(y + H - 2)} ${n(x + W - 2)} ${n(y + H - rb)}V${n(y + H * 0.3)}`, C.edges, 9, 12.5));
  // The flap, a shade darker, with its own edge row and a bead to close it.
  const flapGround = shade(P.ground, 0.08);
  out.push(ctx.use(flapD, { fill: flapGround }));
  const flapInner = [];
  if (onFlap || ctx.hints.covered) flapInner.push(paintFloral({ x: x + W * 0.12, y: y + H * 0.02, w: W * 0.76, h: H * 0.32 }, ctx));
  flapInner.push(beadOverlay(ctx, x - 10, y - 10, W + 20, H * 0.5 + 10));
  flapInner.push(sideShade(CX, W / 2, y, fy, '0.1'));
  out.push(clipped(ctx, flapD, flapInner.join('\n')));
  out.push(el('path', { d: `M${n(x - 5)} ${n(y + H * 0.22)}Q${n(x + W * 0.18)} ${n(fy - H * 0.02 + 6)} ${n(CX)} ${n(fy + 6)}Q${n(x + W * 0.82)} ${n(fy - H * 0.02 + 6)} ${n(x + W + 5)} ${n(y + H * 0.22)}`, fill: 'none', stroke: KIT.ink, 'stroke-opacity': '0.18', 'stroke-width': 5 }));
  out.push(outline(ctx, flapD, shade(flapGround, 0.45), 2.5));
  out.push(beadRow(`M${n(x - 1)} ${n(y + H * 0.22)}Q${n(x + W * 0.18)} ${n(fy - H * 0.02 - 4)} ${n(CX)} ${n(fy - 4)}Q${n(x + W * 0.82)} ${n(fy - H * 0.02 - 4)} ${n(x + W + 1)} ${n(y + H * 0.22)}`, C.edges, 9, 12.5));
  out.push(el('circle', { cx: CX, cy: fy + 4, r: 13, fill: C.flowers[0], stroke: shade(C.flowers[0], 0.35), 'stroke-width': 2.5 }));
  return out.join('\n');
}

function beadedPendant(ctx) {
  const P = ctx.palette;
  const C = floralColors(ctx);
  const out = [];
  const left = sampleSmooth([[262, 96], [280, 250], [338, 350], [400, 378]], 1);
  const strand = `${smooth(left)}${smooth(left.toReversed().map(([px, py]) => [800 - px, py])).replace(/^M[^C]*/, '')}`;
  const strandColors = [P.accents[0], P.accents[1] ?? P.ground];
  out.push(el('path', { d: strand, fill: 'none', stroke: shade(strandColors[0], 0.4), 'stroke-width': 2 }));
  out.push(el('path', { d: strand, fill: 'none', stroke: strandColors[0], 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-dasharray': '0 13' }));
  out.push(el('path', { d: strand, fill: 'none', stroke: strandColors[1], 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-dasharray': '0 13', 'stroke-dashoffset': '6.5' }));
  const d = dropD(CX, 394, 566, 106);
  out.push(ctx.use(d, { fill: P.ground }));
  const inner = [paintFloral({ x: CX - 84, y: 470, w: 168, h: 186 }, ctx), beadOverlay(ctx, CX - 120, 380, 240, 310), sideShade(CX, 106, 394, 672, '0.12')];
  out.push(clipped(ctx, d, inner.join('\n')));
  out.push(outline(ctx, d, shade(P.ground, 0.45), 2.5));
  out.push(beadRow(d, C.edges, 9, 12.5));
  out.push(el('circle', { cx: CX, cy: 388, r: 12, fill: C.edges, stroke: shade(C.edges, 0.35), 'stroke-width': 2 }));
  return out.join('\n');
}

function beadNecklace(ctx) {
  const P = ctx.palette;
  const C = floralColors(ctx);
  const roles = ctx.hints.roles.band;
  const center = roles?.[0] ? P.hex(roles[0]) : P.ground;
  const edge = roles?.[1] ? P.hex(roles[1]) : C.edges;
  const [cy, rx, ry] = [288, 206, 312];
  const a0 = -0.12 * Math.PI;
  const a1 = 1.12 * Math.PI;
  const E = (a) => [CX + rx * Math.cos(a), cy + ry * Math.sin(a)];
  const p0 = E(a0);
  const p1 = E(a1);
  const arc = `M${n(p0[0])} ${n(p0[1])}A${rx} ${ry} 0 1 1 ${n(p1[0])} ${n(p1[1])}`;
  const out = [];
  const tie = [CX, 94];
  const strand = `M${n(p0[0])} ${n(p0[1])}Q${n(p0[0] - 30)} ${n(tie[1] + 10)} ${tie[0]} ${tie[1]}Q${n(p1[0] + 30)} ${n(tie[1] + 10)} ${n(p1[0])} ${n(p1[1])}`;
  out.push(el('path', { d: strand, fill: 'none', stroke: shade(center, 0.2), 'stroke-width': 2 }));
  out.push(beadRow(strand, center, 9, 12));
  out.push(el('circle', { cx: tie[0], cy: tie[1], r: 9, fill: mix(P.metal, KIT.inkSoft, 0.35) }));
  out.push(el('path', { d: arc, fill: 'none', stroke: shade(edge, 0.45), 'stroke-width': 80 }));
  out.push(el('path', { d: arc, fill: 'none', stroke: edge, 'stroke-width': 75 }));
  out.push(el('path', { d: arc, fill: 'none', stroke: center, 'stroke-width': 51 }));
  if (ctx.patterns.includes('flowers')) {
    const count = 7;
    const at = [];
    for (let k = 0; k < count; k++) {
      const a = a0 + ((k + 0.5) * (a1 - a0)) / count;
      const [fx, fy] = E(a);
      at.push({ x: fx, y: fy, r: 21, color: C.flowers[k % C.flowers.length], center: edge, rot: 18 });
    }
    out.push(ctx.pattern('flowers', at));
  }
  beadOverlay(ctx, 0, 0, 0, 0);
  out.push(el('path', { d: arc, fill: 'none', stroke: 'url(#beads)', 'stroke-width': 75 }));
  return out.join('\n');
}

// ---------------------------------------------------------------- pottery

/** A body of revolution's radius at each height, from cubic segments of its right side. */
function profile(segs) {
  const pts = [];
  for (const [p0, c1, c2, p1] of segs) {
    const s = cubic(p0, c1, c2, p1, 28);
    if (pts.length) s.shift();
    pts.push(...s);
  }
  const top = pts[0][1];
  const bottom = pts[pts.length - 1][1];
  const rAt = (y) => {
    if (y <= top) return pts[0][0];
    if (y >= bottom) return pts[pts.length - 1][0];
    for (let i = 1; i < pts.length; i++) {
      if (pts[i][1] >= y) {
        const [x0, y0] = pts[i - 1];
        const [x1, y1] = pts[i];
        return y1 === y0 ? x1 : x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
      }
    }
    return pts[pts.length - 1][0];
  };
  const rMax = Math.max(...pts.map((p) => p[0]));
  return { rAt, top, bottom, rMax };
}

/** The outline of a body of revolution seen slightly from above: the envelope of its rings. */
function revolveD(cx, prof, tilt) {
  const N = 72;
  const ys = Array.from({ length: 160 }, (_, i) => lerp(prof.top, prof.bottom, i / 159));
  const upper = [];
  const lower = [];
  for (let i = 0; i <= N; i++) {
    const x = lerp(-prof.rMax, prof.rMax, i / N);
    let u = Infinity;
    let l = -Infinity;
    for (const y of ys) {
      const r = prof.rAt(y);
      if (Math.abs(x) > r) continue;
      const k = r * tilt * Math.sqrt(Math.max(0, 1 - (x / r) ** 2));
      u = Math.min(u, y - k);
      l = Math.max(l, y + k);
    }
    if (u === Infinity) continue;
    upper.push([cx + x, u]);
    lower.push([cx + x, l]);
  }
  return pd([...upper, ...lower.toReversed()]);
}

function pot(ctx, { prof, tilt, opening, interior, zone, under, meridians }) {
  const P = ctx.palette;
  const slip = P.ground;
  const d = revolveD(CX, prof, tilt);
  const out = [];
  const W = prof.rMax;
  out.push(groundShadow(CX, prof.bottom + prof.rAt(prof.bottom) * tilt * 0.5, W * 0.72, Math.max(10, W * tilt * 0.5)));
  out.push(ctx.use(d, { fill: slip }));
  const inner = [];
  const region = (t0, t1) => wrapRegion({ cx: CX, top: lerp(prof.top, prof.bottom, t0), bottom: lerp(prof.top, prof.bottom, t1), rAt: prof.rAt, tilt });
  const black = P.accents.toSorted((a, b) => luminanceOf(a) - luminanceOf(b))[0] ?? KIT.ink;
  if (under && P.names.includes('orange')) {
    const u = region(under, 1.06);
    inner.push(el('path', { d: pd([...Array.from({ length: 25 }, (_, k) => u.map(k / 24, 0)), [CX + W + 20, prof.bottom + 60], [CX - W - 20, prof.bottom + 60]]), fill: P.hex('orange') }));
    inner.push(el('path', { d: pd(Array.from({ length: 25 }, (_, k) => u.map(k / 24, 0)), false), fill: 'none', stroke: black, 'stroke-width': 4 }));
  }
  inner.push(paintPotZone(region(zone[0], zone[1]), ctx, { meridians }));
  inner.push(sideShade(CX, W, prof.top - W * tilt, prof.bottom + W * tilt, '0.11'));
  inner.push(highlight(CX, W, prof.top, prof.bottom, '0.26'));
  out.push(clipped(ctx, d, inner.join('\n')));
  if (interior) {
    const rx = prof.rAt(prof.top);
    const ry = rx * tilt;
    out.push(el('ellipse', { cx: CX, cy: prof.top, rx: rx - 2, ry: ry - 1, fill: shade(slip, 0.14) }));
    out.push(el('path', { d: `M${n(CX - rx + 6)} ${n(prof.top)}A${n(rx - 6)} ${n(ry - 3)} 0 0 1 ${n(CX + rx - 6)} ${n(prof.top)}`, fill: 'none', stroke: KIT.ink, 'stroke-opacity': '0.12', 'stroke-width': 10 }));
    out.push(el('ellipse', { cx: CX, cy: prof.top, rx: rx - 2, ry: ry - 1, fill: 'none', stroke: black, 'stroke-width': 4 }));
  }
  if (opening) {
    const rx = prof.rAt(prof.top);
    out.push(el('ellipse', { cx: CX, cy: prof.top, rx, ry: rx * tilt, fill: shade(slip, 0.62), stroke: black, 'stroke-width': 3 }));
  }
  out.push(outline(ctx, d, edgeFor(slip), 3));
  return out.join('\n');
}

function luminanceOf(hex) {
  const v = Number.parseInt(hex.slice(1), 16);
  return ((v >> 16) & 255) * 0.2126 + ((v >> 8) & 255) * 0.7152 + (v & 255) * 0.0722;
}

const KINDS_POTTERY = {
  jar: (ctx) => {
    const size = sizeOf(ctx, { w: 14, h: 15 });
    const f = clamp(0.7 + (0.3 * Math.max(size.w, size.h)) / 28, 0.7, 1);
    const H = 470 * f;
    const W = clamp((H * (size.w / size.h)) / 2, 150, 250);
    const y0 = 408 - H / 2;
    const P0 = (r, t) => [r * W, y0 + t * H];
    const prof = profile([
      [P0(0.42, 0), P0(0.41, 0.03), P0(0.38, 0.05), P0(0.37, 0.08)],
      [P0(0.37, 0.08), P0(0.42, 0.13), P0(1, 0.2), P0(1, 0.48)],
      [P0(1, 0.48), P0(1, 0.74), P0(0.64, 0.95), P0(0.4, 1)],
    ]);
    return pot(ctx, { prof, tilt: 0.15, opening: true, zone: [0.12, 0.8], under: 0.85 });
  },
  bowl: (ctx) => {
    const size = sizeOf(ctx, { w: 20, h: 11 });
    const f = clamp(0.72 + (0.28 * size.w) / 24, 0.72, 1);
    const W = 268 * f;
    const H = clamp(2 * W * (size.h / size.w), 150, 330);
    const tilt = 0.27;
    const y0 = 400 - (H + W * tilt) / 2 + W * tilt * 0.6;
    const P0 = (r, t) => [r * W, y0 + t * H];
    const prof = profile([[P0(1, 0), P0(1, 0.46), P0(0.72, 0.92), P0(0.38, 1)]]);
    return pot(ctx, { prof, tilt, interior: true, zone: [0.02, 0.72], under: 0.82 });
  },
  seedPot: (ctx) => {
    const size = sizeOf(ctx, { w: 7, h: 6 });
    const f = clamp(0.62 + (0.38 * Math.max(size.w, size.h)) / 9, 0.62, 1);
    const W = 228 * f;
    const H = 2 * W * (size.h / size.w);
    const tilt = 0.3;
    const y0 = 404 - H / 2;
    const P0 = (r, t) => [r * W, y0 + t * H];
    const prof = profile([
      [P0(0.14, 0), P0(0.6, 0.005), P0(1, 0.16), P0(1, 0.5)],
      [P0(1, 0.5), P0(1, 0.82), P0(0.62, 0.99), P0(0.22, 1)],
    ]);
    return pot(ctx, { prof, tilt, opening: true, zone: [0.02, 0.62], meridians: true });
  },
};

// ---------------------------------------------------------------- patchwork

function bandLayout(count, from, to) {
  const h = Math.min(0.13, ((to - from) / count) * 0.62);
  return Array.from({ length: count }, (_, i) => {
    const c = count === 1 ? (from + to) / 2 : lerp(from + h / 2, to - h / 2, i / (count - 1));
    return [c - h / 2, c + h / 2];
  });
}

function skirt(ctx) {
  const P = ctx.palette;
  const f = ctx.hints.size;
  const H = 540 * f;
  const top = 400 - H / 2 + 6;
  const waist = 106 * f;
  const hem = 252 * f;
  const tilt = 0.075;
  const prof = { top, bottom: top + H, rMax: hem, rAt: (y) => lerp(waist, hem, clamp((y - top) / H, 0, 1)) };
  const d = revolveD(CX, prof, tilt);
  const region = (v0, v1) => wrapRegion({ cx: CX, top: lerp(top, top + H, v0), bottom: lerp(top, top + H, v1), rAt: prof.rAt, tilt });
  const out = [ctx.use(d, { fill: P.ground })];
  const inner = [];
  const count = ctx.hints.counts.bands ?? (f > 1 ? 3 : 2);
  const spots = bandLayout(count, count > 3 ? 0.3 : 0.4, 0.9);
  spots.forEach(([v0, v1], i) => inner.push(paintPatchBand(region(v0, v1), ctx, i, count)));
  // Soft gathers, then the waistband.
  const folds = [];
  for (let k = 1; k < 9; k++) {
    const u = k / 9;
    const r = region(0.05, 1.04);
    folds.push(pd([r.map(u - 0.012, 0), r.map(u + 0.012, 0), r.map(u + 0.03, 1), r.map(u - 0.03, 1)]));
  }
  inner.push(el('path', { d: folds.join(''), fill: KIT.ink, 'fill-opacity': '0.05' }));
  const wb = region(-0.02, 0.05);
  inner.push(el('path', { d: pd([...Array.from({ length: 25 }, (_, k) => wb.map(k / 24, 0)), ...Array.from({ length: 25 }, (_, k) => wb.map(1 - k / 24, 1))]), fill: shade(P.ground, 0.22) }));
  inner.push(el('ellipse', { cx: CX, cy: top, rx: waist, ry: waist * tilt, fill: shade(P.ground, 0.4) }));
  inner.push(sideShade(CX, hem, top, top + H, '0.08'));
  out.push(clipped(ctx, d, inner.join('\n')));
  out.push(outline(ctx, d, edgeFor(P.ground), 3));
  return out.join('\n');
}

function jacket(ctx) {
  const P = ctx.palette;
  const f = ctx.hints.size;
  const S = (x, y) => [CX + x * f, 400 + (y - 250) * f];
  const pts = [
    [-62, 0],
    [62, 0],
    [152, 26],
    [304, 300],
    [244, 334],
    [154, 150],
    [166, 476],
    [-166, 476],
    [-154, 150],
    [-244, 334],
    [-304, 300],
    [-152, 26],
  ].map(([x, y]) => S(x, y));
  const neck = [S(-62, 0), S(0, 54), S(62, 0)];
  const d = `M${n(neck[0][0])} ${n(neck[0][1])}Q${n(neck[1][0])} ${n(neck[1][1])} ${n(neck[2][0])} ${n(neck[2][1])}${pd(pts.slice(2)).replace(/^M/, 'L')}`;
  const out = [ctx.use(d, { fill: P.ground })];
  const inner = [];
  const count = ctx.hints.counts.bands ?? 2;
  const [y0, y1] = [S(0, 66)[1], S(0, 440)[1]];
  const layout = count === 1 ? [[0.06, 0.2]] : bandLayout(count, 0.02, count > 2 ? 0.98 : 0.66);
  layout.forEach(([v0, v1], i) => {
    const r = boxRegion(CX - 320 * f, lerp(y0, y1, v0), 640 * f, (y1 - y0) * (v1 - v0));
    inner.push(paintPatchBand(r, ctx, i, layout.length));
  });
  // Shade under the arms and down the right side, and the front opening.
  inner.push(el('path', { d: pd([S(154, 150), S(244, 334), S(214, 334), S(140, 190)]), fill: KIT.ink, 'fill-opacity': '0.1' }));
  inner.push(el('path', { d: pd([S(-154, 150), S(-244, 334), S(-214, 334), S(-140, 190)]), fill: KIT.ink, 'fill-opacity': '0.1' }));
  inner.push(sideShade(CX, 166 * f, S(0, 0)[1], S(0, 476)[1], '0.07'));
  out.push(clipped(ctx, d, inner.join('\n')));
  const collar = `M${n(S(-62, 0)[0])} ${n(S(-62, 0)[1])}Q${n(S(0, 54)[0])} ${n(S(0, 54)[1])} ${n(S(62, 0)[0])} ${n(S(62, 0)[1])}L${n(S(78, 6)[0])} ${n(S(78, 6)[1])}Q${n(S(0, 76)[0])} ${n(S(0, 76)[1])} ${n(S(-78, 6)[0])} ${n(S(-78, 6)[1])}Z`;
  out.push(el('path', { d: collar, fill: shade(P.ground, 0.2) }));
  out.push(el('path', { d: `M${n(S(0, 40)[0])} ${n(S(0, 40)[1])}L${n(S(0, 476)[0])} ${n(S(0, 476)[1])}`, fill: 'none', stroke: shade(P.ground, 0.4), 'stroke-width': 3 }));
  out.push(outline(ctx, d, edgeFor(P.ground), 3));
  return out.join('\n');
}

// ---------------------------------------------------------------- fallback

function textileSquare(ctx) {
  const d = `M190 190h420v420H190Z`;
  return [clipped(ctx, d, `${paintFlat({ x: 190, y: 190, w: 420, h: 420 }, ctx)}\n${sideShade(CX, 210, 190, 610, '0.06')}`), outline(ctx, d, edgeFor(ctx.palette.ground), 3)].join('\n');
}

/** Every kind's builder. Each takes ctx and returns the object's SVG. */
export const KINDS = Object.freeze({
  wallWeaving: (ctx) => weaving(ctx, true),
  rug: (ctx) => weaving(ctx, false),
  earrings: (ctx) => {
    if (ctx.surface === 'beaded') {
      const one = beadedEarring(ctx, 290);
      ctx.addDef('ear', el('g', { id: 'ear' }, `\n${one}\n`));
      return el('g', { transform: 'translate(400 465) scale(1.3) translate(-400 -400)' }, `\n${el('use', { href: '#ear' })}\n${el('use', { href: '#ear', transform: 'translate(220 0)' })}\n`);
    }
    return KINDS_SILVER.earrings(ctx);
  },
  ring: KINDS_SILVER.ring,
  cuffBracelet: KINDS_SILVER.cuffBracelet,
  pendantNecklace: (ctx) => (ctx.surface === 'beaded' ? beadedPendant(ctx) : KINDS_SILVER.pendantNecklace(ctx)),
  pouch,
  beadNecklace,
  jar: KINDS_POTTERY.jar,
  bowl: KINDS_POTTERY.bowl,
  seedPot: KINDS_POTTERY.seedPot,
  skirt,
  jacket,
  textileSquare,
});

