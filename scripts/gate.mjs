#!/usr/bin/env node
// npm run gate -- <G1..G6> [slug]
// Runs the commands definition-of-done.md lists for the gate and writes
// artifacts/gates/<gate>-<HHMM>.md, one evidence line per check. Full output of each check goes
// to artifacts/gates/logs/. Exits 1 on any failed check. The verifier review comes after.
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  countsText,
  expandPattern,
  pacificHHMM,
  pacificStamp,
  plain,
  runCapture,
  testCounts,
  venvPython,
} from './lib/common.mjs';

const args = process.argv.slice(2).filter((a) => a !== '--');
const gate = (args[0] || '').toUpperCase();
const slug = args[1];
const GATES = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];
if (!GATES.includes(gate)) {
  console.log('usage: npm run gate -- <G1|G2|G3|G4|G5|G6> [slug]   (slug: a feature for G3, an upgrade like b04-bank for G5)');
  process.exit(1);
}
if (gate === 'G5' && !slug) {
  console.log('G5 needs the upgrade slug, for example: npm run gate -- G5 b04-bank');
  process.exit(1);
}
if (slug && !/^[a-zA-Z0-9-]+$/.test(slug)) {
  console.log(`bad slug: ${slug}`);
  process.exit(1);
}

const hhmm = pacificHHMM();
const gatesDir = path.join(ROOT, 'artifacts', 'gates');
const logsDir = path.join(gatesDir, 'logs');
fs.mkdirSync(logsDir, { recursive: true });
const reportName = `${gate}-${hhmm}.md`;
const checks = [];
let logN = 0;

function saveLog(label, out) {
  logN += 1;
  const name = `${gate}-${hhmm}-${String(logN).padStart(2, '0')}.log`;
  fs.writeFileSync(path.join(logsDir, name), `$ ${label}\n\n${plain(out)}`);
  return `artifacts/gates/logs/${name}`;
}

function record(label, code, result, out, extra = {}) {
  const ok = extra.ok ?? code === 0;
  const log = out !== undefined ? saveLog(label, out) : null;
  checks.push({ label, code, result, ok, log });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} → exit ${code}, ${result}`);
  return ok;
}

/** Runs an npm script through the shell (npm is a .cmd shim on Windows). */
function npm(script, scriptArgs = [], env = {}) {
  const t0 = Date.now();
  const cmd = ['npm', 'run', script, ...(scriptArgs.length ? ['--', ...scriptArgs] : [])].join(' ');
  const r = runCapture(cmd, [], { shell: true, env });
  return { ...r, cmd, secs: (Date.now() - t0) / 1000 };
}

function lastLine(out, re) {
  const lines = plain(out).split(/\r?\n/).filter((l) => re.test(l));
  return lines.length ? lines[lines.length - 1].trim() : null;
}

function summarize(script, out) {
  if (script === 'check') return lastLine(out, /^check: /) ?? 'see log';
  if (script === 'check:scope') return lastLine(out, /^check:scope: /) ?? 'see log';
  if (script === 'build') return /built in/.test(plain(out)) ? 'built' : 'build failed';
  return countsText(testCounts(out));
}

function runNpm(script, scriptArgs = [], env = {}, labelSuffix = '') {
  const r = npm(script, scriptArgs, env);
  const label = `${r.cmd}${labelSuffix}`;
  return { ok: record(label, r.code, summarize(script, r.out), r.out), r };
}

/** The Playwright-reported duration of a run, in seconds, or the wall time. */
function playwrightSeconds(out, fallback) {
  const m = [...plain(out).matchAll(/\d+ passed \(([\d.]+)(m?s)\)/g)].pop();
  if (!m) return fallback;
  const v = Number(m[1]);
  return m[2] === 'ms' ? v / 1000 : v;
}

function g4(mode) {
  const env = mode === 'live' ? { CINDIA_DEMO_MODE: 'live' } : {};
  const suffix = mode === 'live' ? ' (live mode)' : '';
  const b = runNpm('build', [], {}, suffix);
  if (!b.ok) return false;
  let ok = true;
  for (let i = 1; i <= 3; i++) {
    const r = npm('test:demo', [], { ...env, CINDIA_SKIP_BUILD: '1' });
    const secs = playwrightSeconds(r.out, r.secs);
    const under = secs < 75;
    ok =
      record(
        `${r.cmd}${suffix} run ${i} of 3`,
        r.code,
        `${countsText(testCounts(r.out))}, ${secs.toFixed(1)}s ${under ? 'under' : 'OVER'} 75s`,
        r.out,
        { ok: r.code === 0 && under },
      ) && ok;
  }
  ok = runNpm('test:offline', [], { ...env, CINDIA_SKIP_BUILD: '1' }, suffix).ok && ok;
  return ok;
}

function claudeCommands() {
  const text = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
  const section = text.split(/^## Commands/m)[1]?.split(/^## /m)[0] ?? '';
  const names = new Set();
  for (const line of section.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    for (const m of line.matchAll(/`npm run ([a-z0-9:-]+)/g)) names.add(m[1]);
  }
  return [...names];
}

