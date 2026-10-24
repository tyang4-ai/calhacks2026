#!/usr/bin/env node
// PreToolUse on Bash and PowerShell.
// Keeps keys out of the conversation for everyone, and keeps subagents away from git writes,
// installs, servers, process kills and writes outside their paths. See docs/harness/hooks-spec.md.
// Parsing is best effort. The edit guard is the real line for file writes.

import fs from 'node:fs';
import os from 'node:os';
import {
  runHook,
  makeContext,
  checkWrite,
  denyOutput,
  logDecision,
  normPath,
  toAbs,
  relTo,
  isUnder,
  isEnvFileName,
  INSTALLERS,
  guardsOff,
  repoRel,
  worktreeRel,
} from './lib/policy.mjs';

const REASONS = {
  secret: 'Keys stay in .env and never enter the conversation. Check for the file with test -f .env or Test-Path .env instead.',
  dump: 'Printing the environment could print the API keys. Ask for one non-secret variable by name instead.',
  git: 'Only the orchestrator runs git commands that change anything. Put what you need under needs: in your report.',
  force: 'Force-pushing or deleting remote branches is never allowed. main must keep its history.',
  install: 'Only the orchestrator, the scaffolder and the integrator add packages. Put the package you need under needs: in your report.',
  global: 'Never install globally or with a system package manager. Put what you need under needs: in your report.',
  npx: 'npx may run only playwright, tsc, eslint, oxlint, vitest, vite, prettier and tsx from the repo, and never fetch a package (-y, --yes, -p, --package).',
  sysdeps: 'Never install system dependencies (playwright install --with-deps or install-deps). Plain "npx playwright install chromium" is enough on Windows.',
  search: 'Recursive searches can print .env. Use git grep, rg without --no-ignore, or the Grep tool.',
  server: 'Never start a server. The orchestrator runs the dev server on 5173 and the API on 8000.',
  kill: 'Never stop processes. The orchestrator owns the dev server and the API.',
  encoded: 'Encoded commands can not be checked. Run the command in plain text.',
};

