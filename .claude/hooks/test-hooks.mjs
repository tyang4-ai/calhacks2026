#!/usr/bin/env node
// Self-test for the harness hooks. Runs the same on Windows and Linux.
// Usage: node .claude/hooks/test-hooks.mjs   (set KEEP_HOOKTEST=1 to keep the temp folder)

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOKS = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cindia-hooktest-'));

// ---------------------------------------------------------------- fixtures

function mkProject(name, { lock = 'off', stop = 'on', pkg = null } = {}) {
  const dir = path.join(tmp, name);
  fs.mkdirSync(path.join(dir, 'docs', 'harness'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'docs', 'harness', 'status.md'),
    [
      'STAGE: W1',
      'NEXT: R5',
      `SHARED_LOCK: ${lock}`,
      `STOP_CHECK: ${stop}`,
      'UPDATED: test',
      '',
      '# Status board',
      '',
      '## Now',
      '',
      '- Testing the hooks.',
      '',
      '## Needs Gordon',
      '',
      '| Since | Question | Default in use |',
      '|---|---|---|',
      '',
      '## Log',
      '',
      'Newest last.',
      '- 10:00 G1 passed',
      '',
    ].join('\n'),
  );
  if (pkg) fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  return dir;
}

const proj = mkProject('proj');
const projLocked = mkProject('proj-locked', { lock: 'on' });
const projStopOff = mkProject('proj-stopoff', { stop: 'off', pkg: { scripts: { 'check:scope': 'node -e "process.exit(1)"' } } });
const projFail = mkProject('proj-fail', { pkg: { scripts: { 'check:scope': 'node -e "console.log(\'bad file\');process.exit(1)"' } } });
const projPass = mkProject('proj-pass', { pkg: { scripts: { 'check:scope': 'node -e "process.exit(0)"' } } });
const projNoScript = mkProject('proj-noscript', { pkg: { scripts: {} } });
const scratch = path.join(tmp, 'scratch');
fs.mkdirSync(scratch, { recursive: true });
const outside = path.join(tmp, 'elsewhere');
fs.mkdirSync(outside, { recursive: true });

const sessions = path.join(tmp, 'sessions');
const subagents = path.join(sessions, 'sess1', 'subagents');
fs.mkdirSync(path.join(subagents, 'nested'), { recursive: true });
const mainTranscript = path.join(sessions, 'sess1.jsonl');
fs.writeFileSync(mainTranscript, '');

function agentTranscript(fileId, content, dir = subagents) {
  const file = path.join(dir, `agent-${fileId}.jsonl`);
  const lines = [
    JSON.stringify({ type: 'user', message: { role: 'user', content }, agentId: fileId, isSidechain: true }),
    JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'ok' }] } }),
  ];
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
  return file;
}

const header = (scope, role = 'builder') => `ROLE: ${role}\nPLAN: docs/plans/F-buyer.md\nTASK: T1\n${scope ? `SCOPE: ${scope}\n` : ''}Build the task.`;
const T = {
  b1: agentTranscript('b1', header('src/features/buyer/A.tsx, tests/features/buyer-a.spec.ts')),
  b2: agentTranscript('b2', header('src/features/buyer/')),
  b3: agentTranscript('b3', header('src/core/')),
  b5: agentTranscript('b5', [{ type: 'text', text: header('src/features/money-map/M.tsx') }]),
  b6: agentTranscript('agent-b6x'.replace(/^agent-/, ''), header('src/features/close/C.tsx')),
  b7: agentTranscript('b7', header('src/features/proof/P.tsx'), path.join(subagents, 'nested')),
  lead1: agentTranscript('lead1', header('src/features/buyer/, tests/features/buyer*', 'feature-lead')),
  be1: agentTranscript('be1', header('server/routers/b04_live_concierge.py, src/sources/live/b04-live-concierge.ts, tests/server/', 'backend-builder')),
};

// ---------------------------------------------------------------- runner

const results = [];

function run(hook, input, { root = proj, raw = null } = {}) {
  return spawnSync(process.execPath, [path.join(HOOKS, hook)], {
    input: raw !== null ? raw : JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    timeout: 120000,
  });
}