function nodeCheck(label, file, fileArgs = []) {
  const r = runCapture(process.execPath, [path.join(ROOT, file), ...fileArgs]);
  const summary = lastLine(r.out, /PASS|FAIL|findings|passed|failed/) ?? `exit ${r.code}`;
  return record(label, r.code, summary, r.out);
}

console.log(`gate ${gate}${slug ? ` ${slug}` : ''} · ${pacificStamp()}`);

switch (gate) {
  case 'G1': {
    runNpm('check');
    runNpm('build');
    runNpm('test:smoke');
    nodeCheck('node .claude/hooks/test-hooks.mjs', '.claude/hooks/test-hooks.mjs');
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const wanted = claudeCommands();
    const missing = wanted.filter((n) => !(n in (pkg.scripts || {})));
    record(
      'CLAUDE.md Commands table vs package.json scripts',
      missing.length ? 1 : 0,
      missing.length ? `missing: ${missing.join(', ')}` : `all ${wanted.length} found (${wanted.join(', ')})`,
    );
    break;
  }
  case 'G2':
    runNpm('check:data');
    runNpm('check');
    break;
  case 'G3':
    if (slug) {
      const scopeArgs = [`src/features/${slug}/`, `tests/features/${slug}-*`];
      runNpm('check:scope', scopeArgs);
      runNpm('test:feature', [slug]);
      runNpm('test:smoke');
    } else {
      runNpm('check');
      runNpm('test:smoke');
      runNpm('build');
    }
    break;
  case 'G4':
    g4('scripted');
    break;
  case 'G5': {
    const nn = slug.slice(0, 3).toLowerCase();
    runNpm('test:server');
    const py = venvPython();
    const tests = expandPattern(`tests/server/test_${nn}_*.py`);
    if (!py) record('contract test', 1, 'no .venv found');
    else if (tests.length === 0) record(`contract test tests/server/test_${nn}_*.py`, 1, 'no test file found');
    else {
      const contract = runCapture(py, ['-m', 'pytest', ...tests, '-q', '-m', 'not live']);
      record(`python -m pytest ${tests.join(' ')} -m "not live"`, contract.code, countsText(testCounts(contract.out)), contract.out);
      const live = runCapture(py, ['-m', 'pytest', ...tests, '-q', '-m', 'live']);
      const c = testCounts(live.out);
      // Exit 5 means no live test was collected.
      record(`python -m pytest ${tests.join(' ')} -m live (pre-smoke)`, live.code, `${countsText(c)}${c.skipped ? ' (key missing, live call skipped)' : ''}`, live.out, {
        ok: live.code === 0,
      });
    }
    g4('scripted');
    g4('live');
    break;
  }
  case 'G6': {
    g4('scripted');
    nodeCheck('node scripts/secrets-scan.mjs', 'scripts/secrets-scan.mjs');
    const st = runCapture('git', ['status', '--porcelain']);
    const dirty = plain(st.out).split(/\r?\n/).filter(Boolean);
    record('git status --porcelain', dirty.length ? 1 : st.code, dirty.length ? `${dirty.length} changed files` : 'clean', st.out);
    break;
  }
}

const passed = checks.filter((c) => c.ok).length;
const ok = passed === checks.length;
const lines = [
  `# ${gate}${slug ? ` ${slug}` : ''} gate`,
  '',
  `- When: ${pacificStamp()}`,
  `- Result: ${ok ? 'PASS' : 'FAIL'} (${passed}/${checks.length} checks passed)`,
  `- Command: npm run gate -- ${gate}${slug ? ` ${slug}` : ''}`,
  '',
  '## Checks',
  '',
  '```text',
  ...checks.map((c) => `${c.label} → exit ${c.code}, ${c.result}${c.ok ? '' : ' [FAIL]'}`),
  '```',
  '',
  '## Logs',
  '',
  ...checks.filter((c) => c.log).map((c) => `- ${c.label}: \`${c.log}\``),
  '',
];
if (gate === 'G6') lines.push('Still by hand: the push, and README.md against the Cut and simulated section of status.md.', '');
lines.push('The verifier review follows. The gate passes only when every check passed and the verifier says PASS.', '');
fs.writeFileSync(path.join(gatesDir, reportName), lines.join('\n'));
console.log(`gate ${gate}: ${ok ? 'PASS' : 'FAIL'} (${passed}/${checks.length}) · report artifacts/gates/${reportName}`);
process.exit(ok ? 0 : 1);
