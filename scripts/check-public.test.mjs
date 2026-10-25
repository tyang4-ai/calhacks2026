// node --test scripts/check-public.test.mjs
// The public check's parts (D-deploy T2): the _redirects parser and its matcher with Cloudflare's
// splat rule, the robots.txt reader, Cloudflare's file resolution, and the file checks against a
// made-up dist/ in a temporary folder, good and broken. No browser runs here (--no-browser).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  MUST_NOT_MATCH,
  MUST_PROXY,
  checkDist,
  matchRedirect,
  parseRedirects,
  resolveLikePages,
  RENDERED_NOT_RUN,
  RENDERED_SKIPPED,
  robotsDisallowsAll,
  summaryLine,
} from './check-public.mjs';
import { banner } from './build-public.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REDIRECTS = fs.readFileSync(path.join(ROOT, 'public', '_redirects'), 'utf8');
const MARKET = path.join(ROOT, 'public', 'market');
const marketPaths = fs
  .readdirSync(MARKET)
  .filter((f) => f !== 'index.html')
  .map((f) => `/market/${f}`);

describe('the _redirects parser and matcher', () => {
  const { rules, errors } = parseRedirects(REDIRECTS);

  test('public/_redirects parses with no errors', () => {
    assert.deepEqual(errors, []);
    assert.ok(rules.length >= 10);
    for (const r of rules) {
      assert.equal(r.destination, '/');
      assert.equal(r.code, 200);
    }
  });

  test('the deep links the plan names reach / with 200', () => {
    for (const p of ['/demo', '/shop', '/shop/piece/pc_01', '/sell/month', '/store/dine-weavers', '/maker/mkr_01', ...MUST_PROXY]) {
      const hit = matchRedirect(rules, p);
      assert.ok(hit, `${p} has a rule`);
      assert.equal(hit.destination, '/', p);
      assert.equal(hit.code, 200, p);
    }
  });

  test('every route family of src/app/routes.tsx has a rule', () => {
    const routes = fs.readFileSync(path.join(ROOT, 'src', 'app', 'routes.tsx'), 'utf8');
    const paths = [...routes.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== '/' && p !== '*');
    assert.ok(paths.length >= 10, 'found the routes');
    for (const p of paths) {
      const sample = p.replace(/:[A-Za-z]+/g, 'x');
      assert.ok(matchRedirect(rules, sample), `${p} (as ${sample}) has a rule`);
    }
  });

  test('nothing matches assets, images, the market, its listings or robots.txt', () => {
    assert.ok(marketPaths.length >= 1, 'public/market/ has listing pages');
    for (const p of [...MUST_NOT_MATCH, ...marketPaths, '/assets/index-abc123.css', '/images/pc_54.svg']) {
      assert.equal(matchRedirect(rules, p), null, p);
    }
  });

  test("Cloudflare's splat: greedy, slashes included, one per rule, :splat filled in", () => {
    const r = parseRedirects('/blog/* /posts/:splat 301\n/movies/:title /media/:title\n').rules;
    assert.equal(matchRedirect(r, '/blog/2026/10/hello').destination, '/posts/2026/10/hello');
    assert.equal(matchRedirect(r, '/blog/').destination, '/posts/');
    assert.equal(matchRedirect(r, '/blog'), null, 'the splat needs the slash before it');
    assert.equal(matchRedirect(r, '/movies/up').destination, '/media/up');
    assert.equal(matchRedirect(r, '/movies/up').code, 302, 'the default code is 302');
    assert.equal(matchRedirect(r, '/movies/up/extra'), null, 'a placeholder is one segment');
    assert.equal(matchRedirect(r, '/blog/x?y=1#z').destination, '/posts/x', 'the query never matches');
  });

  test('static rules win over dynamic ones, and the top-most rule wins among equals', () => {
    const r = parseRedirects('/a /first 301\n/a /second 301\n/b/* /splat 200\n').rules;
    assert.equal(matchRedirect(r, '/a').destination, '/first');
    const mixed = parseRedirects('/b/* /splat 200\n/b/c /static 301\n');
    assert.match(mixed.errors.join(), /static rule \/b\/c comes after/);
    assert.equal(matchRedirect(mixed.rules, '/b/c').destination, '/static');
  });

  test('comments and blank lines are skipped, and bad lines are named', () => {
    const { rules: r, errors: e } = parseRedirects(
      [
        '# a comment',
        '',
        '   ',
        '/ok / 200',
        '/too many fields 200 x',
        '/teapot / 418',
        'nope / 301',
        '/a/*/b/* / 301',
        '/ext https://example.com/ 200',
        '/rel relative 301',
        '/ext2 https://example.com/ 301',
      ].join('\n'),
    );
    assert.deepEqual(
      r.map((x) => x.source),
      ['/ok', '/ext2'],
    );
    assert.equal(e.length, 6);
    assert.match(e[0], /^line 5:/);
    assert.match(e.join(), /418/);
    assert.match(e.join(), /more than one splat/);
    assert.match(e.join(), /relative URL/);
  });
});

