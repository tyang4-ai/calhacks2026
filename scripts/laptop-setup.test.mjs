// node --test scripts/laptop-setup.test.mjs
// The demo-laptop script (D-deploy T3), without running any of its steps: the .env names step on a
// temporary folder with fake values, the token fingerprint, the health report, the netstat reader,
// and the dry run, which must print steps 1 to 9 with their commands and run none of them.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  ENV_NAMES,
  PROXY_MESSAGE,
  SPACETIME_INSTALL_PAGE,
  TOKEN_NAME,
  envStep,
  healthReport,
  lineFingerprint,
  parseArgs,
  parseNetstatPids,
  readEnvNames,
  torchPin,
} from './laptop-setup.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts', 'laptop-setup.mjs');

// Fake values only, none shaped like a real key.
const FAKE = {
  CINDIA_ANTHROPIC_API_KEY: 'fake-value-anthropic-0001',
  NESSIE_KEY: 'fake-value-nessie-0002',
  ELASTIC_URL: 'https://fake-elastic.example.com',
  KIBANA_URL: 'https://fake-kibana.example.com',
  ELASTIC_API_KEY: 'fake-value-elastic-0003',
  APIFY_TOKEN: 'fake-value-apify-0004',
  HF_TOKEN: 'fake-value-hf-0005',
  CINDIA_HF_REPO: 'fake-account/cindia-embed',
  PUBLIC_SITE_URL: 'https://fake-site.example.org',
};

function envText(values) {
  return `${Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')}\n`;
}

function assertNoValue(out, values) {
  for (const v of Object.values(values)) if (v && v !== 'proxy') assert.ok(!out.includes(v), 'a value was printed');
}

