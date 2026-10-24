# Glossary

Every agent loads this file through CLAUDE.md. It fixes what words mean and what the code calls them. If a word you need isn't here, use the closest one that is, and put the gap under `needs:` in your report.

## Build words

| Word | Meaning |
|---|---|
| stage | One step of the build: S0, S1, S2, W1, I1, W2+P2, freeze |
| gate | The checks between stages, G0 to G6, defined in `definition-of-done.md` |
| plan | One file in `docs/plans/` that says what to build for a stage, feature or upgrade |
| task | One row in a plan's Tasks table, owned by one builder, with its own files |
| lead | A feature-lead agent, which owns one feature plan |
| scripted mode | The app plays events from `src/mock/` timelines. No requests beyond localhost |
| live mode | An event source backed by the FastAPI server, which calls Claude or Nessie |
| source | Something that emits events into the store: the scripted player, or one live adapter per upgrade |
| Simulated badge | The UI kit badge every panel shows while its events are scripted |
| cut | A feature or upgrade restored to its last green tag and listed as not built |
| green | Passed its gate, committed and tagged |

## Domain words

Filled in during planning, one row per word: the word, its code name, the English label, the Chinese label, and a one-line meaning.

| Word | Code name | English label | Chinese label | Meaning |
|---|---|---|---|---|
