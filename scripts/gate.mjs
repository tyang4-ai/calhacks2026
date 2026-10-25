#!/usr/bin/env node
// npm run gate -- <gate> [args]
//   G1, G2, G4, G4v2, G6, G1b, G2b       no args
//   G3 [<slug> ...]                      one or more feature slugs
//   G5 <upgrade slug>                    b01 to b10, as v1
//   G5 <upgrade slug> <spec> [<spec> ...] b11 to b16, with the live feature specs by path
// Gate names work in any case. Runs the commands definition-of-done.md lists for the gate and
// writes artifacts/gates/<gate>-<HHMM>.md (with the gate's own spelling, G1b, G4v2), one evidence
// line per check. Full output of each check goes to artifacts/gates/logs/. Exits 1 on any failed
// check. The verifier review comes after.
//
// The time rule (fix-plan 1.9): after every `npm run test:demo` the gate reads
// artifacts/demo/report.json. It passes when the file was written by this run and its
// endedAtWallMs is at most its durationMs plus 15 seconds. Playwright's whole-run time is recorded
// for information only. R0, core and D-deploy have no entry here: the orchestrator runs their
// commands itself.
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  countsText,
  expandPattern,
  normalizeArg,
  pacificHHMM,
  pacificStamp,
  plain,
  runCapture,
  testCounts,
  tourTimeCheck,
  venvPython,
} from './lib/common.mjs';

const GATES = { G1: 'G1', G1B: 'G1b', G2: 'G2', G2B: 'G2b', G3: 'G3', G4: 'G4', G4V2: 'G4v2', G5: 'G5', G6: 'G6' };
const USAGE = [
  'usage: npm run gate -- <G1|G1b|G2|G2b|G3|G4|G4v2|G5|G6> [args]',
  '  G3 <slug> [<slug> ...]                       feature slugs, for example money-map',
  '  G5 <b01..b10 slug>                           for example b04-bank',
  '  G5 <b11..b16 slug> <spec> [<spec> ...]       for example b14-swarm tests/features/support-live.spec.ts',
].join('\n');

const args = process.argv.slice(2).filter((a) => a !== '--');
const gate = GATES[(args[0] || '').toUpperCase()];
const rest = args.slice(1);
if (!gate) {
  console.log(USAGE);
  process.exit(1);
}

const SLUG_RE = /^[a-z0-9-]+$/;
const UPGRADE_RE = /^b(\d\d)-[a-z0-9-]+$/;
let slugs = [];
let upgrade = null;
let upgradeNumber = 0;
let liveSpecs = [];

if (gate === 'G3') {
  slugs = rest.map((s) => s.toLowerCase());
  const bad = slugs.filter((s) => !SLUG_RE.test(s));
  if (bad.length) {
    console.log(`bad slug: ${bad.join(', ')}`);
    process.exit(1);
  }
} else if (gate === 'G5') {
  upgrade = (rest[0] || '').toLowerCase();
  const m = UPGRADE_RE.exec(upgrade);
  if (!m) {
    console.log(`G5 needs the upgrade slug first, for example: npm run gate -- G5 b04-bank\n${USAGE}`);
    process.exit(1);
  }
  upgradeNumber = Number(m[1]);
  const specArgs = rest.slice(1);
  if (upgradeNumber >= 11) {
    if (specArgs.length === 0) {
      console.log(`G5 for ${upgrade} needs at least one live feature spec by path, for example: npm run gate -- G5 b14-swarm tests/features/support-live.spec.ts`);
      process.exit(1);
    }
    const problems = [];
    for (const a of specArgs) {
      const p = normalizeArg(a);
      if (!p.endsWith('.spec.ts')) problems.push(`${a}: not a path ending in .spec.ts`);
      else if (!fs.existsSync(path.join(ROOT, p))) problems.push(`${a}: no such spec file`);
      else liveSpecs.push(p);
    }
    if (problems.length) {
      console.log(problems.map((p) => `G5: ${p}`).join('\n'));
      process.exit(1);
    }
  } else if (specArgs.length) {
    console.log(`G5 for ${upgrade} (b01 to b10) runs as v1 and takes no spec paths`);
    process.exit(1);
  }
} else if (rest.length) {
  console.log(`${gate} takes no arguments\n${USAGE}`);
  process.exit(1);
}

