STAGE: PLANNING
NEXT: R0
SHARED_LOCK: off
STOP_CHECK: on
GUARDS: on
UPDATED: 2026-10-23 23:00 PT

# Status board

The orchestrator owns this file. The six lines above are read by the hooks and by `/goal`. Keep them first and keep their spelling. Everything below is for people and for the orchestrator after a compaction.

## Now

- Harness installed. Planning docs and plan files not written yet.
- The build starts with the kickoff skill once `docs/plans/` is complete (runbook step R0).

## Gates

| Gate | Result | When | Report | Tag |
|---|---|---|---|---|
| G0 | | | | |
| G1 | | | | |
| G2 | | | | |
| G3 (W1) | | | | |
| G4 | | | | |
| G5 | | | | |
| G6 | | | | |

## Features

| Plan | Wave | State | Lead | Last green tag | Notes |
|---|---|---|---|---|---|

States: `todo`, `running`, `green`, `failed`, `CUT`.

## Upgrades

| Plan | State | Live call checked | Last green tag | Notes |
|---|---|---|---|---|

## Environment

Filled in from `artifacts/preflight.md` at G0.

## Needs Gordon

Each item names the default already in use, so the build never waits.

| Since | Question | Default in use |
|---|---|---|

## Cut and simulated

Everything that ends up cut or still on scripted events, for the README and Devpost.

## Log

Newest last. One line per event: time, what happened, evidence path.
