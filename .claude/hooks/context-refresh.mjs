#!/usr/bin/env node
// SessionStart (startup, resume, compact): puts the top of docs/harness/status.md back in front of
// the orchestrator, so it knows where the build stands after a restart or a compaction.

import fs from 'node:fs';
import path from 'node:path';
import { runHook, expandHome } from './lib/policy.mjs';

const CAP = 9000;

function section(lines, heading) {
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start < 0) return [];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end);
}

function trimBlank(lines) {
  let a = 0;
  let b = lines.length;
  while (a < b && !lines[a].trim()) a += 1;
  while (b > a && !lines[b - 1].trim()) b -= 1;
  return lines.slice(a, b);
}

function pacificNow() {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${fmt.format(new Date())} PT`;
}

await runHook('context-refresh', async (input) => {
  const rootRaw = expandHome(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
  const file = path.join(rootRaw, 'docs', 'harness', 'status.md');
  if (!fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

  const markers = lines.slice(0, 40).filter((l) => /^(STAGE|NEXT|SHARED_LOCK|STOP_CHECK|UPDATED):/.test(l));
  const now = trimBlank(section(lines, 'Now'));
  const needs = trimBlank(section(lines, 'Needs Gordon'));
  const log = trimBlank(section(lines, 'Log'));
  const logTail = log.length > 1 ? log.slice(1).slice(-15) : [];

  const parts = [
    `Build state from docs/harness/status.md (re-read the file before acting). Time now: ${pacificNow()}`,
    '',
    ...markers,
  ];
  if (now.length) parts.push('', ...now);
  if (needs.length) parts.push('', ...needs);
  if (logTail.length) parts.push('', '## Log (last 15 lines)', ...logTail);

  let text = parts.join('\n');
  if (text.length > CAP) text = `${text.slice(0, CAP - 20)}\n... (truncated)`;
  return { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } };
});
