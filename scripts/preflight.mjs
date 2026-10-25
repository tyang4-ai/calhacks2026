#!/usr/bin/env node
// G0 preflight. Run from the repo root: node scripts/preflight.mjs [--vault <path to resources/tech>]
// Writes artifacts/preflight.md and artifacts/preflight.json. Exits 1 when a blocker fails.
// Never prints a key: .env is checked for presence of names only.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const IS_WIN = process.platform === 'win32';
const results = [];

function add(check, ok, detail, level = 'blocker') {
  const clean = String(detail ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
  results.push({ check, ok: Boolean(ok), detail: clean, level: ok ? 'ok' : level });
}

function run(cmd, timeoutMs = 15000) {
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', timeout: timeoutMs, windowsHide: true });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  return { code: r.status, out, error: r.error };
}

function versionAtLeast(found, wanted) {
  const a = String(found).split('.').map((n) => parseInt(n, 10) || 0);
  const b = String(wanted).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return true;
}

function firstVersion(text) {
  const m = String(text).match(/(\d+\.\d+(?:\.\d+)?)/);
  return m ? m[1] : null;
}

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function answers(url, timeoutMs = 1500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    return r.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

function portFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '127.0.0.1');
  });
}

// 1. Node
const nodeV = process.versions.node;
add('Node 22.12 or later', versionAtLeast(nodeV, '22.12.0'), `node ${nodeV}`);

// 2. npm
{
  const r = run('npm --version');
  add('npm', r.code === 0, r.code === 0 ? `npm ${r.out}` : 'npm not found');
}

// 3. Python 3.12 or later
{
  const tries = IS_WIN ? ['py -3 --version', 'python --version'] : ['python3 --version', 'python --version'];
  let found = null;
  for (const t of tries) {
    const r = run(t);
    const v = r.code === 0 ? firstVersion(r.out) : null;
    if (v) { found = { cmd: t.split(' ')[0], v }; break; }
  }
  add('Python 3.12 or later', found && versionAtLeast(found.v, '3.12'), found ? `${found.cmd} ${found.v}` : 'python not found', 'blocker');
}

// 4. Git, and Git Bash on Windows
{
  const r = run('git --version');
  add('Git', r.code === 0, r.code === 0 ? r.out : 'git not found');
  if (IS_WIN) {
    const candidates = [
      process.env.CLAUDE_CODE_GIT_BASH_PATH,
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Git', 'bin', 'bash.exe'),
    ].filter(Boolean);
    const hit = candidates.find((p) => fs.existsSync(p));
    add('Git Bash (Claude Code runs Bash through it)', Boolean(hit), hit || 'bash.exe not found. Install Git for Windows or set CLAUDE_CODE_GIT_BASH_PATH');
  }
}

// 5. gh signed in
{
  const r = run('gh auth status', 20000);
  add('gh signed in', r.code === 0, r.code === 0 ? 'signed in' : 'run: gh auth login', 'warning');
}

// 6. Claude Code version
{
  const r = run('claude --version', 20000);
  const v = r.code === 0 ? firstVersion(r.out) : null;
  add('Claude Code 2.1.295 or later', v && versionAtLeast(v, '2.1.295'), v ? `claude ${v}` : 'claude not found. Run: claude update', 'blocker');
}

// 7. Playwright Chromium in the user cache
{
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH
    || (IS_WIN ? path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright')
      : process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright')
        : path.join(os.homedir(), '.cache', 'ms-playwright'));
  let hit = null;
  try {
    hit = fs.readdirSync(base).find((d) => /^chromium/.test(d)) || null;
  } catch { /* folder missing */ }
  add('Playwright Chromium downloaded', Boolean(hit), hit ? path.join(base, hit) : `not found in ${base} yet. S1 installs the build that matches its Playwright version`, 'warning');
}

// 8. Ports
for (const [port, level] of [[5173, 'blocker'], [4173, 'blocker'], [8000, 'warning']]) {
  // eslint-disable-next-line no-await-in-loop
  const free = await portFree(port);
  add(`Port ${port} free`, free, free ? 'free' : 'in use. Stop whatever is listening there', level);
}

