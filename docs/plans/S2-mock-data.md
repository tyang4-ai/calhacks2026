# S2-mock-data · The studio's September, the answer key and the timelines

Priority: P0 · Wave: S2 · Depends on: G1 · Folder: `src/mock/`, `tests/data/` · Made real by: B01 (matches and the flag), B10 (derived figures)

## Goal

One month of believable, fully reconciled records for the Gu embroidery studio, with exactly four planted problems the matcher has to handle, and the scripted timelines that play the 60-second demo. Every number the demo shows comes from here and adds up to the cent.

## Read first

- `docs/common/data-model.md`, all of it: entities, IDs, money rules, the catalog, the demo-critical figures, the planted errors, the file list
- `docs/common/events.md`: every event type and payload, keys, and the validation rules
- `docs/common/demo-script.md`: the beats, their times and the figures on screen
- `docs/common/glossary.md`: the English and Chinese labels
- `src/core/types.ts`, `src/core/events.ts` and `src/core/validate.ts` from S1
- G2 in `docs/common/definition-of-done.md`, and `.claude/rules/mock.md`

## Interfaces

- **Reads:** types and `validateEvent()` from `src/core/`. Nothing from `src/ui/`, `src/app/` or `src/features/`.
- **Exports:** every file in the `data-model.md` file table, typed with the core types. `src/mock/index.ts` re-exports everything and offers `getById(id)`, which finds any entity by its ID across every collection.
- **Emits:** scripted events only, inside `timelines/demo.ts` and `timelines/month.ts`, each with the `key` `events.md` gives for its type.
- **IDs:** exactly the formats in `data-model.md`, including its list of IDs that live only in events (`mv_`, `acct_studio`, `act_`, `ask_`, `scn_` and the beat IDs).
- **Exports the sources registry reads** to answer requests from people (`events.md`), with these exact names: `curatedSet` from `catalog.ts`, `cannedAnswers` and `fallbackAnswer` from `ask.ts`, and `scenarioReplies` from `scenario.ts`.

## Tasks

The data-smith does these in order. Each task's files belong to it alone.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | People, catalog, channels | `src/mock/people.ts`, `src/mock/catalog.ts`, `src/mock/channels.ts` | G1 | opus |
| T2 | September's records | `src/mock/month.ts` | T1 | opus |
| T3 | The answer key | `src/mock/answerKey.ts` | T2 | opus |
| T4 | Ask Cindy, impact, the held-back scenario | `src/mock/ask.ts`, `src/mock/impact.ts`, `src/mock/scenario.ts` | T2 | opus |
| T5 | The month timeline | `src/mock/timelines/month.ts` | T2 | opus |
| T6 | The demo timeline | `src/mock/timelines/demo.ts` | T5, `demo-script.md` | opus |
| T7 | Index and lookup | `src/mock/index.ts` | T1 to T6 | opus |
| T8 | Integrity tests | `tests/data/*.test.ts` | T7 | opus |

### T1 · People, catalog, channels

- `people.ts`: `own_01`, `mkr_01` to `mkr_03` and `buy_01` to `buy_20`. Fictional names in both languages, with a comment at the top saying they're placeholders Gordon can swap. Makers' `surnameChar` values are all different, and the owner's differs from the makers'. Makers and the owner have `lang: "zh"`. Buyers have `lang: "en"`.
- `catalog.ts`: the twelve pieces exactly as the `data-model.md` table gives them (titles, makers, kinds, prices, hours, materials). Write each piece's `story`, `heritage` line and `process` steps in plain English and Simplified Chinese. The process hours add up to the piece's `hours`. `image` is `/images/<pieceId>.svg`, the placeholders S1 created.
- `catalog.ts` also exports `curatedSet`: `{ pieceIds: ["pc_01", "pc_07", "pc_11"], reasons: Record<pieceId, Text> }`. Each reason is one short line naming what fits the request (peonies, under $200, a gift) and one fact about the piece. The demo timeline's `concierge.answered` and the registry's scripted answer both use it.
- `channels.ts`: the three channels and `ctr_gallery_01`. The gallery gets a fictional San Francisco name. The contract's `terms` say 40% commission on each sale, a statement on the 30th, and payment with the statement.

### T2 · September's records

`month.ts` holds every collection for `2026-09`, plus anything dated in early October that belongs to September.

