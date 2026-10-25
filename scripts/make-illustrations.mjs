#!/usr/bin/env node
// npm run art (I2-art). Draws the piece illustrations in public/images/, pc_01.svg to pc_54.svg.
//
//   npm run art                              draws all 54 from artifacts/mock/mock.json (run
//                                            npm run export:mock first), then builds the contact
//                                            sheet and its screenshot
//   npm run art -- --placeholders            writes the 54 placeholders
//   npm run art -- --placeholders pc_07 ...  writes only those pieces' placeholders, to take a
//                                            drawing back out
//   npm run art -- --check                   writes nothing; checks pc_01 to pc_54, every
//                                            piece's image path in mock.json, and the pattern list
//                                            in scripts/lib/art/patterns.mjs. Exits 1 on any failure
//   npm run art -- --sheet                   rebuilds only the contact sheet and its screenshot
//                                            from whatever is in public/images/
//
// A file whose bytes already match is left alone, so a second run changes no file. The drawing
// run prints each piece's kind, surface, patterns and size, and every fallback, unknown motif word
// and unknown color name, so a missing word shows up.
import fs from 'node:fs';
import { rel } from './lib/common.mjs';
import { MAX_BYTES, checkAll, checkSvgSource } from './lib/art/check.mjs';
import { drawPiece } from './lib/art/compose.mjs';
import { IMAGES_DIR, MOCK_JSON, PIECE_IDS, imagePath, isPieceId } from './lib/art/paths.mjs';
import { placeholderSvg } from './lib/art/placeholder.mjs';
import { SHEET_PNG, screenshotSheet, writeSheetHtml } from './lib/art/sheet.mjs';

const USAGE = `usage: npm run art -- [--placeholders [pc_NN ...] | --check | --sheet]
  (no flag)            draws all 54 pieces from artifacts/mock/mock.json and builds the contact sheet
  --placeholders       writes the 54 placeholders, or only the pieces named
  --check              checks pc_01 to pc_54, mock.json's image paths and the pattern list; writes nothing
  --sheet              rebuilds the contact sheet and its screenshot from public/images/`;

const args = process.argv.slice(2).filter((a) => a !== '--');
const flags = args.filter((a) => a.startsWith('-'));
const ids = args.filter((a) => !a.startsWith('-'));

function usageError(message) {
  console.log(`art: ${message}`);
  console.log(USAGE);
  process.exit(1);
}

const KNOWN = new Set(['--placeholders', '--check', '--sheet']);
for (const f of flags) if (!KNOWN.has(f)) usageError(`unknown option ${f}`);
if (new Set(flags).size < flags.length) usageError('an option is given twice');
if (flags.length > 1) usageError(`${flags.join(' and ')} can't run together`);
for (const id of ids) if (!isPieceId(id)) usageError(`${id} is not a piece ID (pc_01 to pc_54)`);
const mode = flags[0] ?? null;
if (ids.length > 0 && mode !== '--placeholders') usageError('piece IDs go only after --placeholders');

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

/** Writes a file only when its bytes differ. Returns true when it wrote. */
function writeIfChanged(file, text) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) return false;
  fs.writeFileSync(file, text, 'utf8');
  return true;
}

function writePlaceholders(pieceIds) {
  const svg = placeholderSvg();
  const problems = checkSvgSource(svg);
  if (problems.length > 0) {
    console.log(`art: the placeholder fails its own check:\n  ${problems.join('\n  ')}`);
    return 1;
  }
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  let written = 0;
  for (const id of pieceIds) if (writeIfChanged(imagePath(id), svg)) written++;
  const kept = pieceIds.length - written;
  console.log(`art: placeholders for ${pieceIds.length} ${pieceIds.length === 1 ? 'piece' : 'pieces'} in ${rel(IMAGES_DIR)}/: ${written} written, ${kept} already matched`);
  return 0;
}

function readMock() {
  if (!fs.existsSync(MOCK_JSON)) {
    console.log(`art: ${rel(MOCK_JSON)} not found. Run npm run export:mock first, then npm run art.`);
    return null;
  }
  try {
    const mock = JSON.parse(fs.readFileSync(MOCK_JSON, 'utf8'));
    if (!Array.isArray(mock.pieces)) {
      console.log(`art: ${rel(MOCK_JSON)} has no pieces array.`);
      return null;
    }
    return mock;
  } catch (err) {
    console.log(`art: ${rel(MOCK_JSON)} is not valid JSON: ${err.message}`);
    return null;
  }
}

