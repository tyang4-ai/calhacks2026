# Hooks

Four hooks guard the build. They live in `.claude/hooks/` and are wired in `.claude/settings.json`. Each is a Node script run in exec form (`"command": "node"`), so it works the same in Git Bash, PowerShell and `cmd.exe`. The shared rules are in `.claude/hooks/lib/policy.mjs`, so the edit guard and the command guard always agree.

| Hook | Event | Matcher | File | Timeout |
|---|---|---|---|---|
| Edit guard | PreToolUse | `Edit\|Write\|NotebookEdit\|MultiEdit` | `edit-guard.mjs` | 15 s |
| Command guard | PreToolUse | `Bash\|PowerShell` | `command-guard.mjs` | 15 s |
| Context refresh | SessionStart | `startup\|resume\|compact` | `context-refresh.mjs` | 15 s |
| Stop check | SubagentStop | `builder` | `stop-check.mjs` | 300 s |

## Who is acting

- Claude Code sends `agent_type` and `agent_id` when a hook fires inside a subagent. `agent_type` is the `name` from the agent's card.
- No `agent_type` means the main session, which is the orchestrator.
- A subagent's paths come from its role and from the `SCOPE:` line of its delegation header (`docs/common/conventions.md`).
- The hooks find the delegation message in the subagent's transcript: `<main transcript without .jsonl>/subagents/agent-<agent_id>.jsonl`, first `user` record. If it isn't there, they search that session folder three levels deep.
- No `SCOPE:` line found means the agent gets its whole role area, and the guard log records a warning.

## Edit guard

Runs before every file write. A deny returns `permissionDecision: "deny"` with a reason that names the path, the role and the scope, and ends with "Put the change you need under needs: in your report." An allow prints nothing, so the permission rules still apply.

**Main session:** may write anything except `.env` and `.env.<x>` files. `.env.example` is fine.

**Every subagent, always allowed:** `artifacts/**` and anything under its scratchpad folder.

**Every subagent, always denied:** `.env` and `.env.*` at any depth (including `.env.example`), `.git/**`, `.claude/**` at any depth, `CLAUDE.md` and `CLAUDE.local.md` at any depth, `.gitignore`, `.gitattributes`, `docs/harness/**`, `docs/plans/**`, `docs/spec/**`, `node_modules/**`, and any path outside the repo.

**Role areas:**

| Role | May write |
|---|---|
| scaffolder | shared code, root config, `scripts/**`, `tests/smoke/**`, `tests/demo/**`, `tests/offline/**`, `public/**`. Nothing at all while `SHARED_LOCK: on` |
| data-smith | `src/mock/**`, `tests/data/**` |
| feature-lead | `src/features/**`, `tests/features/**` |
| builder | `src/features/**`, `tests/features/**`, `server/**`, `src/sources/live/**`, `tests/server/**` |
| verifier | only `artifacts/` |
| integrator | shared code, root config, `docs/common/**`, `scripts/**`, `tests/smoke/**`, `tests/demo/**`, `tests/offline/**`, `public/**` |
| backend-builder | `server/**`, `src/sources/live/**`, `tests/server/**` |
| scribe | `README.md`, `docs/devpost/**` |
| Explore, Plan, general-purpose, anything else | only `artifacts/` |

- **Shared code** is `src/app/**`, `src/core/**`, `src/ui/**`, `src/sources/**` except `src/sources/live/**`, and the files directly in `src/` (`main.tsx`, `index.css`, `vite-env.d.ts`).
- **Root config** is `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `playwright.config.ts`, `index.html` and a root `requirements.txt`.

**SCOPE rules:**
- The agent may write a path only when it is in the role area and matches one of its SCOPE entries.
- `dir/` covers the folder and everything under it. `*` matches inside one path segment.
- Entries outside the role area are ignored and logged. A header can narrow an agent's paths but never widen them. A SCOPE with no usable entries leaves only `artifacts/`.

**SHARED_LOCK:** the orchestrator sets `SHARED_LOCK: on` in `status.md` after G1. From then on the scaffolder can't write shared code or root config. The integrator still can, because changing shared code after G1 is its job.

## Command guard

Runs before every Bash and PowerShell command. It splits compound commands on `;`, `&&`, `||`, `|`, new lines and (outside PowerShell, where it is the call operator) `&`, looks inside `$(...)` and backticks, and checks commands passed to `bash -c`, `sh -c`, `pwsh -Command`, `powershell -Command` and `cmd /c`. It follows `cd` within one command line. Same output format and log as the edit guard.

**For everyone, the main session included:**

| Denied | Examples |
|---|---|
| Reading, printing, copying or moving a `.env` file (not `.env.example`) | `cat .env`, `Get-Content .env`, `grep KEY .env`, `cp .env x`, `wc -l < .env` |
| Expanding a key | `echo $ANTHROPIC_API_KEY`, `${NESSIE_KEY}`, `$env:NESSIE_KEY`, `%NESSIE_KEY%`, `node -e "...process.env.ANTHROPIC_API_KEY..."` |
| Dumping the environment | bare `env`, `printenv`, `set`, `export`, `Get-ChildItem env:` |
| Rewriting remote history | `git push --force`, `-f`, `--force-with-lease`, `+main`, `--delete`, `:branch` |
| Deleting what can't come back | a recursive delete of `.git`, `/`, `~`, a drive root, the repo root or a parent of it |

Presence checks stay allowed: `test -f .env`, `[ -f .env ]`, `Test-Path .env`, `ls .env`.

**For subagents only:**

| Rule | Allowed | Denied |
|---|---|---|
| git | `status`, `diff`, `log`, `show`, `ls-files`, `ls-tree`, `rev-parse`, `blame`, `grep`, `describe`, `shortlog`, `cat-file`, `show-ref`, `for-each-ref`, `merge-base`, `rev-list`, `check-ignore`. `branch` and `tag` for listing, `remote` bare or `-v`, `config --get` or `--list` | everything else, with "Only the orchestrator runs git commands that change anything." |
| Installs | the scaffolder and the integrator may run npm, pnpm, yarn, bun, pip, uv and poetry installs | everyone else. Global installs (`-g`, `--user`, `uv tool`, winget, choco, brew and the like) are denied for every subagent |
| npx | `playwright`, `tsc`, `eslint`, `vitest`, `vite` (not as a server), `prettier`, `tsx` | any other package, and `-y`, `--yes`, `-p`, `--package` |
| Servers | | `npm run dev`, `npm run preview`, `npm run server`, `npm start`, bare `vite`, `vite dev/serve/preview`, `uvicorn`, `python -m uvicorn`, `python -m http.server`, `fastapi dev/run`, `serve`, `http-server`, `wrangler dev`, `playwright show-report` |
| Process kills | | `kill`, `pkill`, `killall`, `taskkill`, `Stop-Process`, `fuser -k`, `kill-port` |
| Recursive deletes | targets under `artifacts/`, `test-results/`, `playwright-report/`, `dist/`, `node_modules/.vite/` or the scratchpad | anything else, or a delete with no visible target |
| Shell writes | targets the edit guard would allow for that role and SCOPE | anything else |

Shell write targets are found in `>`, `>>`, `tee`, `sed -i`, `cp`, `mv`, `Copy-Item`, `Move-Item`, `Set-Content`, `Add-Content`, `Out-File`, `New-Item` (files only), `touch`, `truncate`, `dd of=` and single-file deletes. `/dev/null`, `NUL`, `$null` and fd redirects like `2>&1` are ignored. A target that holds `$` or `%` can't be resolved, so it is logged as unchecked and let through.

## Context refresh

Runs when the main session starts, resumes or compacts. It returns `additionalContext` with:
- the line "Build state from docs/harness/status.md (re-read the file before acting)" and the time in Pacific time
- the five marker lines
- the `## Now` and `## Needs Gordon` sections
- the last 15 lines of `## Log`

