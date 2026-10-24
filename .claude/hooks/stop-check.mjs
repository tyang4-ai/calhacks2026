#!/usr/bin/env node
// The builder stop check. Runs npm run check:scope on the builder's SCOPE before it may finish,
// and sends it back with the errors at most twice in total.
//
// Two entry points share one round counter:
// - PreToolUse, matcher "SubagentHandback": subagents that report through SubagentHandback end
//   their run with that call, so the check runs before it and denies the call on a failure.
// - SubagentStop, matcher "builder": for builders that finish without SubagentHandback. It
//   skips when the handback check already passed for this agent.
//
// Skips quietly (allows) when STOP_CHECK or GUARDS is off, when there's no check:scope script,
// when it can't find a SCOPE, or when the check can't finish.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runHook, makeContext, logDecision, denyOutput, guardsOff } from './lib/policy.mjs';

const MAX_ROUNDS = 2;
const TIMEOUT_MS = 240 * 1000;
const PASS_FRESH_MS = 30 * 60 * 1000;

function safeId(id) {
  return String(id || 'unknown').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);
}

function quote(arg) {
  return `"${String(arg).replace(/"/g, '')}"`;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

await runHook('stop-check', async (input) => {
  const event = input.hook_event_name === 'PreToolUse' ? 'PreToolUse' : 'SubagentStop';
  if (event === 'PreToolUse' && input.tool_name && input.tool_name !== 'SubagentHandback') return null;

  const ctx = makeContext(input);
  if (ctx.role !== 'builder') return null;
  const hook = event === 'PreToolUse' ? 'stop-check:handback' : 'stop-check';
  if (ctx.status.STOP_CHECK === 'off' || guardsOff(ctx)) {
    logDecision(ctx, { hook, decision: 'allow', reason: guardsOff(ctx) ? 'guards off' : 'STOP_CHECK off' });
    return null;
  }

  const pkgFile = path.join(ctx.rootRaw, 'package.json');
  const pkg = readJson(pkgFile);
  if (!pkg || !pkg.scripts || !pkg.scripts['check:scope']) return null;

  const dir = path.join(ctx.rootRaw, 'artifacts', 'hooks', 'stop-check');
  const id = safeId(input.agent_id);
  const countFile = path.join(dir, `${id}.json`);
  const passFile = path.join(dir, `${id}.pass`);

  if (event === 'SubagentStop') {
    const pass = readJson(passFile);
    if (pass && Date.now() - Date.parse(pass.at) < PASS_FRESH_MS) {
      fs.rmSync(passFile, { force: true });
      logDecision(ctx, { hook, decision: 'allow', reason: 'already passed at handback' });
      return null;
    }
  }

  const rounds = (readJson(countFile) || {}).rounds || 0;
  if (rounds >= MAX_ROUNDS) {
    logDecision(ctx, { hook, decision: 'allow', reason: `gave up after ${MAX_ROUNDS} rounds` });
    return null;
  }

  // makeContext already read the SCOPE, from agent_transcript_path when there is one.
  const entries = ctx.scope.found ? ctx.scope.valid : [];
  if (!entries.length) {
    logDecision(ctx, { hook, decision: 'allow', reason: 'no SCOPE found, nothing to check' });
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
    logDecision(ctx, { hook, decision: 'allow', reason: `check did not finish (${res.error ? res.error.code || res.error.message : res.signal})` });
    return null;
  }

  fs.mkdirSync(dir, { recursive: true });
  if (res.status === 0) {
    fs.rmSync(countFile, { force: true });
    if (event === 'PreToolUse') fs.writeFileSync(passFile, JSON.stringify({ at: new Date().toISOString() }));
    logDecision(ctx, { hook, decision: 'allow', command });
    return null;
  }

  const round = rounds + 1;
  fs.writeFileSync(countFile, JSON.stringify({ rounds: round, last: new Date().toISOString(), via: event }));
  const output = `${res.stdout || ''}${res.stderr || ''}`.trim().slice(-4000);
  const reason = `npm run check:scope failed for your files (round ${round} of ${MAX_ROUNDS}). Fix the problems in your own files, then report again. Output:\n${output}`;
  logDecision(ctx, { hook, decision: event === 'PreToolUse' ? 'deny' : 'block', command, round });
  return event === 'PreToolUse' ? denyOutput(reason) : { decision: 'block', reason };
});
