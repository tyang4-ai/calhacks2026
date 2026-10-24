#!/usr/bin/env node
// npm run check: type check, lint, unit tests and event-schema validation for the whole repo.
// Prints one summary line per step and exits 1 if any step fails.
import { countsText, plain, runTool, testCounts } from './lib/common.mjs';

const TIMELINE_TEST = 'src/sources/timelines.validate.test.ts';
const verbose = process.argv.includes('--verbose');
const results = [];

function step(name, fn) {
  const t0 = Date.now();
  const { ok, summary, out } = fn();
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(10)} ${summary} (${secs}s)`);
  if ((!ok || verbose) && out.trim()) {
    const text = plain(out).trimEnd();
    const tail = text.length > 12000 ? `...\n${text.slice(-12000)}` : text;
    console.log(tail.replace(/^/gm, '      '));
  }
}

step('types', () => {
  const r = runTool('tsc', ['-b', '--pretty', 'false']);
  const errors = (plain(r.out).match(/error TS\d+/g) || []).length;
  return { ok: r.code === 0, summary: `tsc -b: ${errors} errors`, out: r.out };
});

step('lint', () => {
  const r = runTool('oxlint', ['--format', 'default']);
  const m = /Found (\d+) warnings? and (\d+) errors?/.exec(plain(r.out));
  const summary = m ? `oxlint: ${m[2]} errors, ${m[1]} warnings` : `oxlint: exit ${r.code}`;
  return { ok: r.code === 0, summary, out: r.code === 0 && !verbose ? '' : r.out };
});

step('unit', () => {
  const r = runTool('vitest', ['run', '--exclude', TIMELINE_TEST]);
  return { ok: r.code === 0, summary: `vitest: ${countsText(testCounts(r.out))}`, out: r.code === 0 ? '' : r.out };
});

step('timelines', () => {
  const r = runTool('vitest', ['run', TIMELINE_TEST]);
  return { ok: r.code === 0, summary: `event schema: ${countsText(testCounts(r.out))}`, out: r.code === 0 ? '' : r.out };
});

const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `check: FAIL (${failed.map((f) => f.name).join(', ')})` : `check: PASS (${results.length} steps)`);
process.exit(failed.length ? 1 : 0);
