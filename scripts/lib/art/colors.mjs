// The named-color table for the piece illustrations (I2-art T1). `facets.colors` names map to hex
// values here. Every color name in mock.json has a value, starting from the plan's list. There is
// no "ivory": the data writes "cream" (A2 R16). An unknown name falls back to the kit's ink, and
// the run prints it.
//
// The values are muted and dye-like so a piece sits quietly on the kit's mat ground.

/** The kit's tokens (design-system.md) the drawings use for the ground, the stitch and hardware. */
export const KIT = {
  paper: '#F6F1E7',
  mat: '#EDE4D3',
  ink: '#1C1A17',
  inkSoft: '#5A5249',
  line: '#D9CFBF',
};

export const COLORS = {
  // reds and pinks
  red: '#B3362C',
  'deep red': '#8A2420',
  rust: '#A4522D',
  terracotta: '#B8603E',
  coral: '#DE7A5E',
  pink: '#E39AAA',
  // whites and neutrals
  cream: '#F2E6CB',
  white: '#FBF9F4',
  natural: '#E6D9BF',
  black: '#1F1C1A',
  charcoal: '#3A3734',
  grey: '#8F8C87',
  sand: '#D7C19B',
  // browns and yellows
  brown: '#6B4A33',
  tan: '#C39A6B',
  ochre: '#C4892F',
  gold: '#D3A437',
  yellow: '#E7B92F',
  orange: '#D2672A',
  // greens and blues
  green: '#4C7C45',
  sage: '#98AD8A',
  olive: '#6E7339',
  teal: '#2C7E7B',
  turquoise: '#3BA9A3',
  'sky blue': '#7CB2D7',
  blue: '#2F5EA3',
  indigo: '#2D3768',
  navy: '#1F2B4C',
  // purples
  purple: '#6A4790',
  violet: '#8D6BB6',
  // metals
  silver: '#C2C6CA',
};

/** Colors of materials when the material itself shows: a leather backing, a stone. */
export const MATERIAL_COLORS = {
  leather: COLORS.tan,
  turquoise: COLORS.turquoise,
  coral: COLORS.coral,
};

/** Every name the table knows. */
export const COLOR_NAMES = Object.keys(COLORS);

/** { hex, known } for one color name. An unknown name gets the kit's ink. */
export function colorHex(name) {
  const key = String(name ?? '').trim().toLowerCase();
  if (Object.hasOwn(COLORS, key)) return { hex: COLORS[key], known: true };
  return { hex: KIT.ink, known: false };
}

function parse(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
}

function format(rgb) {
  return `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** a mixed toward b by t (0 keeps a, 1 gives b). */
export function mix(a, b, t) {
  const pa = parse(a);
  const pb = parse(b);
  return format(pa.map((c, i) => c + (pb[i] - c) * t));
}

/** Darker: mixed toward the kit's ink. */
export const shade = (hex, t) => mix(hex, KIT.ink, t);
/** Lighter: mixed toward white. */
export const tint = (hex, t) => mix(hex, '#FFFFFF', t);

/** Relative luminance, 0 (black) to 1 (white). */
export function luminance(hex) {
  const [r, g, b] = parse(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** True when a color is too close to the mat to stand on it without an edge. */
export const isLight = (hex) => luminance(hex) > 0.6;

/** The outline for a shape of this color: a darker tone of it, or the kit's soft ink for light ones. */
export function edgeFor(hex) {
  return isLight(hex) ? mix(KIT.inkSoft, hex, 0.35) : shade(hex, 0.45);
}