- **Orders:** the thirty orders, channels and IDs per demo-critical figure 3. `ord_001` per figure 1. The gallery orders per figure 4. A featured piece sells at most once in the month. Series pieces may sell several times. Every fee field follows the money rules table, computed with half-up rounding.
- **Cindia payouts:** one per Cindia order, the same day, net of card and platform fees. `pay_001` is the one for `ord_001`, netting 15648.
- **Site payouts:** every one covers exactly one order, except three: the bundle covering `ord_015`, `ord_016` and `ord_017` (figure 5), the payout that nets out `rfd_001` (figure 6), and the late payout for `ord_025` and `ord_026` dated `2026-10-02` (figure 7).
- **The gallery:** `stm_gallery_2026_09`, issued `2026-09-30`, with one line per gallery order at 5000 bps, and one gallery payout of 170000 on `2026-09-30` (figure 4).
- **Bank transactions:** one deposit per payout on its date, two or three materials purchases from a fictional silk supplier, and the three maker payouts on `2026-10-02`. Pick an opening balance and state it in the file.
- **Ledger:** balanced double entries for every order, fee, payout, refund, purchase and maker payout, in the accounts `data-model.md` lists. Debits equal credits in every entry and in total.
- **Cindy's results:** one `Match` per payout of kind `one_to_one`, `bundled`, `refund_netted` or `carried_over` as above. The gallery gets no match. It gets `flg_01` instead, with the figures from data-model error 1, the contract as `trustRecordId`, and an explanation in both languages that says what the statement charged, what the contract says, what the bank shows, and what's owed.
- **Payouts to makers:** `mpo_01` to `mpo_03` per figure 8. Each pays the maker's share of their September orders whose money has arrived. The refunded order pays nothing. The late orders wait for October. Gallery orders pay on what was received, and the shortfall is `heldCents`: 9500 for `mkr_01`, 8000 for `mkr_02`, 16500 for `mkr_03`. `mst_01` to `mst_03` list the same lines.
- **Approvals:** `apr_01` (`follow_up`, `amountCents` 34000, subject `fup_01`) and `apr_02` (`maker_payouts`, subjects `mpo_01` to `mpo_03`), both `proposedBy: "cindy"` and `pending`. `overLimit` is true when any single payout in it is over 50000.
- **The follow-up:** `fup_01`, a short, polite English email to the gallery that names the contract's 40%, the statement's 50%, and the $340.00 owed, and asks for it by a date in October.

### T3 · The answer key

`answerKey.ts` holds exactly the four planted errors in the `data-model.md` table, each with its `kind`, the real record IDs from `month.ts`, and the `expected` result: for `err_01` the expected, actual and delta figures and the trusted record, and for the other three the match kind and the record IDs it covers.

### T4 · Ask Cindy, impact, the scenario

- `ask.ts` exports `cannedAnswers`, three entries `ask_01` to `ask_03`, and `fallbackAnswer: Text`. Each entry has `questionId`, `questions: Text` (the question in both languages), `answer: Text`, `refIds`, and a `ChartSpec` where a chart helps. `fallbackAnswer` says scripted mode answers the three demo questions and names them.
  - `ask_01`: 这个月哪件作品最赚钱? (Which piece earned the most this month?) A bar chart of maker share by piece for September, and the answer naming the top piece with its figure.
  - `ask_02`: why the gallery payment was flagged, citing `ctr_gallery_01`, `stm_gallery_2026_09` and the gallery's bank deposit.
  - `ask_03`: how much one maker gets this month, with their payout, what's held and why.
  - Every figure in an answer comes from `month.ts`, computed, never typed in.
- `impact.ts`: `imp_2026_09`. `makerShareBps` is computed from the Cindia orders. `daysCloseToPayout` is 2 (Sep 30 to Oct 2). `daysCloseToPayoutBefore` and `bookkeepingHoursSaved` are estimates: put a comment on each saying it's illustrative and waiting for Gordon's numbers, and keep `estimate: true`.
- `scenario.ts`: one held-back record set for the judge's scenario, `scn_01`, with record IDs starting `scn_`. An early-October card processor payout report, both as CSV text and as parsed records, covering three new orders where one fee line doesn't follow the 290 bps plus 30 cents rule. It also exports `scenarioReplies`: the `record.arrived`, `match.made` and `flag.raised` events a correct matcher produces for it, with `at` as an offset in ms from the request (0 onward), `source: "scripted"` and the keys `events.md` gives. It is not part of September's totals, and only the registry and the scenario feature import it.

### T5 · The month timeline

