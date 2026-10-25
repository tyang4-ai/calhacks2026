#!/usr/bin/env node
// node scripts/check-public.mjs [--dist <folder>] [--data <mock.json>] [--no-browser]
// Checks a public build in dist/ (D-deploy T2) and prints one line per check:
// - dist/public-build.json says "publicSite": true,
// - dist/_redirects parses as Cloudflare's format, and a matcher with Cloudflare's splat rule sends
//   the site's deep links to / with 200 and matches nothing for assets, images, the sandbox market,
//   each listing's /market/ path, robots.txt or any other file in dist/,
// - dist/robots.txt disallows everything for every agent,
// - dist/index.html holds <meta name="robots" content="noindex">,
// - there's no dist/404.html (it would turn off Cloudflare Pages' fallback to the root page),
// - dist/market/index.html exists, links every listing page, and each page exists with noindex,
// - fewer than 1,000 files and none over 25 MiB (the drag-and-drop limits in direct-upload.mdx).
// Then, unless --no-browser is given, the rendered checks (the G1b verifier's note): headless
// Chromium loads dist/ through Playwright's request routing, with Cloudflare's file and redirect
// rules and no server or port, and every request beyond the site aborted. /demo must have no Live
// switch (demo-mode-toggle), and the m key must leave the mode scripted while the l key still
// works. /shop/piece/pc_01 must show L6 (buyer-pay-blocked) and no buyer-pay-button, with L1 in the
// top bar. No console error, page error, request beyond the site or /api/ request. When Chromium
// can't start, those checks print SKIP and Gordon's browser check (D-deploy step 4) covers them.
// Exits 1 when any check fails.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const MAX_FILES = 1000;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const REDIRECT_CODES = new Set([200, 301, 302, 303, 307, 308]);
const MAX_STATIC = 2000;
const MAX_DYNAMIC = 100;
const MAX_LINE = 1000;

/** The deep links that must reach the root page with 200 (D-deploy, Interfaces). */
export const MUST_PROXY = [
  '/demo',
  '/demo?mode=present',
  '/shop',
  '/shop/search?q=warm',
  '/shop/piece/pc_01',
  '/sell/month',
  '/sell/overview',
  '/store/dine-weavers',
  '/maker/mkr_01',
  '/buyer',
  '/studio/month',
  '/owner',
];
/** Paths no rule may touch: files Cloudflare must serve as they are. */
export const MUST_NOT_MATCH = [
  '/',
  '/index.html',
  '/assets/index.js',
  '/images/pc_01.svg',
  '/market/',
  '/market/index.html',
  '/robots.txt',
  '/favicon.svg',
  '/public-build.json',
];

export const L1_EN = 'Demo. Every maker, community and story here is fictional. Nothing is for sale.';
export const L6_TESTID = 'buyer-pay-blocked';
const NOINDEX = /<meta\s[^>]*name\s*=\s*["']?robots["']?[^>]*content\s*=\s*["'][^"']*\bnoindex\b/i;

/**
 * Parses a Cloudflare Pages _redirects file: one `source destination [code]` per line, `#` lines
 * are comments. Returns { rules, errors }. Each rule has { line, source, destination, code,
 * dynamic }. Errors name the line.
 */
export function parseRedirects(text) {
  const rules = [];
  const errors = [];
  let sawDynamic = false;
  const lines = String(text).split(/\r?\n/);
  lines.forEach((raw, i) => {
    const n = i + 1;
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) return;
    if (raw.length > MAX_LINE) errors.push(`line ${n}: longer than ${MAX_LINE} characters`);
    const parts = line.split(/\s+/);
    if (parts.length < 2 || parts.length > 3) {
      errors.push(`line ${n}: expected "source destination [code]", got ${parts.length} fields`);
      return;
    }
    const [source, destination, codeText] = parts;
    const code = codeText === undefined ? 302 : Number(codeText);
    if (!/^\d{3}$/.test(codeText ?? '302') || !REDIRECT_CODES.has(code)) {
      errors.push(`line ${n}: status ${codeText} isn't one Cloudflare supports (200, 301, 302, 303, 307, 308)`);
      return;
    }
    if (!source.startsWith('/')) {
      errors.push(`line ${n}: source ${source} must be a path starting with /`);
      return;
    }
    if ((source.match(/\*/g) || []).length > 1) {
      errors.push(`line ${n}: source ${source} has more than one splat`);
      return;
    }
    const isAbsolute = /^https?:\/\//.test(destination);
    if (!destination.startsWith('/') && !isAbsolute) {
      errors.push(`line ${n}: destination ${destination} must be a path or an http(s) URL`);
      return;
    }
    if (code === 200 && isAbsolute) {
      errors.push(`line ${n}: a 200 proxy only works to a relative URL on the site`);
      return;
    }
    const dynamic = source.includes('*') || /\/:[A-Za-z]/.test(source);
    if (!dynamic && sawDynamic) errors.push(`line ${n}: static rule ${source} comes after a splat or placeholder rule`);
    if (dynamic) sawDynamic = true;
    rules.push({ line: n, source, destination, code, dynamic });
  });
  const dynamicCount = rules.filter((r) => r.dynamic).length;
  if (rules.length - dynamicCount > MAX_STATIC) errors.push(`more than ${MAX_STATIC} static rules`);
  if (dynamicCount > MAX_DYNAMIC) errors.push(`more than ${MAX_DYNAMIC} dynamic rules`);
  return { rules, errors };
}