function verdictOf(res) {
  const out = (res.stdout || '').trim();
  if (!out) return 'allow';
  try {
    const j = JSON.parse(out);
    if (j.hookSpecificOutput && j.hookSpecificOutput.permissionDecision === 'deny') return 'deny';
    if (j.decision === 'block') return 'block';
    if (j.hookSpecificOutput && typeof j.hookSpecificOutput.additionalContext === 'string') return 'context';
    return `other: ${out.slice(0, 80)}`;
  } catch {
    return `bad json: ${out.slice(0, 80)}`;
  }
}

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
}

function check(name, hook, input, expect, opts = {}) {
  const res = run(hook, input, opts);
  const got = verdictOf(res);
  const ok = got === expect && res.status === 0;
  const detail = ok ? '' : `expected ${expect}, got ${got}, exit ${res.status}${res.stderr ? `, stderr: ${res.stderr.trim().slice(0, 200)}` : ''}`;
  record(name, ok, detail);
  return res;
}

const P = (root, rel) => path.join(root, ...rel.split('/'));

function base(root) {
  return { session_id: 'sess1', transcript_path: mainTranscript, cwd: root, hook_event_name: 'PreToolUse', permission_mode: 'auto' };
}

function edit(role, id, file, { root = proj, tool = 'Write', scratchDir } = {}) {
  const input = { ...base(root), tool_name: tool, tool_input: { file_path: file, content: 'x' } };
  if (role) {
    input.agent_type = role;
    input.agent_id = id || `id-${role}`;
  }
  if (scratchDir) input.scratchpad_dir = scratchDir;
  return input;
}

function sh(role, id, command, { root = proj, tool = 'Bash' } = {}) {
  const input = { ...base(root), tool_name: tool, tool_input: { command, description: 'test' } };
  if (role) {
    input.agent_type = role;
    input.agent_id = id || `id-${role}`;
  }
  return input;
}

const E = 'edit-guard.mjs';
const C = 'command-guard.mjs';

// ---------------------------------------------------------------- edit guard

check('main: write src/core/events.ts', E, edit(null, null, P(proj, 'src/core/events.ts')), 'allow');
check('main: write docs/harness/status.md', E, edit(null, null, P(proj, 'docs/harness/status.md')), 'allow');
check('main: write .env is denied', E, edit(null, null, P(proj, '.env')), 'deny');
check('main: write server/.env.local is denied', E, edit(null, null, P(proj, 'server/.env.local')), 'deny');
check('main: write .env.example', E, edit(null, null, P(proj, '.env.example')), 'allow');

check('builder file scope: own file', E, edit('builder', 'b1', P(proj, 'src/features/buyer/A.tsx')), 'allow');
check('builder file scope: own test', E, edit('builder', 'b1', P(proj, 'tests/features/buyer-a.spec.ts')), 'allow');
check('builder file scope: sibling file', E, edit('builder', 'b1', P(proj, 'src/features/buyer/B.tsx')), 'deny');
check('builder file scope: src/core', E, edit('builder', 'b1', P(proj, 'src/core/events.ts')), 'deny');
check('builder file scope: Edit tool too', E, edit('builder', 'b1', P(proj, 'src/features/buyer/B.tsx'), { tool: 'Edit' }), 'deny');
check('builder file scope: artifacts', E, edit('builder', 'b1', P(proj, 'artifacts/notes/b1.md')), 'allow');

const winRoot = 'C:\\dev\\calhacks2026';
const winInput = (file) => ({
  ...base(winRoot),
  tool_name: 'Write',
  tool_input: { file_path: file, content: 'x' },
  agent_type: 'builder',
  agent_id: 'b1',
});
check('windows path: own file', E, winInput('C:\\dev\\calhacks2026\\src\\features\\buyer\\A.tsx'), 'allow', { root: winRoot });
check('windows path: other case', E, winInput('c:\\Dev\\CalHacks2026\\src\\features\\buyer\\A.tsx'), 'allow', { root: winRoot });
check('windows path: sibling file', E, winInput('C:\\dev\\calhacks2026\\src\\features\\buyer\\B.tsx'), 'deny', { root: winRoot });
check('windows path: dot-dot escape', E, winInput('C:\\dev\\calhacks2026\\src\\features\\buyer\\..\\..\\core\\x.ts'), 'deny', { root: winRoot });