function drawAll() {
  const mock = readMock();
  if (!mock) return 1;
  const byId = new Map(mock.pieces.map((p) => [p.id, p]));
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  let written = 0;
  let failed = 0;
  const sizes = [];
  const notes = [];
  console.log(`art: drawing ${PIECE_IDS.length} pieces from ${rel(MOCK_JSON)} into ${rel(IMAGES_DIR)}/`);
  for (const id of PIECE_IDS) {
    const piece = byId.get(id);
    if (!piece) {
      notes.push(`${id} is not in mock.json, so its file is left as it is`);
      continue;
    }
    if (piece.image !== `/images/${id}.svg`) notes.push(`${id}: mock.json's image is ${JSON.stringify(piece.image)}, the drawing goes to /images/${id}.svg`);
    const { svg, report: r } = drawPiece(piece);
    const problems = checkSvgSource(svg);
    const line = `  ${id}  ${r.kind.padEnd(15)} ${r.surface.padEnd(9)} ${(r.patterns.join(', ') || 'no pattern').padEnd(40)} ${kb(r.bytes).padStart(8)}`;
    if (problems.length > 0) {
      console.log(`${line}  NOT WRITTEN`);
      for (const p of problems) console.log(`      ${p}`);
      failed++;
      continue;
    }
    const wrote = writeIfChanged(imagePath(id), svg);
    if (wrote) written++;
    console.log(`${line}${wrote ? '' : '  (unchanged)'}`);
    sizes.push(r.bytes);
    if (r.kindFallback) notes.push(`${id}: object "${r.object}" has no kind, drawn as a plain flat textile square`);
    if (r.surfaceFallback) notes.push(`${id}: no technique or material picked a surface, so it fell back to "${r.surface}" (${r.surfaceWhy})`);
    for (const w of r.unknownMotifs) notes.push(`${id}: motif "${w}" is not in MOTIF_PATTERNS, so it draws nothing`);
    for (const c of r.unknownColors) notes.push(`${id}: color "${c}" is not in the color table, drawn in the kit's ink`);
    for (const p of r.floralKeptOff) notes.push(`${id}: "${p}" kept off, since flowers, leaves, vines, berries and buds go only on com_ojibwe floral beadwork`);
  }
  const extra = mock.pieces.map((p) => p.id).filter((id) => !isPieceId(id));
  for (const id of extra) notes.push(`mock.json has piece ${id}, outside pc_01 to pc_54, so it isn't drawn`);
  for (const n of notes) console.log(`art: note: ${n}`);
  const total = sizes.reduce((s, b) => s + b, 0);
  if (sizes.length) {
    console.log(`art: sizes: smallest ${kb(Math.min(...sizes))}, largest ${kb(Math.max(...sizes))} (limit: under ${MAX_BYTES} bytes), all ${kb(total)}`);
  }
  console.log(`art: ${sizes.length} drawn, ${written} written, ${sizes.length - written} already matched, ${failed} failed, ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`);
  return failed > 0 ? 1 : 0;
}

async function buildSheet() {
  const html = writeSheetHtml();
  console.log(`art: contact sheet ${rel(html.file)} (${html.pieces} pieces in ${html.groups} groups)`);
  try {
    const shot = await screenshotSheet();
    if (shot.broken.length > 0) {
      console.log(`art: the sheet's screenshot is at ${rel(shot.file)}, but these images didn't load: ${shot.broken.join(', ')}`);
      return 1;
    }
    console.log(`art: screenshot ${rel(SHEET_PNG)}`);
    return 0;
  } catch (err) {
    console.log(`art: the screenshot failed: ${err.message.split('\n')[0]}`);
    console.log("art: it needs Playwright's Chromium, installed at preflight. The HTML sheet is written.");
    return 1;
  }
}

async function runCheck() {
  const { checked, notes, problems } = await checkAll();
  for (const n of notes) console.log(`art: note: ${n}`);
  for (const p of problems) console.log(`FAIL  ${p.file}: ${p.message}`);
  if (problems.length > 0) {
    const files = new Set(problems.map((p) => p.file)).size;
    console.log(`art: --check failed: ${problems.length} ${problems.length === 1 ? 'problem' : 'problems'} in ${files} ${files === 1 ? 'file' : 'files'} (${checked} images checked)`);
    return 1;
  }
  console.log(`art: --check passed: ${checked} files, each valid SVG under 30 KB, viewBox 0 0 800 800, no text, images, scripts or outside references; patterns.mjs exports only allowed pattern names`);
  return 0;
}

let code;
if (mode === '--check') {
  code = await runCheck();
} else if (mode === '--sheet') {
  code = await buildSheet();
} else if (mode === '--placeholders') {
  code = writePlaceholders(ids.length > 0 ? ids : PIECE_IDS);
} else {
  code = drawAll();
  if (code === 0) code = await buildSheet();
}
process.exit(code);