`timelines/month.ts` exports a `Timeline` with `id: "month"`.

- Times (`at`) are relative to `month.started` at 0. The demo shifts the whole timeline by 20200 ms, so each time below lands on its `demo-script.md` time:
  - 0.0: `month.started` for `2026-09`.
  - 0.2 to 9.4: September's records in date order, at about 0.29 s per day, so the late payout of Oct 2 and its `carried_over` match land by 9.4. Each `record.arrived` is followed by its `match.made` and `ledger.posted`. The bundled, refund and carried-over matches each come with an `agent.acted` line from Cindy, short and first person, in both languages.
  - The gallery's statement and deposit wait, out of date order, for the catch: `record.arrived` for `stm_gallery_2026_09` at 10.1, the gallery's deposit at 10.6, `flag.raised` for `flg_01` at 11.3 and `flag.explained` at 12.8.
- No `money.moved` here. The demo's `mv_` IDs count only the moves `demo-script.md` lists.
- `act_` IDs count up in firing order across both timelines.
- Every event carries the `key` `events.md` gives for its type.

### T6 · The demo timeline

`timelines/demo.ts` exports a `Timeline` with `id: "demo"` and the `durationMs` `demo-script.md` gives.

- One `beat.started` per beat, at the beat's start time, with its `beatId` and `camera` exactly as `demo-script.md` lists them.
- Each beat's events exactly as the beat sheet lists them, no more and no fewer, at its times and with its values: the query text, `curatedSet` in the `concierge.answered`, the split from figure 1, the token `tok_7Q2M9X4KD1PA` with last4 4242, `mv_0001` to `mv_0006`, `acct_studio`, the approval dates, the `payout.sent` amounts from the `mpo_` records, the workbook `cindia-close-2026-09.xlsx` with its four sheets, `mst_01`, and the receipt for `ord_001` at `paid_to_maker`, 13448, `2026-10-02`.
- The month timeline's events are included, shifted by 20200 ms.
- Event IDs are `evt_0001` onward, unique across the whole timeline, sorted by `at`.

### T7 · Index

`index.ts` re-exports every collection and timeline, and offers `getById(id)`. A lookup of an unknown ID returns `undefined`, never throws.

### T8 · Integrity tests

`npm run check:data` runs these:

- `tests/data/figures.test.ts`: each of the ten demo-critical figures in `data-model.md`, one test each, with the exact cents.
- `tests/data/reconcile.test.ts`: every payout equals its orders' gross less fees and refunds. Every payout has its bank deposit at the same amount on the same date. The ledger balances. Maker payouts and held amounts follow the rule above. The statement's lines add up to its totals. Nothing is off except the gallery's 34000.
- `tests/data/answer-key.test.ts`: the key lists exactly `err_01` to `err_04`, every record ID in it exists, and each error's records really show its problem.
- `tests/data/timelines.test.ts`: every event in both timelines and in `scenarioReplies` passes `validateEvent()`, IDs are unique, `at` never goes backwards, every entity ID in a payload resolves with `getById()`, every `key` matches its type's key in `events.md`, and every beat in `demo-script.md` has its `beat.started` at its start time with its camera.
- `tests/data/determinism.test.ts`: no file in `src/mock/` contains `Math.random`, `Date.now`, `performance.now` or a `new Date()` with no argument.

## Acceptance

- Given the dataset, when `npm run check:data` runs, then every test passes, and `npm run check` and `npm run check:scope -- src/mock/ tests/data/` exit 0.
- Given `ord_001`, when its figures are read, then gross is 18000, card fee 552, platform fee 1800, materials 2200, maker share 13448, and `pay_001` nets 15648.
- Given the gallery's records, when they're compared, then the contract implies 204000, the statement and the bank both show 170000, and `flg_01` carries a delta of 34000 with the contract trusted.
- Given the answer key, when it's checked against `month.ts`, then it names exactly the four planted errors and the matcher results for them.
- Given the demo timeline, when it's validated, then every beat in `demo-script.md` has its `beat.started` at its time, and the receipt for `ord_001` ends at `paid_to_maker` with 13448.
- Given `src/mock/`, when it's searched, then it holds no unseeded randomness and no wall-clock reads.

## Out of scope

- Any UI, any change to a contract, and any live call. A field the data needs that a contract doesn't define goes under `needs:`.
- Real people's names and real photos.
- October's records, beyond the late payout, the maker payouts and the held-back scenario.
