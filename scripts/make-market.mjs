#!/usr/bin/env node
// node scripts/make-market.mjs [--data <mock.json>] [--out <folder>]
// The sandbox market (D-deploy T1, fix-plan 1.6): static pages of fictional listings that ship with
// the public site at /market/, so B15's crawler reads our own pages and never the real web.
// It reads artifacts/mock/mock.json (npm run export:mock) and writes public/market/:
// - index.html, which links every listing page,
// - one page per counterfeitCandidates entry whose url is a /market/ path, at that path
//   (/market/listing-01.html onward, in cftId order). Candidates on example.com or example.org
//   get no page.
// Each listing page holds the listing inside <main>: the title in its <h1>, the snippet as the first
// paragraph, then the claim, the invented seller and the price. The header above <main> shows L1
// and the sandbox line, and every page carries noindex. No script, image, font, stylesheet link or
// URL to another host. Nothing comes from anywhere but the mock data. The pages are committed, so
// rerun this whenever src/mock/watch.ts changes.
// English only (Gordon, Oct 24, 11:35 PM and 11:55 PM): the pages carry L1 and the claim in English
// and nothing else. A claim's zh value in the data is never written.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_DATA = path.join(ROOT, 'artifacts', 'mock', 'mock.json');
export const DEFAULT_OUT = path.join(ROOT, 'public', 'market');

/** L1, word for word from the English column of glossary.md's label table (I2-shell). */
export const L1 = {
  en: 'Demo. Every maker, community and story here is fictional. Nothing is for sale.',
};
/** The market's own line, under L1 on every market page (D-deploy). */
export const SANDBOX_LINE = "A sandbox market made for testing Cindia's copy watch. These listings are fictional.";
export const MARKET_PREFIX = '/market/';
export const INDEX_FILE = 'index.html';
/** A listing page's file name: one path segment, lowercase, ending in .html. */
const PAGE_NAME = /^[a-z0-9][a-z0-9-]*\.html$/;