check('builder folder scope: nested file', E, edit('builder', 'b2', P(proj, 'src/features/buyer/sub/x.ts')), 'allow');
check('builder folder scope: other feature', E, edit('builder', 'b2', P(proj, 'src/features/money-map/x.ts')), 'deny');
check('builder widening scope: src/core denied', E, edit('builder', 'b3', P(proj, 'src/core/x.ts')), 'deny');
check('builder widening scope: no usable entries', E, edit('builder', 'b3', P(proj, 'src/features/buyer/A.tsx')), 'deny');
check('builder no transcript: role area', E, edit('builder', 'b4-missing', P(proj, 'src/features/any/x.ts')), 'allow');
check('builder no transcript: src/core', E, edit('builder', 'b4-missing', P(proj, 'src/core/x.ts')), 'deny');
check('builder no transcript: server', E, edit('builder', 'b4-missing', P(proj, 'server/main.py')), 'allow');
check('builder content array', E, edit('builder', 'b5', P(proj, 'src/features/money-map/M.tsx')), 'allow');
check('builder content array: sibling', E, edit('builder', 'b5', P(proj, 'src/features/money-map/N.tsx')), 'deny');
check('builder agent- prefix id', E, edit('builder', 'agent-b6x', P(proj, 'src/features/close/C.tsx')), 'allow');
check('builder agent- prefix id: sibling', E, edit('builder', 'agent-b6x', P(proj, 'src/features/close/D.tsx')), 'deny');
check('builder transcript in nested folder', E, edit('builder', 'b7', P(proj, 'src/features/proof/P.tsx')), 'allow');
check('builder transcript in nested folder: sibling', E, edit('builder', 'b7', P(proj, 'src/features/proof/Q.tsx')), 'deny');
check('builder writes .claude', E, edit('builder', 'b2', P(proj, '.claude/settings.json')), 'deny');
check('builder writes CLAUDE.md', E, edit('builder', 'b2', P(proj, 'CLAUDE.md')), 'deny');
check('builder writes nested CLAUDE.md', E, edit('builder', 'b2', P(proj, 'src/features/buyer/CLAUDE.md')), 'deny');
check('builder writes .env', E, edit('builder', 'b2', P(proj, '.env')), 'deny');
check('builder writes .env.example', E, edit('builder', 'b2', P(proj, '.env.example')), 'deny');
check('builder writes docs/plans', E, edit('builder', 'b2', P(proj, 'docs/plans/F-buyer.md')), 'deny');

check('lead folder scope: feature file', E, edit('feature-lead', 'lead1', P(proj, 'src/features/buyer/index.ts')), 'allow');
check('lead folder scope: test glob', E, edit('feature-lead', 'lead1', P(proj, 'tests/features/buyer-flow.spec.ts')), 'allow');
check('lead folder scope: other feature', E, edit('feature-lead', 'lead1', P(proj, 'src/features/money-map/x.ts')), 'deny');
check('lead folder scope: other tests', E, edit('feature-lead', 'lead1', P(proj, 'tests/features/close-x.spec.ts')), 'deny');

check('verifier: artifacts', E, edit('verifier', 'v1', P(proj, 'artifacts/gates/G3-1000.md')), 'allow');
check('verifier: feature file', E, edit('verifier', 'v1', P(proj, 'src/features/buyer/A.tsx')), 'deny');

