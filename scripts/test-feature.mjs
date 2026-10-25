#!/usr/bin/env node
// npm run test:feature -- <slug or spec> [<slug or spec> ...] [playwright args]
// Runs feature specs through run-playwright.mjs features (dev server when it answers).
// - An argument ending in .spec.ts runs that one file, such as tests/features/support-live.spec.ts.
// - Any other argument is a feature slug and expands to tests/features/<slug>-*.spec.ts. A bare
//   spec name like support-live is a slug too, so it matches nothing and the script exits 1.
// - The first argument starting with "-" and everything after it go to Playwright as they are.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, expandPattern, normalizeArg, runLive } from './lib/common.mjs';

const args = process.argv.slice(2).filter((a) => a !== '--');
const firstFlag = args.findIndex((a) => a.startsWith('-'));
const targets = firstFlag === -1 ? args : args.slice(0, firstFlag);
const passThrough = firstFlag === -1 ? [] : args.slice(firstFlag);

if (targets.length === 0) {
  console.log('usage: npm run test:feature -- <feature slug or spec path> [...], for example money-map or tests/features/support-live.spec.ts');
  process.exit(1);
}

const specs = [];
const problems = [];
for (const arg of targets) {
  if (arg.endsWith('.spec.ts')) {
    const p = normalizeArg(arg);
    if (fs.existsSync(path.join(ROOT, p)) && fs.statSync(path.join(ROOT, p)).isFile()) specs.push(p);
    else problems.push(`${arg}: no such spec file`);
    continue;
  }
  if (!/^[a-z0-9-]+$/.test(arg)) {
    problems.push(`${arg}: not a feature slug (lowercase letters, digits and dashes) or a path ending in .spec.ts`);
    continue;
  }
  const found = expandPattern(`tests/features/${arg}-*.spec.ts`);
  if (found.length === 0) problems.push(`${arg}: no tests match tests/features/${arg}-*.spec.ts`);
  specs.push(...found);
}

if (problems.length) {
  for (const p of problems) console.log(`test:feature: ${p}`);
  process.exit(1);
}

const unique = [...new Set(specs)];
console.log(`test:feature: ${unique.length} spec files for ${targets.join(', ')}: ${unique.join(', ')}`);
const code = await runLive(process.execPath, [path.join(ROOT, 'scripts', 'run-playwright.mjs'), 'features', ...unique, ...passThrough]);
process.exit(code);