describe('step 4, the .env names', () => {
  let dir;
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cindia-laptop-'));
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const runStep = (values, env = {}) => {
    fs.writeFileSync(path.join(dir, '.env'), typeof values === 'string' ? values : envText(values));
    const lines = [];
    const result = envStep({ root: dir, env, log: (l) => lines.push(l) });
    return { result, out: lines.join('\n') };
  };

  test('every name present: each prints "present" and no value', () => {
    const { result, out } = runStep(FAKE);
    assert.equal(result.ok, true);
    for (const e of ENV_NAMES) assert.match(out, new RegExp(`^  ${e.label}: present$`, 'm'), e.label);
    assertNoValue(out, FAKE);
  });

  test('a missing or empty name prints "missing" and fails the step, still printing no value', () => {
    const values = { ...FAKE, HF_TOKEN: '', PUBLIC_SITE_URL: '""' };
    delete values.NESSIE_KEY;
    const { result, out } = runStep(values);
    assert.equal(result.ok, false);
    assert.deepEqual(result.missing, ['NESSIE_KEY', 'HF_TOKEN', 'PUBLIC_SITE_URL']);
    assert.match(out, /^ {2}NESSIE_KEY: missing$/m);
    assert.match(out, /^ {2}HF_TOKEN: missing$/m);
    assert.match(out, /^ {2}PUBLIC_SITE_URL: missing$/m);
    assert.match(out, /^ {2}APIFY_TOKEN: present$/m);
    for (const line of out.split('\n').filter((l) => ENV_NAMES.some((e) => l.startsWith(`  ${e.label}:`)))) {
      assert.match(line, /: (present|missing)$/, line);
    }
    assertNoValue(out, values);
  });

  test('either Anthropic name counts, and the shell environment counts too', () => {
    const values = { ...FAKE };
    delete values.CINDIA_ANTHROPIC_API_KEY;
    values.ANTHROPIC_API_KEY = 'fake-value-windows-0006';
    assert.equal(runStep(values).result.ok, true);
    delete values.ANTHROPIC_API_KEY;
    delete values.APIFY_TOKEN;
    const { result, out } = runStep(values, { APIFY_TOKEN: 'fake-value-shell-0007', CINDIA_ANTHROPIC_API_KEY: 'fake-value-shell-0008' });
    assert.equal(result.ok, true);
    assert.match(out, /^ {2}APIFY_TOKEN: present \(shell\)$/m);
    assert.ok(!out.includes('fake-value-shell'), 'a shell value was printed');
  });

  test('an ELASTIC_AUTH=proxy or APIFY_AUTH=proxy line fails with the proxy message', () => {
    for (const name of ['ELASTIC_AUTH', 'APIFY_AUTH']) {
      const { result, out } = runStep({ ...FAKE, [name]: 'proxy' });
      assert.equal(result.ok, false, name);
      assert.deepEqual(result.proxy, [name]);
      assert.ok(out.includes(PROXY_MESSAGE), `${name}: the message is printed`);
      assert.equal(PROXY_MESSAGE, 'Proxy mode works only in the cloud. Put the real key in .env.');
      assertNoValue(out, FAKE);
    }
    const shell = runStep(FAKE, { APIFY_AUTH: 'proxy' });
    assert.equal(shell.result.ok, false);
    assert.ok(shell.out.includes(PROXY_MESSAGE));
    assert.equal(runStep({ ...FAKE, ELASTIC_AUTH: '' }).result.ok, true, 'an empty flag is fine');
  });

  test(`${TOKEN_NAME} is reported but never fails step 4`, () => {
    const { result, out } = runStep(FAKE);
    assert.equal(result.ok, true);
    assert.match(out, new RegExp(`^  ${TOKEN_NAME}: missing \\(step 6 writes it\\)$`, 'm'));
    const withToken = runStep({ ...FAKE, [TOKEN_NAME]: 'fake-value-token-0009' });
    assert.match(withToken.out, new RegExp(`^  ${TOKEN_NAME}: present`, 'm'));
    assert.ok(!withToken.out.includes('fake-value-token-0009'));
  });

  test('no .env at all: every name missing, and the step says to make one', () => {
    fs.rmSync(path.join(dir, '.env'));
    const lines = [];
    const result = envStep({ root: dir, env: {}, log: (l) => lines.push(l) });
    assert.equal(result.ok, false);
    assert.equal(result.missing.length, ENV_NAMES.length);
    assert.match(lines[0], /\.env: missing\. Copy \.env\.example to \.env/);
  });
});

describe('reading .env without holding values', () => {
  test('readEnvNames keeps only set and proxy booleans', () => {
    const names = readEnvNames('export A=1\nB = "two"\nC=\nD=\'\'\nE=proxy\n# F=x\nG=val # note\nH="  "\n');
    assert.deepEqual(Object.fromEntries(names), {
      A: { set: true, proxy: false },
      B: { set: true, proxy: false },
      C: { set: false, proxy: false },
      D: { set: false, proxy: false },
      E: { set: true, proxy: true },
      G: { set: true, proxy: false },
      H: { set: false, proxy: false },
    });
  });

  test('lineFingerprint tells a new token line from the old one, and holds no value', () => {
    const a = lineFingerprint(`X=1\n${TOKEN_NAME}=fake-value-old\n`, TOKEN_NAME);
    const same = lineFingerprint(`${TOKEN_NAME}=fake-value-old\r\nY=2\n`, TOKEN_NAME);
    const b = lineFingerprint(`X=1\n${TOKEN_NAME}=fake-value-new\n`, TOKEN_NAME);
    assert.equal(a, same);
    assert.notEqual(a, b);
    assert.match(a, /^[0-9a-f]{64}$/);
    assert.equal(lineFingerprint('X=1\n', TOKEN_NAME), null);
  });

  test('torchPin reads the pin from server/requirements.txt', () => {
    assert.match(torchPin(ROOT), /^torch==\d+\.\d+/);
    assert.equal(torchPin(path.join(os.tmpdir(), 'no-such-repo')), 'torch');
  });
});

