# F-search · Vibe search, surprise me and the search proof

Priority: P0 · Wave: V2 · Depends on: G1b, G2b · Folder: src/features/search/ · Made real by: B11, B12

SCOPE: src/features/search/, tests/features/search-*

## Goal
A judge types a feeling, not a product name, and sees the words Cindia picked out of it as chips they can edit. Then six pieces from the platform's Native American makers, each with the reason it matched, which part of the listing each matched word came from, and the engine that answered. When our own model has a test score, the engine line says how it did against keyword search, in plain numbers. Surprise me draws a piece the fair way, and one plain line says why: bestseller lists send buyers to the same makers, and this draw leans the other way. On the Sell side, the Proof view shows how our search model scores against keyword search and the untuned base model, or says plainly that it isn't trained yet.

## Read first
- `docs/v2/fix-plan.md`:
  - section 1.1: the four communities, their IDs and the words for them,
  - section 1.2: the tour table, with `d01-vibe` in the buyer minute, `d02-surprise` and `d13-proof` in chapter 2, and their On screen IDs,
  - section 1.3, point 5: fair by design,
  - section 1.5: the keyword chips stay rule-based unless "Backend if time" lands.
- `docs/v2/brief.md`: Shop, vibe search and surprise me, search and the index
- `docs/v2/contracts.md`:
  - section 2: Piece facets and vibe, IndexEntry (`provenance`), demo-critical figures 11, 12 and 15
  - section 3: `search.queried`, `search.answered`, `search.mapped`, `surprise.asked`, `surprise.drawn`, `proof.search_scored`, `model.trained`, the Requests rows
  - section 4: routes `/shop` and `/shop/search`, slots `shop.home.main`, `shop.search.main`, `studio.proof.side`, the search test IDs
  - section 7: the kit components
  - section 9: the glossary rows
  - section 11: `searchParams`, `extractKeywords()`, the surprise draw, `seekToEvent`
  - section 12: labels L3 and L28
