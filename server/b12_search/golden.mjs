#!/usr/bin/env node
// Writes tests/server/b12_surprise_golden.json from the scripted draw itself (docs/plans/B12-search.md,
// Surprise): `node server/b12_search/golden.mjs`. It loads src/sources/surprise.ts and src/mock/index.ts
// through Vite's ssrLoadModule in middleware mode with no HMR, no WebSocket and no watcher, the way
// scripts/export-mock.mjs loads the mock data, so it opens no port and fetches no package.
//
// For each seed (1, 7, 13, and figure 12's 10) it records the first three numbers mulberry32(seed)
// gives, and for each method drawSurprise()'s payload, with each candidate's raw weight beside its
// displayed weight. keyword_random and fair_random use figure 12's keyword (geometric), pure_random
// none. B12's golden test checks the Python port's numbers bit for bit, then replays each draw's
// candidates in the same order.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'tests', 'server', 'b12_surprise_golden.json');
const SEEDS = [1, 7, 13, 10];
const KEYWORD = 'geometric';
const METHODS = ['keyword_random', 'fair_random', 'pure_random'];

let server;
let code = 0;
try {
  server = await createServer({
    root: ROOT,
    configFile: false,
    logLevel: 'error',
    appType: 'custom',
    clearScreen: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  });
  const surprise = await server.ssrLoadModule('/src/sources/surprise.ts');
  const mock = await server.ssrLoadModule('/src/mock/index.ts');
  const index = mock.searchIndex;
  const pieces = mock.pieces;
  const sales = new Map(index.map((e) => [e.pieceId, e.salesThisMonth]));
  const rawWeight = (method, id) => {
    if (method !== 'fair_random') return 1;
    const n = sales.get(id);
    return 1 / (1 + (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0));
  };
  const out = {
    _about:
      'Written by node server/b12_search/golden.mjs from src/sources/surprise.ts (mulberry32, drawSurprise) and src/mock/. ' +
      'Every piece is fictional demo data. Regenerate it whenever surprise.ts or the index changes.',
    keyword: KEYWORD,
    seeds: [],
  };
  for (const seed of SEEDS) {
    const rng = surprise.mulberry32(seed);
    const first = [rng(), rng(), rng()];
    const draws = {};
    for (const method of METHODS) {
      const req = method === 'pure_random' ? { method, seed } : { keyword: KEYWORD, method, seed };
      const d = surprise.drawSurprise(req, index, pieces);
      if (!d) throw new Error(`no draw for seed ${seed} and ${method}`);
      draws[method] = {
        request: req,
        pieceId: d.pieceId,
        candidates: d.candidates.map((c) => ({ pieceId: c.pieceId, weight: c.weight, raw: rawWeight(method, c.pieceId) })),
      };
    }
    out.seeds.push({ seed, mulberry32: first, draws });
  }
  fs.writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`, 'utf8');
  console.log(`golden: wrote ${path.relative(ROOT, OUT).replace(/\\/g, '/')} for seeds ${SEEDS.join(', ')}`);
} catch (err) {
  code = 1;
  console.log(`golden: failed: ${err && err.message ? err.message : String(err)}`);
} finally {
  if (server) await server.close();
}
process.exit(code);