describe('step 8, the health report', () => {
  const healthy = {
    ok: true,
    keys: { anthropic: true, nessie: true, elastic: true, apify: true, hf: true },
    services: { spacetime: true, model: true },
    routers: ['b01', 'b11', 'b15'],
  };

  test('all true passes and lists each key, service and router', () => {
    const r = healthReport(healthy, { market: true });
    assert.equal(r.ok, true);
    for (const name of ['keys.anthropic', 'keys.nessie', 'keys.elastic', 'keys.apify', 'keys.hf', 'services.spacetime', 'services.model']) {
      assert.ok(r.lines.includes(`  ${name}: true`), name);
    }
    assert.ok(r.lines.includes('  routers: b01, b11, b15'));
    assert.ok(r.lines.includes('  b15.market: true'));
  });

  test('a false entry fails, naming the step that fixes it', () => {
    const r = healthReport({ ...healthy, keys: { ...healthy.keys, apify: false }, services: { spacetime: false, model: false } }, { market: false });
    assert.equal(r.ok, false);
    assert.ok(r.lines.includes('  keys.apify: false'));
    const text = r.failures.join('\n');
    assert.match(text, /keys\.apify is false\. Fix: step 4: put APIFY_TOKEN in \.env/);
    assert.match(text, /services\.spacetime is false\. Fix: step 6/);
    assert.match(text, /services\.model is false\. Fix: step 5/);
    assert.match(text, /b15\.market is false\. Fix: step 4: put PUBLIC_SITE_URL/);
  });

  test("a key's fix says to restart the API by hand, since step 7 restarts only for a new token", () => {
    const keys = Object.fromEntries(Object.keys(healthy.keys).map((k) => [k, false]));
    const r = healthReport({ ...healthy, keys }, { market: false });
    assert.equal(r.failures.length, 6);
    for (const f of r.failures) {
      assert.match(f, /reads \.env only when it starts/, f);
      assert.match(f, /start npm run server again in a window of its own/, f);
      assert.doesNotMatch(f, /step 7 restarts/, f);
    }
  });

  test('a v1 health answer without services fails', () => {
    const r = healthReport({ ok: true, keys: { anthropic: true, nessie: true }, routers: [] });
    assert.equal(r.ok, false);
    assert.match(r.failures.join(), /services missing/);
  });
});

test('parseNetstatPids finds the PIDs listening on a port', () => {
  const sample = [
    'Active Connections',
    '',
    '  Proto  Local Address          Foreign Address        State           PID',
    '  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       1012',
    '  TCP    127.0.0.1:8000         0.0.0.0:0              LISTENING       4242',
    '  TCP    127.0.0.1:8000         127.0.0.1:53111        ESTABLISHED     4242',
    '  TCP    127.0.0.1:18000        0.0.0.0:0              LISTENING       777',
    '  TCP    [::1]:8000             [::]:0                 LISTENING       5151',
  ].join('\r\n');
  assert.deepEqual(parseNetstatPids(sample, 8000), ['4242', '5151']);
  assert.deepEqual(parseNetstatPids(sample, 3000), []);
});

