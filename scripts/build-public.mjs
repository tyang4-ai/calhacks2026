#!/usr/bin/env node
// npm run build:public: the public scripted build for Cloudflare Pages (D-deploy T2, fix-plan 1.8).
// 1. node scripts/export-mock.mjs (what npm run export:mock runs) and node scripts/make-market.mjs,
//    so dist/market/ holds the sandbox market from the current mock data,
// 2. tsc -b, then vite build with VITE_PUBLIC_SITE=1 set in the child's environment only. A Node
//    script does this the same way in cmd.exe, PowerShell and Git Bash, where `FOO=1 cmd` fails,
// 3. writes dist/public-build.json: { "publicSite": true, "commit": <full SHA of HEAD>, "builtAt" },
// 4. runs node scripts/check-public.mjs, then node scripts/secrets-scan.mjs, so no key reaches the
//    public build. It exits 1 if either fails. When check-public's rendered checks were skipped
//    (Chromium didn't start), it still passes, as D-deploy allows, but the last line says so and
//    names the two pages to check in the browser before uploading.
// The output goes to dist/ like every build, so it never runs beside G4, G4v2, G5 or G6, and the
// next production-build gate (or npm run build) rebuilds dist/ for localhost. It never deploys:
// Gordon uploads dist/ to Cloudflare Pages himself.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RENDERED_SKIPPED } from './check-public.mjs';
import { BIN, ROOT, runLive } from './lib/common.mjs';

const node = process.execPath;
const script = (name) => path.join(ROOT, 'scripts', name);

/** The last line of a build:public run. Exit 1 on any failure; a skip of the rendered checks still passes. */
export function banner({ check, scan, skipped }) {
  if (check !== 0 || scan !== 0) {
    const failed = [check !== 0 ? 'check-public' : null, scan !== 0 ? 'secrets-scan' : null].filter(Boolean).join(', ');
    return { code: 1, text: `build:public: FAIL (${failed}). Don't upload dist/.` };
  }
  if (skipped) {
    return {
      code: 0,
      text: "build:public: PASS, but the rendered checks were skipped (Chromium didn't start); check /demo and /shop/piece/pc_01 in the browser before uploading (D-deploy step 4).",
    };
  }
  return { code: 0, text: 'build:public: PASS. dist/ is the public build, ready to upload to Cloudflare Pages.' };
}

function step(text) {
  console.log(`\nbuild:public: ${text}`);
}

async function run(label, args, env = {}) {
  const code = await runLive(node, args, { env });
  if (code !== 0) {
    console.log(`build:public: ${label} failed (exit ${code})`);
    process.exit(code || 1);
  }
}

/** Runs a Node script with its output shown as it comes, and returns { code, out }. */
function runShown(args) {
  return new Promise((resolve) => {
    const child = spawn(node, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', (d) => {
      out += d;
      process.stdout.write(d);
    });
    child.on('exit', (code) => resolve({ code: code ?? 1, out }));
    child.on('error', () => resolve({ code: 1, out }));
  });
}

function headCommit() {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  const sha = (r.stdout || '').trim();
  return r.status === 0 && /^[0-9a-f]{40}$/.test(sha) ? sha : null;
}

function treeIsDirty() {
  const r = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  return r.status === 0 && (r.stdout || '').trim() !== '';
}

async function main() {
  step('1/4 exporting the mock data and writing the sandbox market');
  await run('export:mock', [script('export-mock.mjs')]);
  await run('make-market', [script('make-market.mjs')]);

  step('2/4 type check, then the Vite production build with VITE_PUBLIC_SITE=1');
  await run('tsc -b', [BIN.tsc, '-b', '--pretty', 'false']);
  await run('vite build', [BIN.vite, 'build'], { VITE_PUBLIC_SITE: '1' });

  step('3/4 writing dist/public-build.json');
  const commit = headCommit();
  if (!commit) console.log("build:public: note: git didn't give a commit SHA, so public-build.json says null");
  else if (treeIsDirty()) console.log('build:public: note: the working tree has uncommitted changes, so this build is newer than its commit');
  const info = { publicSite: true, commit, builtAt: new Date().toISOString() };
  fs.writeFileSync(path.join(ROOT, 'dist', 'public-build.json'), `${JSON.stringify(info, null, 2)}\n`, 'utf8');
  console.log(`build:public: ${JSON.stringify(info)}`);

  step('4/4 checking the public build, then scanning for keys');
  const check = await runShown([script('check-public.mjs')]);
  const scan = await runLive(node, [script('secrets-scan.mjs')]);
  const result = banner({ check: check.code, scan, skipped: check.out.includes(RENDERED_SKIPPED) });
  console.log(`\n${result.text}`);
  return result.code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(await main());
}