const KEY_NAMES = ['ANTHROPIC_API_KEY', 'NESSIE_KEY'];
const KEY_RE = [
  /\$\{?(ANTHROPIC_API_KEY|NESSIE_KEY)\b/,
  /\$env:(ANTHROPIC_API_KEY|NESSIE_KEY)\b/i,
  /%(ANTHROPIC_API_KEY|NESSIE_KEY)%/i,
  /\benv:(ANTHROPIC_API_KEY|NESSIE_KEY)\b/i,
];

const READ_VERBS = new Set([
  'cat', 'tac', 'nl', 'type', 'more', 'less', 'most', 'head', 'tail', 'get-content', 'gc',
  'grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack', 'findstr', 'select-string', 'sls',
  'sed', 'awk', 'gawk', 'mawk', 'cut', 'base64', 'base32', 'strings', 'od', 'xxd', 'hexdump',
  'sort', 'uniq', 'paste', 'column', 'jq', 'bat', 'batcat', 'diff', 'cmp', 'comm', 'iconv',
  'cp', 'copy', 'copy-item', 'cpi', 'mv', 'move', 'move-item', 'mi', 'scp', 'rsync',
  'curl', 'wget', 'invoke-webrequest', 'iwr', 'invoke-restmethod', 'irm',
  'tar', 'zip', '7z', 'gzip', 'openssl', 'gpg', 'certutil',
  'vi', 'vim', 'nvim', 'nano', 'emacs', 'notepad', 'code', 'import-csv', 'format-hex', 'fhx',
]);

const INTERPRETERS = new Set(['python', 'python3', 'py', 'node', 'deno', 'bun', 'ruby', 'perl', 'php']);
const SHELLS_BASH = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh']);
const SHELLS_PS = new Set(['pwsh', 'powershell']);

const WRAPPERS = new Set(['sudo', 'nohup', 'time', 'exec', 'command', 'nice', 'stdbuf', 'builtin', 'xargs', 'call', 'start']);

const GIT_READ = new Set([
  'status', 'diff', 'log', 'show', 'ls-files', 'ls-tree', 'rev-parse', 'blame', 'grep', 'describe',
  'shortlog', 'cat-file', 'show-ref', 'for-each-ref', 'merge-base', 'rev-list', 'check-ignore',
  'whatchanged', 'name-rev', 'count-objects', 'annotate', 'help', 'version',
]);

const PKG_INSTALL = {
  npm: ['install', 'i', 'in', 'ins', 'inst', 'insta', 'instal', 'isnt', 'isnta', 'isntal', 'isntall', 'ci', 'clean-install', 'add', 'uninstall', 'un', 'unlink', 'remove', 'rm', 'r', 'update', 'up', 'upgrade', 'udpate', 'link', 'ln', 'install-test', 'it', 'install-ci-test', 'cit', 'dedupe', 'ddp', 'prune', 'create', 'init', 'innit'],
  pnpm: ['install', 'i', 'add', 'remove', 'rm', 'un', 'uninstall', 'update', 'up', 'upgrade', 'link', 'ln', 'prune', 'create', 'import', 'fetch', 'init'],
  yarn: ['add', 'install', 'remove', 'upgrade', 'up', 'link', 'create', 'import', 'init'],
  bun: ['install', 'i', 'add', 'a', 'remove', 'rm', 'update', 'link', 'create', 'init'],
};
const PKG_EXEC = { npm: ['exec', 'x'], pnpm: ['dlx', 'exec'], yarn: ['dlx', 'exec'], bun: ['x'] };
const SERVER_SCRIPTS = new Set(['dev', 'preview', 'server', 'start', 'serve', 'restart', 'stop']);
const NPX_OK = new Set(['playwright', 'tsc', 'eslint', 'oxlint', 'vitest', 'vite', 'prettier', 'tsx']);

const SAFE_DELETE_ROOTS = ['artifacts', 'test-results', 'playwright-report', 'dist', 'node_modules/.vite'];
const DEV_NULLS = new Set(['/dev/null', '/dev/stdout', '/dev/stderr', '/dev/tty', 'nul', '$null', 'con']);

// ---------------------------------------------------------------- parsing

function findClose(src, openIdx) {
  let depth = 0;
  let q = null;
  for (let i = openIdx; i < src.length; i += 1) {
    const c = src[i];
    if (q) {
      if (c === q) q = null;
      continue;
    }
    if (c === "'" || c === '"') {
      q = c;
      continue;
    }
    if (c === '(') depth += 1;
    else if (c === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return src.length - 1;
}

// Split a command line into simple commands. Substitutions become commands of their own.
export function splitCommands(src, dialect, out = [], depth = 0) {
  if (depth > 6 || typeof src !== 'string') return out;
  let cur = '';
  let q = null;
  const push = () => {
    const t = cur.trim();
    if (t) out.push(t);
    cur = '';
  };
  const takeSubst = (i) => {
    const end = findClose(src, i + 1);
    splitCommands(src.slice(i + 2, end), dialect, out, depth + 1);
    cur += src.slice(i, end + 1);
    return end;
  };
  const takeBacktick = (i) => {
    const end = src.indexOf('`', i + 1);
    if (end <= i) return -1;
    splitCommands(src.slice(i + 1, end), dialect, out, depth + 1);
    cur += src.slice(i, end + 1);
    return end;
  };
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    const n = src[i + 1];
    if (q === "'") {
      cur += c;
      if (c === "'") q = null;
      continue;
    }
    if (q === '"') {
      if (c === '$' && n === '(') {
        i = takeSubst(i);
        continue;
      }
      if (c === '`' && dialect === 'bash') {
        const end = takeBacktick(i);
        if (end > 0) {
          i = end;
          continue;
        }
      }
      if ((c === '\\' && dialect === 'bash') || (c === '`' && dialect === 'powershell')) {
        cur += c + (n ?? '');
        i += 1;
        continue;
      }
      cur += c;
      if (c === '"') q = null;
      continue;
    }
    if (c === "'" && dialect !== 'cmd') {
      q = c;
      cur += c;
      continue;
    }
    if (c === '"') {
      q = c;
      cur += c;
      continue;
    }
    if (c === '\\' && dialect === 'bash' && n !== undefined) {
      cur += c + n;
      i += 1;
      continue;
    }
    if (c === '`' && dialect === 'powershell' && n !== undefined) {
      cur += c + n;
      i += 1;
      continue;
    }
    if (c === '$' && n === '(') {
      i = takeSubst(i);
      continue;
    }
    if (c === '`' && dialect === 'bash') {
      const end = takeBacktick(i);
      if (end > 0) {
        i = end;
        continue;
      }
    }
    if (c === '\n' || c === '\r' || c === ';') {
      push();
      continue;
    }
    if (c === '&' && n === '&') {
      push();
      i += 1;
      continue;
    }
    if (c === '|' && n === '|') {
      push();
      i += 1;
      continue;
    }
    if (c === '|') {
      push();
      continue;
    }
    if (c === '&') {
      const prev = cur.slice(-1);
      if (prev === '>' || prev === '<' || n === '>') {
        cur += c;
        continue;
      }
      if (dialect === 'powershell') {
        // The call operator, not a separator.
        cur += c;
        continue;
      }
      push();
      continue;
    }
    cur += c;
  }
  push();
  return out;
}

// Words and redirections of one simple command.
export function tokenize(cmd, dialect) {
  const toks = [];
  let cur = '';
  let has = false;
  let q = null;
  const flush = () => {
    if (has) toks.push({ t: 'w', v: cur });
    cur = '';
    has = false;
  };
  for (let i = 0; i < cmd.length; i += 1) {
    const c = cmd[i];
    const n = cmd[i + 1];
    if (q === "'") {
      if (c === "'") q = null;
      else cur += c;
      continue;
    }
    if (q === '"') {
      if (c === '"') {
        q = null;
        continue;
      }
      if (dialect === 'bash' && c === '\\' && n !== undefined && '"\\$`\n'.includes(n)) {
        cur += n;
        i += 1;
        continue;
      }
      if (dialect === 'powershell' && c === '`' && n !== undefined) {
        cur += n;
        i += 1;
        continue;
      }
      cur += c;
      continue;
    }
    if (c === "'" && dialect !== 'cmd') {
      q = c;
      has = true;
      continue;
    }
    if (c === '"') {
      q = c;
      has = true;
      continue;
    }
    if (dialect === 'bash' && c === '\\' && n !== undefined) {
      cur += n;
      i += 1;
      has = true;
      continue;
    }
    if (dialect === 'powershell' && c === '`' && n !== undefined) {
      cur += n;
      i += 1;
      has = true;
      continue;
    }
    if (dialect === 'cmd' && c === '^' && n !== undefined) {
      cur += n;
      i += 1;
      has = true;
      continue;
    }
    if (/\s/.test(c)) {
      flush();
      continue;
    }
    if (c === '>' || c === '<') {
      let fd = '';
      if (has && /^(\d+|&|\*)$/.test(cur)) {
        fd = cur;
        cur = '';
        has = false;
      } else {
        flush();
      }
      let op = c;
      if (c === '>' && n === '>') {
        op = '>>';
        i += 1;
      } else if (c === '>' && n === '|') {
        i += 1;
      } else if (c === '<' && n === '<') {
        op = '<<';
        i += 1;
        if (cmd[i + 1] === '<') {
          op = '<<<';
          i += 1;
        }
      }
      if (cmd[i + 1] === '&') {
        i += 1;
        let j = i + 1;
        let dup = '';
        while (j < cmd.length && /[\d-]/.test(cmd[j])) {
          dup += cmd[j];
          j += 1;
        }
        i = j - 1;
        toks.push({ t: 'r', op, fd, dup: dup || '?' });
        continue;
      }
      toks.push({ t: 'r', op, fd });
      continue;
    }
    cur += c;
    has = true;
  }
  flush();
  return toks;
}

function analyze(cmd, dialect) {
  const toks = tokenize(cmd, dialect);
  const words = [];
  const writes = [];
  const reads = [];
  for (let i = 0; i < toks.length; i += 1) {
    const t = toks[i];
    if (t.t === 'r') {
      if (t.dup !== undefined) continue;
      const nx = toks[i + 1];
      if (nx && nx.t === 'w') {
        i += 1;
        if (t.op === '>' || t.op === '>>') writes.push(nx.v);
        else if (t.op === '<') reads.push(nx.v);
      }
      continue;
    }
    words.push(t.v);
  }
  return { words, writes, reads };
}

export function cmdName(word) {
  let b = String(word || '').replace(/\\/g, '/').split('/').pop().toLowerCase();
  b = b.replace(/^[({]+/, '').replace(/[)}]+$/, '');
  return b.replace(/\.(exe|cmd|bat|ps1|com)$/, '');
}

const isAssign = (w) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(w);
const isFlag = (w) => typeof w === 'string' && w.length > 1 && w.startsWith('-');

function stripWrappers(words) {
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (isAssign(w)) {
      i += 1;
      continue;
    }
    if (w === '&' || w === '(' || w === '{') {
      i += 1;
      continue;
    }
    const base = cmdName(w);
    if (base === 'env') {
      i += 1;
      while (i < words.length && (isFlag(words[i]) || isAssign(words[i]))) {
        if (words[i] === '-u' || words[i] === '--unset' || words[i] === '-C' || words[i] === '--chdir') i += 1;
        i += 1;
      }
      continue;
    }
    if (base === 'timeout') {
      i += 1;
      while (i < words.length && isFlag(words[i])) i += 1;
      i += 1;
      continue;
    }
    if (WRAPPERS.has(base)) {
      i += 1;
      while (i < words.length && isFlag(words[i])) i += 1;
      continue;
    }
    break;
  }
  return words.slice(i);
}

function argParts(a) {
  const s = String(a);
  const parts = new Set([s]);
  if (s.includes('=')) parts.add(s.slice(s.indexOf('=') + 1));
  if (s.startsWith('@')) parts.add(s.slice(1));
  if (s.includes(':') && !/^[a-z]:[\\/]/i.test(s)) parts.add(s.slice(s.lastIndexOf(':') + 1));
  return [...parts];
}

const SEARCH_VERBS = new Set(['grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack', 'findstr', 'select-string', 'sls']);

// For search tools the first positional is the pattern. Pattern files (-f) still count as files.
function fileArgs(name, args) {
  if (!SEARCH_VERBS.has(name)) return args;
  const out = [];
  let patternGiven = false;
  const pos = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    const lower = String(a).toLowerCase();
    if (['-e', '--regexp'].includes(a) || (name.startsWith('s') && lower.startsWith('-pattern'))) {
      patternGiven = true;
      i += 1;
      continue;
    }
    if (a.startsWith('--regexp=')) {
      patternGiven = true;
      continue;
    }
    if (['-f', '--file'].includes(a)) {
      if (args[i + 1] !== undefined) out.push(args[i + 1]);
      i += 1;
      continue;
    }
    if (a.startsWith('--file=')) {
      out.push(a.slice(7));
      continue;
    }
    if (name.startsWith('s') && ['-path', '-literalpath'].includes(lower)) {
      if (args[i + 1] !== undefined) out.push(args[i + 1]);
      i += 1;
      continue;
    }
    if (isFlag(a) || (name === 'findstr' && /^\/[a-z]/i.test(a))) continue;
    pos.push(a);
  }
  out.push(...(patternGiven ? pos : pos.slice(1)));
  return out;
}

