// npm run art -- --check (I2-art). Writes nothing. It checks pc_01 to pc_54 in public/images/ and,
// when artifacts/mock/mock.json exists, every piece's `image` path. A file passes when it:
//   - exists, is under 30 KB and is well-formed XML,
//   - has an <svg> root in the SVG namespace with a viewBox of 0 0 800 800,
//   - has no <text>, <image>, <script> or <foreignObject> (nor a <tspan> or <textPath>, which only
//     live inside text), no on* event attribute, and no reference outside the file: an href that
//     isn't "#id", a url() that isn't "#id", an @import, a URL scheme, or an XML namespace other
//     than the two SVG ones.
// It also checks that patterns.mjs exports only the pattern names allowed (the plan's "Patterns"
// list): its PATTERN_NAMES and the keys of PATTERNS are each in ALLOWED_PATTERNS and agree, the
// module exports nothing beyond its known names (so no builder slips in as a separate export), and
// every motif word maps only to listed patterns.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ROOT, rel } from '../common.mjs';
import { IMAGES_DIR, MOCK_JSON, PIECE_IDS, imagePath } from './paths.mjs';
import { XmlError, parseXml } from './xml.mjs';

/**
 * The pattern builders the illustrations may have (I2-art "Patterns"): plain geometry, plus the five
 * floral builders used only on com_ojibwe floral beadwork. Nothing from "Never drawn" is here.
 */
export const ALLOWED_PATTERNS = Object.freeze([
  'stripes',
  'bands',
  'steps',
  'diamonds',
  'triangles',
  'squares',
  'zigzags',
  'chevrons',
  'arcs',
  'checks',
  'dots',
  'fineLines',
  'flowers',
  'leaves',
  'vines',
  'berries',
  'buds',
]);
const ALLOWED_FLORAL = ['flowers', 'leaves', 'vines', 'berries', 'buds'];
/** Everything patterns.mjs may export. */
const PATTERN_MODULE_EXPORTS = ['FLORAL_PATTERNS', 'MOTIF_PATTERNS', 'PATTERNS', 'PATTERN_NAMES', 'patternsFor'];
const PATTERNS_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'patterns.mjs');

/** Problems with patterns.mjs's exported pattern list. An empty list means it passes. */
export async function checkPatternList() {
  const file = rel(PATTERNS_FILE);
  if (!fs.existsSync(PATTERNS_FILE)) return [{ file, message: 'file is missing' }];
  let mod;
  try {
    mod = await import(pathToFileURL(PATTERNS_FILE).href);
  } catch (err) {
    return [{ file, message: `does not load: ${err.message}` }];
  }
  const problems = [];
  const flag = (message) => problems.push({ file, message });
  for (const name of Object.keys(mod)) {
    if (!PATTERN_MODULE_EXPORTS.includes(name)) flag(`exports ${name}, which is not one of ${PATTERN_MODULE_EXPORTS.join(', ')}`);
  }
  const names = mod.PATTERN_NAMES;
  if (!Array.isArray(names)) {
    flag('PATTERN_NAMES is not an array');
    return problems;
  }
  for (const name of names) if (!ALLOWED_PATTERNS.includes(name)) flag(`PATTERN_NAMES has "${name}", which is not an allowed pattern`);
  const builders = mod.PATTERNS && typeof mod.PATTERNS === 'object' ? Object.keys(mod.PATTERNS) : null;
  if (!builders) flag('PATTERNS is not an object');
  else {
    for (const name of builders) {
      if (!ALLOWED_PATTERNS.includes(name)) flag(`PATTERNS has a builder "${name}", which is not an allowed pattern`);
      if (typeof mod.PATTERNS[name] !== 'function') flag(`PATTERNS.${name} is not a function`);
    }
    const a = builders.toSorted().join(',');
    const b = names.toSorted().join(',');
    if (a !== b) flag(`PATTERN_NAMES (${b}) and the keys of PATTERNS (${a}) disagree`);
  }
  for (const name of mod.FLORAL_PATTERNS ?? []) if (!ALLOWED_FLORAL.includes(name)) flag(`FLORAL_PATTERNS has "${name}", which is not a floral pattern`);
  for (const [word, mapped] of Object.entries(mod.MOTIF_PATTERNS ?? {})) {
    for (const name of mapped) if (!names.includes(name)) flag(`motif "${word}" maps to "${name}", which is not in PATTERN_NAMES`);
  }
  return problems;
}

/** "Under 30 KB": 30,000 is below both 30 KB (30,000) and 30 KiB (30,720), so a pass is a pass either way. */
export const MAX_BYTES = 30_000;
export const VIEW_BOX = [0, 0, 800, 800];

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const FORBIDDEN = new Set(['text', 'tspan', 'textpath', 'image', 'script', 'foreignobject']);
const SCHEME = /\b(?:https?|ftp|file|data|javascript|blob):/i;
const URL_CALL = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;

