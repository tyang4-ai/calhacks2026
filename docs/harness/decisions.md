# Decisions

Append-only. The orchestrator writes every entry, including contract changes the integrator reports. Newest last.

Format: `- <YYYY-MM-DD HH:MM PT> · <who asked> · <decision> · <why> · <files touched>`

## Before the build

- 2026-10-23 23:00 PT · Gordon · Build tooling (agents, hooks, rules, runbook) set up in the repo during the hacking period, after the 6:00 PM Friday start · The harness is dev-environment setup · `.claude/`, `docs/harness/`, `docs/common/conventions.md`
- 2026-10-23 23:00 PT · orchestrator · One shared checkout with guards, no worktrees · No two agents own the same file, and worktrees would add a merge step and an install per tree · `docs/harness/hooks-spec.md`
- 2026-10-23 23:00 PT · orchestrator · Opus for builders and leads, Sonnet for the verifier and scribe · UI quality is the demo · `.claude/agents/`