describe('the dry run', () => {
  let fakeBin;
  let marker;
  before(() => {
    fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), 'cindia-fakebin-'));
    marker = path.join(fakeBin, 'ran.txt');
    if (process.platform !== 'win32') {
      for (const name of ['git', 'npm', 'npx', 'spacetime', 'python', 'python3', 'py', 'lsof', 'netstat', 'taskkill', 'pip']) {
        fs.writeFileSync(path.join(fakeBin, name), `#!/bin/sh\necho "${name} $*" >> "${marker}"\n`, { mode: 0o755 });
      }
    }
  });
  after(() => fs.rmSync(fakeBin, { recursive: true, force: true }));

  const dry = (...extra) =>
    spawnSync(process.execPath, [SCRIPT, '--dry-run', ...extra], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${fakeBin}${path.delimiter}${process.env.PATH}` },
    });

  test('exits 0, prints steps 1 to 9 in order with their commands, and runs none of them', () => {
    const r = dry();
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const order = [...r.stdout.matchAll(/^Step (\d)\/9 · /gm)].map((m) => Number(m[1]));
    assert.deepEqual(order, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const blocks = r.stdout.split(/^Step \d\/9 · /m).slice(1);
    for (const [i, b] of blocks.entries()) {
      // Step 4 runs inside Node and step 9 prints the checklist; every other step has commands.
      if (i + 1 !== 4 && i + 1 !== 9) assert.match(b, /^ {2}\$ \S/m, `step ${i + 1} shows a command`);
    }
    for (const cmd of [
      'git pull --ff-only origin main',
      '-m pip install -r server/requirements.txt',
      'import torch; print(torch.__version__)',
      'npm ci',
      'npm run export:mock',
      'server/b11_embed/fetch_model.py',
      'spacetime --version',
      'spacetime server set-default local',
      'spacetime start --listen-addr 127.0.0.1:3000',
      'npm ci --no-audit --no-fund',
      'spacetime publish -s local cindia --yes=skip-login',
      'server/b13_spacetime/save_token.py',
      'spacetime call -s local cindia clear_runs',
      'npm run server',
      'http://127.0.0.1:8000/api/health',
    ]) {
      assert.ok(r.stdout.includes(cmd), cmd);
    }
    assert.match(r.stdout, /Rehearsal checklist/);
    assert.match(r.stdout, /Nothing ran\./);
    if (process.platform !== 'win32') assert.equal(fs.existsSync(marker), false, `a command ran: ${fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8') : ''}`);
  });

  test("the B11 and B13 commands match their plans and B13's README", () => {
    const out = dry().stdout;
    const readme = fs.readFileSync(path.join(ROOT, 'server', 'b13_spacetime', 'README.md'), 'utf8');
    const b13 = fs.readFileSync(path.join(ROOT, 'docs', 'plans', 'B13-live.md'), 'utf8');
    const b11 = fs.readFileSync(path.join(ROOT, 'docs', 'plans', 'B11-embed.md'), 'utf8');
    for (const cmd of [
      'spacetime start --listen-addr 127.0.0.1:3000',
      'npm ci --no-audit --no-fund',
      'spacetime publish -s local cindia --yes=skip-login',
      'server/b13_spacetime/save_token.py',
      'spacetime call -s local cindia clear_runs',
    ]) {
      assert.ok(out.includes(cmd) && readme.includes(cmd), `${cmd} is in the dry run and the README`);
    }
    assert.ok(out.includes('spacetime server set-default local') && b13.includes('spacetime server set-default local'));
    assert.ok(out.includes('server/b11_embed/fetch_model.py') && b11.includes('python server/b11_embed/fetch_model.py'));
  });

  test('Windows commands: py -3, the venv Python, windows of their own, netstat and taskkill', () => {
    const out = dry('--platform', 'win32').stdout;
    for (const cmd of [
      'py -3 -m venv .venv',
      '.venv\\Scripts\\python.exe -m pip install -r server/requirements.txt',
      '.venv\\Scripts\\python.exe server/b11_embed/fetch_model.py',
      '.venv\\Scripts\\python.exe server/b13_spacetime/save_token.py',
      'start "SpacetimeDB" cmd /k spacetime start --listen-addr 127.0.0.1:3000',
      'start "Cindia API" cmd /k npm run server',
      'netstat -ano -p TCP | findstr :8000',
      'taskkill /PID 1234 /T /F',
    ]) {
      assert.ok(out.includes(`  $ ${cmd}\n`), cmd);
    }
  });

  test('every "$" line is a command alone, with no prose or placeholder in angle brackets', () => {
    for (const platform of ['linux', 'win32']) {
      const lines = dry('--platform', platform)
        .stdout.split('\n')
        .filter((l) => l.startsWith('  $ '));
      assert.ok(lines.length >= 15, platform);
      for (const l of lines) {
        assert.doesNotMatch(l, /\s{2}\(|only if|, then|<[a-z]+>|^ {2}\$ (GET|read|print) /, `${platform}: ${l}`);
      }
    }
  });

  test('the Windows SpacetimeDB install points at the install page only, as docs/tech says', () => {
    const source = fs.readFileSync(SCRIPT, 'utf8');
    const doc = fs.readFileSync(path.join(ROOT, 'docs', 'tech', 'spacetimedb', 'install-and-run-locally.md'), 'utf8');
    assert.ok(doc.includes(SPACETIME_INSTALL_PAGE));
    assert.doesNotMatch(source, /\biwr\b|windows\.spacetimedb\.com/);
  });

  test('--check shows only steps 4 and 8', () => {
    const r = dry('--check');
    assert.equal(r.status, 0);
    assert.deepEqual(
      [...r.stdout.matchAll(/^Step (\d)\/9 · /gm)].map((m) => Number(m[1])),
      [4, 8],
    );
  });
});

