STAGE: PLANNING
NEXT: R0
SHARED_LOCK: off
STOP_CHECK: on
GUARDS: on
UPDATED: 2026-10-24 01:55 PT

# Status board

The orchestrator owns this file. The six lines above are read by the hooks and by `/goal`. Keep them first and keep their spelling. Everything below is for people and for the orchestrator after a compaction.

## Now

- Planning done (Oct 24, 1:55 AM): nine contracts in `docs/common/` and 25 plan files in `docs/plans/`, checked by a separate agent.
- Next: the heartbeat (or Gordon's `/kickoff`) runs the kickoff steps, then the build starts at R1.

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