function isEnvLike(s) {
  const t = String(s).replace(/\*+$/, '');
  return isEnvFileName(t) || /(^|[\\/])\.env$/i.test(t);
}

// PowerShell parameter: -Recurse may be shortened to -r, -re, -rec and so on.
function psParam(a, full) {
  if (!isFlag(a)) return false;
  const name = a.slice(1).split(':')[0].toLowerCase();
  return name.length >= 1 && full.toLowerCase().startsWith(name);
}

function psValue(args, names) {
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (!isFlag(a)) continue;
    const name = a.slice(1).split(':')[0].toLowerCase();
    if (names.some((n) => n.toLowerCase() === name)) {
      if (a.includes(':')) return a.slice(a.indexOf(':') + 1);
      return args[i + 1];
    }
  }
  return undefined;
}

const PS_VALUE_PARAMS = ['path', 'literalpath', 'lp', 'destination', 'filter', 'include', 'exclude', 'credential', 'stream', 'value', 'encoding', 'itemtype', 'type', 'name', 'filepath', 'inputobject'];

function psPositionals(args) {
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (isFlag(a)) {
      const name = a.slice(1).split(':')[0].toLowerCase();
      if (!a.includes(':') && PS_VALUE_PARAMS.includes(name)) i += 1;
      continue;
    }
    out.push(a);
  }
  return out;
}

function unixPositionals(args, valueFlags = []) {
  const out = [];
  let rest = false;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (rest) {
      out.push(a);
      continue;
    }
    if (a === '--') {
      rest = true;
      continue;
    }
    if (isFlag(a)) {
      if (valueFlags.includes(a)) i += 1;
      continue;
    }
    out.push(a);
  }
  return out;
}

const PS_ALIASES_REMOVE = new Set(['remove-item', 'ri', 'del', 'erase', 'rm', 'rmdir', 'rd', 'rni']);

// Returns { recursive, targets } for delete commands, or null.
function deleteInfo(name, args, dialect) {
  if (name === 'rimraf') return { recursive: true, targets: unixPositionals(args) };
  if (name === 'find') {
    const del = args.includes('-delete') || args.some((a, i) => (a === '-exec' || a === '-execdir') && /^(rm|rmdir|del|unlink)$/.test(cmdName(args[i + 1])));
    if (!del) return null;
    const targets = [];
    for (const a of args) {
      if (isFlag(a) || a === '(' || a === '!' || a === '\\(') break;
      targets.push(a);
    }
    return { recursive: true, targets: targets.length ? targets : ['.'] };
  }
  if (dialect === 'powershell' && PS_ALIASES_REMOVE.has(name)) {
    const recursive = args.some((a) => psParam(a, 'recurse'));
    const p = psValue(args, ['path', 'literalpath', 'lp']);
    const targets = p !== undefined ? [p] : psPositionals(args);
    return { recursive, targets };
  }
  if (name === 'remove-item' || name === 'ri') {
    const recursive = args.some((a) => psParam(a, 'recurse'));
    const p = psValue(args, ['path', 'literalpath', 'lp']);
    return { recursive, targets: p !== undefined ? [p] : psPositionals(args) };
  }
  if (name === 'rm' || name === 'unlink') {
    const recursive = name === 'rm' && args.some((a) => a === '--recursive' || (/^-[a-zA-Z]+$/.test(a) && /[rR]/.test(a)));
    return { recursive, targets: unixPositionals(args) };
  }
  if (name === 'rmdir' || name === 'rd') {
    const recursive = args.some((a) => /^\/s$/i.test(a));
    if (!recursive && dialect === 'bash') return null;
    return { recursive, targets: args.filter((a) => !/^\/[a-z]$/i.test(a) && !isFlag(a)) };
  }
  if (name === 'del' || name === 'erase') {
    const recursive = args.some((a) => /^\/s$/i.test(a));
    return { recursive, targets: args.filter((a) => !/^\/[a-z](:.*)?$/i.test(a) && !isFlag(a)) };
  }
  return null;
}

// Where a command writes files. Best effort.
function writeTargets(name, args, dialect, base) {
  const out = [];
  const ps = dialect === 'powershell';
  if (name === 'tee') out.push(...unixPositionals(args));
  if (name === 'tee-object') {
    const p = psValue(args, ['filepath', 'path', 'literalpath']);
    if (p !== undefined) out.push(p);
  }
  if (name === 'sed' && args.some((a) => a === '--in-place' || a.startsWith('--in-place=') || /^-[a-zA-Z]*i/.test(a))) {
    const hasScriptFlag = args.some((a) => a === '-e' || a === '--expression' || a === '-f' || a === '--file' || a.startsWith('--expression=') || a.startsWith('--file='));
    const pos = unixPositionals(args, ['-e', '--expression', '-f', '--file']);
    out.push(...(hasScriptFlag ? pos : pos.slice(1)));
  }
  const copyLike = ['cp', 'mv', 'install', 'copy', 'move', 'copy-item', 'cpi', 'move-item', 'mi', 'xcopy', 'robocopy'];
  if (copyLike.includes(name)) {
    if (ps || ['copy-item', 'cpi', 'move-item', 'mi'].includes(name)) {
      const dest = psValue(args, ['destination']);
      const pos = psPositionals(args);
      const d = dest !== undefined ? dest : pos[1];
      const srcs = dest !== undefined ? pos : pos.slice(0, 1);
      if (d !== undefined) out.push(...expandDest(d, srcs, base));
    } else if (name === 'robocopy') {
      const pos = args.filter((a) => !a.startsWith('/'));
      if (pos[1]) out.push(`${pos[1]}/`);
    } else if (name === 'copy' || name === 'move' || name === 'xcopy') {
      const pos = args.filter((a) => !/^\/[a-z]/i.test(a));
      if (pos.length >= 2) out.push(...expandDest(pos[pos.length - 1], pos.slice(0, -1), base));
    } else {
      const tIdx = args.findIndex((a) => a === '-t' || a === '--target-directory' || a.startsWith('--target-directory='));
      if (tIdx >= 0) {
        const a = args[tIdx];
        const dir = a.includes('=') ? a.slice(a.indexOf('=') + 1) : args[tIdx + 1];
        const srcs = unixPositionals(args.filter((_, i) => i !== tIdx && i !== tIdx + 1), ['-S', '--suffix', '-m', '--mode', '-o', '--owner', '-g', '--group']);
        if (dir !== undefined) out.push(...expandDest(`${dir}/`, srcs, base));
      } else {
        const pos = unixPositionals(args, ['-S', '--suffix', '-m', '--mode', '-o', '--owner', '-g', '--group']);
        if (pos.length >= 2) out.push(...expandDest(pos[pos.length - 1], pos.slice(0, -1), base));
      }
    }
  }
  if (['set-content', 'add-content', 'out-file'].includes(name) || (ps && ['sc', 'ac'].includes(name))) {
    const p = psValue(args, ['path', 'filepath', 'literalpath', 'lp']);
    const pos = psPositionals(args);
    const t = p !== undefined ? p : pos[0];
    if (t !== undefined) out.push(t);
  }
  if (name === 'new-item' || name === 'ni') {
    const type = psValue(args, ['itemtype', 'type']);
    if (!(type && /^d(ir(ectory)?)?$/i.test(type))) {
      const p = psValue(args, ['path']);
      const nm = psValue(args, ['name']);
      const pos = psPositionals(args);
      const t = p !== undefined ? p : pos[0];
      if (t !== undefined && nm !== undefined) out.push(`${t}/${nm}`);
      else if (t !== undefined) out.push(t);
      else if (nm !== undefined) out.push(nm);
    }
  }
  if (name === 'touch') out.push(...unixPositionals(args, ['-d', '-t', '-r', '--date', '--reference']));
  if (name === 'truncate') out.push(...unixPositionals(args, ['-s', '--size', '-r', '--reference']));
  if (name === 'dd') {
    for (const a of args) if (a.startsWith('of=')) out.push(a.slice(3));
  }
  return out;
}