The text is capped at 9,000 characters. With no `status.md` it prints nothing.

## Stop check

Runs when a builder tries to finish.
1. It skips quietly when `STOP_CHECK: off`, when `package.json` or its `check:scope` script doesn't exist yet, when the builder has no SCOPE, or when the check doesn't finish in 240 s.
2. Otherwise it runs `npm run check:scope -- <SCOPE entries>` once, with every entry as an argument.
3. On a failure it returns `decision: "block"` with the last 4,000 characters of output, which sends the builder back to fix its own files.
4. It does this at most twice per builder. The count is kept in `artifacts/hooks/stop-check/<agent_id>.json` and removed after a pass. After the second round the builder may stop and report `failed`.

**What S1 must build for it:** `check:scope` accepts one or more files, folders or simple globs (`tests/features/buyer*`), and checks only those.

## Logs

| File | What it holds |
|---|---|
| `artifacts/hooks/guard.log` | One JSON line per decision: time, role, agent ID, whether a SCOPE was found, hook, tool, path or command (first 200 characters, long tokens redacted), decision, reason. Never file contents |
| `artifacts/hooks/guard-errors.log` | Internal errors, with a stack trace |
| `artifacts/hooks/stop-check/` | Round counts per builder |

The verifier reads `guard.log` for its boundary trace. Logs are written only when the repo folder exists, and `artifacts/` is never committed.

## Failing open, and why

Every hook catches its own errors, logs them to `guard-errors.log` and exits 0, which lets the action through. The build runs unattended for hours, and a hook bug that blocked every edit would stall it with nobody there to fix it. The self-test proves the guards work before the build starts, so a silent failure is unlikely. If `guard-errors.log` shows up during the build, the orchestrator logs it in `lessons.md` and fixes the hook.

## Testing

```text
node .claude/hooks/test-hooks.mjs
```

- It builds throwaway projects and transcripts in the temp folder, runs every hook with crafted input and prints one line per case, then `PASS n/n`. It exits 1 on any failure.
- `KEEP_HOOKTEST=1` keeps the temp folder for a look.
- It runs at kickoff (G0) and again in G1. A failing case blocks the gate.

## Switches

- **Stop check off:** set `STOP_CHECK: off` in `status.md`. Use it if `check:scope` turns out slow or broken. The orchestrator logs why.
- **Emergency, all hooks off:** add `{ "disableAllHooks": true }` to `.claude/settings.local.json`, which is not committed. This turns off every hook, the guards included, so agents are no longer kept in their paths. Use it only to unstick a stalled build, log it in `decisions.md`, and remove it as soon as the hook is fixed.

## Windows notes

- Exec form needs `node.exe` on the PATH. The preflight checks it.
- File paths arrive with backslashes. The hooks change them to forward slashes, lowercase the drive letter, resolve `..` and compare paths without regard to case.
- The stop check runs npm through a shell (`cmd.exe` on Windows), because `npm` is a `.cmd` shim there.
- The PowerShell tool is guarded the same way as Bash. Aliases such as `rm`, `del`, `cp`, `gc` and `gci` are understood.

## Known gaps

- Shell parsing is best effort. Odd quoting, here-documents or variables can hide a write target.
- Writes from inline code (`python -c`, `node -e`) and from scripts the agent runs aren't caught.
- The command guard can't see what a script does, only how it's called.
- The edit guard is the real line for file writes. The command guard catches the common shell routes around it, and the rules in CLAUDE.md cover the rest.
