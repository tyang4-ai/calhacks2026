// Small hints from a piece's own words in mock.json (I2-art T2), so the drawing agrees with the
// `imageAlt` a screen reader reads out and the title a buyer sees. Nothing here adds a motif or a
// color: the hints only say which of the facet colors is the ground, how many bands or diamonds
// the alt counts, which facet colors the alt gives to flowers, leaves and vines, and a shape word
// ("oval", "round", "drop", "leaf"-shaped) or size word ("small", "child's") from the alt or title.
//
// readHints(piece) returns:
//   ground:  a facet color name the alt names as the object's own color ("a black pouch",
//            "a white jar", "on a white ground"), or null
//   counts:  { bands, diamonds, leaves, flowers } from number words in the alt ("three red and
//            black stepped diamonds"), each a number or undefined
//   roles:   { flowers, leaves, vines, berries, buds, stems, edges, center, band }: facet color
//            names the alt gives to each, in the alt's order
//   shape:   "oval" | "round" | "drop" | "leaf" | null
//   size:    a factor from the title's size words (tiny, small, large, wide, long, child's), 1 by default
//   thin:    true when the title says thin or narrow
//   rows:    true when the alt says "rows of" (rows of dots)
//   onFlap, covered: where the alt puts a pouch's beadwork
import { COLORS } from './colors.mjs';

const NUMBERS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const COLOR_WORDS = Object.keys(COLORS).toSorted((a, b) => b.length - a.length);
const COLOR_RE = COLOR_WORDS.map((w) => w.replace(/ /g, '\\s+')).join('|');
const ROLE_NOUNS = {
  flower: 'flowers',
  flowers: 'flowers',
  leaf: 'leaves',
  leaves: 'leaves',
  vine: 'vines',
  vines: 'vines',
  berry: 'berries',
  berries: 'berries',
  bud: 'buds',
  buds: 'buds',
  stem: 'stems',
  stems: 'stems',
  edge: 'edges',
  edges: 'edges',
  center: 'center',
  band: 'band',
};
const NOUN_RE = Object.keys(ROLE_NOUNS).toSorted((a, b) => b.length - a.length).join('|');
const FILLER = '(?:\\s+(?:beaded|small|tiny|little|curving|long|short|wide|narrow))*';
const COLOR_SEQ = `(?:${COLOR_RE})(?:(?:\\s*,\\s*|\\s+and\\s+)(?:${COLOR_RE}))*`;

/** A list of color words like "blue, white and green" to the facet colors it names. */
function colorList(text, facetColors) {
  const found = [];
  const re = new RegExp(`\\b(${COLOR_RE})\\b`, 'gi');
  for (const m of text.matchAll(re)) {
    const name = m[1].toLowerCase().replace(/\s+/g, ' ');
    if (facetColors.includes(name) && !found.includes(name)) found.push(name);
  }
  return found;
}

function roleColors(alt, facetColors) {
  const roles = {};
  // "<colors> [beaded] <noun>[, <noun>][ and <noun>]"
  const re = new RegExp(`\\b(${COLOR_SEQ})${FILLER}\\s+(${NOUN_RE})\\b((?:\\s*,\\s*(?:${NOUN_RE})\\b|\\s+and\\s+(?:${NOUN_RE})\\b)*)`, 'gi');
  for (const m of alt.matchAll(re)) {
    const colors = colorList(m[1], facetColors);
    if (colors.length === 0) continue;
    const first = ROLE_NOUNS[m[2].toLowerCase()];
    if (!roles[first]) roles[first] = colors;
    const rest = [...(m[3] ?? '').matchAll(new RegExp(`\\b(${NOUN_RE})\\b`, 'gi'))].map((x) => ROLE_NOUNS[x[1].toLowerCase()]);
    for (const r of rest) {
      if (roles[r]) continue;
      // A shared list ("red and pink beaded flowers, leaves and vines") colors the later nouns too,
      // except leaves, vines and stems when the piece has green for them.
      if ((r === 'leaves' || r === 'vines' || r === 'stems') && facetColors.includes('green')) continue;
      roles[r] = colors;
    }
  }
  return roles;
}

// The words that may sit between a number and what it counts: colors and plain adjectives, so
// "a weaving with grey bands" never reads as one band.
const BETWEEN = `(?:${COLOR_RE}|and|stepped|small|tiny|narrow|wide|thin|large|plain|patchwork|beaded|zigzag|striped)`;

function countOf(alt, nounRe) {
  const re = new RegExp(`\\b(a|an|one|two|three|four|five|six)\\s+(?:${BETWEEN},?\\s+){0,6}(?:${nounRe})\\b`, 'gi');
  const m = re.exec(alt);
  return m ? NUMBERS[m[1].toLowerCase()] : undefined;
}

export function readHints(piece) {
  const alt = String(piece?.imageAlt?.en ?? '');
  const title = String(piece?.title?.en ?? '');
  const facets = piece?.facets ?? {};
  const facetColors = (facets.colors ?? []).map((c) => String(c).toLowerCase());
  const object = String(facets.object?.en ?? '').toLowerCase();
  const objectWord = object.split(/\s+/).slice(-1)[0] ?? '';

  let ground = null;
  const onGround = new RegExp(`\\bon an? (${COLOR_RE}) (?:ground|band)\\b`, 'i').exec(alt);
  if (onGround && facetColors.includes(onGround[1].toLowerCase())) ground = onGround[1].toLowerCase();
  if (!ground && objectWord) {
    const own = new RegExp(`\\b(${COLOR_RE})\\s+(?:leather\\s+|wool\\s+|cotton\\s+)?(?:${object.replace(/\s+/g, '\\s+')}|${objectWord})\\b`, 'i').exec(alt);
    if (own && facetColors.includes(own[1].toLowerCase())) ground = own[1].toLowerCase();
  }

  const counts = {
    bands: countOf(alt, 'bands?'),
    diamonds: countOf(alt, 'diamonds?'),
    leaves: countOf(alt, 'leaves|leaf'),
    flowers: countOf(alt, 'flowers?'),
  };

  const lower = `${alt} ${title}`.toLowerCase();
  let shape = null;
  if (/shaped like [\w\s]*lea(?:f|ves)/.test(lower)) shape = 'leaf';
  else if (/\bround\b/.test(lower)) shape = 'round';
  else if (/\boval\b/.test(lower)) shape = 'oval';
  else if (/\bdrop\b/.test(lower)) shape = 'drop';

  const t = title.toLowerCase();
  let size = 1;
  if (/\btiny\b/.test(t)) size = 0.72;
  else if (/\bchild'?s\b/.test(t)) size = 0.84;
  else if (/\b(?:small|mini)\b/.test(t)) size = 0.9;
  else if (/\b(?:large|long|wide)\b/.test(t)) size = 1.06;

  return {
    ground,
    counts,
    roles: roleColors(alt, facetColors),
    shape,
    size,
    thin: /\b(?:thin|narrow)\b/.test(t),
    rows: /\brows of\b/i.test(alt),
    onFlap: /\bon the flap\b/i.test(alt),
    covered: /\bcovered\b/i.test(alt),
  };
}
