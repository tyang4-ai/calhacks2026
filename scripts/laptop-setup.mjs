#!/usr/bin/env node
// node scripts/laptop-setup.mjs [--dry-run [--platform win32|linux|darwin]] [--check]
// The demo laptop, ready for live mode (D-deploy T3, C-1, D2-5). Gordon runs it on Windows on a
// good network, never in the cloud session. Node 22, no dependencies. It prints each step and its
// commands before it runs them, stops at the first failure with what to do, and never prints a
// key's value: .env is read inside Node, and only "present" or "missing" comes out.
//   1. git pull --ff-only origin main
//   2. the Python venv: create .venv if it's missing, install server/requirements.txt with the
//      venv's Python, and check that torch.__version__ ends in +cpu
//   3. npm ci, then npm run export:mock
//   4. the .env names, present or missing. An ELASTIC_AUTH=proxy or APIFY_AUTH=proxy line fails
//   5. the model: server/b11_embed/fetch_model.py pulls the newest published model
//   6. SpacetimeDB, as server/b13_spacetime/README.md says: the CLI, the local server on
//      127.0.0.1:3000, the module's packages, the publish, save_token.py, clear_runs
//   7. the API: start npm run server in a window of its own, or restart it when step 6 wrote a new
//      SPACETIME_TOKEN (a running server keeps the old one)
//   8. health: each key and service from /api/health as true or false, and the routers
//   9. the rehearsal checklist
// Flags: --dry-run prints every step and its commands and runs nothing. --check skips the installs
// and the starts and runs only steps 4 and 8. --platform shows another platform's commands in a dry
// run (for review from the cloud session). Any other flag or argument exits 1 before a step runs, so
// a typo like --dryrun can never start a real run. In a dry run, every "$" line is a command to
// paste as it is (into cmd.exe on Windows), and the lines without "$" say when it applies.
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const API_HEALTH = 'http://127.0.0.1:8000/api/health';
export const B15_STATUS = 'http://127.0.0.1:8000/api/b15/status';
export const SPACETIME_PING = 'http://127.0.0.1:3000/v1/ping';
export const PROXY_MESSAGE = 'Proxy mode works only in the cloud. Put the real key in .env.';
/** Where the SpacetimeDB CLI's Windows install command lives (docs/tech/spacetimedb/install-and-run-locally.md). */
export const SPACETIME_INSTALL_PAGE = 'https://spacetimedb.com/install';
export const PLATFORMS = ['win32', 'linux', 'darwin'];
export const USAGE = 'usage: node scripts/laptop-setup.mjs [--dry-run [--platform win32|linux|darwin]] [--check]';
/** server/config.py reads .env once, when the API starts, so a change to .env needs a restart by hand. */
export const RESTART_API =
  'The API reads .env only when it starts, so close the "Cindia API" window, start npm run server again in a window of its own, then run node scripts/laptop-setup.mjs --check';

/** The names step 4 checks (docs/v2/contracts.md section 1). Each entry is present when any of its names is. */
export const ENV_NAMES = [
  { label: 'CINDIA_ANTHROPIC_API_KEY or ANTHROPIC_API_KEY', names: ['CINDIA_ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY'] },
  { label: 'NESSIE_KEY', names: ['NESSIE_KEY'] },
  { label: 'ELASTIC_URL', names: ['ELASTIC_URL'] },
  { label: 'KIBANA_URL', names: ['KIBANA_URL'] },
  { label: 'ELASTIC_API_KEY', names: ['ELASTIC_API_KEY'] },
  { label: 'APIFY_TOKEN', names: ['APIFY_TOKEN'] },
  { label: 'HF_TOKEN', names: ['HF_TOKEN'] },
  { label: 'CINDIA_HF_REPO', names: ['CINDIA_HF_REPO'] },
  { label: 'PUBLIC_SITE_URL', names: ['PUBLIC_SITE_URL'] },
];
export const TOKEN_NAME = 'SPACETIME_TOKEN';