const gateArgs = gate === 'G3' ? slugs : gate === 'G5' ? [upgrade, ...liveSpecs] : [];
const title = [gate, ...gateArgs].join(' ');
const hhmm = pacificHHMM();
const gatesDir = path.join(ROOT, 'artifacts', 'gates');
const logsDir = path.join(gatesDir, 'logs');
fs.mkdirSync(logsDir, { recursive: true });
const reportName = `${gate}-${hhmm}.md`;
const DEMO_REPORT = path.join(ROOT, 'artifacts', 'demo', 'report.json');
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
  return { ...r, cmd, startedAt: t0, secs: (Date.now() - t0) / 1000 };
}

function lastLine(out, re) {
  const lines = plain(out).split(/\r?\n/).filter((l) => re.test(l));
  return lines.length ? lines[lines.length - 1].trim() : null;
}

function summarize(script, out) {
  if (script === 'check') return lastLine(out, /^check: /) ?? 'see log';
  if (script === 'check:scope') return lastLine(out, /^check:scope: /) ?? 'see log';
  if (script === 'build') return /built in/.test(plain(out)) ? 'built' : 'build failed';
  if (script === 'art') return lastLine(out, /^art/) ?? lastLine(out, /\S/) ?? 'see log';
  return countsText(testCounts(out));
}

function runNpm(script, scriptArgs = [], env = {}, labelSuffix = '') {
  const r = npm(script, scriptArgs, env);
  const label = `${r.cmd}${labelSuffix}`;
  return { ok: record(label, r.code, summarize(script, r.out), r.out), r };
}

/** The Playwright-reported duration of a run, in seconds, or the wall time. */
function playwrightSeconds(out, fallback) {
  // Playwright prints the run time as "(850ms)", "(58.2s)", "(1.0m)" or "(1.1h)".
  const m = [...plain(out).matchAll(/\d+ passed \(([\d.]+)(ms|s|m|h)\)/g)].pop();
  if (!m) return fallback;
  const v = Number(m[1]);
  const perUnit = { ms: 0.001, s: 1, m: 60, h: 3600 };
  return v * perUnit[m[2]];
}

function demoEnv(mode, source) {
  return mode === 'live' ? { CINDIA_DEMO_MODE: 'live', ...(source ? { CINDIA_DEMO_UPGRADE: source } : {}) } : {};
}

/**
 * One `npm run test:demo` on the dist/ already built, judged by its exit code and the time rule
 * from report.json. Playwright's whole-run time is shown for information only.
 */
function demoRun(env, label) {
  const r = npm('test:demo', [], { ...env, CINDIA_SKIP_BUILD: '1' });
  const t = tourTimeCheck(DEMO_REPORT, r.startedAt);
  const pw = playwrightSeconds(r.out, r.secs);
  return record(
    `${r.cmd}${label}`,
    r.code,
    `${countsText(testCounts(r.out))}, ${t.text}; Playwright run ${pw.toFixed(1)}s (information only)`,
    r.out,
    { ok: r.code === 0 && t.ok },
  );
}

/**
 * Builds, plays the demo `runs` times, then the offline run. In live mode the harness asserts
 * that every source key with a healthy adapter played live, and `source` (G5's slug, a source key
 * like b01-match) must be one of them.
 */
