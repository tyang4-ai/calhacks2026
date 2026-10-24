#!/usr/bin/env node
// npm run test:feature -- <slug>
// Runs tests/features/<slug>-*.spec.ts through run-playwright.mjs features (dev server when it answers).
import path from 'node:path';
import { ROOT, expandPattern, runLive } from './lib/common.mjs';

const args = process.argv.slice(2).filter((a) => a !== '--');
const slug = args[0];
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.log('usage: npm run test:feature -- <feature slug>, for example money-map');
  process.exit(1);
}

const specs = expandPattern(`tests/features/${slug}-*.spec.ts`);
if (specs.length === 0) {
  console.log(`test:feature: no tests match tests/features/${slug}-*.spec.ts`);
  process.exit(1);
}
console.log(`test:feature: ${specs.length} spec files for ${slug}: ${specs.join(', ')}`);
const code = await runLive(process.execPath, [path.join(ROOT, 'scripts', 'run-playwright.mjs'), 'features', ...specs, ...args.slice(1)]);
process.exit(code);