check('scaffolder lock off: src/core', E, edit('scaffolder', 's1', P(proj, 'src/core/events.ts')), 'allow');
check('scaffolder lock off: package.json', E, edit('scaffolder', 's1', P(proj, 'package.json')), 'allow');
check('scaffolder lock off: tsconfig.app.json', E, edit('scaffolder', 's1', P(proj, 'tsconfig.app.json')), 'allow');
check('scaffolder lock off: src/main.tsx', E, edit('scaffolder', 's1', P(proj, 'src/main.tsx')), 'allow');
check('scaffolder lock off: src/sources/live', E, edit('scaffolder', 's1', P(proj, 'src/sources/live/b04.ts')), 'deny');
check('scaffolder lock off: src/features', E, edit('scaffolder', 's1', P(proj, 'src/features/buyer/A.tsx')), 'deny');
check('scaffolder lock on: src/core', E, edit('scaffolder', 's1', P(projLocked, 'src/core/events.ts'), { root: projLocked }), 'deny', { root: projLocked });
check('scaffolder lock on: artifacts', E, edit('scaffolder', 's1', P(projLocked, 'artifacts/x.md'), { root: projLocked }), 'allow', { root: projLocked });

check('integrator lock on: src/core', E, edit('integrator', 'i1', P(projLocked, 'src/core/events.ts'), { root: projLocked }), 'allow', { root: projLocked });
check('integrator lock on: docs/common', E, edit('integrator', 'i1', P(projLocked, 'docs/common/events.md'), { root: projLocked }), 'allow', { root: projLocked });
check('integrator lock on: docs/harness', E, edit('integrator', 'i1', P(projLocked, 'docs/harness/status.md'), { root: projLocked }), 'deny', { root: projLocked });
check('integrator: src/features', E, edit('integrator', 'i1', P(proj, 'src/features/buyer/A.tsx')), 'deny');

check('data-smith: src/mock', E, edit('data-smith', 'd1', P(proj, 'src/mock/studio.ts')), 'allow');
check('data-smith: tests/data', E, edit('data-smith', 'd1', P(proj, 'tests/data/integrity.test.ts')), 'allow');
check('data-smith: src/features', E, edit('data-smith', 'd1', P(proj, 'src/features/buyer/A.tsx')), 'deny');

check('backend-builder: own router', E, edit('backend-builder', 'be1', P(proj, 'server/routers/b04_live_concierge.py')), 'allow');
check('backend-builder: own adapter', E, edit('backend-builder', 'be1', P(proj, 'src/sources/live/b04-live-concierge.ts')), 'allow');
check('backend-builder: tests/server folder', E, edit('backend-builder', 'be1', P(proj, 'tests/server/test_b04.py')), 'allow');
check('backend-builder: other router', E, edit('backend-builder', 'be1', P(proj, 'server/routers/b05_x.py')), 'deny');
check('scribe: README', E, edit('scribe', 'sc1', P(proj, 'README.md')), 'allow');
check('scribe: devpost', E, edit('scribe', 'sc1', P(proj, 'docs/devpost/draft.md')), 'allow');
check('scribe: src', E, edit('scribe', 'sc1', P(proj, 'src/app/App.tsx')), 'deny');

check('general-purpose: src', E, edit('general-purpose', 'gp1', P(proj, 'src/app/App.tsx')), 'deny');
check('unknown type: src', E, edit('mystery-agent', 'm1', P(proj, 'src/app/App.tsx')), 'deny');
check('general-purpose: artifacts', E, edit('general-purpose', 'gp1', P(proj, 'artifacts/x.md')), 'allow');

check('builder outside repo', E, edit('builder', 'b2', path.join(outside, 'x.ts')), 'deny');
check('builder in scratchpad', E, edit('builder', 'b2', path.join(scratch, 'notes.md'), { scratchDir: scratch }), 'allow');
check('main outside repo', E, edit(null, null, path.join(outside, 'x.ts')), 'allow');
check('NotebookEdit path', E, { ...edit('builder', 'b1', ''), tool_name: 'NotebookEdit', tool_input: { notebook_path: P(proj, 'src/core/x.ipynb') } }, 'deny');

// Fail open on bad input.
{
  const res = run(E, null, { raw: 'not json at all' });
  record('fail open: bad JSON', res.status === 0 && !(res.stdout || '').trim(), `exit ${res.status}, out ${(res.stdout || '').slice(0, 80)}`);
}

// ---------------------------------------------------------------- command guard

