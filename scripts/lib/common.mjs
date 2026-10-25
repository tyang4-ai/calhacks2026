// Shared helpers for the check, gate and test scripts. Node only, so they behave the same in
// cmd.exe, PowerShell and Git Bash.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const IS_WIN = process.platform === 'win32';

/** The JS entry of each tool, run with this Node, so no shell or .cmd shim is involved. */
export const BIN = {
  tsc: path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'),
  oxlint: path.join(ROOT, 'node_modules', 'oxlint', 'bin', 'oxlint'),
  vitest: path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'),
  vite: path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'),
  playwright: path.join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js'),
};

/** Runs a tool with this Node and captures its output. Never throws. */
export function runTool(tool, args, opts = {}) {
  return runCapture(process.execPath, [BIN[tool], ...args], opts);
}

/** Runs a command, capturing stdout and stderr together. Never throws. */
export function runCapture(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', ...opts.env },
    shell: opts.shell || false,
    timeout: opts.timeout,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  return { code: r.status ?? (r.error ? 1 : 0), out, error: r.error };
}

/** Runs a command with live output, resolving to its exit code. */
export function runLive(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      stdio: opts.stdio || 'inherit',
      env: { ...process.env, ...opts.env },
      shell: opts.shell || false,
    });
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

/** Repo-relative path with forward slashes. */
export function rel(p) {
  return path.relative(ROOT, path.resolve(ROOT, p)).split(path.sep).join('/');
}

/** Strips ANSI color codes. */
export function plain(s) {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\u001b\[[0-9;]*m/g, '');
}

/** The .venv Python, or null when .venv doesn't exist. */
export function venvPython() {
  const p = IS_WIN ? path.join(ROOT, '.venv', 'Scripts', 'python.exe') : path.join(ROOT, '.venv', 'bin', 'python');
  return fs.existsSync(p) ? p : null;
}

/** HHMM on the Pacific clock. */
export function pacificHHMM(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === 'hour').value.replace('24', '00');
  const m = parts.find((p) => p.type === 'minute').value;
  return `${h}${m}`;
}

/** "2026-10-24 02:30 PT". */
export function pacificStamp(d = new Date()) {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${s.replace(',', '')} PT`;
}

/** Turns "/c/dev/x" (Git Bash) and backslashes into a repo-relative forward-slash path. */
export function normalizeArg(arg) {
  let a = arg.replace(/\\/g, '/');
  const m = /^\/([a-zA-Z])\/(.*)$/.exec(a);
  if (m && IS_WIN) a = `${m[1]}:/${m[2]}`;
  if (path.isAbsolute(a)) a = rel(a);
  a = a.replace(/^\.\//, '');
  return a;
}

function segmentRegex(seg) {
  const esc = seg.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  return new RegExp(`^${esc}$`, IS_WIN ? 'i' : '');
}

/** Expands one path or pattern (with `*` inside a segment) to the existing repo-relative paths. */
export function expandPattern(pattern) {
  const p = normalizeArg(pattern).replace(/\/+$/, '');
  if (!p.includes('*') && !p.includes('?')) return fs.existsSync(path.join(ROOT, p)) ? [p] : [];
  const segs = p.split('/');
  let current = [''];
  for (const seg of segs) {
    const next = [];
    for (const base of current) {
      const dir = path.join(ROOT, base);
      if (!seg.includes('*') && !seg.includes('?')) {
        const cand = base ? `${base}/${seg}` : seg;
        if (fs.existsSync(path.join(ROOT, cand))) next.push(cand);
        continue;
      }
      let entries = [];
      try {
        entries = fs.readdirSync(dir);
      } catch {
        continue;
      }
      const re = segmentRegex(seg);
      for (const e of entries) if (re.test(e)) next.push(base ? `${base}/${e}` : e);
    }
    current = next;
  }
  return current;
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.venv', '__pycache__', 'test-results', 'artifacts', '.pytest_cache']);

/** Every file under a repo-relative path (the path itself when it's a file). */
export function filesUnder(p) {
  const full = path.join(ROOT, p);
  let st;
  try {
    st = fs.statSync(full);
  } catch {
    return [];
  }
  if (st.isFile()) return [p];
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      if (SKIP_DIRS.has(e.name)) continue;
      const child = `${d}/${e.name}`;
      if (e.isDirectory()) walk(child);
      else out.push(child);
    }
  };
  walk(p);
  return out;
}

/** Is a repo-relative file inside one of the scope paths (folders or files)? */
export function inScope(file, scopes) {
  const f = IS_WIN ? file.toLowerCase() : file;
  return scopes.some((s) => {
    const sc = IS_WIN ? s.toLowerCase() : s;
    return f === sc || f.startsWith(`${sc}/`);
  });
}

/** Finds the first "N passed", "N failed" and similar counts in test output. */
export function testCounts(out) {
  const text = plain(out);
  const pick = (re) => {
    const all = [...text.matchAll(re)];
    return all.length ? Number(all[all.length - 1][1]) : null;
  };
  return {
    passed: pick(/(\d+) passed/g),
    failed: pick(/(\d+) failed/g),
    skipped: pick(/(\d+) skipped/g),
    flaky: pick(/(\d+) flaky/g),
  };
}

/** How far past the timeline's own length the tour test may end, in ms (definition-of-done.md). */
export const TOUR_MARGIN_MS = 15000;

/**
 * The gate's time rule (fix-plan 1.9): the tour test alone, from the demo harness's report.json.
 * It passes when the file was written at or after `startedAtMs` (this run) and its `endedAtWallMs`
 * is at most its `durationMs` plus TOUR_MARGIN_MS. Never throws.
 */
export function tourTimeCheck(file, startedAtMs) {
  const shown = rel(file);
  let st;
  try {
    st = fs.statSync(file);
  } catch {
    return { ok: false, text: `no ${shown}` };
  }
  if (st.mtimeMs < startedAtMs) return { ok: false, text: `${shown} is older than this run` };
  let report;
  try {
    report = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return { ok: false, text: `${shown} isn't valid JSON` };
  }
  const ended = report?.endedAtWallMs;
  const duration = report?.durationMs;
  if (typeof ended !== 'number' || !Number.isFinite(ended)) return { ok: false, text: `${shown} has no endedAtWallMs` };
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) return { ok: false, text: `${shown} has no durationMs` };
  const limit = duration + TOUR_MARGIN_MS;
  const ok = ended <= limit;
  return {
    ok,
    endedAtWallMs: ended,
    durationMs: duration,
    text: `tour ${(ended / 1000).toFixed(1)}s ${ok ? 'within' : 'OVER'} ${(limit / 1000).toFixed(1)}s (durationMs ${duration} + ${TOUR_MARGIN_MS / 1000} s)`,
  };
}

export function countsText(c) {
  const parts = [];
  if (c.passed !== null) parts.push(`${c.passed} passed`);
  parts.push(`${c.failed ?? 0} failed`);
  if (c.skipped) parts.push(`${c.skipped} skipped`);
  if (c.flaky) parts.push(`${c.flaky} flaky`);
  return parts.join(', ');
}
