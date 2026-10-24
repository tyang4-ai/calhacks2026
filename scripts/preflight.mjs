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

// 9. .env names present (values never read into output)
{
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    add('.env present', false, 'missing. Copy C:\\dev\\secrets\\cindia.env to .env. Phase 1 can run without it', 'warning');
  } else {
    const names = new Set();
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(\S.*)?$/);
      if (m && m[2] && m[2].trim() !== '') names.add(m[1]);
    }
    for (const key of ['ANTHROPIC_API_KEY', 'NESSIE_KEY']) {
      add(`.env has ${key}`, names.has(key), names.has(key) ? 'present (value not shown)' : 'missing or empty. Upgrades that call it get blocked', 'warning');
    }
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