/** What fixes each health entry that reads false: the step, and the names or service behind it. */
export const HEALTH_FIX = {
  'keys.anthropic': `step 4: put CINDIA_ANTHROPIC_API_KEY or ANTHROPIC_API_KEY in .env. ${RESTART_API}`,
  'keys.nessie': `step 4: put NESSIE_KEY in .env. ${RESTART_API}`,
  'keys.elastic': `step 4: put ELASTIC_URL and ELASTIC_API_KEY in .env. ${RESTART_API}`,
  'keys.apify': `step 4: put APIFY_TOKEN in .env. ${RESTART_API}`,
  'keys.hf': `step 4: put HF_TOKEN in .env. ${RESTART_API}`,
  'services.spacetime': 'step 6: the local SpacetimeDB server on 127.0.0.1:3000. Run node scripts/laptop-setup.mjs again',
  'services.model': 'step 5: fetch_model.py into CINDIA_MODEL_DIR. Run node scripts/laptop-setup.mjs again',
  'b15.market': `step 4: put PUBLIC_SITE_URL (the Cloudflare Pages URL) in .env. ${RESTART_API}`,
};

export const CHECKLIST = [
  'Rehearsal checklist (D-deploy, "Prepare the demo laptop"):',
  '  1. Start the platform: npm run build, then npm run preview, then open http://localhost:4173/demo?mode=present',
  '  2. Play the whole tour in presenter mode with Live off: Space or the right arrow for each beat, the left arrow to replay one.',
  '  3. Turn Live on, then type a search and a support question of your own. Each answers live, and the badges say Live.',
  "  4. Close the API's window and ask again. The answer comes from the scripted source with the Simulated badge, and the tour still plays the same.",
  '  5. Start npm run server again in a window of its own, then run node scripts/laptop-setup.mjs --check to confirm health.',
  '  6. Right before judging: spacetime call -s local cindia clear_runs, then restart the API (server/b13_spacetime/README.md), so the swarm view starts empty.',
  '  7. Reserve an ethernet cable and bring a USB-C ethernet adapter. Hotspots are banned. If the network drops during judging, the tour needs none.',
];

// ---------------------------------------------------------------------------------------------
// .env, read inside Node. Values never leave these functions: only booleans and hashes do.

/** Each name in an .env text: { set: boolean, proxy: boolean }. A value of only spaces or quotes is not set. */
export function readEnvNames(text) {
  const out = new Map();
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(raw);
    if (!m) continue;
    let v = m[2].trim();
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1).trim();
    else v = v.replace(/\s+#.*$/, '').trim();
    out.set(m[1], { set: v !== '', proxy: v.toLowerCase() === 'proxy' });
  }
  return out;
}