/** Problems in one SVG source. An empty list means it passes. */
export function checkSvgSource(source, byteLength = Buffer.byteLength(source, 'utf8')) {
  const problems = [];
  if (byteLength >= MAX_BYTES) problems.push(`${byteLength} bytes, must be under ${MAX_BYTES}`);

  let doc;
  try {
    doc = parseXml(source);
  } catch (err) {
    if (err instanceof XmlError) {
      problems.push(`not valid XML: ${err.message}`);
      return problems;
    }
    throw err;
  }

  const { root, elements } = doc;
  if (root.name !== 'svg') problems.push(`root element is <${root.name}>, must be <svg>`);
  if (root.attrs.xmlns !== SVG_NS) problems.push(`root has no xmlns="${SVG_NS}"`);

  const viewBox = (root.attrs.viewBox ?? '').trim().split(/[\s,]+/).map(Number);
  const viewBoxOk = viewBox.length === 4 && viewBox.every((n, k) => n === VIEW_BOX[k]);
  if (!viewBoxOk) problems.push(`viewBox is "${root.attrs.viewBox ?? ''}", must be "${VIEW_BOX.join(' ')}"`);

  const seen = new Set();
  const flag = (message) => {
    if (!seen.has(message)) {
      seen.add(message);
      problems.push(message);
    }
  };

  for (const el of elements) {
    const isStyle = el.local.toLowerCase() === 'style';
    if (FORBIDDEN.has(el.local.toLowerCase())) flag(`has a <${el.name}> element`);
    // The places a reference can hide: attribute values, and the CSS inside a <style>.
    const values = [];
    for (const [name, value] of Object.entries(el.attrs)) {
      const local = name.slice(name.indexOf(':') + 1).toLowerCase();
      if (name === 'xmlns' || name.startsWith('xmlns:')) {
        const allowed = name === 'xmlns' ? SVG_NS : name === 'xmlns:xlink' ? XLINK_NS : null;
        if (value !== allowed) flag(`${name}="${value}" is a namespace other than SVG and xlink`);
        continue;
      }
      if (local.startsWith('on')) flag(`${name} is an event handler`);
      if (local === 'href' && !value.startsWith('#')) flag(`${name}="${value.slice(0, 40)}" points outside the file`);
      values.push(value);
    }
    if (isStyle) {
      if (/@import/i.test(el.text)) flag('a <style> has an @import');
      values.push(el.text);
    }
    for (const value of values) {
      if (SCHEME.test(value)) flag(`a value holds a URL: ${value.slice(0, 40)}`);
      for (const m of value.matchAll(URL_CALL)) {
        if (!m[2].startsWith('#')) flag(`url(${m[2].slice(0, 40)}) points outside the file`);
      }
    }
  }
  return problems;
}

/** Reads one file and checks it. */
export function checkSvgFile(file) {
  if (!fs.existsSync(file)) return ['file is missing'];
  const buf = fs.readFileSync(file);
  return checkSvgSource(buf.toString('utf8'), buf.length);
}

/** The image paths mock.json's pieces point at, or notes on why it can't say. */
function mockImagePaths() {
  const notes = [];
  const problems = [];
  const files = [];
  if (!fs.existsSync(MOCK_JSON)) {
    notes.push('artifacts/mock/mock.json not found, so only pc_01 to pc_54 are checked');
    return { files, notes, problems };
  }
  let mock;
  try {
    mock = JSON.parse(fs.readFileSync(MOCK_JSON, 'utf8'));
  } catch (err) {
    problems.push({ file: rel(MOCK_JSON), message: `not valid JSON: ${err.message}` });
    return { files, notes, problems };
  }
  if (!Array.isArray(mock.pieces)) {
    notes.push('mock.json has no pieces array, so only pc_01 to pc_54 are checked');
    return { files, notes, problems };
  }
  const publicDir = path.join(ROOT, 'public');
  for (const piece of mock.pieces) {
    const where = `mock.json piece ${piece?.id ?? '?'}`;
    const image = piece?.image;
    if (typeof image !== 'string' || !image.startsWith('/images/')) {
      problems.push({ file: where, message: `image is ${JSON.stringify(image)}, must be a /images/ path` });
      continue;
    }
    const abs = path.resolve(publicDir, `.${image}`);
    if (!abs.startsWith(IMAGES_DIR + path.sep)) {
      problems.push({ file: where, message: `image ${image} leaves public/images/` });
      continue;
    }
    files.push(abs);
  }
  return { files, notes, problems };
}

/** Runs every check. Resolves to { checked, notes, problems: [{ file, message }] }. */
export async function checkAll() {
  const mock = mockImagePaths();
  const problems = [...mock.problems, ...(await checkPatternList())];
  const files = [...new Set([...PIECE_IDS.map(imagePath), ...mock.files])];
  for (const file of files) {
    for (const message of checkSvgFile(file)) problems.push({ file: rel(file), message });
  }
  return { checked: files.length, notes: mock.notes, problems };
}