/** Escapes text for element content and double-quoted attributes. Apostrophes stay as they are. */
export function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** "$95.00" from 9500. Integer cents only, as the data stores them. */
export function formatUsd(cents) {
  if (!Number.isInteger(cents)) throw new Error(`priceCents must be an integer, got ${cents}`);
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}$${dollars}.${String(abs % 100).padStart(2, '0')}`;
}

/**
 * The candidates that get a page: url is a /market/ path, sorted by cftId. Throws on a /market/
 * url that isn't a single .html file name, so nothing writes outside the folder.
 */
export function marketListings(data) {
  const all = Array.isArray(data?.counterfeitCandidates) ? data.counterfeitCandidates : null;
  if (!all) throw new Error('the data has no counterfeitCandidates array. Run npm run export:mock first');
  const listings = all
    .filter((c) => typeof c?.url === 'string' && c.url.startsWith(MARKET_PREFIX))
    .map((c) => {
      const file = c.url.slice(MARKET_PREFIX.length);
      if (!PAGE_NAME.test(file) || file === INDEX_FILE) {
        throw new Error(`${c.id}: ${c.url} isn't a listing page path like /market/listing-01.html`);
      }
      for (const field of ['id', 'title', 'snippet']) {
        if (typeof c[field] !== 'string' || c[field].trim() === '') throw new Error(`${c.id ?? c.url}: ${field} is missing`);
      }
      return { ...c, file };
    })
    .toSorted((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const seen = new Set();
  for (const l of listings) {
    if (seen.has(l.file)) throw new Error(`two candidates share ${l.url}`);
    seen.add(l.file);
  }
  return listings;
}

const STYLE = [
  'body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #24211d; background: #fbf9f5; line-height: 1.5; }',
  'header { background: #efe8dc; border-bottom: 1px solid #d8cdbb; padding: 12px 24px; font-size: 14px; }',
  'header .notice { font-weight: 600; }',
  'header .sandbox { margin-top: 4px; }',
  'main, footer { max-width: 720px; margin: 0 auto; padding: 24px; }',
  'footer { padding-top: 0; font-size: 14px; }',
  'h1 { font-size: 28px; line-height: 1.25; margin: 0 0 12px; }',
  'main p { margin: 0 0 12px; }',
  '.price { font-size: 20px; font-weight: 600; }',
  'ul { padding-left: 20px; }',
  'li { margin-bottom: 8px; }',
  'a { color: #1d4e89; }',
].join('\n');

function page({ title, mainHtml, footerHtml }) {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="robots" content="noindex">',
    `<title>${escapeHtml(title)}</title>`,
    '<style>',
    STYLE,
    '</style>',
    '</head>',
    '<body>',
    '<header>',
    `<div class="notice">${escapeHtml(L1.en)}</div>`,
    `<div class="sandbox">${escapeHtml(SANDBOX_LINE)}</div>`,
    '</header>',
    '<main>',
    mainHtml,
    '</main>',
    footerHtml ? `<footer>\n${footerHtml}\n</footer>` : '',
    '</body>',
    '</html>',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n')
    .concat('\n');
}

export function sellerLine(listing) {
  return typeof listing.seller === 'string' && listing.seller.trim() !== ''
    ? `Sold by ${listing.seller}`
    : 'Sold by an invented sandbox seller';
}

export function listingPage(listing) {
  const lines = [`<h1>${escapeHtml(listing.title)}</h1>`, `<p>${escapeHtml(listing.snippet)}</p>`];
  const claim = listing.claim;
  if (claim && typeof claim.en === 'string' && claim.en.trim() !== '') {
    lines.push(`<p class="claim"><strong>Listing claim:</strong> ${escapeHtml(claim.en)}</p>`);
  }
  lines.push(`<p class="seller">${escapeHtml(sellerLine(listing))}</p>`);
  if (Number.isInteger(listing.priceCents)) lines.push(`<p class="price">${escapeHtml(formatUsd(listing.priceCents))}</p>`);
  return page({
    title: `${listing.title} · Sandbox market`,
    mainHtml: lines.join('\n'),
    footerHtml: `<a href="${MARKET_PREFIX}">All sandbox listings</a>`,
  });
}

export function indexPage(listings) {
  const items = listings.map((l) => {
    const extra = [l.seller ? escapeHtml(l.seller) : null, Number.isInteger(l.priceCents) ? escapeHtml(formatUsd(l.priceCents)) : null]
      .filter(Boolean)
      .join(' · ');
    return `<li><a href="${escapeHtml(l.url)}">${escapeHtml(l.title)}</a>${extra ? ` · ${extra}` : ''}</li>`;
  });
  const count = `${listings.length} fictional ${listings.length === 1 ? 'listing' : 'listings'} by invented sellers.`;
  return page({
    title: 'Sandbox market',
    mainHtml: ['<h1>Sandbox market</h1>', `<p>${escapeHtml(count)}</p>`, '<ul>', ...items, '</ul>'].join('\n'),
  });
}

/** Every page the market holds: [{ file, html }], the index first. */
export function marketPages(data) {
  const listings = marketListings(data);
  return [{ file: INDEX_FILE, html: indexPage(listings) }, ...listings.map((l) => ({ file: l.file, html: listingPage(l) }))];
}

/** Writes the pages into outDir and removes any other .html file there. Returns the file names. */
export function writeMarket(data, outDir = DEFAULT_OUT) {
  const pages = marketPages(data);
  fs.mkdirSync(outDir, { recursive: true });
  const keep = new Set(pages.map((p) => p.file));
  for (const name of fs.readdirSync(outDir)) {
    if (name.endsWith('.html') && !keep.has(name)) fs.rmSync(path.join(outDir, name));
  }
  for (const p of pages) fs.writeFileSync(path.join(outDir, p.file), p.html, 'utf8');
  return pages.map((p) => p.file);
}

function argValue(args, name) {
  const i = args.indexOf(name);
  return i > -1 ? args[i + 1] : undefined;
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const dataPath = path.resolve(argValue(args, '--data') ?? DEFAULT_DATA);
  const outDir = path.resolve(argValue(args, '--out') ?? DEFAULT_OUT);
  if (!fs.existsSync(dataPath)) {
    console.log(`make-market: ${path.relative(ROOT, dataPath) || dataPath} is missing. Run npm run export:mock first`);
    return 1;
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (err) {
    console.log(`make-market: can't read ${dataPath}: ${err.message}`);
    return 1;
  }
  try {
    const files = writeMarket(data, outDir);
    const shown = path.relative(ROOT, outDir).split(path.sep).join('/') || outDir;
    for (const f of files) console.log(`  ${shown}/${f}`);
    console.log(`make-market: ${files.length - 1} listing pages and the index written to ${shown}/`);
    return 0;
  } catch (err) {
    console.log(`make-market: ${err.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(main());
}
