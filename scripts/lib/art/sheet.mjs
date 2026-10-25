// The contact sheet for the piece illustrations (I2-art T2): all 54 in a grid, grouped by
// community, each with its ID, title, object and color names, written to
// artifacts/art/contact-sheet.html, then a screenshot of it at artifacts/art/contact-sheet.png,
// taken with the repo's Playwright Chromium. It shows whatever is in public/images/, so
// I3-redesign can rebuild it for a drop's art with `npm run art -- --sheet`.
//
// The page loads only local files. The screenshot blocks every request that isn't a file: URL.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ART_DIR, MOCK_JSON, PIECE_IDS, imagePath } from './paths.mjs';

export const SHEET_HTML = path.join(ART_DIR, 'contact-sheet.html');
export const SHEET_PNG = path.join(ART_DIR, 'contact-sheet.png');

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

function readMock() {
  if (!fs.existsSync(MOCK_JSON)) return null;
  try {
    return JSON.parse(fs.readFileSync(MOCK_JSON, 'utf8'));
  } catch {
    return null;
  }
}

/** Writes the sheet's HTML. Returns { file, pieces, groups }. */
export function writeSheetHtml() {
  const mock = readMock();
  const pieces = new Map((mock?.pieces ?? []).map((p) => [p.id, p]));
  const communities = mock?.communities ?? [];
  const groups = [];
  const placed = new Set();
  for (const c of communities) {
    const ids = PIECE_IDS.filter((id) => pieces.get(id)?.communityId === c.id);
    if (ids.length === 0) continue;
    ids.forEach((id) => placed.add(id));
    groups.push({ title: `${c.name?.en ?? c.id} (${c.id})`, craft: c.craft?.en ?? '', ids });
  }
  const rest = PIECE_IDS.filter((id) => !placed.has(id));
  if (rest.length) groups.push({ title: mock ? 'Pieces without a community in mock.json' : 'Pieces (mock.json not found)', craft: '', ids: rest });

  const card = (id) => {
    const p = pieces.get(id);
    const src = path.relative(ART_DIR, imagePath(id)).split(path.sep).join('/');
    const f = p?.facets ?? {};
    const exists = fs.existsSync(imagePath(id));
    const kb = exists ? `${(fs.statSync(imagePath(id)).size / 1024).toFixed(1)} KB` : 'missing';
    return [
      '<figure>',
      `<img src="${esc(src)}" width="196" height="196" alt="" data-id="${esc(id)}">`,
      '<figcaption>',
      `<b>${esc(id)}</b> <span class="kb">${esc(kb)}</span><br>`,
      `<span class="title">${esc(p?.title?.en ?? '')}</span><br>`,
      `<span class="meta">${esc(f.object?.en ?? '')}${f.colors?.length ? ` · ${esc(f.colors.join(', '))}` : ''}</span>`,
      f.motifs?.length ? `<br><span class="meta">motifs: ${esc(f.motifs.join(', '))}</span>` : '',
      '</figcaption>',
      '</figure>',
    ].join('');
  };

  const html = [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<title>Cindia piece illustrations: contact sheet</title>',
    '<style>',
    'body{margin:0;padding:28px 32px 40px;background:#F6F1E7;color:#1C1A17;font:14px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif}',
    'h1{font-size:22px;margin:0 0 4px}',
    'p.note{margin:0 0 18px;color:#5A5249}',
    'h2{font-size:17px;margin:22px 0 2px}',
    'p.craft{margin:0 0 10px;color:#5A5249}',
    '.grid{display:grid;grid-template-columns:repeat(7,196px);gap:14px 14px}',
    'figure{margin:0}',
    'img{display:block;width:196px;height:196px;border:1px solid #D9CFBF;background:#EDE4D3}',
    'figcaption{margin-top:5px;font-size:12px;line-height:1.3}',
    '.title{color:#1C1A17}',
    '.meta,.kb{color:#5A5249}',
    '</style>',
    '</head>',
    '<body>',
    '<h1>Piece illustrations, contact sheet</h1>',
    `<p class="note">${PIECE_IDS.length} drawings from public/images/. Illustrations of fictional pieces, drawn from each piece's facets in mock.json. The kit's PieceCard adds the "Illustration" tag on the site.</p>`,
    ...groups.flatMap((g) => [`<h2>${esc(g.title)}</h2>`, g.craft ? `<p class="craft">${esc(g.craft)}</p>` : '', `<div class="grid">${g.ids.map(card).join('')}</div>`]),
    '</body>',
    '</html>',
    '',
  ].join('\n');
  fs.mkdirSync(ART_DIR, { recursive: true });
  fs.writeFileSync(SHEET_HTML, html, 'utf8');
  return { file: SHEET_HTML, pieces: PIECE_IDS.length, groups: groups.length };
}

/** Screenshots the sheet with Playwright's Chromium. Returns { file, broken } (IDs whose image didn't load). */
export async function screenshotSheet(file = SHEET_HTML, out = SHEET_PNG) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1480, height: 900 }, deviceScaleFactor: 1 });
    await page.route('**/*', (route) => (route.request().url().startsWith('file:') ? route.continue() : route.abort()));
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    await page.evaluate(() =>
      Promise.all(
        [...document.images].map((img) =>
          img.complete
            ? null
            : new Promise((done) => {
                img.addEventListener('load', done, { once: true });
                img.addEventListener('error', done, { once: true });
              }),
        ),
      ),
    );
    const broken = await page.evaluate(() => [...document.images].filter((img) => !img.naturalWidth).map((img) => img.dataset.id));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, fullPage: true });
    return { file: out, broken };
  } finally {
    await browser.close();
  }
}