check('builder: git commit', C, sh('builder', 'b1', 'git commit -m "x"'), 'deny');
check('builder: git status', C, sh('builder', 'b1', 'git status'), 'allow');
check('builder: git -C . log', C, sh('builder', 'b1', 'git -C . log --oneline -5'), 'allow');
check('builder: git diff --stat', C, sh('builder', 'b1', 'git --no-pager diff --stat'), 'allow');
check('builder: git branch', C, sh('builder', 'b1', 'git branch'), 'allow');
check('builder: git branch -D', C, sh('builder', 'b1', 'git branch -D old'), 'deny');
check('builder: git branch create', C, sh('builder', 'b1', 'git branch newbranch'), 'deny');
check('builder: git tag -l', C, sh('builder', 'b1', 'git tag -l'), 'allow');
check('builder: git tag create', C, sh('builder', 'b1', 'git tag v1'), 'deny');
check('builder: git config --get', C, sh('builder', 'b1', 'git config --get user.name'), 'allow');
check('builder: git config set', C, sh('builder', 'b1', 'git config user.name x'), 'deny');
check('builder: git remote -v', C, sh('builder', 'b1', 'git remote -v'), 'allow');
check('builder: git restore', C, sh('builder', 'b1', 'git restore src/features/buyer/A.tsx'), 'deny');
check('builder: git stash', C, sh('builder', 'b1', 'git stash'), 'deny');
check('builder: bash -c git commit', C, sh('builder', 'b1', 'bash -c "git commit -m x"'), 'deny');
check('builder: npm run check && git add', C, sh('builder', 'b1', 'npm run check && git add .'), 'deny');
check('builder: $(git commit)', C, sh('builder', 'b1', 'echo $(git commit -m x)'), 'deny');

check('builder: npm install foo', C, sh('builder', 'b1', 'npm install foo'), 'deny');
check('builder: npm i -D foo', C, sh('builder', 'b1', 'npm i -D foo'), 'deny');
check('builder: yarn', C, sh('builder', 'b1', 'yarn'), 'deny');
check('builder: python -m pip install', C, sh('builder', 'b1', 'python -m pip install requests'), 'deny');
check('builder: pip install', C, sh('builder', 'b1', 'pip install fastapi'), 'deny');
check('builder: uv add', C, sh('builder', 'b1', 'uv add httpx'), 'deny');
check('scaffolder: npm install', C, sh('scaffolder', 's1', 'npm install'), 'allow');
check('scaffolder: npm install foo', C, sh('scaffolder', 's1', 'npm install react@19.3.1'), 'allow');
check('integrator: pip install -r', C, sh('integrator', 'i1', 'pip install -r server/requirements.txt'), 'allow');
check('scaffolder: npm install -g', C, sh('scaffolder', 's1', 'npm install -g typescript'), 'deny');
check('builder: npx playwright test', C, sh('builder', 'b1', 'npx playwright test tests/features/buyer-a.spec.ts'), 'allow');
check('builder: npx tsc --noEmit', C, sh('builder', 'b1', 'npx tsc --noEmit'), 'allow');
check('builder: npx -y cowsay', C, sh('builder', 'b1', 'npx -y cowsay hi'), 'deny');
check('builder: npx cowsay', C, sh('builder', 'b1', 'npx cowsay hi'), 'deny');
check('builder: npx vite build', C, sh('builder', 'b1', 'npx vite build'), 'allow');
check('builder: npx vite', C, sh('builder', 'b1', 'npx vite'), 'deny');

check('builder: npm run dev', C, sh('builder', 'b1', 'npm run dev'), 'deny');
check('builder: npm start', C, sh('builder', 'b1', 'npm start'), 'deny');
check('builder: npm run preview', C, sh('builder', 'b1', 'npm run preview'), 'deny');
check('builder: uvicorn', C, sh('builder', 'b1', 'uvicorn server.main:app --port 8000'), 'deny');
check('builder: python -m http.server', C, sh('builder', 'b1', 'python -m http.server 9000'), 'deny');
check('builder: npm run check:scope', C, sh('builder', 'b1', 'npm run check:scope -- src/features/buyer/A.tsx'), 'allow');
check('builder: npm test', C, sh('builder', 'b1', 'npm test'), 'allow');
check('builder: npm run gate', C, sh('builder', 'b1', 'npm run gate -- G3'), 'allow');
check('main: npm run dev', C, sh(null, null, 'npm run dev'), 'allow');

