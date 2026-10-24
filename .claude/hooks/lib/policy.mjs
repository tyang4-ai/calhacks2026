// Shared logic for the harness hooks. Node 22, ESM, no dependencies.
// Every hook fails open: an internal error is logged and the hook exits 0.
// The real policy lives here so the edit guard and the command guard agree.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------- input

export async function readInput(timeoutMs = 5000) {
  const chunks = [];
  const reading = (async () => {
    for await (const chunk of process.stdin) chunks.push(chunk);
  })();
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  await Promise.race([reading, timeout]);
  clearTimeout(timer);
  try {
    process.stdin.destroy();
  } catch {
    // ignore
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

// Wraps a hook body. The body returns an object to print as JSON, or null.
export async function runHook(name, body) {
  let input = {};
  try {
    input = await readInput();
    const out = await body(input);
    if (out) process.stdout.write(JSON.stringify(out));
  } catch (err) {
    try {
      logError(name, input, err);
    } catch {
      // nothing left to do
    }
  }
  process.exitCode = 0;
}

// ---------------------------------------------------------------- paths

export function expandHome(p) {
  if (typeof p !== 'string') return p;
  if (p === '~') return os.homedir();
  if (p.startsWith('~/') || p.startsWith('~\\')) return path.join(os.homedir(), p.slice(2));
  return p;
}

export function hasDrive(p) {
  return /^[a-z]:(\/|$)/i.test(p || '');
}

export function isAbsNorm(p) {
  return typeof p === 'string' && (p.startsWith('/') || hasDrive(p));
}

// Backslashes to "/", lowercase drive letter, "." and ".." resolved by hand.
// Works on Windows-style input even when the hook runs on Linux.
export function normPath(input) {
  if (input === undefined || input === null) return '';
  let s = String(input).trim().replace(/\\/g, '/');
  let drive = '';
  const m = s.match(/^([A-Za-z]):(\/|$)/);
  if (m) {
    drive = `${m[1].toLowerCase()}:`;
    s = s.slice(2);
  }
  const isAbs = drive !== '' || s.startsWith('/');
  const parts = [];
  for (const seg of s.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (parts.length && parts[parts.length - 1] !== '..') parts.pop();
      else if (!isAbs) parts.push('..');
      continue;
    }
    parts.push(seg);
  }
  const body = parts.join('/');
  if (drive) return `${drive}/${body}`;
  if (isAbs) return `/${body}`;
  return body;
}

// Git Bash spells C:\dev as /c/dev. When the reference path has a drive letter, map the
// Git Bash form back to the drive form, so both spellings land on the same repo path.
// "/tmp/..." and other multi-letter first segments stay as they are (outside the repo).
export function fromGitBash(p, ref) {
  if (typeof p !== 'string' || !hasDrive(normPath(expandHome(ref || '')))) return p;
  const m = p.replace(/\\/g, '/').match(/^\/([a-zA-Z])(\/.*)?$/);
  if (!m) return p;
  return `${m[1].toLowerCase()}:${m[2] || '/'}`;
}

// Resolve a possibly relative path against a base, both normalized.
export function toAbs(p, base) {
  const b = normPath(expandHome(base));
  const n = normPath(fromGitBash(expandHome(p), b));
  if (isAbsNorm(n)) return n;
  return normPath(`${b}/${n}`);
}

export function caseInsensitive(...paths) {
  return process.platform === 'win32' || paths.some((p) => hasDrive(p));
}

// Is abs inside root? Returns the repo-relative path (original case) or null.
export function relTo(root, abs) {
  const r = normPath(root);
  const a = normPath(abs);
  const ci = caseInsensitive(r, a);
  const rc = ci ? r.toLowerCase() : r;
  const ac = ci ? a.toLowerCase() : a;
  if (ac === rc) return '';
  const prefix = rc.endsWith('/') ? rc : `${rc}/`;
  if (ac.startsWith(prefix)) return a.slice(prefix.length);
  return null;
}

export function isUnder(abs, dir) {
  if (!dir) return false;
  return relTo(dir, abs) !== null;
}

// ---------------------------------------------------------------- globs

const reCache = new Map();

// "**" spans segments, "*" stays inside one segment, "**/" may match nothing.
export function globToRegex(glob, ci) {
  const key = `${ci ? 'i' : 's'}:${glob}`;
  if (reCache.has(key)) return reCache.get(key);
  let re = '';
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i += 1;
        if (glob[i + 1] === '/') {
          i += 1;
          re += '(?:.*/)?';
        } else {
          re += '.*';
        }
      } else {
        re += '[^/]*';
      }
    } else if ('\\^$+?.()|{}[]'.includes(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  const out = new RegExp(`^${re}$`, ci ? 'i' : '');
  reCache.set(key, out);
  return out;
}

export function matchAny(globs, rel, ci) {
  return globs.some((g) => globToRegex(g, ci).test(rel));
}

// ---------------------------------------------------------------- roles

export const SHARED_CODE = ['src/app/**', 'src/core/**', 'src/ui/**', 'src/sources/**', 'src/*'];
export const ROOT_CONFIG = [
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'vitest.config.ts',
  'tsconfig*.json',
  'eslint.config.js',
  '.oxlintrc.json',
  '.prettierrc',
  '.prettierrc.json',
  '.prettierignore',
  'playwright.config.ts',
  'index.html',
  'requirements.txt',
];
const LIVE = 'src/sources/live/**';

// The backend skeleton S1 creates. Shared code once SHARED_LOCK is on.
export const SERVER_SKELETON = [
  'server/*.py',
  'server/requirements.txt',
  'server/routers/__init__.py',
  'tests/server/conftest.py',
  'tests/server/__init__.py',
];

export const ROLES = {
  scaffolder: {
    include: [...SHARED_CODE, ...ROOT_CONFIG, ...SERVER_SKELETON, 'scripts/**', 'tests/smoke/**', 'tests/demo/**', 'tests/offline/**', 'public/**'],
    exclude: [LIVE],
    lockable: true,
  },
  'data-smith': { include: ['src/mock/**', 'tests/data/**'] },
  'feature-lead': { include: ['src/features/**', 'tests/features/**'] },
  builder: { include: ['src/features/**', 'tests/features/**', 'server/**', LIVE, 'tests/server/**'] },
  verifier: { include: [] },
  integrator: {
    include: [...SHARED_CODE, ...ROOT_CONFIG, ...SERVER_SKELETON, 'docs/common/**', 'scripts/**', 'tests/smoke/**', 'tests/demo/**', 'tests/offline/**', 'public/**'],
    exclude: [LIVE],
  },
  'backend-builder': { include: ['server/**', LIVE, 'tests/server/**'] },
  scribe: { include: ['README.md', 'docs/devpost/**', 'sponsors/**'] },
};

export const ROLE_NAMES = Object.keys(ROLES);
export const INSTALLERS = new Set(['scaffolder', 'integrator']);

// Never writable by a subagent, at any depth where it matters.
export const ALWAYS_DENY = [
  '**/.env',
  '**/.env.*',
  '.git',
  '.git/**',
  '**/.claude',
  '**/.claude/**',
  '**/CLAUDE.md',
  '**/CLAUDE.local.md',
  '.gitignore',
  '.gitattributes',
  'docs/harness/**',
  'docs/plans/**',
  'docs/spec/**',
  'node_modules/**',
];

export const ALWAYS_ALLOW = ['artifacts/**'];

export function inArea(spec, rel, ci) {
  if (!spec || !spec.include.length) return false;
  if (!matchAny(spec.include, rel, ci)) return false;
  if (spec.exclude && matchAny(spec.exclude, rel, ci)) return false;
  return true;
}

// A key file: .env or .env.<x>. ".env.example" holds names only.
export function isEnvFileName(name) {
  const base = String(name).replace(/\\/g, '/').split('/').pop();
  if (!/^\.env(\..+)?$/i.test(base)) return false;
  return base.toLowerCase() !== '.env.example';
}

// ---------------------------------------------------------------- status

export function readStatus(rootRaw) {
  const status = { STAGE: '', NEXT: '', SHARED_LOCK: 'off', STOP_CHECK: 'on', GUARDS: 'on', UPDATED: '', found: false };
  try {
    const file = path.join(rootRaw, 'docs', 'harness', 'status.md');
    if (!fs.existsSync(file)) return status;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).slice(0, 40);
    for (const line of lines) {
      const m = line.match(/^(STAGE|NEXT|SHARED_LOCK|STOP_CHECK|GUARDS|UPDATED):\s*(.*?)\s*$/);
      if (m) {
        status[m[1]] = ['SHARED_LOCK', 'STOP_CHECK', 'GUARDS'].includes(m[1]) ? m[2].toLowerCase() : m[2];
        status.found = true;
      }
    }
  } catch {
    // defaults stand
  }
  return status;
}

