#!/usr/bin/env node
// I3-redesign: checks every color pair docs/common/design-system.md lists under "Contrast pairs".
// Each row names a text (or mark) token, a ground token and the ratio it needs: 4.5 for text,
// 3 for large headings and non-text marks where the design says so. Values come from
// src/ui/tokens.css, the one place tokens are defined, so the doc and the CSS can't drift apart.
// Prints one line per pair and exits 1 if any pair falls under its need or can't be resolved.
//
//   node scripts/check-contrast.mjs [<design-system.md>] [<tokens.css>]

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docPath = resolve(root, process.argv[2] ?? "docs/common/design-system.md");
const cssPath = resolve(root, process.argv[3] ?? "src/ui/tokens.css");

/** The custom properties of the first :root block, which holds the values (not reduced motion). */
function readTokens(css) {
  const start = css.indexOf(":root");
  if (start < 0) throw new Error(`no :root block in ${cssPath}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const body = css.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, "");
  const tokens = new Map();
  for (const m of body.matchAll(/(--c-[a-z0-9-]+)\s*:\s*([^;]+);/g)) tokens.set(m[1], m[2].trim());
  return tokens;
}

/** The rows of the "Contrast pairs" section: `| \`--c-a\` | \`--c-b\` | 4.5 | ...`. */
function readPairs(md) {
  const lines = md.split(/\r?\n/);
  const at = lines.findIndex((l) => /^#{2,3}\s+Contrast pairs\b/.test(l));
  if (at < 0) throw new Error(`no "Contrast pairs" heading in ${docPath}`);
  const level = lines[at].match(/^#+/)[0].length;
  const pairs = [];
  for (let i = at + 1; i < lines.length; i++) {
    const h = lines[i].match(/^(#+)\s/);
    if (h && h[1].length <= level) break;
    const m = lines[i].match(/^\|\s*`(--c-[a-z0-9-]+)`\s*\|\s*`(--c-[a-z0-9-]+)`\s*\|\s*([0-9.]+)\s*\|/);
    if (m) pairs.push({ fg: m[1], bg: m[2], need: Number(m[3]), line: i + 1 });
  }
  return pairs;
}

function parseColor(value) {
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = [...h].map((c) => c + c).join("");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const rgb = value.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[,/]\s*([0-9.]+))?\s*\)$/i);
  if (rgb && (rgb[4] === undefined || Number(rgb[4]) === 1)) return rgb.slice(1, 4).map(Number);
  return null; // translucent or unknown: not a ground text can be checked on
}

function luminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Follows var(--c-x) references inside tokens.css. */
function resolveToken(tokens, name, seen = new Set()) {
  if (seen.has(name)) return null;
  seen.add(name);
  const v = tokens.get(name);
  if (v === undefined) return null;
  const ref = v.match(/^var\(\s*(--c-[a-z0-9-]+)\s*\)$/);
  return ref ? resolveToken(tokens, ref[1], seen) : v;
}

let failed = 0;
let tokens;
let pairs;
try {
  tokens = readTokens(readFileSync(cssPath, "utf8"));
  pairs = readPairs(readFileSync(docPath, "utf8"));
} catch (err) {
  console.error(`check-contrast: ${err.message}`);
  process.exit(1);
}
if (pairs.length === 0) {
  console.error(`check-contrast: the "Contrast pairs" section in ${docPath} lists no pairs`);
  process.exit(1);
}

for (const p of pairs) {
  const fgValue = resolveToken(tokens, p.fg);
  const bgValue = resolveToken(tokens, p.bg);
  const fg = fgValue && parseColor(fgValue);
  const bg = bgValue && parseColor(bgValue);
  if (!fg || !bg) {
    failed++;
    console.log(`FAIL ${p.fg} on ${p.bg}: can't resolve ${!fg ? p.fg : p.bg} in tokens.css (line ${p.line})`);
    continue;
  }
  if (!(p.need >= 3)) {
    failed++;
    console.log(`FAIL ${p.fg} on ${p.bg}: need ${p.need} is under 3 to 1 (line ${p.line})`);
    continue;
  }
  const r = ratio(fg, bg);
  const ok = r + 1e-9 >= p.need;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${p.fg} on ${p.bg}: ${r.toFixed(2)} to 1, needs ${p.need}`);
}

console.log(`check-contrast: ${pairs.length - failed} of ${pairs.length} pairs pass`);
process.exit(failed ? 1 : 0);
