#!/usr/bin/env node
// npm run check:scope -- <path> [<path> ...]
// The same steps as npm run check, reporting only problems in the files or folders given.
// It expands `*` itself, since cmd.exe doesn't. A path that doesn't exist yet counts as no files
// and gets a note, not an error.
import {
  countsText,
  expandPattern,
  filesUnder,
  inScope,
  normalizeArg,
  plain,
  runCapture,
  runTool,
  testCounts,
  venvPython,
} from './lib/common.mjs';

const args = process.argv.slice(2).filter((a) => a !== '--');
if (args.length === 0) {
  console.log('usage: npm run check:scope -- <file or folder or glob> [...]');
  process.exit(1);
}

const scopes = [];
const notes = [];
for (const a of args) {
  const hits = expandPattern(a);
  if (hits.length === 0) notes.push(`note: ${normalizeArg(a)} matches no files yet`);
  scopes.push(...hits);
}
const files = [...new Set(scopes.flatMap(filesUnder))];
const CODE = /\.(ts|tsx|mts|js|jsx|mjs)$/;
const codeFiles = files.filter((f) => CODE.test(f));
const pyFiles = files.filter((f) => f.endsWith('.py'));
const unitTests = codeFiles.filter((f) => /\.test\.(ts|tsx)$/.test(f));
const sources = codeFiles.filter((f) => !/\.(test|spec)\.(ts|tsx)$/.test(f));
const touchesMock = scopes.some((s) => s === 'src/mock' || s.startsWith('src/mock/'));

for (const n of notes) console.log(n);
console.log(`scope: ${scopes.length ? scopes.join(', ') : '(nothing yet)'} · ${files.length} files`);

const results = [];
function report(name, ok, summary, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(10)} ${summary}`);
  if (!ok && detail.trim()) {
    const t = plain(detail).trimEnd();
    console.log((t.length > 12000 ? `...\n${t.slice(-12000)}` : t).replace(/^/gm, '      '));
  }
}

// 1. TypeScript diagnostics for the whole program, filtered to files in scope.
if (codeFiles.some((f) => /\.(ts|tsx|mts)$/.test(f))) {
  const r = runTool('tsc', ['-b', '--pretty', 'false']);
  const blocks = [];
  let cur = null;
  for (const line of plain(r.out).split(/\r?\n/)) {
    const m = /^(.+?)\(\d+,\d+\): error TS\d+/.exec(line);
    if (m) {
      cur = { file: normalizeArg(m[1]), lines: [line] };
      blocks.push(cur);
    } else if (cur && /^\s/.test(line)) cur.lines.push(line);
    else cur = null;
  }
  const mine = blocks.filter((b) => inScope(b.file, scopes));
  const others = blocks.length - mine.length;
  report(
    'types',
    mine.length === 0,
    `tsc: ${mine.length} errors in scope${others ? ` (${others} elsewhere, not reported)` : ''}`,
    mine.map((b) => b.lines.join('\n')).join('\n'),
  );
} else report('types', true, 'tsc: no TypeScript files in scope');

// 2. oxlint on the files in scope.
if (codeFiles.length) {
  const r = runTool('oxlint', ['--format', 'default', ...codeFiles]);
  const m = /Found (\d+) warnings? and (\d+) errors?/.exec(plain(r.out));
  report('lint', r.code === 0, m ? `oxlint: ${m[2]} errors, ${m[1]} warnings` : `oxlint: exit ${r.code}`, r.out);
} else report('lint', true, 'oxlint: no code files in scope');

// 3. The Vitest tests in scope, and the tests related to the source files in scope.
if (sources.length || unitTests.length) {
  const r = runTool('vitest', ['related', '--run', '--passWithNoTests', ...sources, ...unitTests]);
  report('unit', r.code === 0, `vitest related: ${countsText(testCounts(r.out))}`, r.code === 0 ? '' : r.out);
} else report('unit', true, 'vitest: no unit-testable files in scope');

// 4. Timeline validation when a path is under src/mock/.
if (touchesMock) {
  const r = runTool('vitest', ['run', 'src/sources/timelines.validate.test.ts']);
  report('timelines', r.code === 0, `event schema: ${countsText(testCounts(r.out))}`, r.code === 0 ? '' : r.out);
}

// 5. Python files compile.
if (pyFiles.length) {
  const py = venvPython();
  if (!py) report('python', false, 'no .venv found: create it with py -3 -m venv .venv');
  else {
    const r = runCapture(py, ['-m', 'py_compile', ...pyFiles]);
    report('python', r.code === 0, `py_compile: ${pyFiles.length} files${r.code === 0 ? ', ok' : ', errors'}`, r.out);
  }
}

const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `check:scope: FAIL (${failed.map((f) => f.name).join(', ')})` : `check:scope: PASS (${results.length} steps)`);
process.exit(failed.length ? 1 : 0);
