# Decisions

Append-only. The orchestrator writes every entry, including contract changes the integrator reports. Newest last.

Format: `- <YYYY-MM-DD HH:MM PT> · <who asked> · <decision> · <why> · <files touched>`

## Before the build

- 2026-10-23 23:00 PT · Gordon · Build tooling (agents, hooks, rules, runbook) set up in the repo during the hacking period, after the 6:00 PM Friday start · The harness is dev-environment setup · `.claude/`, `docs/harness/`, `docs/common/conventions.md`
- 2026-10-23 23:00 PT · orchestrator · One shared checkout with guards, no worktrees · No two agents own the same file, and worktrees would add a merge step and an install per tree · `docs/harness/hooks-spec.md`
- 2026-10-23 23:00 PT · orchestrator · Opus for builders and leads, Sonnet for the verifier and scribe · UI quality is the demo · `.claude/agents/`
- 2026-10-24 00:45 PT · Gordon · The directors said yes to building from the planning doc written before the event. Their reply, as Gordon relayed it: "that's completely fine" · Asked after hacking started · `docs/spec/cindia-spec.md`, `docs/spec/cindia-pitch.md`
- 2026-10-24 00:50 PT · Gordon · The look is Silk and ink, the plan is Max 20x (4 leads, 3 builders each), and the build starts tonight once planning is pushed · Answered in chat · `docs/common/design-system.md`
- 2026-10-24 01:55 PT · orchestrator · Planning marked done after the plan audit. Contract fixes: request answers wait 1.2 s of real time, the store keeps payload figures, `followup.sent` has no key, carried-over matches name their month, first approval decision wins, the Nessie docs copied to `docs/spec/nessie/` · `docs/common/`, `docs/plans/`

## During the build

- 2026-10-24 02:35 PT · scaffolder · `@playwright/test` pinned at 1.61.1 · It matches the Chromium build 1228 preflight downloaded; 1.64.1 wants 1248 · `package.json`
- 2026-10-24 02:35 PT · scaffolder · `@types/node` added as a dev dependency · The Vite react-ts template ships it, and the config files and Playwright tests need it · `package.json`
- 2026-10-24 02:35 PT · scaffolder · Kit money formatter lives in `src/ui/formatCents.ts`, not `money.ts` · Case clash with `Money.tsx` on Windows broke `tsc` · `src/ui/`
- 2026-10-24 02:35 PT · scaffolder · `ApiError` lives in `server/__init__.py` · `server/errors.py` wasn't in S1's SCOPE · `server/__init__.py`
- 2026-10-24 02:35 PT · scaffolder · No `tests/server/__init__.py` · With it, pytest shadows the real `server` package; upgrade tests import helpers with `from conftest import needs_key`. Skeleton lists in conventions.md and hooks-spec.md still name the file as owned path, which is harmless; the integrator drops it from conventions.md · `tests/server/`, `docs/harness/hooks-spec.md`
- 2026-10-24 02:45 PT · S1 scaffolder via integrator · conventions.md: server skeleton row drops `tests/server/__init__.py`, and the `tests/server/` row says upgrade tests use `from conftest import needs_key` · pytest shadowing of the `server` package · `docs/common/conventions.md`
- 2026-10-24 02:45 PT · S1 scaffolder via integrator · glossary.md: rows for studio views `month` (Month 本月) and `dashboard` (Dashboard 仪表盘) · `src/app/strings.ts` already used the labels · `docs/common/glossary.md`