// GUARDS: off in status.md turns the edit guard, the command guard and the stop check off.
// It replaces disableAllHooks, which would also turn off /goal.
export function guardsOff(ctx) {
  return ctx.status.GUARDS === 'off';
}

// ---------------------------------------------------------------- scope

function existsFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function searchFile(dir, names, depth) {
  if (depth < 0) return null;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const e of entries) {
    if (e.isFile() && names.includes(e.name)) return path.join(dir, e.name);
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      const hit = searchFile(path.join(dir, e.name), names, depth - 1);
      if (hit) return hit;
    }
  }
  return null;
}

export function findSubagentTranscript(input) {
  const direct = input.agent_transcript_path ? expandHome(input.agent_transcript_path) : null;
  if (direct && existsFile(direct)) return direct;
  const main = input.transcript_path ? expandHome(input.transcript_path) : null;
  const id = input.agent_id ? String(input.agent_id) : '';
  if (!main || !id) return null;
  const base = main.replace(/\.jsonl$/i, '');
  const names = [];
  if (id.startsWith('agent-')) names.push(`${id}.jsonl`, `agent-${id}.jsonl`);
  else names.push(`agent-${id}.jsonl`, `${id}.jsonl`);
  for (const n of names) {
    const candidate = path.join(base, 'subagents', n);
    if (existsFile(candidate)) return candidate;
  }
  return searchFile(base, names, 3);
}