function sourceRegex(source) {
  let re = '';
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '*') {
      re += '(?<splat>.*)';
      i += 1;
    } else if (ch === ':' && source[i - 1] === '/' && /[A-Za-z]/.test(source[i + 1] ?? '')) {
      const m = /^:([A-Za-z]\w*)/.exec(source.slice(i));
      re += `(?<${m[1]}>[^/]+)`;
      i += m[0].length;
    } else {
      re += ch.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
      i += 1;
    }
  }
  return new RegExp(`^${re}$`);
}

/**
 * The rule Cloudflare Pages applies to a request path, or null. The query string never takes part
 * in matching. A splat greedily matches everything (slashes included) and a placeholder one
 * segment. Static rules are looked up first, then the dynamic ones, top-most first.
 * Returns { rule, destination, code } with :splat and placeholders filled in.
 */
export function matchRedirect(rules, requestPath) {
  const pathname = String(requestPath).split(/[?#]/)[0];
  const ordered = [...rules.filter((r) => !r.dynamic), ...rules.filter((r) => r.dynamic)];
  for (const rule of ordered) {
    const m = sourceRegex(rule.source).exec(pathname);
    if (!m) continue;
    const groups = m.groups ?? {};
    let destination = rule.destination.replace(/:splat\b/g, groups.splat ?? '');
    for (const [k, v] of Object.entries(groups)) if (k !== 'splat') destination = destination.replace(new RegExp(`:${k}\\b`, 'g'), v);
    return { rule, destination, code: rule.code };
  }
  return null;
}

/** True when robots.txt disallows the whole site for every agent and allows nothing back. */
export function robotsDisallowsAll(text) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === 'user-agent') {
      if (!lastWasAgent) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value);
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === 'disallow') current.disallow.push(value);
    if (field === 'allow') current.allow.push(value);
  }
  if (!groups.some((g) => g.agents.includes('*'))) return false;
  return groups.every((g) => g.disallow.includes('/') && g.allow.length === 0);
}

/** Every file under dir, as forward-slash paths relative to it. */
export function listFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(path.relative(dir, p).split(path.sep).join('/'));
    }
  };
  walk(dir);
  return out.toSorted();
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

/** The /market/ listing paths from the mock data, or [] when it's missing. */
export function dataListingPaths(dataPath) {
  const text = readText(dataPath);
  if (text === null) return [];
  try {
    const data = JSON.parse(text);
    return (data.counterfeitCandidates ?? []).map((c) => c.url).filter((u) => typeof u === 'string' && u.startsWith('/market/'));
  } catch {
    return [];
  }
}

