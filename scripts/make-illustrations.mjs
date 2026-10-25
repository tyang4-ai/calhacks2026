#!/usr/bin/env node
// npm run art (I2-art). Draws the piece illustrations in public/images/, pc_01.svg to pc_54.svg.
//
//   npm run art                              draws all 54. Until T2 lands it writes the placeholders
//   npm run art -- --placeholders            writes the 54 placeholders
//   npm run art -- --placeholders pc_07 ...  writes only those pieces' placeholders, to take a
//                                            drawing back out
//   npm run art -- --check                   writes nothing; checks pc_01 to pc_54 and every
//                                            piece's image path in artifacts/mock/mock.json.
//                                            Exits 1 on any failure
//   npm run art -- --sheet                   rebuilds the contact sheet (lands with T2)
//
// A file whose bytes already match is left alone, so a second run changes no file.
import fs from 'node:fs';
import { rel } from './lib/common.mjs';
import { checkAll, checkSvgSource } from './lib/art/check.mjs';
import { IMAGES_DIR, PIECE_IDS, imagePath, isPieceId } from './lib/art/paths.mjs';
import { placeholderSvg } from './lib/art/placeholder.mjs';

const USAGE = `usage: npm run art -- [--placeholders [pc_NN ...] | --check | --sheet]
  (no flag)            draws all 54 pieces; until I2-art T2 lands, that writes the placeholders
  --placeholders       writes the 54 placeholders, or only the pieces named
  --check              checks pc_01 to pc_54 and mock.json's image paths; writes nothing
  --sheet              rebuilds the contact sheet (lands with I2-art T2)`;

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

function writePlaceholders(pieceIds) {
  const svg = placeholderSvg();
  const problems = checkSvgSource(svg);
  if (problems.length > 0) {
    console.log(`art: the placeholder fails its own check:\n  ${problems.join('\n  ')}`);
    return 1;
  }
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  let written = 0;
  for (const id of pieceIds) {
    const file = imagePath(id);
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === svg) continue;
    fs.writeFileSync(file, svg, 'utf8');
    written++;
  }
  const kept = pieceIds.length - written;
  console.log(`art: placeholders for ${pieceIds.length} ${pieceIds.length === 1 ? 'piece' : 'pieces'} in ${rel(IMAGES_DIR)}/: ${written} written, ${kept} already matched`);
  return 0;
}

function runCheck() {
  const { checked, notes, problems } = checkAll();
  for (const n of notes) console.log(`art: note: ${n}`);
  for (const p of problems) console.log(`FAIL  ${p.file}: ${p.message}`);
  if (problems.length > 0) {
    const files = new Set(problems.map((p) => p.file)).size;
    console.log(`art: --check failed: ${problems.length} ${problems.length === 1 ? 'problem' : 'problems'} in ${files} ${files === 1 ? 'file' : 'files'} (${checked} checked)`);
    return 1;
  }
  console.log(`art: --check passed: ${checked} files, each valid SVG under 30 KB, viewBox 0 0 800 800, no text, images, scripts or outside references`);
  return 0;
}

let code;
if (mode === '--check') {
  code = runCheck();
} else if (mode === '--sheet') {
  console.log('art: --sheet is not built yet. The contact sheet lands with I2-art T2, after the drawings do.');
  code = 1;
} else {
  code = writePlaceholders(ids.length > 0 ? ids : PIECE_IDS);
  if (code === 0 && mode === null) console.log('art: no drawings yet (I2-art T2), so every piece got its placeholder.');
}
process.exit(code);