/** sha256 of a name's line in an .env text, or null. Lets step 7 see a new token without holding it. */
export function lineFingerprint(text, name) {
  const line = String(text ?? '')
    .split(/\r?\n/)
    .find((l) => new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`).test(l));
  return line === undefined ? null : createHash('sha256').update(line.trim()).digest('hex');
}

function readEnvFile(root) {
  try {
    return fs.readFileSync(path.join(root, '.env'), 'utf8');
  } catch {
    return null;
  }
}

/**
 * Step 4: prints each name as present or missing, never a value. Fails on a missing name or on any
 * *_AUTH=proxy line. `env` is the process environment to count as well (server/config.py reads it
 * before .env). Returns { ok, missing, proxy }.
 */
export function envStep({ root = ROOT, env = process.env, log = console.log } = {}) {
  const text = readEnvFile(root);
  if (text === null) log('  .env: missing. Copy .env.example to .env and fill in the values (never paste a key into a chat)');
  const file = readEnvNames(text ?? '');
  const where = (name) => {
    if (file.get(name)?.set) return 'present';
    if (typeof env?.[name] === 'string' && env[name].trim() !== '') return 'present (shell)';
    return null;
  };
  const missing = [];
  for (const entry of ENV_NAMES) {
    const found = entry.names.map(where).find(Boolean);
    log(`  ${entry.label}: ${found ?? 'missing'}`);
    if (!found) missing.push(entry.label);
  }
  log(`  ${TOKEN_NAME}: ${where(TOKEN_NAME) ?? 'missing'} (step 6 writes it)`);
  const proxy = [];
  const authNames = new Set([...file.keys(), ...Object.keys(env ?? {})].filter((n) => n.endsWith('_AUTH')));
  for (const name of [...authNames].toSorted()) {
    const inFile = file.get(name)?.proxy;
    const inEnv = typeof env?.[name] === 'string' && env[name].trim().toLowerCase() === 'proxy';
    if (inFile || inEnv) proxy.push(name);
  }
  for (const name of proxy) log(`  ${name}=proxy${file.get(name)?.proxy ? ' in .env' : ' in the shell'}: ${PROXY_MESSAGE}`);
  if (missing.length) log(`  Missing: ${missing.join(', ')}. Put them in .env (docs/v2/apis-and-accounts.md says where each comes from), then run this again.`);
  return { ok: missing.length === 0 && proxy.length === 0, missing, proxy };
}

// ---------------------------------------------------------------------------------------------
// Health

/** Step 8's lines and failures from /api/health (and /api/b15/status when b15 is loaded). */
export function healthReport(health, b15Status = null) {
  const lines = [];
  const failures = [];
  for (const group of ['keys', 'services']) {
    const values = health?.[group];
    if (!values || typeof values !== 'object') {
      lines.push(`  ${group}: not in /api/health`);
      failures.push(`${group} missing from /api/health: pull the newest main (step 1) and restart the API (step 7)`);
      continue;
    }
    for (const [name, value] of Object.entries(values)) {
      const ok = value === true;
      lines.push(`  ${group}.${name}: ${ok}`);
      if (!ok) failures.push(`${group}.${name} is false. Fix: ${HEALTH_FIX[`${group}.${name}`] ?? 'see /api/health'}`);
    }
  }
  const routers = Array.isArray(health?.routers) ? health.routers : [];
  lines.push(`  routers: ${routers.length ? routers.join(', ') : '(none)'}`);
  if (routers.includes('b15')) {
    const market = b15Status?.market === true;
    lines.push(`  b15.market: ${market}`);
    if (!market) failures.push(`b15.market is false. Fix: ${HEALTH_FIX['b15.market']}`);
  }
  return { lines, failures, ok: failures.length === 0 };
}

async function getJson(url, timeoutMs = 3000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
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

async function waitFor(check, seconds) {
  const until = Date.now() + seconds * 1000;
  while (Date.now() < until) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return check();
}

// ---------------------------------------------------------------------------------------------
// Commands, as they're shown and as they run

/** The commands for one platform, each one a line to paste as it is (into cmd.exe on Windows). */
export function commandsFor(platform) {
  const win = platform === 'win32';
  const venvPy = win ? '.venv\\Scripts\\python.exe' : '.venv/bin/python';
  const sysPy = win ? 'py -3' : 'python3';
  // In a window of its own on Windows. Elsewhere the script runs it in the background, output in
  // artifacts/laptop/, and the line to paste runs it in a terminal of its own.
  const window = (title, cmd) => (win ? `start "${title}" cmd /k ${cmd}` : cmd);
  return {
    win,
    venvPy,
    pull: 'git pull --ff-only origin main',
    venvCreate: `${sysPy} -m venv .venv`,
    pipInstall: `${venvPy} -m pip install -r server/requirements.txt`,
    torchVersion: `${venvPy} -c "import torch; print(torch.__version__)"`,
    npmCi: 'npm ci',
    exportMock: 'npm run export:mock',
    fetchModel: `${venvPy} server/b11_embed/fetch_model.py`,
    spacetimeVersion: 'spacetime --version',
    spacetimeDefault: 'spacetime server set-default local',
    spacetimeStart: window('SpacetimeDB', 'spacetime start --listen-addr 127.0.0.1:3000'),
    moduleInstall: 'npm ci --no-audit --no-fund',
    moduleInstallNoLock: 'npm install --no-audit --no-fund',
    publish: 'spacetime publish -s local cindia --yes=skip-login',
    publishFresh: 'spacetime publish -s local cindia --delete-data=always --yes=skip-login,delete-data',
    saveToken: `${venvPy} server/b13_spacetime/save_token.py`,
    clearRuns: 'spacetime call -s local cindia clear_runs',
    serverStart: window('Cindia API', 'npm run server'),
    // findstr and lsof print the listener's PID; 1234 stands for it in the kill line.
    findPort: win ? 'netstat -ano -p TCP | findstr :8000' : 'lsof -t -iTCP:8000 -sTCP:LISTEN',
    killPid: win ? 'taskkill /PID 1234 /T /F' : 'kill 1234',
    health: `curl -s ${API_HEALTH}`,
    b15Status: `curl -s ${B15_STATUS}`,
  };
}

const MODULE_DIR = 'server/b13_spacetime/module';

const asCmd = (text) => ({ cmd: text });
const asNote = (text) => ({ note: text });

/**
 * The nine steps: title, items and whether --check runs it. An item is { cmd } (a line to paste as
 * it is) or { note } (when or where the commands after it apply).
 */
export function steps(platform) {
  const c = commandsFor(platform);
  const cmd = asCmd;
  const note = asNote;
  const own = c.win ? 'in a window of its own' : 'in a terminal of its own';
  return [
    { n: 1, title: 'Pull the newest main', items: [cmd(c.pull)] },
    {
      n: 2,
      title: 'The Python venv and the CPU build of torch',
      items: [note('Only if .venv is missing:'), cmd(c.venvCreate), note('Then:'), cmd(c.pipInstall), note('It must print a version ending in +cpu:'), cmd(c.torchVersion)],
    },
    { n: 3, title: 'Node packages and the mock data', items: [cmd(c.npmCi), cmd(c.exportMock)] },
    {
      n: 4,
      title: 'The .env names, present or missing (never their values)',
      items: [note('The script reads .env inside Node and prints each name as present or missing. A missing name, or an ELASTIC_AUTH=proxy or APIFY_AUTH=proxy line, fails the step.')],
      check: true,
    },
    { n: 5, title: 'The model from the Hugging Face repo', items: [cmd(c.fetchModel)] },
    {
      n: 6,
      title: 'SpacetimeDB (server/b13_spacetime/README.md)',
      items: [
        cmd(c.spacetimeVersion),
        cmd(c.spacetimeDefault),
        note(`Only if ${SPACETIME_PING} doesn't answer, start the server ${own}, then wait up to 30 s:`),
        cmd(c.spacetimeStart),
        note(`From ${MODULE_DIR}/:`),
        cmd(c.moduleInstall),
        cmd(c.publish),
        note('From the repo root:'),
        cmd(c.saveToken),
        cmd(c.clearRuns),
      ],
    },
    {
      n: 7,
      title: 'The API on port 8000',
      items: [
        note(`Only if ${API_HEALTH} doesn't answer, start the API ${own}, then wait up to 60 s:`),
        cmd(c.serverStart),
        note(`Only if the API answers and step 6 wrote a new ${TOKEN_NAME} (a running API keeps the old one): find the PID listening on port 8000, stop it with that PID in place of 1234, then start the API again:`),
        cmd(c.findPort),
        cmd(c.killPid),
        cmd(c.serverStart),
        note(`Step 7 restarts the API only for a new ${TOKEN_NAME}. After any other change to .env, restart the API window yourself.`),
      ],
    },
    {
      n: 8,
      title: 'Health: every key and service true',
      items: [cmd(c.health), note('When /api/health lists b15:'), cmd(c.b15Status)],
      check: true,
    },
    { n: 9, title: 'The rehearsal checklist', items: CHECKLIST.map(note) },
  ];
}

