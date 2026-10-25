// SVG writing helpers for the piece illustrations (I2-art T1): number formatting, elements, path
// data, the seeded random source, and the regions patterns draw into.
//
// Everything here is deterministic: numbers are rounded to one decimal, attributes keep the order
// they're given in, and the only randomness is seeded from the piece ID.
//
// A region is where a pattern draws. Patterns work in (u, v) from 0 to 1: u runs along the region
// (across a flat panel, or around a round body), v runs across it (top to bottom). Three kinds:
//   - boxRegion: a flat axis-aligned rectangle (weavings, beaded panels, garments' flat parts),
//   - wrapRegion: a band around a round body seen slightly from above (pots, a ring's face, a
//     skirt), so u is an angle and the band's lines bow down at the front,
//   - ringRegion: an oval ring (a stamped border around an oval), u once around it, v from the
//     outer edge in.

/**
 * A number for the file: whole pixels from 10 up (half a pixel is invisible on an 800 square and
 * keeps files small), one decimal below 10 (stroke widths, dashes, small radii). No "-0".
 */
export function n(x) {
  const r = Math.abs(x) >= 10 ? Math.round(x) : Math.round(x * 10) / 10;
  return r === 0 ? '0' : String(r);
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/** One element. Numbers go through n(), strings are escaped, undefined, null and false are skipped. */
export function el(tag, attrs = {}, inner = '') {
  let s = `<${tag}`;
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    const val = typeof v === 'number' ? n(v) : String(v).replace(/[&<>"]/g, (c) => ESC[c]);
    s += ` ${k}="${val}"`;
  }
  return inner === '' ? `${s}/>` : `${s}>${inner}</${tag}>`;
}

/** Path data through points: "M x y L x y ... Z". */
export function pd(points, close = true) {
  if (points.length === 0) return '';
  const body = points.map(([x, y]) => `${n(x)} ${n(y)}`).join('L');
  return `M${body}${close ? 'Z' : ''}`;
}

/** An open polyline in relative steps ("M x y l dx dy ..."), short for dense lines like rickrack. */
export function pdRel(points) {
  if (points.length === 0) return '';
  let s = `M${n(points[0][0])} ${n(points[0][1])}l`;
  let [px, py] = points[0];
  const parts = [];
  for (let i = 1; i < points.length; i++) {
    const dx = Math.round((points[i][0] - px) * 10) / 10;
    const dy = Math.round((points[i][1] - py) * 10) / 10;
    parts.push(`${dx === 0 ? 0 : dx} ${dy === 0 ? 0 : dy}`);
    px += dx;
    py += dy;
  }
  s += parts.join(' ');
  return s;
}

/** A smooth open curve through points (Catmull-Rom as cubic Béziers). */
export function smooth(points) {
  if (points.length < 2) return '';
  let s = `M${n(points[0][0])} ${n(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    s += `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`;
  }
  return s;
}

/** Points along a smooth curve through the given points, `per` samples per segment. */
export function sampleSmooth(points, per = 12) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Points along a cubic Bézier. */
export function cubic(p0, p1, p2, p3, steps = 24) {
  const out = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const m = 1 - t;
    const a = m * m * m;
    const b = 3 * m * m * t;
    const c = 3 * m * t * t;
    const d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return out;
}

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const lerp = (a, b, t) => a + (b - a) * t;

/** A seeded random source: the same seed always gives the same sequence. */
export function seeded(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let a = h;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (lo, hi) => lo + (hi - lo) * next(),
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
  };
}

/** A flat rectangle. */
export function boxRegion(x, y, w, h) {
  return {
    type: 'box',
    curved: false,
    closed: false,
    x,
    y,
    w,
    h,
    lenPx: w,
    hPx: h,
    map: (u, v) => [x + clamp(u, 0, 1) * w, y + v * h],
    fs: () => 1,
    sub: (v0, v1) => boxRegion(x, y + v0 * h, w, (v1 - v0) * h),
    subU: (u0, u1) => boxRegion(x + u0 * w, y, (u1 - u0) * w, h),
  };
}

/**
 * A band around a round body: at height y the body's radius is rAt(y), and the band's lines are
 * the front halves of ellipses with half-height r * tilt, so they bow down at the front. u runs
 * over the angles a0 to a1 (the front half by default), v from `top` to `bottom`.
 */
export function wrapRegion({ cx, top, bottom, rAt, tilt, a0 = -Math.PI / 2, a1 = Math.PI / 2 }) {
  const ang = (u) => a0 + (a1 - a0) * u;
  const rMid = rAt((top + bottom) / 2);
  return {
    type: 'wrap',
    curved: true,
    closed: false,
    cx,
    top,
    bottom,
    rAt,
    tilt,
    lenPx: rMid * Math.abs(a1 - a0),
    hPx: bottom - top,
    map: (u, v) => {
      const y = top + v * (bottom - top);
      const r = rAt(y);
      const a = ang(clamp(u, 0, 1));
      return [cx + r * Math.sin(a), y + r * tilt * Math.cos(a)];
    },
    fs: (u) => Math.max(0.08, Math.cos(ang(u))),
    // From (u0, v) to (u1, v): an elliptical arc, since a ring around the body is an ellipse.
    // Increasing u runs west, front, east, which is counterclockwise on screen: sweep 0.
    arc: (u0, u1, v) => {
      const y = top + v * (bottom - top);
      const r = rAt(y);
      const a = ang(clamp(u1, 0, 1));
      return `A${n(r)} ${n(r * tilt)} 0 0 ${u1 > u0 ? 0 : 1} ${n(cx + r * Math.sin(a))} ${n(y + r * tilt * Math.cos(a))}`;
    },
    sub: (v0, v1) => wrapRegion({ cx, top: top + v0 * (bottom - top), bottom: top + v1 * (bottom - top), rAt, tilt, a0, a1 }),
  };
}

/** An oval ring: u once around from the top, v from the outer oval (rx, ry) in by `width`. */
export function ringRegion(cx, cy, rx, ry, width) {
  return {
    type: 'ring',
    curved: true,
    closed: true,
    lenPx: Math.PI * (rx + ry),
    hPx: width,
    map: (u, v) => {
      const a = u * 2 * Math.PI - Math.PI / 2;
      const k = v * width;
      return [cx + (rx - k) * Math.cos(a), cy + (ry - k * (ry / rx)) * Math.sin(a)];
    },
    fs: () => 1,
    sub: (v0, v1) => {
      const r = ringRegion(cx, cy, rx - v0 * width, ry - v0 * width * (ry / rx), (v1 - v0) * width);
      return r;
    },
  };
}

/**
 * Maps a closed (or open) polygon given in (u, v) into a region. On a curved region the edges are
 * split so they follow the curve.
 */
export function mapPoly(region, uv, closed = true) {
  if (!region.curved) return uv.map(([u, v]) => region.map(u, v));
  const out = [];
  const count = closed ? uv.length : uv.length - 1;
  for (let i = 0; i < count; i++) {
    const [u0, v0] = uv[i];
    const [u1, v1] = uv[(i + 1) % uv.length];
    const steps = Math.max(1, Math.ceil(Math.abs(u1 - u0) / 0.05), Math.ceil(Math.abs(v1 - v0) / 0.5));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push(region.map(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t));
    }
  }
  if (!closed) out.push(region.map(...uv[uv.length - 1]));
  return out;
}

/**
 * Shapes that never overlap, merged into one path per fill (in the order each fill first appears),
 * so a row of fifty squares is two elements, not fifty. Only for shapes that don't overlap: merging
 * changes the stacking order between fills.
 */
export function batch() {
  const order = [];
  const byFill = new Map();
  return {
    add(region, uv, fill) {
      if (!byFill.has(fill)) {
        byFill.set(fill, []);
        order.push(fill);
      }
      byFill.get(fill).push(uvD(region, uv));
    },
    toString() {
      return order.map((fill) => el('path', { d: byFill.get(fill).join(''), fill })).join('');
    },
  };
}

/**
 * Path data for a polygon (or open line) given in (u, v). On a wrap region an edge of constant v
 * is written as one elliptical arc; other edges are split so they follow the curve.
 */
export function uvD(region, uv, closed = true) {
  if (!region.arc) return pd(mapPoly(region, uv, closed), closed);
  const [x0, y0] = region.map(...uv[0]);
  let s = `M${n(x0)} ${n(y0)}`;
  const count = closed ? uv.length : uv.length - 1;
  for (let i = 0; i < count; i++) {
    const [u0, v0] = uv[i];
    const [u1, v1] = uv[(i + 1) % uv.length];
    if (v0 === v1 && Math.abs(u1 - u0) > 0.02) {
      s += region.arc(u0, u1, v0);
      continue;
    }
    const steps = Math.max(1, Math.ceil(Math.abs(u1 - u0) / 0.05), Math.ceil(Math.abs(v1 - v0) / 0.5));
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      const [x, y] = region.map(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t);
      s += `L${n(x)} ${n(y)}`;
    }
  }
  return closed ? `${s}Z` : s;
}

/** A filled polygon in (u, v). */
export function uvPoly(region, uv, fill, extra = {}) {
  return el('path', { d: uvD(region, uv), fill, ...extra });
}