check('builder: taskkill', C, sh('builder', 'b1', 'taskkill /F /IM node.exe'), 'deny');
check('builder: kill', C, sh('builder', 'b1', 'kill -9 1234'), 'deny');
check('builder: PowerShell Stop-Process', C, sh('builder', 'b1', 'Stop-Process -Name node', { tool: 'PowerShell' }), 'deny');

check('main: cat .env', C, sh(null, null, 'cat .env'), 'deny');
check('main: cat server/.env', C, sh(null, null, 'cat server/.env'), 'deny');
check('main: grep KEY .env', C, sh(null, null, 'grep ANTHROPIC .env'), 'deny');
check('main: cat .env.example', C, sh(null, null, 'cat .env.example'), 'allow');
check('main: test -f .env', C, sh(null, null, 'test -f .env && echo present'), 'allow');
check('main: [ -f .env ]', C, sh(null, null, '[ -f .env ] && echo yes'), 'allow');
check('main: ls .env', C, sh(null, null, 'ls -la .env'), 'allow');
check('main: PowerShell Test-Path', C, sh(null, null, 'Test-Path .env', { tool: 'PowerShell' }), 'allow');
check('main: PowerShell Get-Content .env', C, sh(null, null, 'Get-Content .env', { tool: 'PowerShell' }), 'deny');
check('main: input redirect from .env', C, sh(null, null, 'wc -l < .env'), 'deny');
check('main: cp .env elsewhere', C, sh(null, null, 'cp .env /tmp/keys'), 'deny');
check('main: echo $ANTHROPIC_API_KEY', C, sh(null, null, 'echo $ANTHROPIC_API_KEY'), 'deny');
check('main: echo ${NESSIE_KEY}', C, sh(null, null, 'echo "${NESSIE_KEY}"'), 'deny');
check('main: PowerShell $env:NESSIE_KEY', C, sh(null, null, 'Write-Output $env:NESSIE_KEY', { tool: 'PowerShell' }), 'deny');
check('main: printenv', C, sh(null, null, 'printenv'), 'deny');
check('main: env | grep', C, sh(null, null, 'env | grep KEY'), 'deny');
check('main: env VAR=1 node x', C, sh(null, null, 'env FOO=1 node scripts/x.mjs'), 'allow');
check('main: PowerShell gci env:', C, sh(null, null, 'Get-ChildItem env:', { tool: 'PowerShell' }), 'deny');
check('main: node -e process.env key', C, sh(null, null, 'node -e "console.log(process.env.ANTHROPIC_API_KEY)"'), 'deny');
check('main: grep for the name in code', C, sh(null, null, 'grep -rn ANTHROPIC_API_KEY server/'), 'allow');
check('main: rg pattern .env', C, sh(null, null, 'rg "\\.env" src'), 'allow');

check('main: git push --force', C, sh(null, null, 'git push --force origin main'), 'deny');
check('main: git push -f', C, sh(null, null, 'git push -f'), 'deny');
check('main: git push +main', C, sh(null, null, 'git push origin +main'), 'deny');
check('main: git push --delete', C, sh(null, null, 'git push origin --delete old'), 'deny');
check('main: git push --follow-tags', C, sh(null, null, 'git push origin main --follow-tags'), 'allow');
check('main: git commit', C, sh(null, null, 'git add -A && git commit -m "G1: scaffold passes"'), 'allow');
check('main: rm -rf .git', C, sh(null, null, 'rm -rf .git'), 'deny');
check('main: rm -rf repo root', C, sh(null, null, 'rm -rf .'), 'deny');
check('main: rm -rf dist', C, sh(null, null, 'rm -rf dist'), 'allow');