/** Parses the command line. Returns { dryRun, check, platform, error }; error names the first bad argument. */
export function parseArgs(argv) {
  const args = argv.filter((a) => a !== '--');
  const out = { dryRun: false, check: false, platform: null, error: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--check') out.check = true;
    else if (a === '--platform' || a.startsWith('--platform=')) {
      const v = a.includes('=') ? a.slice(a.indexOf('=') + 1) : args[++i];
      if (!PLATFORMS.includes(v)) {
        out.error = `--platform needs one of ${PLATFORMS.join(', ')}${v === undefined ? '' : `, not ${v}`}`;
        return out;
      }
      out.platform = v;
    } else {
      out.error = `unknown ${a.startsWith('-') ? 'flag' : 'argument'} ${a}`;
      return out;
    }
  }
  if (out.platform && !out.dryRun) out.error = '--platform works only with --dry-run';
  return out;
}

// ---------------------------------------------------------------------------------------------
// Running

class StepFailure extends Error {}

function fail(message) {
  throw new StepFailure(message);
}

/** Prints a command before it runs, with its folder on the line before when it isn't the repo root. */
function show(cmd, cwd) {
  if (cwd && cwd !== ROOT) console.log(`  From ${path.relative(ROOT, cwd).split(path.sep).join('/')}/:`);
  console.log(`  $ ${cmd}`);
}

