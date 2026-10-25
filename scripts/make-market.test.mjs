// node --test scripts/make-market.test.mjs
// The sandbox market's pages (D-deploy T1): they match the mock data, and they break no rule of
// the plan. The data is loaded fresh from src/mock/index.ts through Vite in middleware mode (no
// port, no watcher), the same way npm run export:mock does, so a stale mock.json can't hide a
// page that needs rewriting.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import {
  DEFAULT_OUT,
  INDEX_FILE,
  L1,
  SANDBOX_LINE,
  escapeHtml,
  formatUsd,
  marketListings,
  marketPages,
  writeMarket,
} from './make-market.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function loadMock() {
  const server = await createServer({
    root: ROOT,
    configFile: false,
    logLevel: 'error',
    appType: 'custom',
    clearScreen: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  });
  try {
    const mod = await server.ssrLoadModule('/src/mock/index.ts');
    const data = {};
    for (const key of Object.keys(mod)) {
      if (typeof mod[key] === 'function' || mod[key] === undefined) continue;
      data[key] = mod[key];
    }
    // The same shape mock.json has after JSON.stringify.
    return JSON.parse(JSON.stringify(data));
  } finally {
    await server.close();
  }
}

/** L1's English and Chinese, read from glossary.md's label table. */
function glossaryL1() {
  const text = fs.readFileSync(path.join(ROOT, 'docs', 'common', 'glossary.md'), 'utf8');
  const row = text.split(/\r?\n/).find((l) => l.startsWith('| L1 |'));
  assert.ok(row, 'glossary.md has an L1 row');
  const cells = row.split('|').map((c) => c.trim());
  return { en: cells[2], zh: cells[3] };
}

const decode = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const textOf = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function parts(html) {
  const main = /<main>([\s\S]*?)<\/main>/.exec(html);
  const header = /<header>([\s\S]*?)<\/header>/.exec(html);
  return {
    main: main ? main[1] : null,
    header: header ? header[1] : null,
    beforeMain: html.slice(0, html.indexOf('<main>')),
  };
}