/** The file checks. Returns [{ name, ok, detail }]. Never throws. */
export function checkDist(dist, { dataPath = path.join(ROOT, 'artifacts', 'mock', 'mock.json') } = {}) {
  const results = [];
  const add = (name, ok, detail) => results.push({ name, ok: Boolean(ok), detail });
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    add('dist/ holds a build', false, `no index.html in ${dist}. Run npm run build:public`);
    return results;
  }
  const files = listFiles(dist);

  // 1. The public-build marker
  {
    const text = readText(path.join(dist, 'public-build.json'));
    let info = null;
    try {
      info = text === null ? null : JSON.parse(text);
    } catch {
      info = null;
    }
    const ok = info?.publicSite === true;
    const commit = typeof info?.commit === 'string' && /^[0-9a-f]{40}$/.test(info.commit) ? info.commit.slice(0, 12) : 'no full commit SHA';
    add(
      'public-build.json says publicSite: true',
      ok,
      text === null ? 'missing. This is not a public build: run npm run build:public' : ok ? `commit ${commit}, built ${info.builtAt ?? '?'}` : 'publicSite isn\'t true',
    );
  }

  // 2. _redirects
  {
    const text = readText(path.join(dist, '_redirects'));
    if (text === null) add('_redirects parses as Cloudflare\'s format', false, 'dist/_redirects is missing (public/_redirects is copied by Vite)');
    else {
      const { rules, errors } = parseRedirects(text);
      add("_redirects parses as Cloudflare's format", errors.length === 0 && rules.length > 0, errors.length ? errors.join('; ') : `${rules.length} rules`);
      const wrong = [];
      for (const p of MUST_PROXY) {
        const hit = matchRedirect(rules, p);
        if (!hit || hit.destination !== '/' || hit.code !== 200) wrong.push(`${p} → ${hit ? `${hit.destination} ${hit.code}` : 'no rule'}`);
      }
      add('deep links reach / with 200', wrong.length === 0, wrong.length ? wrong.join('; ') : `${MUST_PROXY.length} paths`);
      const marketIndex = readText(path.join(dist, 'market', 'index.html')) ?? '';
      const listingPaths = [
        ...new Set([...dataListingPaths(dataPath), ...[...marketIndex.matchAll(/href="(\/market\/[^"]+)"/g)].map((m) => m[1])]),
      ];
      const filePaths = files.filter((f) => f !== '_redirects').map((f) => `/${f}`);
      const mustNot = [...new Set([...MUST_NOT_MATCH, ...listingPaths, ...filePaths])];
      const caught = mustNot.filter((p) => matchRedirect(rules, p)).map((p) => `${p} (line ${matchRedirect(rules, p).rule.line})`);
      add(
        'no rule touches a file, the market or robots.txt',
        caught.length === 0,
        caught.length ? caught.join('; ') : `${mustNot.length} paths, ${listingPaths.length} of them listings`,
      );
    }
  }

  // 3. robots.txt
  {
    const text = readText(path.join(dist, 'robots.txt'));
    add('robots.txt disallows everything for every agent', text !== null && robotsDisallowsAll(text), text === null ? 'dist/robots.txt is missing' : text.trim().replace(/\s+/g, ' '));
  }

  // 4. noindex on the app page
  {
    const html = readText(path.join(dist, 'index.html')) ?? '';
    add('index.html holds the noindex tag', NOINDEX.test(html), NOINDEX.test(html) ? '<meta name="robots" content="noindex">' : 'missing');
  }

  // 5. No 404.html at the top
  add('no top-level 404.html', !fs.existsSync(path.join(dist, '404.html')), fs.existsSync(path.join(dist, '404.html')) ? 'dist/404.html turns off the fallback to the root page' : 'none');

  // 6. The sandbox market
  {
    const index = readText(path.join(dist, 'market', 'index.html'));
    if (index === null) add('market/index.html links every listing page', false, 'dist/market/index.html is missing. Run node scripts/make-market.mjs');
    else {
      const links = [...index.matchAll(/href="(\/market\/[^"]+)"/g)].map((m) => m[1]).filter((h) => h !== '/market/');
      const expected = dataListingPaths(dataPath);
      const problems = [];
      for (const p of expected) if (!links.includes(p)) problems.push(`${p} not linked`);
      for (const href of links) {
        const page = readText(path.join(dist, ...href.replace(/^\//, '').split('/')));
        if (page === null) problems.push(`${href} missing`);
        else {
          if (!NOINDEX.test(page)) problems.push(`${href} has no noindex`);
          if (!page.includes(L1_EN)) problems.push(`${href} has no L1`);
        }
      }
      if (!NOINDEX.test(index)) problems.push('/market/ has no noindex');
      if (links.length === 0) problems.push('no listing links');
      add(
        'market/index.html links every listing page',
        problems.length === 0,
        problems.length ? problems.join('; ') : `${links.length} listings${expected.length ? `, all ${expected.length} from the data` : ''}`,
      );
    }
  }

  // 7. Cloudflare's drag-and-drop limits
  {
    const big = files.filter((f) => fs.statSync(path.join(dist, f)).size > MAX_FILE_BYTES);
    // The web fonts' unicode-range subsets (.woff2 and .woff) are most of the count.
    const fonts = files.filter((f) => /\.(woff2?|ttf|otf)$/.test(f)).length;
    add(
      `fewer than ${MAX_FILES} files, none over 25 MiB`,
      files.length < MAX_FILES && big.length === 0,
      `${files.length} files, ${fonts} of them fonts${big.length ? `; over 25 MiB: ${big.join(', ')}` : ''}`,
    );
  }
  return results;
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/**
 * What Cloudflare Pages would answer for a path of this dist/: the _redirects rule first, then the
 * file, then the folder's index.html or the .html file, then (with no 404.html) the root page.
 * Returns { status, file?, location? }.
 */
export function resolveLikePages(dist, rules, requestPath) {
  const pathname = decodeURIComponent(String(requestPath).split(/[?#]/)[0]);
  const hit = matchRedirect(rules, pathname);
  if (hit && hit.code !== 200) return { status: hit.code, location: hit.destination };
  const target = hit ? hit.destination.split(/[?#]/)[0] : pathname;
  const safe = path.normalize(target).replace(/^([/\\])+/, '');
  if (safe.startsWith('..')) return { status: 404 };
  const candidates = target.endsWith('/') ? [path.join(safe, 'index.html')] : [safe, `${safe}.html`, path.join(safe, 'index.html')];
  for (const c of candidates) {
    const full = path.join(dist, c);
    if (c && fs.existsSync(full) && fs.statSync(full).isFile() && path.basename(c) !== '_redirects') return { status: 200, file: full };
  }
  if (fs.existsSync(path.join(dist, '404.html'))) return { status: 404, file: path.join(dist, '404.html') };
  return { status: 200, file: path.join(dist, 'index.html') };
}

/** The rendered checks, through Playwright's request routing. Returns [{ name, ok, detail, skip? }]. */
export async function checkRendered(dist) {
  const results = [];
  const add = (name, ok, detail, skip = false) => results.push({ name, ok: Boolean(ok), detail, skip });
  const redirectsText = readText(path.join(dist, '_redirects')) ?? '';
  const { rules } = parseRedirects(redirectsText);
  let chromium;
  let browser;
  try {
    ({ chromium } = await import('@playwright/test'));
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    const why = String(err?.message ?? err).split('\n')[0];
    add('rendered checks', true, `SKIP: Chromium didn't start (${why}). Run npx playwright install chromium, or check /demo and /shop/piece/pc_01 in the browser`, true);
    return results;
  }
  const ORIGIN = 'http://cindia-public.localhost';
  const remote = [];
  const api = [];
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, serviceWorkers: 'block' });
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== ORIGIN) {
        if (!['data:', 'blob:', 'about:'].includes(url.protocol)) remote.push(url.href);
        return route.abort('blockedbyclient');
      }
      if (url.pathname.startsWith('/api/')) api.push(url.pathname);
      const r = resolveLikePages(dist, rules, url.pathname);
      if (r.location) return route.fulfill({ status: r.status, headers: { location: r.location }, body: '' });
      if (!r.file) return route.fulfill({ status: r.status, body: '' });
      const type = TYPES[path.extname(r.file).toLowerCase()] ?? 'application/octet-stream';
      return route.fulfill({ status: r.status, contentType: type, body: fs.readFileSync(r.file) });
    });
    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
      if (msg.type() === 'warning' && /^\[cindia( shell)?\]/.test(msg.text())) errors.push(`console.warn: ${msg.text()}`);
    });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    const T = 20000;

    // /demo: no Live switch, and m does nothing while l still works.
    try {
      await page.goto(`${ORIGIN}/demo`, { waitUntil: 'load' });
      await page.locator('[data-testid="demo-controls"]').waitFor({ state: 'attached', timeout: T });
      await page.waitForFunction(() => Boolean(window.__cindia?.store), null, { timeout: T });
      const toggles = await page.locator('[data-testid="demo-mode-toggle"]').count();
      add('/demo has no Live switch (demo-mode-toggle)', toggles === 0, toggles === 0 ? 'absent' : `${toggles} found`);

      await page.evaluate(() => {
        if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
      });
      const langToggle = page.locator('[data-testid="demo-lang-toggle"]');
      const langBefore = await langToggle.getAttribute('data-lang');
      await page.keyboard.press('l');
      await page.waitForFunction((before) => document.querySelector('[data-testid="demo-lang-toggle"]')?.getAttribute('data-lang') !== before, langBefore, { timeout: 5000 }).catch(() => {});
      const langAfter = await langToggle.getAttribute('data-lang');
      const modeBefore = await page.evaluate(() => window.__cindia.store.getState().mode);
      const apiBefore = api.length;
      await page.keyboard.press('m');
      await page.waitForTimeout(800);
      const modeAfter = await page.evaluate(() => window.__cindia.store.getState().mode);
      const togglesAfter = await page.locator('[data-testid="demo-mode-toggle"]').count();
      const keysWork = langBefore !== langAfter;
      add(
        'the m key leaves the mode scripted',
        keysWork && modeBefore === 'scripted' && modeAfter === 'scripted' && togglesAfter === 0 && api.length === apiBefore,
        keysWork
          ? `mode ${modeBefore} → ${modeAfter} after m (l switched the language ${langBefore} → ${langAfter})`
          : `the l key didn't switch the language (${langBefore} → ${langAfter}), so the key handler isn't live`,
      );
    } catch (err) {
      add('/demo renders', false, String(err?.message ?? err).split('\n')[0]);
    }

    // The piece page: L6 in Pay's place, and L1 in the top bar.
    try {
      await page.goto(`${ORIGIN}/shop/piece/pc_01`, { waitUntil: 'load' });
      await page.locator(`[data-testid="${L6_TESTID}"]`).first().waitFor({ state: 'visible', timeout: T });
      const pay = await page.locator('[data-testid="buyer-pay-button"]').count();
      add('/shop/piece/pc_01 shows L6 and no Pay button', pay === 0, pay === 0 ? `${L6_TESTID} shown, buyer-pay-button absent` : `${pay} buyer-pay-button found`);
      const top = page.locator('[data-testid="shell-topnav"]').first();
      await top.waitFor({ state: 'visible', timeout: T });
      const topText = (await top.innerText()).replace(/\s+/g, ' ');
      add('L1 shows in the top bar', topText.includes(L1_EN), topText.includes(L1_EN) ? 'shell-topnav holds L1' : 'L1 not found in shell-topnav');
    } catch (err) {
      add('/shop/piece/pc_01 shows L6 and no Pay button', false, String(err?.message ?? err).split('\n')[0]);
    }

    // The sandbox market resolves like Cloudflare serves it.
    try {
      await page.goto(`${ORIGIN}/market/`, { waitUntil: 'load' });
      const h1 = (await page.locator('h1').first().innerText()).trim();
      const links = await page.locator('main a[href^="/market/"]').count();
      add('/market/ serves the sandbox market', h1 === 'Sandbox market' && links > 0, `h1 "${h1}", ${links} listing links`);
    } catch (err) {
      add('/market/ serves the sandbox market', false, String(err?.message ?? err).split('\n')[0]);
    }

    add('no request beyond the site', remote.length === 0, remote.length ? [...new Set(remote)].slice(0, 5).join(', ') : 'none');
    add('no /api/ request', api.length === 0, api.length ? [...new Set(api)].slice(0, 5).join(', ') : 'none');
    add('no console or page errors', errors.length === 0, errors.length ? errors.slice(0, 5).join(' | ') : 'none');
    await context.close();
  } finally {
    await browser.close();
  }
  return results;
}

function argValue(args, name) {
  const i = args.indexOf(name);
  return i > -1 ? args[i + 1] : undefined;
}

export async function main(argv = process.argv.slice(2)) {
  const args = argv.filter((a) => a !== '--');
  const dist = path.resolve(argValue(args, '--dist') ?? path.join(ROOT, 'dist'));
  const dataPath = path.resolve(argValue(args, '--data') ?? path.join(ROOT, 'artifacts', 'mock', 'mock.json'));
  const results = checkDist(dist, { dataPath });
  const built = fs.existsSync(path.join(dist, 'index.html'));
  const noBrowser = args.includes('--no-browser');
  if (built && !noBrowser) results.push(...(await checkRendered(dist)));
  for (const r of results) console.log(`${r.skip ? 'SKIP' : r.ok ? 'PASS' : 'FAIL'}  ${r.name}: ${r.detail}`);
  console.log(summaryLine(results, { rendered: built && !noBrowser }));
  return results.some((r) => !r.ok) ? 1 : 0;
}

/** The last line's note when the rendered checks didn't run, so a PASS never hides it. */
export const RENDERED_SKIPPED = 'rendered checks skipped: Chromium did not start';
export const RENDERED_NOT_RUN = 'rendered checks not run: --no-browser';

/**
 * The last line: PASS or FAIL with the count of checks that ran (a SKIP row isn't one), plus a note
 * when the rendered checks were skipped or not asked for. A skip never fails the run, as D-deploy
 * allows, because Gordon's browser check covers the same ground.
 */
export function summaryLine(results, { rendered = true } = {}) {
  const ran = results.filter((r) => !r.skip);
  const failed = ran.filter((r) => !r.ok);
  const note = !rendered ? `, ${RENDERED_NOT_RUN}` : results.some((r) => r.skip) ? `, ${RENDERED_SKIPPED}` : '';
  const checks = `${ran.length === 1 ? 'check' : 'checks'}${note}`;
  return failed.length ? `check-public: FAIL (${failed.length} of ${ran.length} ${checks})` : `check-public: PASS (${ran.length} ${checks})`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(await main());
}