/** Prints a request the script makes itself. */
function probe(url) {
  console.log(`  checking ${url}`);
}

/** Runs a shell command with its output shown. Returns the exit code. */
function sh(cmd, { cwd = ROOT } = {}) {
  show(cmd, cwd);
  const r = spawnSync(cmd, { cwd, shell: true, stdio: 'inherit', windowsHide: false });
  return r.status ?? 1;
}

/** Runs a shell command and captures its output. */
function shCapture(cmd, { cwd = ROOT } = {}) {
  show(cmd, cwd);
  const r = spawnSync(cmd, { cwd, shell: true, encoding: 'utf8', windowsHide: true });
  return { code: r.status ?? 1, out: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}

/** Starts a long-running command in a window of its own (Windows) or in the background. */
function startInWindow(title, cmd, logName) {
  if (process.platform === 'win32') {
    // `start` opens the new window and returns at once. The window outlives this script.
    const line = `start "${title}" cmd /k ${cmd}`;
    show(line);
    spawnSync(line, { cwd: ROOT, shell: true, stdio: 'ignore' });
    return;
  }
  const dir = path.join(ROOT, 'artifacts', 'laptop');
  fs.mkdirSync(dir, { recursive: true });
  const logFile = path.join(dir, logName);
  console.log(`  In the background, output in artifacts/laptop/${logName}:`);
  show(cmd);
  const fd = fs.openSync(logFile, 'a');
  const child = spawn(cmd, { cwd: ROOT, shell: true, detached: true, stdio: ['ignore', fd, fd] });
  child.unref();
}

function venvPython() {
  return process.platform === 'win32' ? path.join(ROOT, '.venv', 'Scripts', 'python.exe') : path.join(ROOT, '.venv', 'bin', 'python');
}

function q(p) {
  return `"${p}"`;
}

/** torch's pin from server/requirements.txt ("torch==2.14.1"), or plain "torch". */
export function torchPin(root) {
  try {
    const line = fs
      .readFileSync(path.join(root, 'server', 'requirements.txt'), 'utf8')
      .split(/\r?\n/)
      .find((l) => /^\s*torch\s*==/.test(l));
    return line ? line.trim().replace(/\s+/g, '') : 'torch';
  } catch {
    return 'torch';
  }
}

/** PIDs listening on a TCP port, from netstat on Windows and lsof elsewhere. */
export function parseNetstatPids(text, port) {
  const pids = new Set();
  for (const line of String(text).split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 5 || !/^TCP$/i.test(cols[0])) continue;
    if (!cols[1].endsWith(`:${port}`) || !/^LISTENING$/i.test(cols[3])) continue;
    if (/^\d+$/.test(cols[4]) && cols[4] !== '0') pids.add(cols[4]);
  }
  return [...pids];
}

function listeningPids(port) {
  if (process.platform === 'win32') {
    const r = shCapture('netstat -ano -p TCP');
    return parseNetstatPids(r.out, port);
  }
  const r = shCapture(`lsof -t -iTCP:${port} -sTCP:LISTEN`);
  return r.out.split(/\s+/).filter((p) => /^\d+$/.test(p));
}

function killPid(pid) {
  return process.platform === 'win32' ? sh(`taskkill /PID ${pid} /T /F`) : sh(`kill ${pid}`);
}

