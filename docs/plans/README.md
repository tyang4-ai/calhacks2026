# Plans

PLANNING: in progress

The line above turns to `PLANNING: done` once every plan file and contract exists and the contract audit has passed. The heartbeat starts the build when it sees it.

One plan file per stage, feature and upgrade. The orchestrator reads the lists below in order. The kickoff skill checks that every file in the Plan files table exists before the build starts.

## Plan files

| Plan ID | File | Wave | Priority |
|---|---|---|---|
| S1-scaffold | `docs/plans/S1-scaffold.md` | S1 | P0 |
| S2-mock-data | `docs/plans/S2-mock-data.md` | S2 | P0 |
| I1-demo-stage | `docs/plans/I1-demo-stage.md` | I1 | P0 |

W1 features, W2 features and B01 to B10 get their rows during planning. W1 and W2 rows run in table order. Upgrades run in number order.

## Template

```markdown
# F-<slug> · <name> (<spec feature numbers>)

Priority: P0 · Wave: W1 · Depends on: G2 · Folder: src/features/<slug>/ · Made real by: B04

## Goal
Two lines on what the judge sees.

## Read first
The common docs and the sections this feature needs.

## Interfaces
- Reads: events (names), data (types and IDs), UI kit components
- Emits: events, with payload fields
- Exports: the feature module (slots and routes) from ui-contract.md
- Test IDs: every element the tests and the demo look for

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | ... | src/features/<slug>/Thing.tsx, tests/features/<slug>-thing.spec.ts | none | opus |
| T9 | Assemble and wire the slots (lead) | src/features/<slug>/index.ts | T1 to T3 | lead |

## Acceptance
Given, when, then lines tied to test IDs and demo beats.

## Out of scope
What not to build.
```

## Rules for splitting a feature

- A task owns its files. No two tasks in a wave touch the same file.
- A task depends only on the contracts or on earlier tasks in the same plan.
- One agent finishes it in under an hour, and it ends in something checkable: a test ID that renders, a test that passes.
- Most features split into 2 to 5 tasks. The lead does the assembly task itself.
- Every name a task uses already exists in a contract. If it doesn't, add it to the contract first.
- A task's "Files it owns" column becomes the builder's `SCOPE` line, so list every file, tests included.
