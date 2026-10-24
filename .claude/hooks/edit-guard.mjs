#!/usr/bin/env node
// PreToolUse on Edit, Write, NotebookEdit and MultiEdit.
// Denies writes outside the agent's role area and SCOPE. See docs/harness/hooks-spec.md.

import { runHook, makeContext, checkWrite, denyOutput, logDecision, guardsOff } from './lib/policy.mjs';

await runHook('edit-guard', async (input) => {
  const toolInput = input.tool_input || {};
  const target = toolInput.file_path || toolInput.notebook_path || toolInput.path;
  if (!target) return null;

  const ctx = makeContext(input);
  if (guardsOff(ctx)) {
    logDecision(ctx, { hook: 'edit-guard', tool: input.tool_name || null, decision: 'allow', reason: 'guards off' });
    return null;
  }
  const verdict = checkWrite(ctx, target, ctx.cwd);

  logDecision(ctx, {
    hook: 'edit-guard',
    tool: input.tool_name || null,
    path: verdict.rel,
    decision: verdict.allow ? 'allow' : 'deny',
    reason: verdict.allow ? undefined : verdict.reason,
    scope_ignored: ctx.scope.ignored.length ? ctx.scope.ignored : undefined,
    warning: !ctx.isMain && !ctx.scope.found ? 'no SCOPE line found, using the role area' : undefined,
  });

  return verdict.allow ? null : denyOutput(verdict.reason);
});