const RUN = {
  1() {
    if (sh('git pull --ff-only origin main') !== 0) {
      fail('git pull failed. Commit or stash local changes (or fix the network), then run this again.');
    }
  },
  2(c) {
    const py = venvPython();
    if (!fs.existsSync(py)) {
      if (sh(c.venvCreate) !== 0) fail(`Couldn't create .venv. Install Python 3.12 or later${c.win ? ' (the py launcher comes with it)' : ''}, then run this again.`);
    } else console.log('  .venv exists');
    if (sh(`${q(py)} -m pip install -r server/requirements.txt`) !== 0) {
      fail('pip install failed. Check the network (not venue Wi-Fi), then run this again.');
    }
    const r = shCapture(`${q(py)} -c "import torch; print(torch.__version__)"`);
    const version = r.out.split(/\r?\n/).pop() ?? '';
    console.log(`  torch ${version || '(not found)'}`);
    if (r.code !== 0 || !version.endsWith('+cpu')) {
      const pin = torchPin(ROOT);
      fail(
        `torch isn't the CPU build (${version || 'not installed'}). Run ${q(py)} -m pip install --force-reinstall --no-deps ${pin} --index-url https://download.pytorch.org/whl/cpu, then run this again.`,
      );
    }
  },
  3() {
    if (sh('npm ci') !== 0) fail('npm ci failed. Close every window running npm run dev, preview or server (they lock node_modules), then run this again.');
    if (sh('npm run export:mock') !== 0) fail('npm run export:mock failed. Read the line above it, then run this again.');
  },
  4() {
    console.log('  reading .env inside Node');
    const r = envStep();
    if (!r.ok) {
      fail(
        r.proxy.length
          ? PROXY_MESSAGE
          : `Put ${r.missing.join(', ')} in .env, then run this again. If the API is already running, restart its window too: it reads .env only when it starts.`,
      );
    }
  },
  5() {
    const script = path.join(ROOT, 'server', 'b11_embed', 'fetch_model.py');
    if (!fs.existsSync(script)) fail("server/b11_embed/fetch_model.py isn't in this checkout yet (B11-embed T8). Pull again later, or tell the build session.");
    if (sh(`${q(venvPython())} server/b11_embed/fetch_model.py`) !== 0) {
      fail('fetch_model.py failed. Check HF_TOKEN (read access) and CINDIA_HF_REPO in .env and the network, then run this again.');
    }
  },
  async 6(c, ctx) {
    const v = shCapture('spacetime --version');
    if (v.code !== 0) {
      fail(
        c.win
          ? `The SpacetimeDB CLI isn't installed. Open ${SPACETIME_INSTALL_PAGE} and run its PowerShell command for Windows, then open a new terminal and run this again.`
          : "The SpacetimeDB CLI isn't installed. Run: curl -sSf https://install.spacetimedb.com | sh -s -- --yes, open a new terminal, then run this again.",
      );
    }
    const version = (/(\d+\.\d+\.\d+)/.exec(v.out) || [])[1];
    console.log(`  spacetime ${version ?? v.out.split(/\r?\n/)[0]}${version && version !== '2.13.0' ? ' (the module is built with 2.13.0; if the publish fails, install that version)' : ''}`);
    if (sh('spacetime server set-default local') !== 0) fail("spacetime server set-default local failed. Read the line above it, then run this again.");
    probe(SPACETIME_PING);
    if (await answers(SPACETIME_PING)) console.log('  SpacetimeDB answers on 127.0.0.1:3000');
    else {
      startInWindow('SpacetimeDB', 'spacetime start --listen-addr 127.0.0.1:3000', 'spacetime.log');
      console.log('  waiting up to 30 s for 127.0.0.1:3000');
      if (!(await waitFor(() => answers(SPACETIME_PING), 30))) {
        fail("SpacetimeDB didn't answer on 127.0.0.1:3000 within 30 s. Look at its window, close anything else on port 3000, then run this again.");
      }
    }
    const moduleDir = path.join(ROOT, ...MODULE_DIR.split('/'));
    const install = fs.existsSync(path.join(moduleDir, 'package-lock.json')) ? c.moduleInstall : c.moduleInstallNoLock;
    if (sh(install, { cwd: moduleDir }) !== 0) fail(`${install} failed in ${MODULE_DIR}/. Check the network, then run this again.`);
    if (sh(c.publish, { cwd: moduleDir }) !== 0) {
      fail(
        `The publish failed. If it says the change breaks the schema, run this from ${MODULE_DIR}/ (it deletes the demo data, and the API seeds it again): ${c.publishFresh}. Then run this again.`,
      );
    }
    const before = lineFingerprint(readEnvFile(ROOT), TOKEN_NAME);
    if (sh(`${q(venvPython())} server/b13_spacetime/save_token.py`) !== 0) fail('save_token.py failed. Read the line above it, then run this again.');
    const after = lineFingerprint(readEnvFile(ROOT), TOKEN_NAME);
    if (!after || !readEnvNames(readEnvFile(ROOT) ?? '').get(TOKEN_NAME)?.set) fail(`${TOKEN_NAME} isn't in .env after save_token.py. Run it again from the repo root.`);
    ctx.tokenChanged = before !== after;
    console.log(`  ${TOKEN_NAME}: present${ctx.tokenChanged ? ' (new)' : ' (unchanged)'}`);
    if (sh(c.clearRuns) !== 0) fail('clear_runs failed. Is the module published? Read the line above it, then run this again.');
  },
  async 7(c, ctx) {
    probe(API_HEALTH);
    const up = await answers(API_HEALTH);
    if (up && !ctx.tokenChanged) {
      console.log('  The API answers, and the token is unchanged');
      return;
    }
    if (up) {
      console.log(`  The API answers but keeps the old ${TOKEN_NAME}, so it restarts`);
      const pids = listeningPids(8000);
      if (!pids.length) fail("Couldn't find the process on port 8000. Close the API's window, then run this again.");
      for (const pid of pids) killPid(pid);
      if (!(await waitFor(async () => !(await answers(API_HEALTH, 800)), 15))) fail("The API on port 8000 didn't stop. Close its window, then run this again.");
    }
    startInWindow('Cindia API', 'npm run server', 'api.log');
    console.log('  waiting up to 60 s for the API');
    if (!(await waitFor(() => answers(API_HEALTH), 60))) fail("The API didn't answer within 60 s. Read its window (a missing package or a bad .env line), then run this again.");
  },
  async 8() {
    probe(API_HEALTH);
    const health = await getJson(API_HEALTH);
    if (!health) fail("The API doesn't answer on port 8000. Start npm run server in a window of its own (step 7), then run this again.");
    const routers = Array.isArray(health.routers) ? health.routers : [];
    let b15 = null;
    if (routers.includes('b15')) {
      probe(B15_STATUS);
      b15 = await getJson(B15_STATUS);
    }
    const report = healthReport(health, b15);
    for (const l of report.lines) console.log(l);
    if (!report.ok) fail(report.failures.join('\n  '));
  },
  9() {
    for (const l of CHECKLIST) console.log(l);
  },
};

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.error) {
    // Before any step, so a typo can never start a real run.
    console.log(`laptop-setup: ${opts.error}. Nothing ran.\n${USAGE}`);
    return 1;
  }
  const { dryRun, check } = opts;
  const platform = opts.platform ?? process.platform;
  const all = steps(platform);
  const chosen = check ? all.filter((s) => s.check) : all;
  console.log(
    `laptop-setup: ${dryRun ? 'dry run, nothing runs' : check ? 'check only (steps 4 and 8)' : 'setting up the demo laptop for live mode'} · ${platform === 'win32' ? 'Windows' : platform} commands`,
  );
  if (dryRun) {
    console.log(`Each "$" line is a command to paste as it is${platform === 'win32' ? ' into cmd.exe' : ''}, from the repo root unless a line says otherwise.`);
    for (const s of chosen) {
      console.log(`\nStep ${s.n}/9 · ${s.title}`);
      for (const item of s.items) console.log(item.cmd !== undefined ? `  $ ${item.cmd}` : `  ${item.note}`);
    }
    console.log('\nlaptop-setup: dry run done. Nothing ran.');
    return 0;
  }
  const c = commandsFor(process.platform);
  const ctx = { tokenChanged: false };
  const failures = [];
  for (const s of chosen) {
    console.log(`\nStep ${s.n}/9 · ${s.title}`);
    try {
      await RUN[s.n](c, ctx);
      console.log(`  step ${s.n}: ok`);
    } catch (err) {
      if (!(err instanceof StepFailure)) throw err;
      console.log(`  step ${s.n}: FAILED\n  What to do: ${err.message}`);
      failures.push(s.n);
      // --check runs both of its steps, so health shows even when a name is missing.
      if (!check) break;
    }
  }
  if (failures.length) {
    console.log(`\nlaptop-setup: stopped at step ${failures[0]}. Fix it, then run node scripts/laptop-setup.mjs${check ? ' --check' : ''} again.`);
    return 1;
  }
  console.log(`\nlaptop-setup: ${check ? 'health is all true' : 'done. /api/health reads all true'}.`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(await main());
}