function expandDest(dest, srcs, base) {
  let isDir = /[\\/]$/.test(dest);
  if (!isDir) {
    try {
      isDir = fs.statSync(toAbs(dest, base).replace(/^([a-z]):/, (m, d) => `${d.toUpperCase()}:`)).isDirectory();
    } catch {
      isDir = false;
    }
  }
  if (!isDir) return [dest];
  const d = dest.replace(/[\\/]+$/, '');
  if (!srcs.length) return [`${d}/__unknown__`];
  return srcs.map((s) => `${d}/${String(s).replace(/\\/g, '/').split('/').pop()}`);
}

function gitParse(words) {
  let i = 1;
  while (i < words.length) {
    const w = words[i];
    if (['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env'].includes(w)) {
      i += 2;
      continue;
    }
    if (isFlag(w)) {
      i += 1;
      continue;
    }
    break;
  }
  return { sub: String(words[i] || '').toLowerCase(), args: words.slice(i + 1) };
}

function gitListingOk(args, mutating, listFlags) {
  if (args.some((a) => mutating.includes(a) || mutating.some((m) => m.startsWith('--') && a.startsWith(`${m}=`)))) return false;
  const positional = args.filter((a) => !isFlag(a));
  if (!positional.length) return true;
  return args.some((a) => listFlags.includes(a) || listFlags.some((f) => a.startsWith(`${f}=`)) || /^-n\d*$/.test(a));
}

function gitAllowed(sub, args) {
  if (!sub) return true;
  if (GIT_READ.has(sub)) return true;
  if (sub === 'branch') {
    return gitListingOk(
      args,
      ['-d', '-D', '--delete', '-m', '-M', '--move', '-c', '-C', '--copy', '-f', '--force', '--set-upstream-to', '-u', '--unset-upstream', '--edit-description', '--track', '-t', '--no-track', '--create-reflog'],
      ['--list', '-l', '--contains', '--no-contains', '--merged', '--no-merged', '--points-at'],
    );
  }
  if (sub === 'tag') {
    return gitListingOk(
      args,
      ['-a', '--annotate', '-s', '--sign', '-u', '--local-user', '-f', '--force', '-d', '--delete', '-m', '--message', '-F', '--file', '-e', '--edit'],
      ['--list', '-l', '--contains', '--no-contains', '--merged', '--no-merged', '--points-at'],
    );
  }
  if (sub === 'remote') return args.length === 0 || (args.length === 1 && ['-v', '--verbose'].includes(args[0]));
  if (sub === 'config') {
    const reads = args.some((a) => ['--get', '--get-all', '--get-regexp', '--list', '-l'].includes(a));
    const writes = args.some((a) => ['--unset', '--unset-all', '--add', '--replace-all', '--rename-section', '--remove-section', '-e', '--edit'].includes(a));
    return reads && !writes;
  }
  return false;
}

function pushIsForce(args) {
  for (const a of args) {
    if (['--force', '--force-with-lease', '--force-if-includes', '--delete', '--mirror', '--prune'].includes(a)) return true;
    if (a.startsWith('--force-with-lease=') || a.startsWith('--force=')) return true;
    if (/^-[a-zA-Z]+$/.test(a) && /[fd]/.test(a.slice(1))) return true;
    if (!isFlag(a) && (a.startsWith('+') || a.startsWith(':'))) return true;
  }
  return false;
}

function viteIsServer(rest) {
  if (!rest.length) return true;
  if (isFlag(rest[0])) return true;
  return ['dev', 'serve', 'preview'].includes(String(rest[0]).toLowerCase());
}

// The npx target and its arguments, or null.
function npxTarget(args) {
  let i = 0;
  while (i < args.length && isFlag(args[i])) {
    if (args[i] === '--') break;
    i += 1;
  }
  if (args[i] === '--') i += 1;
  const pkg = args[i];
  if (!pkg) return null;
  let bin = String(pkg);
  if (bin.startsWith('@')) bin = bin.split('/')[1] || bin;
  bin = bin.replace(/@.*$/, '').toLowerCase();
  return { bin, rest: args.slice(i + 1) };
}

// playwright install: browsers only, never system packages.
function playwrightInstall(rest) {
  const sub = String(rest[0] || '').toLowerCase();
  if (sub === 'install-deps') return 'sysdeps';
  if (sub !== 'install') return null;
  if (rest.some((a) => a === '--with-deps')) return 'sysdeps';
  return 'install';
}

function npxCheck(args, installer = false) {
  let i = 0;
  while (i < args.length && isFlag(args[i])) {
    const a = args[i];
    if (['-y', '--yes', '-p', '--package'].includes(a) || a.startsWith('--package=') || a.startsWith('-p=')) return REASONS.npx;
    if (a === '--') {
      i += 1;
      break;
    }
    i += 1;
  }
  if (args[i] === '--') i += 1;
  const pkg = args[i];
  if (!pkg) return null;
  let bin = String(pkg);
  if (bin.startsWith('@')) bin = bin.split('/')[1] || bin;
  bin = bin.replace(/@.*$/, '').toLowerCase();
  if (!NPX_OK.has(bin)) return `${REASONS.npx} "${pkg}" is not on that list.`;
  const rest = args.slice(i + 1);
  if (bin === 'vite' && viteIsServer(rest)) return REASONS.server;
  if (bin === 'playwright' && String(rest[0] || '').toLowerCase() === 'show-report') return REASONS.server;
  if (bin === 'playwright') {
    const pi = playwrightInstall(rest);
    if (pi === 'sysdeps') return REASONS.sysdeps;
    if (pi === 'install' && !installer) return REASONS.install;
  }
  return null;
}

function firstSub(args, valueFlags) {
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (isFlag(a)) {
      if (valueFlags.includes(a)) i += 1;
      continue;
    }
    return { sub: String(a).toLowerCase(), rest: args.slice(i + 1) };
  }
  return { sub: '', rest: [] };
}

// ---------------------------------------------------------------- recursive searches
// A content search that walks a folder holding .env prints the key line into the conversation.
// Denied for everyone unless .env is excluded or the search is limited to other file names.
// Plain rg and git grep skip gitignored and untracked files, so they stay allowed.