check('builder: rm -rf src', C, sh('builder', 'b1', 'rm -rf src'), 'deny');
check('builder: rm -rf artifacts/tmp', C, sh('builder', 'b1', 'rm -rf artifacts/tmp'), 'allow');
check('builder: rm -fr test-results', C, sh('builder', 'b1', 'rm -fr test-results playwright-report'), 'allow');
check('builder: rm own file', C, sh('builder', 'b1', 'rm src/features/buyer/A.tsx'), 'allow');
check('builder: rm shared file', C, sh('builder', 'b1', 'rm src/core/events.ts'), 'deny');
check('builder: PowerShell Remove-Item -Recurse src', C, sh('builder', 'b1', 'Remove-Item -Recurse -Force src', { tool: 'PowerShell' }), 'deny');
check('builder: PowerShell rm -r artifacts\\x', C, sh('builder', 'b1', 'rm -r artifacts\\x', { tool: 'PowerShell' }), 'allow');
check('builder: find -delete', C, sh('builder', 'b1', 'find src -name "*.bak" -delete'), 'deny');

check('builder: echo > src/core', C, sh('builder', 'b1', 'echo hi > src/core/x.ts'), 'deny');
check('builder: echo > own file', C, sh('builder', 'b1', 'echo hi > src/features/buyer/A.tsx'), 'allow');
check('builder: log to artifacts', C, sh('builder', 'b1', 'npm run check > artifacts/check.log 2>&1'), 'allow');
check('builder: 2>/dev/null', C, sh('builder', 'b1', 'ls src 2>/dev/null'), 'allow');
check('builder: cd then write', C, sh('builder', 'b1', 'cd src/core && echo x > events.ts'), 'deny');
check('builder: cp into shared dir', C, sh('builder', 'b1', 'cp a.txt src/core/'), 'deny');
check('builder: sed -i shared', C, sh('builder', 'b1', "sed -i 's/a/b/' src/core/x.ts"), 'deny');
check('builder: tee own file', C, sh('builder', 'b1', 'echo hi | tee src/features/buyer/A.tsx'), 'allow');
check('builder: tee shared', C, sh('builder', 'b1', 'echo hi | tee -a src/app/App.tsx'), 'deny');
check('builder: PowerShell Set-Content shared', C, sh('builder', 'b1', 'Set-Content -Path src\\core\\x.ts -Value hi', { tool: 'PowerShell' }), 'deny');
check('builder: PowerShell Out-File own', C, sh('builder', 'b1', '"hi" | Out-File src/features/buyer/A.tsx', { tool: 'PowerShell' }), 'allow');
check('builder: touch outside scope', C, sh('builder', 'b1', 'touch src/features/buyer/Z.tsx'), 'deny');
check('verifier: write report', C, sh('verifier', 'v1', 'echo ok > artifacts/verify/x.md'), 'allow');
check('verifier: write feature', C, sh('verifier', 'v1', 'echo ok > src/features/buyer/A.tsx'), 'deny');
check('builder: PowerShell encoded command', C, sh('builder', 'b1', 'powershell -EncodedCommand ZQBjAGgAbwA=', { tool: 'Bash' }), 'deny');
check('builder: pwsh -Command git commit', C, sh('builder', 'b1', 'pwsh -Command "git commit -m x"'), 'deny');
check('builder: cmd /c del /s', C, sh('builder', 'b1', 'cmd /c "del /s /q src"'), 'deny');

{
  const res = run(C, null, { raw: '{"tool_name": "Bash", "tool_input": ' });
  record('fail open: truncated JSON', res.status === 0 && !(res.stdout || '').trim(), `exit ${res.status}`);
}

// ---------------------------------------------------------------- context hook