function demoGate(mode, runs, source) {
  const env = demoEnv(mode, source);
  const suffix = mode === 'live' ? ' (live mode)' : '';
  const b = runNpm('build', [], {}, suffix);
  if (!b.ok) return false;
  let ok = true;
  for (let i = 1; i <= runs; i++) {
    ok = demoRun(env, `${suffix}${runs > 1 ? ` run ${i} of ${runs}` : ''}`) && ok;
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

/** The upgrade's contract tests (not live) and its live test, as v1 runs them. */
function serverTests(nn) {
  const py = venvPython();
  const tests = expandPattern(`tests/server/test_${nn}_*.py`);
  if (!py) return record('contract test', 1, 'no .venv found');
  if (tests.length === 0) return record(`contract test tests/server/test_${nn}_*.py`, 1, 'no test file found');
  const contract = runCapture(py, ['-m', 'pytest', ...tests, '-q', '-m', 'not live']);
  const a = record(`python -m pytest ${tests.join(' ')} -m "not live"`, contract.code, countsText(testCounts(contract.out)), contract.out);
  const live = runCapture(py, ['-m', 'pytest', ...tests, '-q', '-m', 'live']);
  const c = testCounts(live.out);
  // Exit 5 means no live test was collected.
  const b = record(
    `python -m pytest ${tests.join(' ')} -m live (pre-smoke)`,
    live.code,
    `${countsText(c)}${c.skipped ? ' (key missing, live call skipped)' : ''}`,
    live.out,
    { ok: live.code === 0 },
  );
  return a && b;
}

console.log(`gate ${title} · ${pacificStamp()}`);

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
  case 'G1b':
    runNpm('check');
    runNpm('test:smoke');
    // test:demo once on the Phase A mapping, then the offline run.
    demoGate('scripted', 1);
    break;
  case 'G2':
    runNpm('check:data');
    runNpm('check');
    break;
  case 'G2b':
    // Never a whole-repo check while other V1 agents are mid-edit (B1-19).
    runNpm('check:data');
    runNpm('check:scope', ['src/mock/', 'tests/data/', 'src/sources/']);
    runNpm('art', ['--check']);
    break;
  case 'G3':
    if (slugs.length) {
      const scopeArgs = slugs.flatMap((s) => [`src/features/${s}/`, `tests/features/${s}-*`]);
      runNpm('check:scope', scopeArgs);
      runNpm('test:feature', slugs);
      runNpm('test:smoke');
    } else {
      runNpm('check');
      runNpm('test:smoke');
      runNpm('build');
    }
    break;
  case 'G4':
  case 'G4v2':
    demoGate('scripted', 3);
    break;
  case 'G5': {
    const nn = upgrade.slice(0, 3);
    runNpm('test:server');
    serverTests(nn);
    if (upgradeNumber <= 10) {
      // v1's G5, on whatever timeline is current, with the time rule.
      demoGate('scripted', 3);
      demoGate('live', 3, upgrade);
    } else {
      // v2's G5 (fix-plan 1.4): the live feature specs, then the scripted tour with the source live.
      for (const spec of liveSpecs) runNpm('test:feature', [spec]);
      demoGate('live', 1, upgrade);
    }
    break;
  }
  case 'G6': {
    demoGate('scripted', 3);
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
  `# ${title} gate`,
  '',
  `- When: ${pacificStamp()}`,
  `- Result: ${ok ? 'PASS' : 'FAIL'} (${passed}/${checks.length} checks passed)`,
  `- Command: npm run gate -- ${title}`,
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
if (checks.some((c) => c.label.includes('test:demo')))
  lines.push(
    'Each test:demo line is judged by its exit code and the tour time from `artifacts/demo/report.json` (written by that run, `endedAtWallMs` at most `durationMs` plus 15 s). The Playwright run time is for information only.',
    '',
  );
if (gate === 'G6') lines.push('Still by hand: the push, and README.md against the Cut and simulated section of status.md.', '');
lines.push('The verifier review follows. The gate passes only when every check passed and the verifier says PASS.', '');
fs.writeFileSync(path.join(gatesDir, reportName), lines.join('\n'));
console.log(`gate ${gate}: ${ok ? 'PASS' : 'FAIL'} (${passed}/${checks.length}) · report artifacts/gates/${reportName}`);
process.exit(ok ? 0 : 1);