describe('robots.txt', () => {
  test('public/robots.txt disallows everything', () => {
    assert.equal(robotsDisallowsAll(fs.readFileSync(path.join(ROOT, 'public', 'robots.txt'), 'utf8')), true);
  });
  test('anything less is refused', () => {
    assert.equal(robotsDisallowsAll('User-agent: *\nDisallow: /\n'), true);
    assert.equal(robotsDisallowsAll('User-agent: *\r\nDisallow: / # all\r\n'), true);
    assert.equal(robotsDisallowsAll('User-agent: *\nDisallow:\n'), false);
    assert.equal(robotsDisallowsAll('User-agent: *\nDisallow: /private\n'), false);
    assert.equal(robotsDisallowsAll('User-agent: *\nDisallow: /\nAllow: /market/\n'), false);
    assert.equal(robotsDisallowsAll('User-agent: Googlebot\nDisallow: /\n'), false);
    assert.equal(robotsDisallowsAll('User-agent: *\nDisallow: /\n\nUser-agent: Bingbot\nDisallow:\n'), false);
    assert.equal(robotsDisallowsAll(''), false);
  });
});

/** A small dist/ that passes every file check. */
function makeDist(dir) {
  const w = (rel, body) => {
    const full = path.join(dir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body);
  };
  w('index.html', '<!doctype html><html><head><meta name="robots" content="noindex" /></head><body><div id="root"></div></body></html>');
  w('public-build.json', JSON.stringify({ publicSite: true, commit: 'a'.repeat(40), builtAt: '2026-10-25T05:00:00.000Z' }));
  w('_redirects', REDIRECTS);
  w('robots.txt', 'User-agent: *\nDisallow: /\n');
  w('favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
  w('assets/index.js', 'console.log(1)');
  w('images/pc_01.svg', '<svg/>');
  for (const f of fs.readdirSync(MARKET)) w(`market/${f}`, fs.readFileSync(path.join(MARKET, f)));
}

describe('the file checks on a made-up dist/', () => {
  let tmp;
  let dist;
  let data;
  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cindia-public-'));
    dist = path.join(tmp, 'dist');
    data = path.join(tmp, 'mock.json');
    fs.writeFileSync(data, JSON.stringify({ counterfeitCandidates: [...marketPaths.map((url, i) => ({ id: `cft_0${i + 1}`, url })), { id: 'cft_09', url: 'https://example.com/x' }] }));
  });
  after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const reset = () => {
    fs.rmSync(dist, { recursive: true, force: true });
    makeDist(dist);
  };
  const failing = () =>
    checkDist(dist, { dataPath: data })
      .filter((r) => !r.ok)
      .map((r) => r.name);

  test('a good dist/ passes every check, one line each', () => {
    reset();
    const results = checkDist(dist, { dataPath: data });
    assert.equal(results.length, 9);
    assert.deepEqual(
      results.filter((r) => !r.ok),
      [],
    );
  });

  test('a localhost build (no public-build.json) fails', () => {
    reset();
    fs.rmSync(path.join(dist, 'public-build.json'));
    assert.deepEqual(failing(), ['public-build.json says publicSite: true']);
    fs.writeFileSync(path.join(dist, 'public-build.json'), JSON.stringify({ publicSite: false }));
    assert.deepEqual(failing(), ['public-build.json says publicSite: true']);
  });

  test('a catch-all rule fails, because it would serve the page for assets and the market', () => {
    reset();
    fs.appendFileSync(path.join(dist, '_redirects'), '/* / 200\n');
    assert.deepEqual(failing(), ['no rule touches a file, the market or robots.txt']);
  });

  test('a missing or broken _redirects fails', () => {
    reset();
    fs.writeFileSync(path.join(dist, '_redirects'), '/shop / 200\n/sell / 418\n');
    assert.deepEqual(failing(), ["_redirects parses as Cloudflare's format", 'deep links reach / with 200']);
    fs.rmSync(path.join(dist, '_redirects'));
    assert.deepEqual(failing(), ["_redirects parses as Cloudflare's format"]);
  });

  test('robots.txt, noindex and 404.html are each checked', () => {
    reset();
    fs.writeFileSync(path.join(dist, 'robots.txt'), 'User-agent: *\nAllow: /\n');
    fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><html><head></head><body></body></html>');
    fs.writeFileSync(path.join(dist, '404.html'), 'not found');
    assert.deepEqual(failing(), ['robots.txt disallows everything for every agent', 'index.html holds the noindex tag', 'no top-level 404.html']);
  });

  test('a listing page missing from dist/market/ fails', () => {
    reset();
    fs.rmSync(path.join(dist, 'market', path.basename(marketPaths[0])));
    assert.deepEqual(failing(), ['market/index.html links every listing page']);
    fs.rmSync(path.join(dist, 'market'), { recursive: true });
    assert.deepEqual(failing(), ['market/index.html links every listing page']);
  });

  test('too many files fails the drag-and-drop limit', () => {
    reset();
    for (let i = 0; i < 1000; i++) fs.writeFileSync(path.join(dist, 'assets', `f${i}.js`), '');
    assert.deepEqual(failing(), ['fewer than 1000 files, none over 25 MiB']);
  });

  test("files resolve the way Cloudflare Pages serves them", () => {
    reset();
    const { rules } = parseRedirects(REDIRECTS);
    const at = (p) => {
      const r = resolveLikePages(dist, rules, p);
      return r.file ? `${r.status} ${path.relative(dist, r.file).split(path.sep).join('/')}` : `${r.status}`;
    };
    assert.equal(at('/demo?mode=present'), '200 index.html');
    assert.equal(at('/shop/piece/pc_01'), '200 index.html');
    assert.equal(at('/market/'), '200 market/index.html');
    assert.equal(at(marketPaths[0]), `200 ${marketPaths[0].slice(1)}`);
    assert.equal(at('/assets/index.js'), '200 assets/index.js');
    assert.equal(at('/robots.txt'), '200 robots.txt');
    assert.equal(at('/no/such/page'), '200 index.html', 'with no 404.html, Pages falls back to the root page');
    assert.equal(at('/_redirects'), '200 index.html', '_redirects itself is never served');
    fs.writeFileSync(path.join(dist, '404.html'), 'x');
    assert.equal(at('/no/such/page'), '404 404.html');
  });

  test('the command prints one line per check and exits 0 or 1', () => {
    reset();
    const run = () =>
      spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'check-public.mjs'), '--dist', dist, '--data', data, '--no-browser'], {
        encoding: 'utf8',
      });
    const good = run();
    assert.equal(good.status, 0, good.stdout);
    assert.equal(good.stdout.split('\n').filter((l) => l.startsWith('PASS  ')).length, 9);
    assert.match(good.stdout, /^check-public: PASS \(9 checks, rendered checks not run: --no-browser\)$/m);
    fs.writeFileSync(path.join(dist, '404.html'), 'x');
    const bad = run();
    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /^FAIL {2}no top-level 404\.html/m);
  });

  test("when Chromium can't start, the rendered checks SKIP, the run passes, and the last line says so", () => {
    reset();
    const noBrowsers = fs.mkdtempSync(path.join(os.tmpdir(), 'cindia-no-browsers-'));
    try {
      const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'check-public.mjs'), '--dist', dist, '--data', data], {
        encoding: 'utf8',
        env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: noBrowsers },
        timeout: 60000,
      });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(r.stdout, /^SKIP {2}rendered checks: /m);
      const last = r.stdout.trim().split('\n').pop();
      assert.equal(last, `check-public: PASS (9 checks, ${RENDERED_SKIPPED})`);
    } finally {
      fs.rmSync(noBrowsers, { recursive: true, force: true });
    }
  });
});