// Text of the first user message in a transcript: the delegation message.
export function readDelegation(file) {
  if (!file) return null;
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    // The delegation message is the first record, so 1 MB is plenty.
    const size = Math.min(fs.fstatSync(fd).size, 1024 * 1024);
    const buf = Buffer.alloc(size);
    fs.readSync(fd, buf, 0, size, 0);
    const lines = buf.toString('utf8').split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      let rec;
      try {
        rec = JSON.parse(line);
      } catch {
        continue;
      }
      if (rec.type !== 'user' || !rec.message) continue;
      const content = rec.message.content;
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content
          .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
          .map((part) => part.text)
          .join('\n');
      }
      return null;
    }
  } catch {
    return null;
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // ignore
      }
    }
  }
  return null;
}

function cleanEntry(s) {
  return s.trim().replace(/^[`'"]+|[`'"]+$/g, '').replace(/\\/g, '/').replace(/^\.\//, '');
}

// The SCOPE line never reaches past its own line break. A bare "SCOPE:" may be followed by a
// "- path" list instead, which is read until the first line that isn't a list item.
export function parseScope(text) {
  if (!text) return null;
  const one = text.match(/^[ \t]*SCOPE:[ \t]*(\S.*)$/m);
  if (one) return one[1].split(',').map(cleanEntry).filter(Boolean);
  const lines = text.split(/\r?\n/);
  const idx = lines.findIndex((l) => /^[ \t]*SCOPE:[ \t]*$/.test(l));
  if (idx < 0) return null;
  const out = [];
  for (let i = idx + 1; i < lines.length; i += 1) {
    const m = lines[i].match(/^[ \t]*[-*][ \t]+(.+)$/);
    if (!m) break;
    out.push(...m[1].split(',').map(cleanEntry).filter(Boolean));
  }
  return out.length ? out : null;
}

// A SCOPE entry becomes a glob. "dir/" covers the folder.
export function scopeToGlob(entry) {
  return entry.endsWith('/') ? `${entry}**` : entry;
}

// A sample path for an entry, used to test whether the entry sits in the role area.
function scopeSample(entry) {
  let s = entry.endsWith('/') ? `${entry}__scope_probe__` : entry;
  s = s.replace(/\*\*/g, 'x/x').replace(/\*/g, 'x');
  return s;
}

export function readScope(input, spec, ci) {
  const file = findSubagentTranscript(input);
  const text = readDelegation(file);
  const entries = parseScope(text);
  if (!entries) return { found: false, file, entries: [], valid: [], ignored: [] };
  const valid = [];
  const ignored = [];
  for (const e of entries) {
    const sample = normPath(scopeSample(e));
    const rel = sample.startsWith('..') || isAbsNorm(sample) ? null : sample;
    if (rel !== null && !matchAny(ALWAYS_DENY, rel, ci) && inArea(spec, rel, ci)) valid.push(e);
    else ignored.push(e);
  }
  return { found: true, file, entries, valid, ignored };
}

// ---------------------------------------------------------------- context

export function makeContext(input) {
  const rootRaw = expandHome(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
  const root = normPath(rootRaw);
  const isMain = !input.agent_type && !input.agent_id;
  const role = isMain ? 'main' : String(input.agent_type || 'unknown').toLowerCase();
  const cwd = input.cwd ? normPath(fromGitBash(expandHome(input.cwd), root)) : root;
  const scratch = input.scratchpad_dir ? normPath(fromGitBash(expandHome(input.scratchpad_dir), root)) : null;
  const ci = caseInsensitive(root, cwd);
  const status = readStatus(rootRaw);
  const spec = ROLES[role] || null;
  let scope = { found: false, file: null, entries: [], valid: [], ignored: [] };
  if (!isMain && spec && spec.include.length) scope = readScope(input, spec, ci);
  return { input, rootRaw, root, isMain, role, cwd, scratch, ci, status, spec, scope };
}

export function scopeText(ctx) {
  if (ctx.isMain) return 'none (main session)';
  if (!ctx.scope.found) return 'none found, using the role area';
  return ctx.scope.valid.length ? ctx.scope.valid.join(', ') : 'no usable entries';
}

function denyText(ctx, what) {
  return `${what} Role: ${ctx.role}. Scope: ${scopeText(ctx)}. Put the change you need under needs: in your report.`;
}

// A path inside an isolated worktree (.claude/worktrees/<name>/...) is judged as the
// repo path after that prefix, so the worktree fallback gets the same rules as the main checkout.
const WORKTREE_RE = /^\.claude\/worktrees\/[^/]+(?:\/(.*))?$/i;

export function worktreeRel(rel) {
  if (rel === null || rel === undefined) return rel;
  const m = String(rel).match(WORKTREE_RE);
  if (!m) return rel;
  return m[1] || '';
}

// Repo-relative path of abs, with worktree paths mapped. null when outside the repo.
export function repoRel(ctx, abs) {
  return worktreeRel(relTo(ctx.root, abs));
}

// The one write policy. target may be relative to baseDir (default: the repo root).
export function checkWrite(ctx, target, baseDir) {
  const abs = toAbs(target, baseDir || ctx.root);
  const rel = repoRel(ctx, abs);
  const shown = rel === null ? abs : rel || '.';

  if (ctx.isMain) {
    if (rel !== null && isEnvFileName(rel)) {
      return { allow: false, rel: shown, reason: `${shown} holds the API keys. Only Gordon edits it, outside Claude Code.` };
    }
    return { allow: true, rel: shown };
  }

  if (ctx.scratch && isUnder(abs, ctx.scratch)) return { allow: true, rel: shown };
  if (rel === null) return { allow: false, rel: shown, reason: denyText(ctx, `${abs} is outside the repo.`) };
  if (rel === '') return { allow: false, rel: shown, reason: denyText(ctx, 'The repo root itself is not writable.') };
  if (matchAny(ALWAYS_DENY, rel, ctx.ci)) {
    return { allow: false, rel, reason: denyText(ctx, `${rel} belongs to the orchestrator or to Gordon.`) };
  }
  if (matchAny(ALWAYS_ALLOW, rel, ctx.ci)) return { allow: true, rel };

  const spec = ctx.spec;
  if (!spec || !spec.include.length) {
    const why = spec
      ? `The ${ctx.role} writes only to artifacts/, so ${rel} is off limits.`
      : `Agent type "${ctx.role}" has no write area, so ${rel} is off limits. Use a roster role (${ROLE_NAMES.join(', ')}).`;
    return { allow: false, rel, reason: denyText(ctx, why) };
  }
  if (spec.lockable && ctx.status.SHARED_LOCK === 'on') {
    return {
      allow: false,
      rel,
      reason: denyText(ctx, `${rel} is locked: SHARED_LOCK is on after G1, so only the integrator changes shared code now.`),
    };
  }
  if (ctx.status.SHARED_LOCK === 'on' && ctx.role !== 'integrator' && matchAny(SERVER_SKELETON, rel, ctx.ci)) {
    return {
      allow: false,
      rel,
      reason: denyText(ctx, `${rel} is part of the shared server skeleton, locked after G1. Only the integrator changes it now.`),
    };
  }
  if (!inArea(spec, rel, ctx.ci)) {
    return { allow: false, rel, reason: denyText(ctx, `${rel} is outside the ${ctx.role} area.`) };
  }
  if (ctx.scope.found) {
    const globs = ctx.scope.valid.map(scopeToGlob);
    if (!globs.length || !matchAny(globs, rel, ctx.ci)) {
      return { allow: false, rel, reason: denyText(ctx, `${rel} is not in your SCOPE.`) };
    }
  }
  return { allow: true, rel };
}

// ---------------------------------------------------------------- output

export function denyOutput(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  };
}

// ---------------------------------------------------------------- logs

function logDir(rootRaw) {
  try {
    if (!rootRaw || !fs.statSync(rootRaw).isDirectory()) return null;
  } catch {
    return null;
  }
  const dir = path.join(rootRaw, 'artifacts', 'hooks');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function logDecision(ctx, record) {
  try {
    const dir = logDir(ctx.rootRaw);
    if (!dir) return;
    const line = {
      time: new Date().toISOString(),
      role: ctx.role,
      agent_id: ctx.input.agent_id || null,
      scope_found: ctx.scope.found,
      ...record,
    };
    fs.appendFileSync(path.join(dir, 'guard.log'), `${JSON.stringify(line)}\n`);
  } catch {
    // logging never blocks
  }
}

export function logError(hook, input, err) {
  try {
    const rootRaw = expandHome(process.env.CLAUDE_PROJECT_DIR || (input && input.cwd) || process.cwd());
    const dir = logDir(rootRaw);
    if (!dir) return;
    const line = {
      time: new Date().toISOString(),
      hook,
      tool: input && input.tool_name,
      agent_type: input && input.agent_type,
      error: String((err && err.stack) || err),
    };
    fs.appendFileSync(path.join(dir, 'guard-errors.log'), `${JSON.stringify(line)}\n`);
  } catch {
    // nothing left to do
  }
}
