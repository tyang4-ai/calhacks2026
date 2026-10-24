---
paths:
  - "src/mock/**"
  - "tests/data/**"
---

# Mock data rules

- **`data-model.md` is the spec.** Entities, fields, ID formats and the planted errors come from there, never from what one feature would like. A missing field goes under `needs:` for the integrator.
- **Deterministic:** no unseeded randomness, no `Date.now()`, and no `new Date()` without a fixed value. If you need variety, use a seeded generator with the seed written in the file.
- **Money** is integer cents everywhere. Totals reconcile to the cent, except the planted errors.
- **Planted errors** exist only where `data-model.md` says. The answer key lists each one with its ID, the expected and actual figures, and why it's wrong. Nothing else in the data is off.
- **Names** of people come from the placeholder names file `data-model.md` points to, so Gordon can swap them in one place. No real people's names.
- **Events:** every scripted event uses an event type from `events.md` with exactly its payload fields, and passes the schema check in `src/core/`.
- **Timing** in a timeline uses the format `events.md` defines, never the wall clock.
- **Exports** follow the names `data-model.md` gives. After G2, never rename one, since features import them.
- **Tests in `tests/data/`** check that totals reconcile, that the answer key matches the planted errors exactly, that every event validates, and that the demo-critical figures match. `npm run check:data` runs them.