const ENV_PROBES = ['.env', '.env.local'];
const GLOB_CHARS = /[*?[{]/;
const CONTENT_READERS = new Set([
  'grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack', 'findstr', 'select-string', 'sls',
  'cat', 'tac', 'head', 'tail', 'less', 'more', 'nl', 'strings', 'xxd', 'od', 'hexdump',
  'sed', 'awk', 'bat', 'base64', 'get-content', 'gc', 'type', 'cp', 'copy', 'copy-item',
]);

// A file-name glob (*, ?, [..], {a,b}) tested against a bare name. Globs with a slash are
// tested against "x/<name>" too, so "**/.env*" counts.
function nameGlobMatches(glob, name) {
  const g = String(glob || '').trim().replace(/^['"]|['"]$/g, '').replace(/\\/g, '/');
  if (!g) return false;
  const brace = g.match(/^(.*?)\{([^{}]*)\}(.*)$/);
  if (brace) return brace[2].split(',').some((alt) => nameGlobMatches(`${brace[1]}${alt}${brace[3]}`, name));
  let re = '';
  for (let i = 0; i < g.length; i += 1) {
    const c = g[i];
    if (c === '*') re += '.*';
    else if (c === '?') re += '.';
    else if (c === '[') {
      const end = g.indexOf(']', i + 1);
      if (end > i) {
        re += `[${g.slice(i + 1, end).replace(/^!/, '^').replace(/\\/g, '\\\\')}]`;
        i = end;
      } else re += '\\[';
    } else if ('\\^$+.()|]'.includes(c)) re += `\\${c}`;
    else re += c;
  }
  const rx = new RegExp(`^${re}$`, 'i');
  return rx.test(name) || (g.includes('/') && (rx.test(`x/${name}`) || rx.test(`./${name}`)));
}

function envMatched(glob) {
  return ENV_PROBES.some((n) => nameGlobMatches(glob, n));
}

// Split a search root into the folder to walk and an optional file-name filter.
function splitRoot(token) {
  const t = String(token).replace(/\\/g, '/');
  if (!GLOB_CHARS.test(t)) return { dir: t, filter: null };
  const segs = t.split('/');
  const first = segs.findIndex((x) => GLOB_CHARS.test(x));
  const dir = segs.slice(0, first).join('/') || (t.startsWith('/') ? '/' : '.');
  return { dir, filter: segs[segs.length - 1] };
}

// 'yes', 'no' or 'unknown': is there a .env or .env.<x> file at or under abs?
function walkFindsEnv(abs) {
  let st;
  try {
    st = fs.statSync(abs);
  } catch {
    return 'no';
  }
  if (!st.isDirectory()) return isEnvFileName(abs) ? 'yes' : 'no';
  const queue = [[abs, 0]];
  let dirs = 0;
  while (queue.length) {
    const [dir, depth] = queue.shift();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    dirs += 1;
    if (dirs > 4000) return 'unknown';
    for (const e of entries) {
      if (e.isDirectory()) {
        if (e.name !== 'node_modules' && e.name !== '.git' && depth < 8) queue.push([`${dir}/${e.name}`, depth + 1]);
      } else if (isEnvFileName(e.name)) {
        return 'yes';
      }
    }
  }
  return 'no';
}

// The repo root, its worktrees, its parents, a drive root and the home folder always count.
function rootHoldsEnv(ctx, abs) {
  const rel = relTo(ctx.root, abs);
  if (rel !== null && worktreeRel(rel) === '') return 'yes';
  if (rel === null && relTo(abs, ctx.root) !== null) return 'yes';
  if (abs === '/' || /^[a-z]:\/?$/.test(abs) || abs === normPath(os.homedir())) return 'yes';
  return walkFindsEnv(abs);
}

// info: { roots: [tokens], positive: [globs], negative: [globs], typeFilter }
function searchVerdict(ctx, info, base) {
  const positive = (info.positive || []).filter(Boolean);
  const negative = (info.negative || []).filter(Boolean);
  if (negative.some(envMatched)) return null;
  if (info.typeFilter) return null;
  if (positive.length && !positive.some(envMatched)) return null;
  const roots = info.roots && info.roots.length ? info.roots : ['.'];
  for (const r of roots) {
    const raw = String(r);
    if (raw.includes('$') || raw.includes('%')) return REASONS.search;
    const { dir, filter } = splitRoot(raw);
    if (filter && !envMatched(filter)) continue;
    const abs = toAbs(dir || '.', base);
    if (rootHoldsEnv(ctx, abs) !== 'no') return REASONS.search;
  }
  return null;
}

const GREP_VALUE_LONG = new Set([
  '--regexp', '--file', '--max-count', '--after-context', '--before-context', '--context', '--directories',
  '--devices', '--include', '--exclude', '--exclude-dir', '--exclude-from', '--label', '--binary-files', '--group-separator',
]);

function parseGrep(args) {
  const info = { recursive: false, roots: [], positive: [], negative: [] };
  let patternGiven = false;
  const pos = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = String(args[i]);
    if (a === '--') {
      pos.push(...args.slice(i + 1));
      break;
    }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      const k = eq > 0 ? a.slice(0, eq) : a;
      let v = eq > 0 ? a.slice(eq + 1) : undefined;
      if (v === undefined && GREP_VALUE_LONG.has(k)) {
        v = args[i + 1];
        i += 1;
      }
      if (k === '--recursive' || k === '--dereference-recursive') info.recursive = true;
      else if (k === '--directories' && v === 'recurse') info.recursive = true;
      else if (k === '--include') info.positive.push(v);
      else if (k === '--exclude') info.negative.push(v);
      else if (k === '--regexp' || k === '--file') patternGiven = true;
      continue;
    }
    if (/^-[a-zA-Z0-9]+$/.test(a)) {
      const letters = a.slice(1);
      for (let j = 0; j < letters.length; j += 1) {
        const L = letters[j];
        if (L === 'r' || L === 'R') info.recursive = true;
        if ('efmABCdD'.includes(L)) {
          const v = letters.slice(j + 1) || args[(i += 1)];
          if (L === 'e' || L === 'f') patternGiven = true;
          if (L === 'd' && v === 'recurse') info.recursive = true;
          break;
        }
      }
      continue;
    }
    pos.push(a);
  }
  info.roots = patternGiven ? pos : pos.slice(1);
  return info;
}

function parseFindstr(args) {
  const info = { recursive: false, roots: [], positive: [], negative: [] };
  let stringGiven = false;
  const dirs = [];
  const pats = [];
  for (const raw of args) {
    const a = String(raw);
    const m = a.match(/^\/([a-z]+)(?::(.*))?$/i);
    if (m) {
      const letters = m[1].toLowerCase();
      if (m[2] === undefined && letters.includes('s')) info.recursive = true;
      if ((letters === 'c' || letters === 'g') && m[2] !== undefined) stringGiven = true;
      if (letters === 'd' && m[2]) dirs.push(...m[2].split(/[;,]/).filter(Boolean));
      continue;
    }
    pats.push(a);
  }
  const files = stringGiven ? pats : pats.slice(1);
  const bases = dirs.length ? dirs : ['.'];
  for (const f of files.length ? files : ['*']) {
    const t = f.replace(/\\/g, '/');
    const segs = t.split('/');
    const name = segs.pop();
    const dir = segs.join('/');
    for (const b of bases) info.roots.push(`${b}/${dir ? `${dir}/` : ''}${name}`);
  }
  return info;
}

const RG_VALUE = new Set([
  '-e', '--regexp', '-f', '--file', '-g', '--glob', '--iglob', '-t', '--type', '-T', '--type-not', '-m', '--max-count',
  '-A', '-B', '-C', '--context', '--after-context', '--before-context', '-M', '--max-columns', '-j', '--threads',
  '--max-depth', '-d', '--maxdepth', '--type-add', '--colors', '-E', '--encoding', '--sort', '--sortr', '-r', '--replace',
  '--ignore-file', '--pre', '--pre-glob', '--engine', '--max-filesize', '--ignore', '-G', '--file-search-regex', '--path-to-ignore',
]);

function parseRgAg(name, args) {
  const info = { unrestricted: false, roots: [], positive: [], negative: [], typeFilter: false };
  let patternGiven = false;
  const pos = [];
  const glob = (v) => {
    const g = String(v || '');
    if (g.startsWith('!')) info.negative.push(g.slice(1));
    else info.positive.push(g);
  };
  for (let i = 0; i < args.length; i += 1) {
    const a = String(args[i]);
    if (a === '--') {
      pos.push(...args.slice(i + 1));
      break;
    }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      const k = eq > 0 ? a.slice(0, eq) : a;
      let v = eq > 0 ? a.slice(eq + 1) : undefined;
      if (v === undefined && RG_VALUE.has(k)) {
        v = args[i + 1];
        i += 1;
      }
      if (/^--no-ignore/.test(k) || k === '--unrestricted' || k === '--hidden' || k === '--skip-vcs-ignores' || k === '--all-text') info.unrestricted = true;
      else if (k === '--glob' || k === '--iglob') glob(v);
      else if (k === '--ignore' && name === 'ag') info.negative.push(v);
      else if (k === '--type' && v && !/^(all|env)$/i.test(v)) info.typeFilter = true;
      else if (k === '--regexp' || k === '--file') patternGiven = true;
      continue;
    }
    if (a === '-.') {
      info.unrestricted = true;
      continue;
    }
    if (/^-[a-zA-Z0-9]+$/.test(a)) {
      const letters = a.slice(1);
      for (let j = 0; j < letters.length; j += 1) {
        const L = letters[j];
        if (L === 'u' || (name === 'ag' && (L === 'U' || L === 'a'))) info.unrestricted = true;
        if (RG_VALUE.has(`-${L}`)) {
          const v = letters.slice(j + 1) || args[(i += 1)];
          if (L === 'g') glob(v);
          if (L === 't' && v && !/^(all|env)$/i.test(v)) info.typeFilter = true;
          if (L === 'e' || L === 'f') patternGiven = true;
          break;
        }
      }
      continue;
    }
    pos.push(a);
  }
  info.roots = patternGiven ? pos : pos.slice(1);
  return info;
}

function parseGitGrep(gargs) {
  const info = { unsafe: false, roots: [], positive: [], negative: [] };
  const noIndex = gargs.includes('--no-index');
  const untrackedAll = gargs.includes('--untracked') && gargs.includes('--no-exclude-standard');
  info.unsafe = noIndex || untrackedAll;
  const dd = gargs.indexOf('--');
  const specs = dd >= 0 ? gargs.slice(dd + 1) : [];
  for (const sp of specs) {
    const v = String(sp);
    const ex = v.match(/^:(?:!|\^|\(exclude\))(.*)$/);
    if (ex) info.negative.push(ex[1]);
    else if (GLOB_CHARS.test(v)) info.positive.push(v.split('/').pop());
    else info.roots.push(v);
  }
  return info;
}

// find's start points, name filters and whether it hands files to a content reader.
function parseFind(args) {
  const info = { roots: [], positive: [], negative: [], execReads: false };
  let i = 0;
  while (i < args.length && !/^[-(!]/.test(String(args[i])) && args[i] !== '\\(') {
    info.roots.push(args[i]);
    i += 1;
  }
  let negate = false;
  for (; i < args.length; i += 1) {
    const a = String(args[i]);
    if (a === '!' || a === '-not') {
      negate = true;
      continue;
    }
    if (['-name', '-iname', '-path', '-ipath', '-wholename', '-iwholename'].includes(a)) {
      const v = args[i + 1];
      i += 1;
      const pat = a.includes('path') || a.includes('wholename') ? String(v || '').split('/').pop() : v;
      (negate ? info.negative : info.positive).push(pat);
      negate = false;
      continue;
    }
    if (['-exec', '-execdir', '-ok', '-okdir'].includes(a)) {
      const end = args.findIndex((x, k) => k > i && (x === ';' || x === '\;' || x === '+'));
      const cmd = args.slice(i + 1, end > 0 ? end : args.length);
      const nm = cmdName(cmd[0]);
      if (CONTENT_READERS.has(nm)) {
        info.execReads = true;
        if (['grep', 'egrep', 'fgrep'].includes(nm)) {
          const g = parseGrep(cmd.slice(1));
          info.positive.push(...g.positive);
          info.negative.push(...g.negative);
        }
      }
      i = end > 0 ? end : args.length;
      negate = false;
      continue;
    }
    negate = false;
  }
  return info;
}

// One simple command: is it a recursive content search that can reach .env?
function searchCheckSimple(ctx, name, words, args, base) {
  if (['grep', 'egrep', 'fgrep'].includes(name)) {
    const info = parseGrep(args);
    if (info.recursive) return searchVerdict(ctx, info, base);
    return null;
  }
  if (name === 'findstr') {
    const info = parseFindstr(args);
    if (info.recursive) return searchVerdict(ctx, info, base);
    return null;
  }
  if (name === 'rg' || name === 'ag') {
    const info = parseRgAg(name, args);
    if (info.unrestricted) return searchVerdict(ctx, info, base);
    return null;
  }
  if (name === 'git') {
    const { sub, args: gargs } = gitParse(words);
    if (sub !== 'grep') return null;
    const info = parseGitGrep(gargs);
    if (info.unsafe) return searchVerdict(ctx, info, base);
    return null;
  }
  if (name === 'find') {
    const info = parseFind(args);
    if (info.execReads) return searchVerdict(ctx, info, base);
    return null;
  }
  return null;
}

// Statements of a line (split on ; new lines && ||), each split into pipeline segments.
function pipelines(line) {
  const out = [];
  let stmt = [];
  let cur = '';
  let q = null;
  const endSeg = () => {
    if (cur.trim()) stmt.push(cur.trim());
    cur = '';
  };
  const endStmt = () => {
    endSeg();
    if (stmt.length) out.push(stmt);
    stmt = [];
  };
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    const n = line[i + 1];
    if (q) {
      cur += c;
      if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'") {
      q = c;
      cur += c;
      continue;
    }
    if (c === ';' || c === '\n' || c === '\r') {
      endStmt();
      continue;
    }
    if ((c === '&' && n === '&') || (c === '|' && n === '|')) {
      endStmt();
      i += 1;
      continue;
    }
    if (c === '|') {
      endSeg();
      continue;
    }
    cur += c;
  }
  endStmt();
  return out;
}

const PS_LISTERS = new Set(['get-childitem', 'gci', 'ls', 'dir']);
const PIPE_READERS = new Set(['select-string', 'sls', 'get-content', 'gc', 'cat', 'type']);

function psList(v) {
  return String(v || '').split(',').map((x) => x.trim()).filter(Boolean);
}

// Pipelines that walk folders and read every file: gci -Recurse | Select-String, find | xargs grep.
function searchCheckPipelines(ctx, line, dialect, base0) {
  let base = base0;
  for (const segs of pipelines(line)) {
    const parsed = segs.map((seg) => {
      const raw = analyze(seg, dialect).words;
      const words = cmdName(raw[0]) === 'xargs' ? raw : stripWrappers(raw);
      return { name: cmdName(words[0]), words, args: words.slice(1) };
    });
    if (parsed.length === 1 && ['cd', 'pushd', 'chdir', 'set-location', 'sl'].includes(parsed[0].name)) {
      const t = psValue(parsed[0].args, ['path', 'literalpath']) ?? parsed[0].args.find((a) => !isFlag(a));
      if (t && t !== '-' && !t.includes('$') && !t.includes('%')) base = toAbs(t, base);
      continue;
    }
    for (let k = 0; k < parsed.length - 1; k += 1) {
      const p = parsed[k];
      const later = parsed.slice(k + 1);
      if (PS_LISTERS.has(p.name) && p.args.some((a) => psParam(a, 'recurse'))) {
        if (!later.some((x) => PIPE_READERS.has(x.name))) continue;
        const pathVal = psValue(p.args, ['path', 'literalpath', 'lp']);
        const pos = psPositionals(p.args);
        const roots = pathVal !== undefined ? psList(pathVal) : pos.length ? psList(pos[0]) : ['.'];
        const info = {
          roots,
          positive: [...psList(psValue(p.args, ['include'])), ...psList(psValue(p.args, ['filter']))],
          negative: psList(psValue(p.args, ['exclude'])),
        };
        const v = searchVerdict(ctx, info, base);
        if (v) return v;
      }
      if (p.name === 'find') {
        const xa = later.find((x) => x.name === 'xargs');
        let reader = null;
        if (xa) {
          let j = 0;
          while (j < xa.args.length && isFlag(xa.args[j])) {
            if (['-I', '-L', '-n', '-P', '-d', '-E', '-s', '--delimiter', '--max-args', '--max-procs'].includes(xa.args[j])) j += 1;
            j += 1;
          }
          reader = { name: cmdName(xa.args[j]), args: xa.args.slice(j + 1) };
        }
        if (!reader || !CONTENT_READERS.has(reader.name)) continue;
        const info = parseFind(p.args);
        if (['grep', 'egrep', 'fgrep'].includes(reader.name)) {
          const g = parseGrep(reader.args);
          info.positive.push(...g.positive);
          info.negative.push(...g.negative);
        }
        const v = searchVerdict(ctx, info, base);
        if (v) return v;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------- the rules

function criticalDeleteTarget(ctx, target, base) {
  const raw = String(target);
  if (['~', '~/', '$HOME', '${HOME}', '%USERPROFILE%', '$env:USERPROFILE', '/', '/*', '\\'].includes(raw)) return true;
  if (raw.includes('$') || raw.includes('%')) return false;
  const abs = toAbs(raw, base);
  if (abs === '/' || /^[a-z]:\/?$/.test(abs)) return true;
  if (abs === normPath(os.homedir())) return true;
  const rel = repoRel(ctx, abs);
  if (rel === '') return true;
  if (rel === null && relTo(abs, ctx.root) !== null) return true; // a parent of the repo
  if (rel !== null && (rel === '.git' || rel.startsWith('.git/'))) return true;
  if (rel !== null && /^\*|^\.\*$/.test(rel)) return true; // a glob at the repo root
  return false;
}

function safeDeleteTarget(ctx, target, base) {
  const raw = String(target);
  if (raw.includes('$') || raw.includes('%')) return false;
  const abs = toAbs(raw, base);
  if (ctx.scratch && isUnder(abs, ctx.scratch)) return true;
  const rel = repoRel(ctx, abs);
  if (rel === null || rel === '') return false;
  const r = ctx.ci ? rel.toLowerCase() : rel;
  return SAFE_DELETE_ROOTS.some((root) => r === root || r.startsWith(`${root}/`));
}

function checkSimple(ctx, sub, dialect, state, depth) {
  const { words: rawWords, writes, reads } = analyze(sub, dialect);
  if (!rawWords.length && !writes.length && !reads.length) return null;

  // Environment dumps, before wrappers are stripped.
  const first = cmdName(rawWords[0]);
  if (first === 'env') {
    let i = 1;
    while (i < rawWords.length && (isFlag(rawWords[i]) || isAssign(rawWords[i]))) {
      if (['-u', '--unset', '-C', '--chdir'].includes(rawWords[i])) i += 1;
      i += 1;
    }
    if (i >= rawWords.length) return REASONS.dump;
  }

  const words = stripWrappers(rawWords);
  const name = cmdName(words[0]);
  const args = words.slice(1);

  // ---- everyone
  for (const r of reads) if (isEnvLike(r)) return REASONS.secret;

  if (name === 'printenv') {
    const pos = args.filter((a) => !isFlag(a));
    if (!pos.length || pos.some((a) => KEY_NAMES.includes(a))) return REASONS.dump;
  }
  if (name === 'set' && args.length === 0) return REASONS.dump;
  if (['export', 'declare', 'typeset'].includes(name) && args.every((a) => isFlag(a))) return REASONS.dump;
  if (['get-childitem', 'gci', 'dir', 'ls', 'get-item', 'gi', 'get-content', 'gc', 'cat', 'type'].includes(name)) {
    if (args.some((a) => /^env:/i.test(a) || /^-path:env:/i.test(a))) return REASONS.dump;
  }

  if (READ_VERBS.has(name)) {
    for (const a of fileArgs(name, args)) for (const part of argParts(a)) if (isEnvLike(part)) return REASONS.secret;
  }

  if (INTERPRETERS.has(name)) {
    const code = args.join(' ');
    if (/(environ|process\.env|getenv|GetEnvironmentVariable|ENV\[)[^\n]{0,60}(ANTHROPIC_API_KEY|NESSIE_KEY)/i.test(code)) return REASONS.secret;
    if (/(os\.environ|process\.env)\s*(\)|;|,|$)/.test(code)) return REASONS.dump;
    if (/dotenv/i.test(code) && args.some((a) => ['-c', '-e', '--eval', '-p', '--print'].includes(a))) return REASONS.secret;
    if (/(open|readFileSync|readFile|read_text|Get-Content)\s*\(\s*['"][^'"]*\.env['"]/i.test(code)) return REASONS.secret;
  }

  if (name === 'git') {
    const { sub: gsub, args: gargs } = gitParse(words);
    if (gsub === 'push' && pushIsForce(gargs)) return REASONS.force;
  }

  const searchReason = searchCheckSimple(ctx, name, words, args, state.base);
  if (searchReason) return searchReason;

  {
    let pw = null;
    if (['npx', 'bunx', 'pnpx'].includes(name)) pw = npxTarget(args);
    else if (['npm', 'pnpm', 'yarn', 'bun'].includes(name)) {
      const { sub: psub, rest } = firstSub(args, ['--prefix', '-C', '--dir', '--workspace', '-w', '--cwd']);
      if ((PKG_EXEC[name] || []).includes(psub)) pw = npxTarget(rest);
    } else if (name === 'playwright') pw = { bin: 'playwright', rest: args };
    if (pw && pw.bin === 'playwright' && playwrightInstall(pw.rest) === 'sysdeps') return REASONS.sysdeps;
  }

  const del = deleteInfo(name, args, dialect);
  if (del && del.recursive) {
    for (const t of del.targets) {
      if (criticalDeleteTarget(ctx, t, state.base)) return `This deletes ${t}, which the build can't recover from.`;
    }
  }

  // Nested shells get the same checks.
  if (SHELLS_BASH.has(name)) {
    const idx = args.findIndex((a) => /^-[a-zA-Z]*c[a-zA-Z]*$/.test(a));
    if (idx >= 0 && args[idx + 1] !== undefined) {
      const r = checkLine(ctx, args[idx + 1], 'bash', depth + 1, { base: state.base });
      if (r) return r;
    }
  }
  if (SHELLS_PS.has(name)) {
    if (args.some((a) => psParam(a, 'encodedcommand') || /^-ec$/i.test(a))) {
      if (!ctx.isMain) return REASONS.encoded;
    }
    const idx = args.findIndex((a) => isFlag(a) && psParam(a, 'command'));
    if (idx >= 0 && args.length > idx + 1) {
      const r = checkLine(ctx, args.slice(idx + 1).join(' '), 'powershell', depth + 1, { base: state.base });
      if (r) return r;
    }
  }
  if (name === 'cmd') {
    const idx = args.findIndex((a) => /^\/[ck]$/i.test(a));
    if (idx >= 0 && args.length > idx + 1) {
      const r = checkLine(ctx, args.slice(idx + 1).join(' '), 'cmd', depth + 1, { base: state.base });
      if (r) return r;
    }
  }

  // Track cd for later commands in the same line.
  if (['cd', 'pushd', 'chdir', 'set-location', 'sl'].includes(name)) {
    const p = psValue(args, ['path', 'literalpath']);
    const target = p !== undefined ? p : args.find((a) => !isFlag(a));
    if (target && target !== '-' && !target.includes('$') && !target.includes('%')) state.base = toAbs(target, state.base);
    return null;
  }

  if (ctx.isMain) return null;

  // ---- subagents only
  if (name === 'git') {
    const { sub: gsub, args: gargs } = gitParse(words);
    if (!gitAllowed(gsub, gargs)) return REASONS.git;
  }

  const installer = INSTALLERS.has(ctx.role);
  if (['npm', 'pnpm', 'yarn', 'bun'].includes(name)) {
    if (args.some((a) => a === '-g' || a === '--global' || a === '--location=global')) return REASONS.global;
    const { sub: psub, rest } = firstSub(args, ['--prefix', '-C', '--dir', '--workspace', '-w', '--cwd']);
    if (name === 'yarn' && !psub) return installer ? null : REASONS.install;
    if (PKG_INSTALL[name].includes(psub)) {
      if (name === 'bun' && psub === 'x') return npxCheck(rest, installer);
      return installer ? null : REASONS.install;
    }
    if (PKG_EXEC[name].includes(psub)) {
      const r = npxCheck(rest, installer);
      if (r) return r;
    }
    if (['run', 'run-script', 'rum', 'urn'].includes(psub)) {
      const { sub: script } = firstSub(rest, []);
      if (SERVER_SCRIPTS.has(script)) return REASONS.server;
    } else if (SERVER_SCRIPTS.has(psub)) {
      return REASONS.server;
    }
  }
  if (name === 'npx' || name === 'bunx' || name === 'pnpx') {
    const r = npxCheck(args, installer);
    if (r) return r;
  }
  if (/^pip(3(\.\d+)?)?$/.test(name)) {
    const { sub: psub } = firstSub(args, []);
    if (['install', 'uninstall', 'download'].includes(psub)) {
      if (args.some((a) => a === '--user' || a === '--target' || a === '-t')) return REASONS.global;
      return installer ? null : REASONS.install;
    }
  }
  if (/^(python(3(\.\d+)?)?|py)$/.test(name)) {
    const mIdx = args.findIndex((a) => a === '-m');
    if (mIdx >= 0) {
      const mod = String(args[mIdx + 1] || '').toLowerCase();
      const rest = args.slice(mIdx + 2);
      if (mod === 'pip') {
        const { sub: psub } = firstSub(rest, []);
        if (['install', 'uninstall', 'download'].includes(psub)) return installer ? null : REASONS.install;
      }
      if (['uvicorn', 'http.server', 'hypercorn', 'gunicorn'].includes(mod)) return REASONS.server;
      if (mod === 'fastapi' || mod === 'flask') {
        const { sub: s } = firstSub(rest, []);
        if (['dev', 'run'].includes(s)) return REASONS.server;
      }
    }
  }
  if (name === 'uv') {
    const { sub: usub, rest } = firstSub(args, ['--directory', '--project']);
    if (['add', 'remove', 'sync', 'lock'].includes(usub)) return installer ? null : REASONS.install;
    if (usub === 'pip') {
      const { sub: s } = firstSub(rest, []);
      if (['install', 'uninstall', 'sync'].includes(s)) return installer ? null : REASONS.install;
    }
    if (usub === 'tool') return REASONS.global;
  }
  if (name === 'poetry') {
    const { sub: s } = firstSub(args, []);
    if (['add', 'remove', 'install', 'update', 'lock'].includes(s)) return installer ? null : REASONS.install;
  }
  if (['pipx', 'conda', 'mamba', 'choco', 'winget', 'scoop', 'brew', 'apt', 'apt-get', 'dnf', 'yum', 'pacman', 'gem', 'cargo', 'go'].includes(name)) {
    const { sub: s } = firstSub(args, []);
    if (['install', 'add', 'create', 'upgrade', 'update', 'get'].includes(s)) return REASONS.global;
  }

  // Servers
  if (name === 'vite' && viteIsServer(args)) return REASONS.server;
  if (['uvicorn', 'hypercorn', 'gunicorn', 'serve', 'http-server', 'live-server', 'browser-sync'].includes(name)) return REASONS.server;
  if (name === 'fastapi' || name === 'flask') {
    const { sub: s } = firstSub(args, []);
    if (['dev', 'run'].includes(s)) return REASONS.server;
  }
  if (name === 'wrangler' && args.some((a) => String(a).toLowerCase() === 'dev')) return REASONS.server;
  if (name === 'playwright' && String(args[0] || '').toLowerCase() === 'show-report') return REASONS.server;
  if (name === 'playwright' && playwrightInstall(args) === 'install' && !installer) return REASONS.install;
  if (name === 'php' && args.includes('-S')) return REASONS.server;

  // Process kills
  if (['kill', 'pkill', 'killall', 'taskkill', 'stop-process', 'spps', 'kill-port', 'tskill'].includes(name)) return REASONS.kill;
  if (name === 'fuser' && args.some((a) => /^-[a-zA-Z]*k/.test(a))) return REASONS.kill;
  if (name === 'wmic' && args.some((a) => /^(delete|terminate)$/i.test(a))) return REASONS.kill;

  // Deletes and writes
  if (del) {
    if (del.recursive) {
      if (!del.targets.length) return 'This recursive delete has no visible target, so it can not be checked. Name the folder under artifacts/, test-results/, playwright-report/ or dist/.';
      for (const t of del.targets) {
        if (!safeDeleteTarget(ctx, t, state.base)) {
          return `Recursive deletes are allowed only under artifacts/, test-results/, playwright-report/, dist/, node_modules/.vite/ or your scratchpad, and ${t} is not. Put what you need under needs: in your report.`;
        }
      }
    } else {
      for (const t of del.targets) {
        const v = checkTarget(ctx, t, state.base);
        if (v) return v;
      }
    }
  }

  const targets = [...writes, ...writeTargets(name, args, dialect, state.base)];
  for (const t of targets) {
    const v = checkTarget(ctx, t, state.base);
    if (v) return v;
  }
  return null;
}

const skippedTargets = [];

function checkTarget(ctx, target, base) {
  const raw = String(target).trim();
  if (!raw || DEV_NULLS.has(raw.toLowerCase())) return null;
  if (raw.includes('$') || raw.includes('%')) {
    skippedTargets.push(raw);
    return null;
  }
  const verdict = checkWrite(ctx, raw, base);
  return verdict.allow ? null : verdict.reason;
}

function checkLine(ctx, line, dialect, depth = 0, local = { base: ctx.cwd }) {
  if (depth > 4) return null;
  for (const re of KEY_RE) if (re.test(line)) return REASONS.secret;
  const piped = searchCheckPipelines(ctx, line, dialect, local.base);
  if (piped) return piped;
  const lineState = { base: local.base };
  for (const sub of splitCommands(line, dialect)) {
    const r = checkSimple(ctx, sub, dialect, lineState, depth);
    if (r) return r;
  }
  return null;
}

function redact(s) {
  return String(s)
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[redacted]')
    .slice(0, 200);
}

await runHook('command-guard', async (input) => {
  const toolInput = input.tool_input || {};
  const command = toolInput.command;
  if (typeof command !== 'string' || !command.trim()) return null;
  const dialect = String(input.tool_name || '').toLowerCase() === 'powershell' ? 'powershell' : 'bash';
  const ctx = makeContext(input);
  if (guardsOff(ctx)) {
    logDecision(ctx, { hook: 'command-guard', tool: input.tool_name || null, command: redact(command), decision: 'allow', reason: 'guards off' });
    return null;
  }
  const reason = checkLine(ctx, command, dialect);
  logDecision(ctx, {
    hook: 'command-guard',
    tool: input.tool_name || null,
    command: redact(command),
    decision: reason ? 'deny' : 'allow',
    reason: reason || undefined,
    unchecked_targets: skippedTargets.length ? skippedTargets.slice(0, 5) : undefined,
  });
  if (!reason) return null;
  const tail = reason.includes('needs:') ? '' : ' Put what you need under needs: in your report.';
  return denyOutput(ctx.isMain ? reason : `${reason}${tail}`);
});
