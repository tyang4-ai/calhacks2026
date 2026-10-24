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
} from './lib/policy.mjs';

const REASONS = {
  secret: 'Keys stay in .env and never enter the conversation. Check for the file with test -f .env or Test-Path .env instead.',
  dump: 'Printing the environment could print the API keys. Ask for one non-secret variable by name instead.',
  git: 'Only the orchestrator runs git commands that change anything. Put what you need under needs: in your report.',
  force: 'Force-pushing or deleting remote branches is never allowed. main must keep its history.',
  install: 'Only the orchestrator, the scaffolder and the integrator add packages. Put the package you need under needs: in your report.',
  global: 'Never install globally or with a system package manager. Put what you need under needs: in your report.',
  npx: 'npx may run only playwright, tsc, eslint, vitest, vite, prettier and tsx from the repo, and never fetch a package (-y, --yes, -p, --package).',
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
const NPX_OK = new Set(['playwright', 'tsc', 'eslint', 'vitest', 'vite', 'prettier', 'tsx']);

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

function npxCheck(args) {
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

// ---------------------------------------------------------------- the rules

function criticalDeleteTarget(ctx, target, base) {
  const raw = String(target);
  if (['~', '~/', '$HOME', '${HOME}', '%USERPROFILE%', '$env:USERPROFILE', '/', '/*', '\\'].includes(raw)) return true;
  if (raw.includes('$') || raw.includes('%')) return false;
  const abs = toAbs(raw, base);
  if (abs === '/' || /^[a-z]:\/?$/.test(abs)) return true;
  if (abs === normPath(os.homedir())) return true;
  const rel = relTo(ctx.root, abs);
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
  const rel = relTo(ctx.root, abs);
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
      if (name === 'bun' && psub === 'x') return npxCheck(rest);
      return installer ? null : REASONS.install;
    }
    if (PKG_EXEC[name].includes(psub)) {
      const r = npxCheck(rest);
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
    const r = npxCheck(args);
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