const ok = (name) => ({ name, ok: true, detail: '' });

describe('the last lines', () => {
  const skip = { name: 'rendered checks', ok: true, detail: 'SKIP: ...', skip: true };

  test("check-public's summary counts the checks that ran and names a skip", () => {
    assert.equal(summaryLine([ok('a'), ok('b')]), 'check-public: PASS (2 checks)');
    assert.equal(summaryLine([ok('a'), skip]), 'check-public: PASS (1 check, rendered checks skipped: Chromium did not start)');
    assert.equal(summaryLine([ok('a'), { name: 'b', ok: false, detail: '' }, skip]), `check-public: FAIL (1 of 2 checks, ${RENDERED_SKIPPED})`);
    assert.equal(summaryLine([ok('a')], { rendered: false }), `check-public: PASS (1 check, ${RENDERED_NOT_RUN})`);
  });

  test("build:public's banner: PASS, PASS with the skip spelled out, or FAIL", () => {
    assert.deepEqual(banner({ check: 0, scan: 0, skipped: false }), {
      code: 0,
      text: 'build:public: PASS. dist/ is the public build, ready to upload to Cloudflare Pages.',
    });
    const skipped = banner({ check: 0, scan: 0, skipped: true });
    assert.equal(skipped.code, 0, 'a skip keeps the exit code the plan allows');
    assert.match(skipped.text, /^build:public: PASS, but the rendered checks were skipped/);
    assert.match(skipped.text, /check \/demo and \/shop\/piece\/pc_01 in the browser before uploading/);
    assert.deepEqual(banner({ check: 1, scan: 0, skipped: true }), { code: 1, text: "build:public: FAIL (check-public). Don't upload dist/." });
    assert.equal(banner({ check: 0, scan: 1, skipped: false }).text, "build:public: FAIL (secrets-scan). Don't upload dist/.");
  });
});
