#!/usr/bin/env node
// npm run export:mock: writes src/mock/ as JSON to artifacts/mock/mock.json, for the Python side
// (B11 to B15 read it, api-contract.md). It loads src/mock/index.ts through Vite in middleware mode
// with no HMR, no WebSocket and no file watcher, so it opens no port, then ssrLoadModule.
// mock.json holds one key per export of src/mock/index.ts whose value isn't a function, plus
// _generatedAt. It prints one line per key with its item count, closes Vite and exits 0.
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { ROOT } from './lib/common.mjs';

const ENTRY = '/src/mock/index.ts';
const OUT = path.join(ROOT, 'artifacts', 'mock', 'mock.json');
// The one key mock.json adds beside the exports (conventions.md).
const GENERATED_AT = '_generatedAt';

function itemCount(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value).length;
  return 1;
}

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
  const mod = await server.ssrLoadModule(ENTRY);
  const data = {};
  for (const key of Object.keys(mod)) {
    const value = mod[key];
    if (typeof value === 'function' || value === undefined) continue;
    data[key] = value;
  }
  data[GENERATED_AT] = new Date().toISOString();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  for (const key of Object.keys(data)) {
    if (key === GENERATED_AT) continue;
    const n = itemCount(data[key]);
    console.log(`  ${key}: ${n} ${n === 1 ? 'item' : 'items'}`);
  }
  console.log(`export:mock: ${Object.keys(data).length - 1} exports written to artifacts/mock/mock.json`);
} catch (err) {
  code = 1;
  console.log(`export:mock: failed to load ${ENTRY}: ${err && err.message ? err.message : String(err)}`);
  if (err && err.stack) console.log(err.stack.split('\n').slice(1, 6).join('\n'));
} finally {
  if (server) await server.close();
}
process.exit(code);
