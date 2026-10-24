# Kickoff · Gordon's steps on the build machine

The build runs on the Windows desktop at home, driven from the phone or laptop through Remote Control. Start it after planning is done and `docs/plans/` is complete.

## 1. Once, before the first launch (about 10 minutes)

- `claude update`, then sign in with the claude.ai account. Remote Control needs the subscription login, not an API key.
- In Claude Code, open `/config` and turn on **Push when actions required** and **Push when Claude decides**. Sign in to the Claude app on the phone with the same account.
- Node 22.12 or later, Python 3.12 or later, Git for Windows, then `gh auth login`.
- Both keys in `C:\dev\secrets\cindia.env`, outside the vault, because Syncthing copies the vault to other devices:
  ```text
  ANTHROPIC_API_KEY=...
  NESSIE_KEY=...
  ```
- Power plan: never sleep on AC. Pause Windows Update for a week.

## 2. Launch (paste in PowerShell)

```powershell
$R = "C:\dev\calhacks2026"
$V = "B:\Alioth\Notes\Hackathons\my-entries\2026-10-cal-hacks-13"
if (-not (Test-Path $R)) { git clone https://github.com/tyang4-ai/calhacks2026 $R }
Set-Location $R
git pull
Copy-Item "C:\dev\secrets\cindia.env" "$R\.env"
Remove-Item Env:\ANTHROPIC_API_KEY -ErrorAction SilentlyContinue
node .claude\hooks\test-hooks.mjs
node scripts\preflight.mjs --vault "$V\resources\tech"
claude --permission-mode auto --remote-control "Cindia build" --add-dir "$V\resources\tech"
```

- `.env` is listed in `.gitignore`, so the keys never enter git.
- Claude Code asks once whether to trust the folder. Answer yes at the machine, since the hooks only run in a trusted folder.
- If the hook test or the preflight prints a blocker, fix it before launching.

## 3. Start the build (in the Claude session)

**If planning is still being written** (for example, you launch before going to sleep): type `/loop 10m /heartbeat` and leave it. Every 10 minutes it pulls from GitHub. When `docs/plans/README.md` says `PLANNING: done`, it runs the kickoff checks and starts the build on its own, then keeps it moving. Skip the steps below. In the morning you can still add the goal line from your phone.

**If planning is done:**

1. Type `/kickoff`. It runs G0, fills in the Environment section of `status.md`, sets a 15-minute heartbeat, and prints the goal line. The heartbeat restarts the build whenever it goes quiet, which `/goal` alone doesn't do while the dev server runs in the background.
2. Type the goal line exactly:

```text
/goal Run the build in docs/harness/runbook.md until docs/harness/status.md reads STAGE: FROZEN and the G6 summary is printed in this conversation, or until it is past 6:00 AM PT Sunday and the freeze steps are done.
```

## 4. While it runs

- **Phone:** the Claude app or claude.ai/code shows the "Cindia build" session live, with every subagent's progress. You can type into it.
- **Pushes** arrive when a gate passes, a feature is cut, or a question lands under Needs Gordon. Each question already has a default in use, so the build keeps going if you don't answer.
- **GitHub:** `docs/harness/status.md` is pushed after every gate.
- **The demo laptop** pulls `main` from GitHub. `demo-ok-1` and later tags are safe builds to demo.
- **Phone preview (optional, you only):** after `demo-ok-1`, on the laptop, `npm run build` then `npx wrangler pages deploy dist`. The session never deploys anything itself.

## 5. If something stops

| Problem | Do this |
|---|---|
| The session crashed or the window closed | In `C:\dev\calhacks2026`, run `claude --continue --permission-mode auto --remote-control "Cindia build" --add-dir "B:\Alioth\Notes\Hackathons\my-entries\2026-10-cal-hacks-13\resources\tech"`. The goal comes back with it |
| It seems stuck | On the phone, look for a pending prompt. Type `/goal` to see the goal's status |
| A usage limit was hit | A Remote Control session doesn't start the wait by itself. The heartbeat picks the build back up within 15 minutes of the reset. If you're around, run `/rate-limit-options` and pick "Wait here, then continue automatically" |
| A push says an action needs your approval | Auto mode pauses after 3 blocked actions in a row or 20 in a session. Approve the action from the phone if it's safe, and auto mode turns back on |
| A hook blocks everything | Read `artifacts/hooks/guard-errors.log`. Emergency only: set `GUARDS: off` in `docs/harness/status.md`. Don't use `disableAllHooks`, because it also turns off `/goal` |
| The session printed "Goal cleared after an unrecoverable error" | Fix the cause it names, then type the goal line again |
| You want to stop the build | Press Esc in the session, or type `/goal clear` |