// 8b. Port 3000, v2's local SpacetimeDB (D2-28). Free, or SpacetimeDB itself answering, is fine.
{
  const free = await portFree(3000);
  const spacetime = free ? false : await answers('http://127.0.0.1:3000/v1/ping');
  add(
    'Port 3000 free or SpacetimeDB',
    free || spacetime,
    free ? 'free (spacetime start --listen-addr 127.0.0.1:3000 uses it)' : spacetime ? 'SpacetimeDB answers on 127.0.0.1:3000' : "in use by something that isn't SpacetimeDB. Stop it",
    'warning',
  );
}

// 9. .env names present (values never read into output). A key counts in .env or in the process
// environment (the cloud's variables), and CINDIA_ANTHROPIC_API_KEY counts for the Anthropic row, as
// server/config.py reads them. Only booleans leave this block: never a value.
const envNames = new Map();
{
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    add('.env present', false, 'missing. Copy C:\\dev\\secrets\\cindia.env to .env. Phase 1 can run without it', 'warning');
  } else {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const v = m[2].replace(/^(["'])(.*)\1$/, '$2').trim();
      envNames.set(m[1], { set: v !== '', proxy: v.toLowerCase() === 'proxy' });
    }
  }
}
/** Where a name is set: '.env', 'environment' or null. */
function envWhere(name) {
  if (envNames.get(name)?.set) return '.env';
  if (typeof process.env[name] === 'string' && process.env[name].trim() !== '') return 'environment';
  return null;
}
/** The first of the names that is set, as "NAME in .env", or null. */
function envFound(names) {
  return names.map((n) => (envWhere(n) ? `${n} in ${envWhere(n)}` : null)).find(Boolean) ?? null;
}
for (const [label, names] of [
  ['ANTHROPIC_API_KEY', ['ANTHROPIC_API_KEY', 'CINDIA_ANTHROPIC_API_KEY']],
  ['NESSIE_KEY', ['NESSIE_KEY']],
]) {
  const found = envFound(names);
  add(
    `${label} set (.env or environment)`,
    Boolean(found),
    found ? `present (${found}, value not shown)` : 'missing or empty in .env and the environment. Upgrades that call it get blocked',
    'warning',
  );
}

// 9b. The v2 names (docs/v2/contracts.md section 1, D2-28), by presence only and as warnings. A name
// counts in .env or in the process environment (the cloud's variables), and the Elastic and Apify
// keys also count with their *_AUTH=proxy flag (cloud only). Values are never read into output.
{
  const proxyFlag = (name) => envNames.get(name)?.proxy || String(process.env[name] ?? '').trim().toLowerCase() === 'proxy';
  const V2_NAMES = [
    { label: 'CINDIA_ANTHROPIC_API_KEY or ANTHROPIC_API_KEY', names: ['CINDIA_ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY'], use: 'every Claude call' },
    { label: 'NESSIE_KEY', names: ['NESSIE_KEY'], use: 'B04 and B16' },
    { label: 'ELASTIC_URL', names: ['ELASTIC_URL'], use: 'B12' },
    { label: 'KIBANA_URL', names: ['KIBANA_URL'], use: 'B12 Agent Builder' },
    { label: 'ELASTIC_API_KEY', names: ['ELASTIC_API_KEY'], proxy: 'ELASTIC_AUTH', use: 'B12' },
    { label: 'APIFY_TOKEN', names: ['APIFY_TOKEN'], proxy: 'APIFY_AUTH', use: 'B15' },
    { label: 'HF_TOKEN', names: ['HF_TOKEN'], use: 'B11 publish and fetch_model.py' },
    { label: 'CINDIA_HF_REPO', names: ['CINDIA_HF_REPO'], use: 'B11 publish and fetch_model.py' },
    { label: 'PUBLIC_SITE_URL', names: ['PUBLIC_SITE_URL'], use: "B15's sandbox market, once the public site is up" },
    { label: 'SPACETIME_TOKEN', names: ['SPACETIME_TOKEN'], use: 'B13, written by save_token.py' },
  ];
  for (const entry of V2_NAMES) {
    const found = envFound(entry.names) ?? (entry.proxy && proxyFlag(entry.proxy) ? `${entry.proxy}=proxy (cloud only)` : null);
    add(`v2 name ${entry.label}`, Boolean(found), found ? `present (${found}, value not shown)` : `missing. Needed by ${entry.use}`, 'warning');
  }
}

// 10. Claude Code should bill the claude.ai plan, not an API key
add(
  'ANTHROPIC_API_KEY not set in the shell',
  !process.env.ANTHROPIC_API_KEY,
  process.env.ANTHROPIC_API_KEY ? 'set. Claude Code may bill that key instead of the claude.ai plan, and Remote Control needs the plan. Unset it and relaunch' : 'not set',
  'warning',
);

// 11. Vault docs readable
{
  const vault = argValue('--vault') || process.env.CINDIA_VAULT_TECH
    || (IS_WIN ? 'B:\\Alioth\\Notes\\Hackathons\\my-entries\\2026-10-cal-hacks-13\\resources\\tech' : null);
  const ok = vault && fs.existsSync(path.join(vault, 'ch13-tech-stack.md'));
  add('Vault tech docs readable', ok, vault ? (ok ? vault : `ch13-tech-stack.md not found in ${vault}`) : 'pass --vault <path>', 'warning');
}

// 12. Clock
{
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' });
  add('Clock on Pacific time', tz === 'America/Los_Angeles', `system zone ${tz}, Pacific now ${now}`, 'warning');
}

// 13. Disk space
try {
  const s = fs.statfsSync(ROOT);
  const gb = (s.bavail * s.bsize) / 1e9;
  add('At least 5 GB free', gb >= 5, `${gb.toFixed(1)} GB free`, 'blocker');
} catch (e) {
  add('At least 5 GB free', false, `could not check: ${e.message}`, 'warning');
}

// 14. .gitignore
{
  const gi = fs.existsSync(path.join(ROOT, '.gitignore')) ? fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8') : '';
  const lines = gi.split(/\r?\n/).map((l) => l.trim());
  add('.gitignore lists .env and artifacts/', lines.includes('.env') && lines.includes('artifacts/'), lines.includes('.env') && lines.includes('artifacts/') ? 'yes' : 'missing entries');
}

// 15. Git remote and branch
{
  const remote = run('git remote get-url origin');
  add('origin is tyang4-ai/calhacks2026', remote.code === 0 && /tyang4-ai\/calhacks2026/.test(remote.out), remote.out || 'no origin', 'warning');
  const branch = run('git branch --show-current');
  add('On branch main', branch.out === 'main', branch.out || 'unknown', 'warning');
  const dirty = run('git status --porcelain');
  add('Working tree clean', dirty.code === 0 && dirty.out === '', dirty.out ? `${dirty.out.split(/\r?\n/).length} changed files` : 'clean', 'warning');
}

// 16. Harness files present
for (const f of ['CLAUDE.md', '.claude/settings.json', '.claude/hooks/edit-guard.mjs', 'docs/harness/runbook.md', 'docs/harness/status.md']) {
  add(`${f} present`, fs.existsSync(path.join(ROOT, f)), fs.existsSync(path.join(ROOT, f)) ? 'yes' : 'missing');
}

// Output
const blockers = results.filter((r) => r.level === 'blocker');
const warnings = results.filter((r) => r.level === 'warning');
const stamp = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
const md = [
  `# Preflight · ${stamp} PT`,
  '',
  `Blockers: ${blockers.length} · Warnings: ${warnings.length} · Checks: ${results.length}`,
  '',
  '| Check | Result | Detail |',
  '|---|---|---|',
  ...results.map((r) => `| ${r.check} | ${r.ok ? 'ok' : r.level.toUpperCase()} | ${r.detail.replace(/\|/g, '/')} |`),
  '',
].join('\n');

fs.mkdirSync(path.join(ROOT, 'artifacts'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'artifacts', 'preflight.md'), md);
fs.writeFileSync(path.join(ROOT, 'artifacts', 'preflight.json'), JSON.stringify({ at: stamp, results }, null, 2));
process.stdout.write(`${md}\nWrote artifacts/preflight.md\n`);
process.exit(blockers.length ? 1 : 0);