{
  const input = { session_id: 'sess1', transcript_path: mainTranscript, cwd: proj, hook_event_name: 'SessionStart', source: 'compact' };
  const res = run('context-refresh.mjs', input);
  let ok = res.status === 0;
  let detail = '';
  try {
    const j = JSON.parse(res.stdout);
    const text = j.hookSpecificOutput.additionalContext;
    ok = ok && j.hookSpecificOutput.hookEventName === 'SessionStart';
    for (const needle of ['Build state from docs/harness/status.md', 'Time now:', 'STAGE: W1', 'SHARED_LOCK: off', '## Now', 'Testing the hooks.', '## Needs Gordon', 'G1 passed']) {
      if (!text.includes(needle)) {
        ok = false;
        detail += `missing "${needle}". `;
      }
    }
    if (text.length > 9000) {
      ok = false;
      detail += 'over 9000 characters. ';
    }
  } catch (err) {
    ok = false;
    detail = `bad output: ${(res.stdout || '').slice(0, 120)} ${err}`;
  }
  record('context hook: status summary', ok, detail);
}
{
  const empty = path.join(tmp, 'no-status');
  fs.mkdirSync(empty, { recursive: true });
  const res = run('context-refresh.mjs', { cwd: empty, hook_event_name: 'SessionStart', source: 'startup' }, { root: empty });
  record('context hook: no status file', res.status === 0 && !(res.stdout || '').trim(), `exit ${res.status}`);
}

// ---------------------------------------------------------------- stop check

function stopInput(root, id = 'b1') {
  return {
    session_id: 'sess1',
    transcript_path: mainTranscript,
    cwd: root,
    hook_event_name: 'SubagentStop',
    stop_hook_active: false,
    agent_id: id,
    agent_type: 'builder',
    agent_transcript_path: T[id] || path.join(subagents, `agent-${id}.jsonl`),
    last_assistant_message: 'REPORT',
  };
}

const S = 'stop-check.mjs';
check('stop check: no package.json', S, stopInput(proj), 'allow');
check('stop check: no check:scope script', S, stopInput(projNoScript), 'allow', { root: projNoScript });
check('stop check: STOP_CHECK off', S, stopInput(projStopOff), 'allow', { root: projStopOff });
check('stop check: not a builder', S, { ...stopInput(projFail), agent_type: 'verifier' }, 'allow', { root: projFail });

const npm = spawnSync('npm --version', { shell: true, encoding: 'utf8' });
if (npm.status === 0) {
  check('stop check: failing check, round 1', S, stopInput(projFail), 'block', { root: projFail });
  const r2 = check('stop check: failing check, round 2', S, stopInput(projFail), 'block', { root: projFail });
  record('stop check: output passed back', (r2.stdout || '').includes('bad file'), (r2.stdout || '').slice(0, 160));
  check('stop check: gives up after 2 rounds', S, stopInput(projFail), 'allow', { root: projFail });
  check('stop check: passing check', S, stopInput(projPass), 'allow', { root: projPass });
  const countFile = path.join(projPass, 'artifacts', 'hooks', 'stop-check', 'b1.json');
  record('stop check: no count file after a pass', !fs.existsSync(countFile));
} else {
  record('stop check: npm cases skipped (npm not found)', true);
}

// ---------------------------------------------------------------- logs

{
  const log = path.join(proj, 'artifacts', 'hooks', 'guard.log');
  let ok = fs.existsSync(log);
  let detail = ok ? '' : 'guard.log missing';
  if (ok) {
    const lines = fs.readFileSync(log, 'utf8').trim().split('\n');
    for (const line of lines) {
      try {
        const j = JSON.parse(line);
        if ('content' in j) {
          ok = false;
          detail = 'a log line holds file content';
        }
      } catch {
        ok = false;
        detail = 'a log line is not JSON';
      }
    }
    if (ok && !lines.some((l) => l.includes('"decision":"deny"'))) {
      ok = false;
      detail = 'no deny decisions logged';
    }
  }
  record('logs: guard.log is JSON lines without content', ok, detail);
  const junk = fs.existsSync(path.join(process.cwd(), 'C:\\dev\\calhacks2026'));
  record('logs: Windows test root left no folder behind', !junk);
}

// ---------------------------------------------------------------- report

let failed = 0;
for (const r of results) {
  if (r.ok) console.log(`PASS  ${r.name}`);
  else {
    failed += 1;
    console.log(`FAIL  ${r.name}  (${r.detail})`);
  }
}
const total = results.length;
console.log(failed ? `FAIL ${failed} of ${total}` : `PASS ${total}/${total}`);

if (!process.env.KEEP_HOOKTEST) {
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    // ignore
  }
} else {
  console.log(`kept ${tmp}`);
}
process.exitCode = failed ? 1 : 0;