/** Every rule the plan sets for any market page. */
function checkCommonRules(file, html, l1) {
  assert.match(html, /^<!doctype html>/i, `${file}: starts with a doctype`);
  assert.ok(html.includes('<meta name="robots" content="noindex">'), `${file}: carries noindex`);
  const { header, main, beforeMain } = parts(html);
  assert.ok(header !== null, `${file}: has a header`);
  assert.ok(main !== null, `${file}: has a main`);
  assert.ok(beforeMain.includes('<header>'), `${file}: the header sits above main`);
  const headerText = textOf(header);
  assert.ok(headerText.includes(l1.en), `${file}: the header shows L1 in English`);
  assert.ok(headerText.includes(l1.zh), `${file}: the header shows L1 in Chinese`);
  assert.ok(headerText.includes(SANDBOX_LINE), `${file}: the header shows the sandbox line`);
  assert.ok(headerText.indexOf(l1.en) < headerText.indexOf(SANDBOX_LINE), `${file}: L1 comes before the sandbox line`);
  assert.ok(!/<p[\s>]/.test(beforeMain), `${file}: no paragraph before main, so the snippet is the page's first paragraph`);
  for (const [what, re] of [
    ['script', /<script\b/i],
    ['image', /<(img|picture|source|svg|image)\b/i],
    ['embedded frame or object', /<(iframe|object|embed|video|audio)\b/i],
    ['stylesheet or other link tag', /<link\b/i],
    ['font', /@font-face|@import|\.woff2?\b|\.ttf\b|\.otf\b/i],
    ['CSS url()', /url\(/i],
    ['absolute URL', /\b(https?|ftp):\/\//i],
    ['protocol-relative URL', /(href|src|action)\s*=\s*["']?\/\//i],
    ['inline event handler', /\son[a-z]+\s*=/i],
  ]) {
    assert.ok(!re.test(html), `${file}: holds no ${what}`);
  }
  for (const m of html.matchAll(/\b(?:href|src|action)\s*=\s*"([^"]*)"/gi)) {
    assert.ok(m[1].startsWith('/market/'), `${file}: link ${m[1]} stays on the sandbox market`);
  }
}

describe('make-market against the current mock data', () => {
  let data;
  let pages;
  let listings;
  const l1 = glossaryL1();

  before(async () => {
    data = await loadMock();
    pages = marketPages(data);
    listings = marketListings(data);
  });

  test('L1 in the script is glossary.md word for word', () => {
    assert.deepEqual(L1, l1);
  });

  test('one page per /market/ candidate, at its own url, in cftId order, plus the index', () => {
    const expected = data.counterfeitCandidates
      .filter((c) => c.url.startsWith('/market/'))
      .map((c) => c.id)
      .toSorted();
    assert.ok(expected.length >= 1, 'the data has market listings');
    assert.deepEqual(
      listings.map((l) => l.id),
      expected,
    );
    for (const l of listings) assert.equal(`/market/${l.file}`, l.url);
    assert.deepEqual(
      pages.map((p) => p.file),
      [INDEX_FILE, ...listings.map((l) => l.file)],
    );
    // S3-catalog: listing-01 to listing-04 in cftId order.
    assert.deepEqual(
      listings.map((l) => l.file),
      listings.map((_, i) => `listing-${String(i + 1).padStart(2, '0')}.html`),
    );
  });

  test('the committed pages in public/market/ are exactly what the data makes', () => {
    const onDisk = fs.readdirSync(DEFAULT_OUT).toSorted();
    assert.deepEqual(onDisk, pages.map((p) => p.file).toSorted(), 'public/market/ holds only the generated pages. Rerun node scripts/make-market.mjs');
    for (const p of pages) {
      const disk = fs.readFileSync(path.join(DEFAULT_OUT, p.file), 'utf8');
      assert.equal(disk, p.html, `${p.file} is out of date. Run npm run export:mock, then node scripts/make-market.mjs`);
    }
  });

  test('every page shows L1 and the sandbox line, carries noindex, and loads nothing', () => {
    for (const p of pages) checkCommonRules(p.file, p.html, l1);
  });

  test('each listing page: title in its one h1 and the snippet as the first paragraph inside main', () => {
    for (const l of listings) {
      const html = pages.find((p) => p.file === l.file).html;
      const { main } = parts(html);
      const h1s = [...html.matchAll(/<h1>([\s\S]*?)<\/h1>/g)];
      assert.equal(h1s.length, 1, `${l.file}: one h1`);
      assert.ok(main.includes(h1s[0][0]), `${l.file}: the h1 is inside main`);
      assert.equal(decode(h1s[0][1]), l.title, `${l.file}: the h1 is the title`);
      const firstP = /<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/.exec(main);
      assert.ok(firstP, `${l.file}: main has a paragraph`);
      assert.equal(decode(firstP[1]), l.snippet, `${l.file}: the first paragraph is the snippet`);
      assert.ok(main.indexOf(h1s[0][0]) < main.indexOf(firstP[0]), `${l.file}: the title comes before the snippet`);
      const mainText = textOf(main);
      if (l.claim?.en) assert.ok(mainText.includes(l.claim.en), `${l.file}: main holds the claim`);
      if (l.claim?.zh) assert.ok(mainText.includes(l.claim.zh), `${l.file}: main holds the claim in Chinese`);
      if (l.seller) assert.ok(mainText.includes(`Sold by ${l.seller}`), `${l.file}: main holds the seller line`);
      if (Number.isInteger(l.priceCents)) assert.ok(mainText.includes(formatUsd(l.priceCents)), `${l.file}: main holds the price`);
    }
  });

  test('the index links every listing page with a plain link', () => {
    const index = pages.find((p) => p.file === INDEX_FILE).html;
    const hrefs = [...index.matchAll(/<a href="([^"]+)">/g)].map((m) => m[1]);
    assert.deepEqual(
      hrefs,
      listings.map((l) => l.url),
    );
  });

  test('the claim-only listing names no maker and no community', () => {
    const claimOnly = listings.filter((l) => l.verdict === 'claim_only');
    assert.ok(claimOnly.length >= 1, 'the market has a claim-only listing');
    const names = new Set();
    for (const p of data.people ?? []) if (p.role !== 'buyer') for (const n of Object.values(p.name ?? {})) names.add(n);
    for (const m of data.allMakers ?? []) for (const n of Object.values(m.name ?? {})) names.add(n);
    for (const c of data.communities ?? []) {
      for (const n of Object.values(c.name ?? {})) names.add(n);
      for (const n of Object.values(c.people ?? {})) names.add(n);
    }
    for (const [key, list] of Object.entries(data.contentRules?.peopleNames ?? {})) {
      if (key !== 'general') for (const n of list) names.add(n);
    }
    assert.ok(names.size > 10, 'the names list was built from the data');
    for (const l of claimOnly) {
      const text = textOf(parts(pages.find((p) => p.file === l.file).html).main);
      for (const n of names) assert.ok(!text.includes(n), `${l.file}: names no maker or community (found ${n})`);
    }
  });
});

describe('make-market rules on made-up data', () => {
  const base = {
    id: 'cft_09',
    title: 'A <bold> & "quoted" title',
    snippet: "It's a snippet.",
    claim: { en: 'Claims nothing.', zh: '没有声称。' },
    verdict: 'neither',
  };

  test('candidates on example.com or example.org get no page', () => {
    const data = {
      counterfeitCandidates: [
        { ...base, id: 'cft_02', url: 'https://example.com/listing' },
        { ...base, id: 'cft_01', url: '/market/listing-01.html' },
        { ...base, id: 'cft_03', url: 'https://example.org/x' },
      ],
    };
    assert.deepEqual(
      marketPages(data).map((p) => p.file),
      ['index.html', 'listing-01.html'],
    );
  });

  test('a /market/ url that would leave the folder or overwrite the index is refused', () => {
    for (const url of ['/market/../x.html', '/market/sub/listing.html', '/market/index.html', '/market/listing-01']) {
      assert.throws(() => marketListings({ counterfeitCandidates: [{ ...base, url }] }), /isn't a listing page path/, url);
    }
  });

  test('text is escaped and the seller line falls back when the data has no seller', () => {
    const [, page] = marketPages({ counterfeitCandidates: [{ ...base, url: '/market/listing-01.html' }] });
    assert.ok(page.html.includes(`<h1>${escapeHtml(base.title)}</h1>`));
    assert.ok(!page.html.includes('<bold>'));
    assert.ok(page.html.includes("<p>It's a snippet.</p>"));
    assert.ok(page.html.includes('Sold by an invented sandbox seller'));
    assert.ok(!page.html.includes('class="price"'), 'no price line without priceCents');
  });

  test('the page rules catch a script, an image, a stylesheet, a font and another host', () => {
    const [, page] = marketPages({ counterfeitCandidates: [{ ...base, url: '/market/listing-01.html' }] });
    const l1 = glossaryL1();
    checkCommonRules('good', page.html, l1);
    for (const bad of [
      '<script>1</script>',
      '<img alt="">',
      '<link rel="stylesheet" href="/market/x.css">',
      '<style>@font-face { font-family: x; }</style>',
      '<a href="https://example.com/">x</a>',
      '<a href="//example.com/">x</a>',
    ]) {
      assert.throws(() => checkCommonRules('bad', page.html.replace('</main>', `${bad}\n</main>`), l1), undefined, bad);
    }
    assert.throws(() => checkCommonRules('bad', page.html.replace('<meta name="robots" content="noindex">', ''), l1));
    assert.throws(() => checkCommonRules('bad', page.html.replace('<header>', '<header>\n<p>first</p>'), l1));
  });

  test('prices print as dollars from integer cents', () => {
    assert.equal(formatUsd(9500), '$95.00');
    assert.equal(formatUsd(123456), '$1,234.56');
    assert.equal(formatUsd(5), '$0.05');
    assert.throws(() => formatUsd(9.5));
  });

  describe('writeMarket', () => {
    let dir;
    before(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cindia-market-'));
      fs.writeFileSync(path.join(dir, 'listing-99.html'), 'old page');
      fs.writeFileSync(path.join(dir, 'notes.txt'), 'not a page');
    });
    after(() => fs.rmSync(dir, { recursive: true, force: true }));

    test('writes the pages and removes stale pages only', () => {
      const files = writeMarket({ counterfeitCandidates: [{ ...base, url: '/market/listing-01.html' }] }, dir);
      assert.deepEqual(files, ['index.html', 'listing-01.html']);
      assert.deepEqual(fs.readdirSync(dir).toSorted(), ['index.html', 'listing-01.html', 'notes.txt']);
    });
  });
});