- `docs/v2/reviews/A2-culture-trust.md`: finding 17 (the weights stay off the Shop page) and finding 18 (the index's layers are demo text)
- `docs/common/events.md` (after I2-core): the store, `userEvent()`, the Simulated rule, Requests from people
- `docs/common/ui-contract.md` (after I2-core): SlotProps, feature modules, test hooks
- `docs/common/design-system.md` (after I2-core): `PieceCard` and its `demo` prop, `SearchBar`, `Chip`, `ScoreBar`, `Panel`, `Badge`, `Money`, words on screen

## Interfaces
- **Reads events** through `useCindia()`, from the `search`, `surprise` and `model` store keys:
  - `search.queried`, `search.answered` (results, reasons, engine and `modelId` render from the payload),
  - `surprise.asked`, `surprise.drawn` (the method and the drawn piece render from the payload, and the candidates' weights never show on the Shop page),
  - `model.trained`, `proof.search_scored` (the proof panel, and the model line under `search-engine`).

  Also reads `sources`. The language comes from `SlotProps.lang`.
- **Reads data** with `getById()` and the `src/mock` exports `S3-catalog` names:
  - each result's piece (title, image, `imageAlt`, price, maker, community), and the maker's `surnameChar` for the `MakerMark`,
  - the piece's community (name, `people`, `demo`, verification), and the communities list for the filter,
  - each result's `IndexEntry` from `searchIndex`, for its `provenance` only (the source markers in T2),
  - `src/mock/model.ts` (`report`, null until the first real training run).
- **Reads props:** `SlotProps.searchParams` (`q` and repeated `k`) on `/shop/search`.
- **Uses** `extractKeywords(text)` from `src/sources/` to turn what the person typed into chips. It's rule-based code, the same in scripted and live mode, and it gives figure 11's six keywords for the tour's query. So the chip row carries the kit's Rule-based badge (C-9, fix-plan 1.5).
- **Emits,** with `userEvent()` from `src/core/events.ts`:
  - `search.queried` (`queryId` from the next `qry_user_` number, `text`, `keywords`, `lang`, `filters`) on submit, on a chip edit and on a filter change,
  - `surprise.asked` (`surpriseId` from the next `srp_user_` number, `keyword` when the person typed one, `method`, `seed`) on Surprise me.

  A person's seed is 1 plus the number of `surprise.asked` events already in the store, so nothing reads the wall clock and every press gives a new draw. The sources registry answers both: in scripted mode with the keyword scorer and the seeded draw, in live mode with B12.
- **Navigates** with the `src/core/nav.ts` helpers: submit goes to the results route with `q` and `k`, and a result or surprise card goes to the piece route. On `/demo` the stage navigator ignores `navigate`. The results page emits a query only for a `q` that differs from the latest query's text (T2), so it emits nothing on `/demo` as long as the stage passes no `q` or the latest query's own text (I2-shell T4).
- **Exports:** `src/features/search/index.ts` default-exports `{ id: "search", slots: { "shop.home.main": HomeView, "shop.search.main": ResultsView, "studio.proof.side": SearchProof } }`.
- **Source keys on the badge:** `b12-search` and `b11-embed` on both Shop panels, `b11-embed` on the proof panel.
- **Test IDs from the contract:** `search-input`, `search-chip-<n>`, `search-submit`, `search-results`, `search-result-<pieceId>`, `search-reason-<pieceId>`, `search-engine`, `search-surprise`, `search-surprise-mode`, `search-surprise-result`, `search-surprise-rule` (fix-plan 1.2, beat `d02-surprise`), `search-proof`, `search-proof-row-<system>`.
- **Internal test IDs:**
  - `search-example-<n>`: the example vibes, from 1,
  - `search-featured`: the home grid,
  - `search-chip-add`: the box that adds a chip on the results page,
  - `search-chip-remove-<n>`: the kit SearchBar's remove control on chip n,
  - `search-filter-price`,
  - `search-filter-community-<communityId>`,
  - `search-surprise-keyword`,
  - `search-source-<pieceId>-<n>`: the source marker on a result's matched keyword n,
  - `search-closeness-<pieceId>`: a result's closeness, when its payload has one,
  - `search-no-close`: the "No close matches" line,
  - `search-provenance-note`: the line under the grid about who wrote each part,
  - `search-model-line`: the model's score under `search-engine`,
  - `search-proof-note`: L28 under the proof table,
  - `search-proof-empty`: "Not trained yet",
  - `search-working`: the waiting line.
- **Labels from the glossary:** vibe search, keyword, why it matched, surprise me, fair random, search model, live, rule-based, demo data, community, and the communities' kind label (Native American, 美洲原住民). From contracts section 12: L3, which the kit's `PieceCard` prints when it gets `demo`, and L28.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings and the spec helper (lead): every short string these screens need that the glossary lacks, English and Chinese side by side, including four example vibes, the engine names, the model line, the source markers, the provenance note, the three surprise rules and L28. Then `search-lib.ts` (below) | src/features/search/strings.ts, tests/features/search-lib.ts | none | lead |
| T1 | The home hero: search box, live chip preview, example vibes, submit | src/features/search/SearchHero.tsx, tests/features/search-hero.spec.ts | T0 | opus |
| T2 | The results grid: cards, reasons with their source markers, the engine label and the model line, the query a URL brings | src/features/search/ResultsGrid.tsx, src/features/search/ResultCard.tsx, tests/features/search-results.spec.ts | T0 | opus |
| T3 | Refining on the results page: the search bar with its editable chips, and the filters, each change a new query | src/features/search/RefineBar.tsx, src/features/search/Filters.tsx, tests/features/search-refine.spec.ts | T0 | opus |
| T4 | Surprise me: the button, the mode picker, the drawn card and the rule line | src/features/search/SurpriseButton.tsx, src/features/search/SurpriseResult.tsx, tests/features/search-surprise.spec.ts | T0 | opus |
| T5 | The featured grid on home | src/features/search/Featured.tsx, tests/features/search-featured.spec.ts | T0 | sonnet |
| T6 | The search proof panel on Sell › Proof | src/features/search/SearchProof.tsx, tests/features/search-proof.spec.ts | T0 | sonnet |
| T7 | Assemble the two Shop views and fill the slots (lead), then B11's and B12's live feature specs | src/features/search/HomeView.tsx, src/features/search/ResultsView.tsx, src/features/search/index.ts, tests/features/search-flow.spec.ts, tests/features/search-live-map.spec.ts, tests/features/search-live.spec.ts | T1 to T6 | lead |

**How the tasks fit:** the lead writes T0 before spawning any builder. A builder that needs a string T0 lacks lists it under `needs:`, and the lead adds it. Each of T1 to T6 exports one or two components that take what they need as props or read the store. Builders run `npm run check:scope` on their files and write their spec, which imports `search-lib.ts`. The specs run for the first time once T7 fills the slots, and the lead sends any failure back to the builder who owns the file.

**T0's spec helper.** `search-lib.ts` re-exports `seekToEvent(page, type, match, offsetMs)` from `tests/smoke/lib.ts` and never copies it (contracts section 11). It adds `tourEvent(page, type, match, offsetMs, seed)`:
- When `window.__cindia.player.getTimeline()` holds the event (after I2-tour), it calls `seekToEvent`, which pauses and seeks there.
- Until then, it pauses the player and emits `seed`, the scripted payloads from `src/mock/search.ts` in tour order (the query with `qry_01`, then its answer, or the surprise with `srp_01`), with `window.__cindia.emit()`.

It never seeks to a fixed time.

**T1.** `SearchHero` is the top of Shop home. The kit's `SearchBar` holds `search-input`, `search-submit` and the chips, with `chipPrefix` `search-chip-`.
- As the person types, chips appear under the box from `extractKeywords()` (`search-chip-1` onward), with the kit's Rule-based badge beside them, since code picks them and no model does. They're a preview until submit, so a person sees what Cindia heard before asking.
- Four example vibes (`search-example-1` to `search-example-4`) fill the box when clicked.
- Submit emits `search.queried` with the text, the chips and the filters, then navigates to the results route.
- When a scripted `search.queried` arrives from the timeline (`d01-vibe`), the box shows its text as if typed and the chips show the payload's `keywords`, not the preview.
- While the latest query has no answer, a quiet line says Cindy is searching (`search-working`).

**T2.** `ResultsGrid` (`search-results`) renders the latest `search.answered` in payload order. Each `ResultCard` (`search-result-<pieceId>`) is a kit `PieceCard` with `demo={community.demo}`, so its verification line starts with L3: illustration, title, `MakerMark`, community, price through `Money`, and the `VerificationLine`. Under it, `search-reason-<pieceId>` shows the payload's `reason` with the `matched` keywords as small chips.
- **Source markers (A1-17).** Each matched keyword names the part of the listing it came from, in `search-source-<pieceId>-<n>`. `ResultCard` finds the word in the piece's facets (group `facts`), its vibe (group `vibe`) or its community's craft (group `culture`), and reads that group's value in the piece's `provenance`: `maker` reads "from the maker's notes", `community` "from the community", `agent:tagger` "suggested by the Tagger" and `agent:describer` "from the picture notes". A word found in no group gets no marker. This is the one place the results read the index, and only for these labels. The reason and the matched words still come from the payload.
- **The provenance note.** `search-provenance-note`, one line under the grid: "Each keyword shows who writes that part of a listing in a real launch. In this demo, the Cindia team wrote every part." The data agent wrote all of it and no Tagger or Describer ran (A2-18), so no marker ever says a maker approved anything.
- **Closeness (B12).** When a result carries `closeness`, its card shows `search-closeness-<pieceId>`: a small `ScoreBar` with the number to two places and the word "closeness", so a nonsense query never reads as a perfect match. A result without one (the scripted keyword scorer sends none) shows nothing there. When the answer's `closeMatches` is `false`, `search-no-close` above the grid reads "No close matches", and the results still show under it. An answer without `closeMatches` shows no such line.
- **The engine.** `search-engine` names the engine from the payload in plain words, with the model ID when there is one. `keyword_scripted` reads as a rule-based keyword match in the browser, never as our model.
- **The model line (A1-2, A1-4).** When the store's `model` key holds a `proof.search_scored`, `search-model-line` sits under `search-engine` and uses that payload only: "Cindia's own model, <modelId>. Recall at 5 on <queries> held-out test queries: <custom> against <keyword> for keyword search." When the custom row isn't above the keyword row, it says so plainly instead: "On <queries> held-out test queries, keyword search scored <keyword> and our model <custom>." With no score in the store, there's no line. In the tour, `model.trained` and `proof.search_scored` land at the start of `d01-vibe` when a report exists, so the line shows during the vibe search.
- **The query a URL brings (B1-29).** When `searchParams.q` is set and differs from the latest `search.queried` text, the results view emits one `search.queried` for it, with `k` as the keywords, or `extractKeywords(q)` when `k` is empty. That makes a shared results link work. Feature specs run on the dev server, where `<StrictMode>` runs every effect twice, so the effect keeps the `q` it already sent in a ref and reads the latest query through `getState()` inside the effect, never from a value captured at render. It emits once per new `q`.
- Clicking a card navigates to that piece.
- An answer with no results says so and offers Surprise me.

**T3.** `RefineBar` is the results page's search bar (D1-7): the kit `SearchBar` with `search-input` holding the latest query's text, `search-submit`, and the latest query's keywords as its chips (`search-chip-<n>`). Each chip's remove control is `search-chip-remove-<n>`, and `search-chip-add` adds a keyword. These are the only chips on the results page, so each `search-chip-<n>` renders once there. `Filters` has a max-price control (`search-filter-price`) and one toggle per community (`search-filter-community-<communityId>`, four of them).
- Every change emits a new `search.queried`: the edited text, keywords and filters, and a new `queryId`. A new text sent with `search-submit` is a new query too.
- Chips keep their order, so `search-chip-<n>` stays stable for tests.
- The scripted answer to an edited query comes from the keyword scorer, because the demo's answer only fits the demo's exact query (I2-core T5, B1-14).

**T4.** `SurpriseButton` (`search-surprise`) sits on home and on the results page, with `SurpriseResult` and the rule line beside it on both.
- `search-surprise-mode` picks keyword, pure random or fair random. Fair random is the default.
- With keyword mode, `search-surprise-keyword` takes the word (it starts with the latest query's first chip). The other modes send no keyword.
- Pressing it emits `surprise.asked` with the seed rule above.
- `SurpriseResult` (`search-surprise-result`) shows the latest `surprise.drawn` as a `PieceCard` with `demo={community.demo}`, and names the method.
- `search-surprise-rule` gives the rule for the method in one plain line (A1-16, A2-17). It follows the latest draw's method, or the picked mode before any draw:
  - fair random: "Bestseller lists send buyers to the same makers. Fair random leans the other way: makers with fewer sales this month get a bigger chance."
  - keyword random: "Every piece that matches the keyword has the same chance."
  - pure random: "Every piece on Cindia has the same chance."
- The Shop page never shows the candidates' weights, because with real makers they would tell anyone who sold least this month. The search process view shows them (F-process).
- A drawn card navigates to the piece.

**T5.** `Featured` (`search-featured`) is a grid of eight `PieceCard`s on home: the first two pieces of kind `featured` from each of the four communities, topped up with the community's first pieces when it has fewer than two, in community order. Each card shows its community's name and gets `demo={community.demo}`. It renders from `src/mock` only, so it needs no events.

**T6.** `SearchProof` (`search-proof`) is a kit `Panel` with `b11-embed`.
- With a `proof.search_scored` in the store, it shows one row per system (`search-proof-row-keyword`, `search-proof-row-base`, `search-proof-row-custom`, `search-proof-row-hybrid`): recall at 5 as a `ScoreBar` and MRR, with the number of eval queries and `modelId`. The best row is marked, whichever system it is.
- Under the table, `search-proof-note` shows L28: "<queries> test queries over the same <pieces> fictional pieces, written separately by our data agent and never used for training. A small test, not a benchmark." The query count comes from the payload and the piece count from `pieces`. If Gordon writes or edits some of the queries (fix-plan 1.5), the line says how many, as B11's report gives it.
- With `model.trained`, a line names the base model, the number of training pairs and the epochs.
- With neither, and `report` null in `src/mock/model.ts`, it shows `search-proof-empty` ("Not trained yet") and one line on what the panel will show.
- It never shows a number the event didn't carry.

**T7.** `HomeView` stacks `SearchHero`, then `SurpriseButton` with `SurpriseResult` and `search-surprise-rule`, then `Featured`, in one `Panel` that declares `b12-search` and `b11-embed`. `ResultsView` puts `RefineBar` and `Filters` above `ResultsGrid`, with `search-engine` and `search-model-line` at the top of the grid, and `SurpriseButton`, `SurpriseResult` and `search-surprise-rule` in a column on the right (D1-7), in a `Panel` with the same keys. Both fit 1440 by 900 with the six tour results above the fold, so every On screen ID of `d01-vibe` and `d02-surprise` sits inside the frame on `/shop/search`. `index.ts` exports the module. `search-flow.spec.ts` walks home to results to surprise. `search-live-map.spec.ts` and `search-live.spec.ts` are B11's and B12's live feature specs (acceptance 17 and 18), which the orchestrator runs as `npm run gate -- G5 b11-embed search-live-map` and `npm run gate -- G5 b12-search search-live`.

## Acceptance
Specs open the route named and check by test ID only. A spec reaches a tour event with `tourEvent()` from `search-lib.ts`: it seeks there with `seekToEvent(page, type, match, offsetMs)` once the timeline holds the event (after I2-tour), and until then it emits the scripted payloads from `src/mock/search.ts`. No spec seeks to a fixed time. A spec seeks before it acts, because a seek drops a pending answer (lessons, F-ask-cindy). An answer to a person counts as arrived when it shows within Playwright's default expect timeout, never inside a wall-clock window (B1-27). Expected values come from `src/mock/`, not typed in. After I2-tour, G4v2 checks the same IDs at the beats in fix-plan 1.2.

1. **Given** the tour's `search.queried` (figure 11) on `/shop`, **then** `search-input` shows its text and `search-chip-1` to `search-chip-6` read `demoSearch.query.keywords` in order, `gift for mom` and `under $200` among them, with the Rule-based badge beside the chips.
2. **Given** the tour's `search.answered` on `/shop/search`, **then** `search-results` holds `demoSearch.answer`'s six results in order, starting with `search-result-pc_01`. Every card has a `search-reason-<pieceId>`, every price is $200.00 or less, and every card's verification line starts with L3.
3. **Given** `/shop/search` after the tour's `search.answered` (D1-7), **then** the same page shows `search-input` with the tour's text, each of `search-chip-1` to `search-chip-6` exactly once, and `search-engine`. **Given** the tour's `surprise.drawn` after it, **then** `search-surprise`, `search-surprise-result` and `search-surprise-rule` show on that page too, inside the frame.
4. **Given** scripted mode with no search score in the store, **then** `search-engine` names a rule-based keyword match, `search-model-line` is absent, and both Shop panels show `simulated-badge`.
5. **Given** a `proof.search_scored` with four systems emitted as a test payload, **then** `search-model-line` shows that payload's custom and keyword recall at 5 and its query count, and no other number. With the custom recall below the keyword recall in a second payload, the line says keyword search scored higher.
6. **Given** the tour's answer, **then** each matched keyword in `search-reason-pc_01` carries `search-source-pc_01-<n>` with the label for its group in `pc_01`'s `provenance`, and `search-provenance-note` shows under the grid.
7. **When** a person types "warm wool for a reading nook" in `search-input`, **then** chips appear before submit. **When** they press `search-submit`, **then** the store holds a `search.queried` with `source: "user"` and those chips, the page is the results route, and the keyword scorer's answer arrives in `search-results`.
8. **When** a person removes `search-chip-2` on `/shop/search` after the tour's answer, **then** a new `search.queried` without that keyword is in the store, and a new answer for its `queryId` arrives and renders.
9. **When** `search-filter-price` is set to $100 there, **then** the new `search.queried` carries `maxPriceCents: 10000`, and in the answer that arrives no card shows a price above $100.00, so `search-result-pc_01` ($180.00) is gone.
10. **When** `/shop/search?q=something%20calm&k=calm` opens on a fresh store on the dev server, which runs `<StrictMode>`, **then** exactly one `search.queried` with that text and the keyword `calm` is emitted.
11. **Given** the tour's `surprise.asked` and `surprise.drawn` (figure 12), **then** `search-surprise-result` shows `demoSurprise`'s drawn piece and names fair random, `search-surprise-rule` shows the fair-random line, and no candidate's weight shows anywhere on the page.
12. **When** a person picks pure random in `search-surprise-mode` and presses `search-surprise` twice, **then** the two `surprise.asked` events carry seeds 1 and 2 (on a fresh store) and no keyword, and `search-surprise-result` and `search-surprise-rule` name pure random.
13. **Given** `/shop` on a fresh store, **then** `search-featured` shows eight cards, two from each of the four communities in community order, and `search-input` is empty.
14. **Given** `/sell/proof` with no `proof.search_scored` in the store and `report` null, **then** `search-proof-empty` shows. **When** a `proof.search_scored` with four systems is emitted, **then** `search-proof-row-keyword`, `search-proof-row-base`, `search-proof-row-custom` and `search-proof-row-hybrid` show the payload's recall and MRR, and `search-proof-note` shows L28 with the payload's query count.
15. **Given** `demo-lang-toggle` set to Chinese, **then** the hero, the chips' labels, the reasons, the source markers, the rule line and the proof panel show their Chinese text, and amounts are still dollars.
16. **Given** a `search.answered` emitted with `closeness` on each result and `closeMatches: false`, **then** each card's `search-closeness-<pieceId>` shows that result's closeness and `search-no-close` reads "No close matches". **Given** the tour's scripted answer, which carries neither, **then** no `search-closeness-<pieceId>` and no `search-no-close` show.
17. **Given** live mode with `b11-embed` live, **when** a person submits their own search, **then** the store holds a live `search.mapped` for that query's `queryId`, from the trained model through B12's adapter, and every event is valid. This is `search-live-map.spec.ts`, B11's live feature spec, run as `npm run gate -- G5 b11-embed search-live-map`.
18. **Given** live mode with `b12-search` live, **when** a person submits their own search and then presses `search-surprise`, **then** a live `search.answered` and `search.mapped` arrive for the query and a live `surprise.drawn` for the draw, `search-results` and `search-surprise-result` render them, and every event is valid. This is `search-live.spec.ts`, B12's live feature spec, run as `npm run gate -- G5 b12-search search-live`.

Specs 17 and 18 skip with a named reason when `/api/health` doesn't list their router or `services.model` is false, so G3 passes before B11 and B12 land.

## Out of scope
- Ranking, embedding or the scripted keyword scorer itself. B12, B11 and `I2-core` own those, and this feature renders what the events carry.
- The embedding map and the surprise candidates' weights. Both are in the process feature's search view.
- Having the Finder agent write the chips in live mode. That's in "Backend if time" (fix-plan 1.5), and the chips stay rule-based, and labeled so, until it lands.
- Saving searches, accounts, a cart or wish lists.
- Image search.

## Contract additions needed
Settled in contracts section 11, I2-core and I2-shell, listed so a builder knows where each lives:
- `SlotProps.searchParams?: { q?: string, k: string[] }`, filled by the shell on `/shop/search`, with `k` an empty list when the URL has none.
- `extractKeywords(text)` in `src/sources/keywords.ts`, exported from `src/sources/index.ts`, returning `{ keywords: string[], filters: { maxPriceCents?: number } }`. It's deterministic and returns exactly figure 11's keywords for the tour's query.
- The scripted keyword scorer applies `search.queried`'s `filters` (max price, communities), the same as B12, and the demo's answer plays only when the text, keywords and filters all equal the demo's (I2-core T5, B1-14).
- `src/core/nav.ts` with typed route builders and `navigate(path)`. On `/demo` the stage navigator ignores `navigate` (I2-shell T1).
- ID prefixes for a person's requests: `qry_user_<n>` for queries and `srp_user_<n>` for surprises. The tour uses `qry_01` and `srp_01`.
- The `src/mock` exports this plan reads: `communities`, `searchIndex`, `demoSearch`, `demoSurprise`, and `report` from `model.ts`, plus `getById()` for `com_` IDs (S3-catalog).
- `seekToEvent(page, type, match, offsetMs)` in `tests/smoke/lib.ts` (I2-shell T5).
- The test ID `search-surprise-rule` (fix-plan 1.2, beat `d02-surprise`).
- The kit `SearchBar` gives chip n's remove control a test ID, `<chipPrefix>remove-<n>`, so this plan's `search-chip-remove-<n>` exists (I2-kit T2).
- The search process view lists the newest `surprise.drawn`'s candidates with their weights, the drawn one marked, since this feature never shows them (F-process T2, A2-17).
- On `/demo` the stage gives `shop.search.main` no `searchParams.q`, or the latest query's own text, so T2's link rule never emits there (I2-shell T4).
- `closeness?` on each `search.answered` result and `closeMatches?` on the answer (contracts section 3, B12).

Still open, and in the fix report's needs:
- The glossary's `keyword` row says a rule-based extractor picks the words, not the Finder agent (contracts section 9, C-9).