describe('arguments', () => {
  test('parseArgs knows --dry-run, --check and --platform, and names anything else', () => {
    assert.deepEqual(parseArgs(['--dry-run', '--check']), { dryRun: true, check: true, platform: null, error: null });
    assert.equal(parseArgs(['--', '--dry-run', '--platform', 'win32']).platform, 'win32');
    assert.equal(parseArgs(['--dry-run', '--platform=linux']).platform, 'linux');
    assert.equal(parseArgs(['--dryrun']).error, 'unknown flag --dryrun');
    assert.equal(parseArgs(['--check', 'now']).error, 'unknown argument now');
    assert.match(parseArgs(['--dry-run', '--platform']).error, /--platform needs one of win32, linux, darwin$/);
    assert.match(parseArgs(['--dry-run', '--platform', 'mac']).error, /not mac/);
    assert.equal(parseArgs(['--platform', 'win32']).error, '--platform works only with --dry-run');
  });

  describe('an unknown flag exits 1 before any step runs', () => {
    let fakeBin;
    let marker;
    before(() => {
      fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), 'cindia-fakebin-'));
      marker = path.join(fakeBin, 'ran.txt');
      if (process.platform !== 'win32') {
        for (const name of ['git', 'npm', 'spacetime', 'python', 'python3', 'py', 'lsof', 'curl']) {
          fs.writeFileSync(path.join(fakeBin, name), `#!/bin/sh\necho "${name} $*" >> "${marker}"\n`, { mode: 0o755 });
        }
      }
    });
    after(() => fs.rmSync(fakeBin, { recursive: true, force: true }));

    for (const args of [['--dryrun'], ['--dry-run', '--chek'], ['-n'], ['dry-run'], ['--platform', 'win32']]) {
      test(args.join(' '), () => {
        const r = spawnSync(process.execPath, [SCRIPT, ...args], {
          cwd: ROOT,
          encoding: 'utf8',
          env: { ...process.env, PATH: `${fakeBin}${path.delimiter}${process.env.PATH}` },
          timeout: 20000,
        });
        assert.equal(r.status, 1, r.stdout);
        assert.match(r.stdout, /^laptop-setup: .+\. Nothing ran\.$/m);
        assert.match(r.stdout, /^usage: node scripts\/laptop-setup\.mjs/m);
        const bad = args.find((a) => !['--dry-run', 'win32'].includes(a)) ?? args[0];
        assert.ok(r.stdout.includes(bad), `names ${bad}`);
        assert.doesNotMatch(r.stdout, /^Step \d/m, 'no step started');
        if (process.platform !== 'win32') assert.equal(fs.existsSync(marker), false, 'a command ran');
      });
    }
  });
});
