#!/usr/bin/env node
// SubagentStop, matcher "builder": runs npm run check:scope on the builder's SCOPE before it may stop.
// Sends the builder back with the errors at most twice. Skips quietly when it can't run.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runHook, makeContext, logDecision } from './lib/policy.mjs';

const MAX_ROUNDS = 2;
const TIMEOUT_MS = 240 * 1000;

function safeId(id) {
  return String(id || 'unknown').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);
}

function quote(arg) {
  return `"${String(arg).replace(/"/g, '')}"`;
}

await runHook('stop-check', async (input) => {
  const ctx = makeContext(input);
  if (ctx.role !== 'builder') return null;
  if (ctx.status.STOP_CHECK === 'off') return null;

  const pkgFile = path.join(ctx.rootRaw, 'package.json');
  if (!fs.existsSync(pkgFile)) return null;
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  } catch {
    return null;
  }
  if (!pkg.scripts || !pkg.scripts['check:scope']) return null;

  const countDir = path.join(ctx.rootRaw, 'artifacts', 'hooks', 'stop-check');
  const countFile = path.join(countDir, `${safeId(input.agent_id)}.json`);
  let rounds = 0;
  try {
    rounds = JSON.parse(fs.readFileSync(countFile, 'utf8')).rounds || 0;
  } catch {
    rounds = 0;
  }
  if (rounds >= MAX_ROUNDS) {
    logDecision(ctx, { hook: 'stop-check', decision: 'allow', reason: `gave up after ${MAX_ROUNDS} rounds` });
    return null;
  }

  // makeContext already read the SCOPE, from agent_transcript_path first.
  const entries = ctx.scope.found ? ctx.scope.valid : [];
  if (!entries.length) {
    logDecision(ctx, { hook: 'stop-check', decision: 'allow', reason: 'no SCOPE found, nothing to check' });
    return null;
  }

  const command = `npm run check:scope -- ${entries.map((e) => quote(e.replace(/\/$/, ''))).join(' ')}`;
  const res = spawnSync(command, {
    cwd: ctx.rootRaw,
    shell: true,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });

  if (res.error || res.signal) {
    logDecision(ctx, { hook: 'stop-check', decision: 'allow', reason: `check did not finish (${res.error ? res.error.code || res.error.message : res.signal})` });
    return null;
  }

  if (res.status === 0) {
    try {
      fs.rmSync(countFile, { force: true });
    } catch {
      // ignore
    }
    logDecision(ctx, { hook: 'stop-check', decision: 'allow', command });
    return null;
  }

  rounds += 1;
  fs.mkdirSync(countDir, { recursive: true });
  fs.writeFileSync(countFile, JSON.stringify({ rounds, last: new Date().toISOString() }));
  const output = `${res.stdout || ''}${res.stderr || ''}`.trim().slice(-4000);
  logDecision(ctx, { hook: 'stop-check', decision: 'block', command, round: rounds });
  return {
    decision: 'block',
    reason: `npm run check:scope failed for your files (round ${rounds} of ${MAX_ROUNDS}). Fix the problems in your own files, then report. Output:\n${output}`,
  };
});
