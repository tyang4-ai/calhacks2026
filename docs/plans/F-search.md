# F-search · Vibe search, surprise me and the search proof

Priority: P0 · Wave: V2 · Depends on: G1b, G2b · Folder: src/features/search/ · Made real by: B11, B12

SCOPE: src/features/search/, tests/features/search-*

## Goal
A judge types a feeling, not a product name, and sees the words Cindia pulled out of it as chips they can edit. Then six pieces from four communities, each with the reason it matched and the name of the engine that answered. One more click on Surprise me draws a piece the fair way, and the screen says how it was drawn. On the Sell side, the Proof view shows how our own search model scores against keyword search and the untuned base model, or says plainly that it isn't trained yet.

## Read first
- `docs/v2/brief.md`: Shop, vibe search and surprise me, search and the index
- `docs/v2/contracts.md`:
  - section 2: Piece facets and vibe, IndexEntry, demo-critical figures 11, 12 and 15
  - section 3: `search.queried`, `search.answered`, `search.mapped`, `surprise.asked`, `surprise.drawn`, `proof.search_scored`, `model.trained`, the Requests rows
  - section 4: routes `/shop` and `/shop/search`, slots `shop.home.main`, `shop.search.main`, `studio.proof.side`, the search test IDs
  - section 7: the kit components
  - section 8: beats `d01-vibe`, `d02-surprise` and `d13-proof`
  - section 9: the glossary rows
- `docs/common/events.md` (after I2-core): the store, `userEvent()`, the Simulated rule, Requests from people
- `docs/common/ui-contract.md` (after I2-core): SlotProps, feature modules, test hooks
- `docs/common/design-system.md` (after I2-core): `PieceCard`, `SearchBar`, `Chip`, `ScoreBar`, `Panel`, `Badge`, `Money`, words on screen

## Interfaces
- **Reads events** through `useCindia()`, from the `search`, `surprise` and `model` store keys:
  - `search.queried`, `search.answered` (results, reasons, engine and `modelId` render from the payload, never from the index),
  - `surprise.asked`, `surprise.drawn` (the method and the candidates' weights render from the payload),
  - `model.trained`, `proof.search_scored`.
  
  Also reads `sources`. The language comes from `SlotProps.lang`.
- **Reads data** with `getById()` and the `src/mock` exports `S3-catalog` names: each result's piece (title, image, price, maker, community), the maker's `surnameChar` for the `MakerMark`, the piece's community (name, kind, verification), the communities list for the filter, and `src/mock/model.ts` (`report`, null until the first real training run).
- **Reads props:** `SlotProps.searchParams` (`q` and repeated `k`) on `/shop/search`.
- **Uses** `extractKeywords(text)` from `src/sources/` to turn what the person typed into chips. It's the same helper in scripted and live mode, and it gives figure 11's six keywords for the tour's query.
- **Emits,** with `userEvent()` from `src/core/events.ts`:
  - `search.queried` (`queryId` from the next `qry_user_` number, `text`, `keywords`, `lang`, `filters`) on submit, on a chip edit and on a filter change,
  - `surprise.asked` (`surpriseId` from the next `srp_user_` number, `keyword` when the person typed one, `method`, `seed`) on Surprise me.
  
  A person's seed is 1 plus the number of `surprise.asked` events already in the store, so nothing reads the wall clock and every press gives a new draw. The sources registry answers both: in scripted mode with the keyword scorer and the seeded draw, in live mode with B12.
- **Navigates** with the `src/core/nav.ts` helpers: submit goes to the results route with `q` and `k`, and a result or surprise card goes to the piece route. On `/demo` the shell decides what navigation does.
- **Exports:** `src/features/search/index.ts` default-exports `{ id: "search", slots: { "shop.home.main": HomeView, "shop.search.main": ResultsView, "studio.proof.side": SearchProof } }`.
- **Source keys on the badge:** `b12-search` and `b11-embed` on both Shop panels, `b11-embed` on the proof panel.
- **Test IDs from the contract:** `search-input`, `search-chip-<n>`, `search-submit`, `search-results`, `search-result-<pieceId>`, `search-reason-<pieceId>`, `search-engine`, `search-surprise`, `search-surprise-mode`, `search-surprise-result`, `search-proof`, `search-proof-row-<system>`.
- **Internal test IDs:**
  - `search-example-<n>`: the example vibes, from 1,
  - `search-featured`: the home grid,
  - `search-chip-add`: the box that adds a chip,
  - `search-chip-remove-<n>`,
  - `search-filter-price`,
  - `search-filter-community-<communityId>`,
  - `search-surprise-keyword`,
  - `search-surprise-weights`,
  - `search-proof-empty`: "Not trained yet",
  - `search-working`: the waiting line.
- **Labels from the glossary:** vibe search, keyword, why it matched, surprise me, fair random, search model, live, demo data, Indigenous, heritage, community.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): every short string these screens need that the glossary lacks, English and Chinese side by side, including four example vibes and the engine names | src/features/search/strings.ts | none | lead |
| T1 | The home hero: search box, live chip preview, example vibes, submit | src/features/search/SearchHero.tsx, tests/features/search-hero.spec.ts | T0 | opus |
| T2 | The results grid: cards, reasons, engine label, the query a URL brings | src/features/search/ResultsGrid.tsx, src/features/search/ResultCard.tsx, tests/features/search-results.spec.ts | T0 | opus |
| T3 | Refining: editable chips and the filters, each change a new query | src/features/search/ChipEditor.tsx, src/features/search/Filters.tsx, tests/features/search-refine.spec.ts | T0 | opus |
| T4 | Surprise me: the button, the mode picker, the drawn card with its weights | src/features/search/SurpriseButton.tsx, src/features/search/SurpriseResult.tsx, tests/features/search-surprise.spec.ts | T0 | opus |
| T5 | The featured grid on home | src/features/search/Featured.tsx, tests/features/search-featured.spec.ts | T0 | sonnet |
| T6 | The search proof panel on Sell › Proof | src/features/search/SearchProof.tsx, tests/features/search-proof.spec.ts | T0 | sonnet |
| T7 | Assemble the two Shop views and fill the slots (lead) | src/features/search/HomeView.tsx, src/features/search/ResultsView.tsx, src/features/search/index.ts, tests/features/search-flow.spec.ts | T1 to T6 | lead |

**How the tasks fit:** the lead writes T0 before spawning any builder. A builder that needs a string T0 lacks lists it under `needs:`, and the lead adds it. Each of T1 to T6 exports one or two components that take what they need as props or read the store. Builders run `npm run check:scope` on their files and write their spec. The specs run for the first time once T7 fills the slots, and the lead sends any failure back to the builder who owns the file.

**T1.** `SearchHero` is the top of Shop home. The kit's `SearchBar` holds `search-input` and `search-submit`.
- As the person types, chips appear under the box from `extractKeywords()` (`search-chip-1` onward). They're a preview until submit, so a person sees what Cindia heard before asking.
- Four example vibes (`search-example-1` to `search-example-4`) fill the box when clicked.
- Submit emits `search.queried` with the text, the chips and the filters, then navigates to the results route.
- When a scripted `search.queried` arrives from the timeline (`d01-vibe`), the box shows its text as if typed and the chips show the payload's `keywords`, not the preview.
- While the latest query has no answer, a quiet line says Cindy is searching (`search-working`).

**T2.** `ResultsGrid` (`search-results`) renders the latest `search.answered` in payload order. Each `ResultCard` (`search-result-<pieceId>`) is a kit `PieceCard`: illustration, title, `MakerMark`, community, price through `Money`, and the `VerificationLine`. Under it, `search-reason-<pieceId>` shows the payload's `reason` with the `matched` keywords as small chips.
- `search-engine` names the engine from the payload in plain words ("Keyword match, simulated" for `keyword_scripted`) and the model ID when there is one.
- On mount, if `searchParams.q` is set and differs from the latest `search.queried` text, it emits one `search.queried` for it, with `k` as the keywords (or `extractKeywords(q)` when there are none). That makes a shared results link work.
- Clicking a card navigates to that piece.
- An answer with no results says so and offers Surprise me.

**T3.** `ChipEditor` shows the latest query's keywords as kit `Chip`s with a remove button each (`search-chip-remove-<n>`), plus `search-chip-add`. `Filters` has a max-price control (`search-filter-price`) and one toggle per community (`search-filter-community-<communityId>`). Every change emits a new `search.queried`: same text, the edited keywords and filters, a new `queryId`. Chips keep their order, so `search-chip-<n>` stays stable for tests.

**T4.** `SurpriseButton` (`search-surprise`) sits on home and on the results page.
- `search-surprise-mode` picks keyword, pure random or fair random. Fair random is the default, and its line says it leans toward makers with fewer sales this month.
- With keyword mode, `search-surprise-keyword` takes the word (it starts with the latest query's first chip). The other modes send no keyword.
- Pressing it emits `surprise.asked` with the seed rule above.
- `SurpriseResult` (`search-surprise-result`) shows the latest `surprise.drawn` as a `PieceCard` and names the method. `search-surprise-weights` lists each candidate with its weight from the payload as a `ScoreBar`, the drawn one marked.
- A drawn card navigates to the piece.

**T5.** `Featured` (`search-featured`) is a grid of eight `PieceCard`s on home: the first piece of kind `featured` from each community (or the community's first piece if it has none), in community order, with the community's name and its Indigenous or heritage label. It renders from `src/mock` only, so it needs no events.

**T6.** `SearchProof` (`search-proof`) is a kit `Panel` with `b11-embed`.
- With a `proof.search_scored` in the store, it shows one row per system (`search-proof-row-keyword`, `search-proof-row-base`, `search-proof-row-custom`, `search-proof-row-hybrid`): recall at 5 as a `ScoreBar` and MRR, with the number of eval queries and `modelId`. The best row is marked.
- With `model.trained`, a line names the base model, the number of training pairs and the epochs.
- With neither, and `report` null in `src/mock/model.ts`, it shows `search-proof-empty` ("Not trained yet") and one line on what the panel will show.
- It never shows a number the event didn't carry.

**T7.** `HomeView` stacks `SearchHero`, `SurpriseButton` with `SurpriseResult`, and `Featured` in one `Panel` that declares `b12-search` and `b11-embed`. `ResultsView` puts `ChipEditor` and `Filters` above `ResultsGrid`, with `SurpriseButton` on the right, in a `Panel` with the same keys. Both fit 1440 by 900 with the six tour results above the fold. `index.ts` exports the module. `search-flow.spec.ts` walks home to results to surprise.

## Acceptance
Specs open the route named and check by test ID only. Until `I2-tour` adds the tour timeline, a spec gets the tour's events by emitting the scripted payloads from `src/mock/search.ts` with `window.__cindia.emit()` at the beat's times. After `I2-tour`, G4v2 checks the same lines at the beats in contracts section 8.

1. **Given** the tour's `search.queried` (figure 11), **then** `search-input` shows its text and `search-chip-1` to `search-chip-6` read `soft`, `hopeful`, `garden`, `peony`, `gift for mom`, `under $200` in that order.
2. **Given** the tour's `search.answered`, **then** `search-results` holds six cards whose first three are `search-result-pc_01`, `search-result-pc_07` and `search-result-pc_11`. Every card has a `search-reason-<pieceId>`, every price is $200.00 or less, and the last three come from three different Indigenous communities.
3. **Given** scripted mode, **then** `search-engine` names the keyword match as simulated, and both Shop panels show `simulated-badge`.
4. **When** a person types "warm wool for a reading nook" in `search-input`, **then** chips appear before submit. **When** they press `search-submit`, **then** the store holds a `search.queried` with `source: "user"` and those chips, the page is the results route, and about 1.2 seconds later in real time `search-results` shows the scripted answer.
5. **When** a person removes `search-chip-2`, **then** a new `search.queried` without that keyword is in the store, and the results update.
6. **When** `search-filter-price` is set to $100, **then** the new `search.queried` carries `maxPriceCents: 10000` and no result card shows a price above $100.00.
7. **When** `/shop/search?q=something%20calm&k=calm` opens on a fresh store, **then** exactly one `search.queried` with that text and the keyword `calm` is emitted.
8. **Given** the tour's `surprise.asked` and `surprise.drawn` (figure 12), **then** `search-surprise-result` shows `pc_46` and names fair random, and `search-surprise-weights` lists the candidates with `pc_46` marked.
9. **When** a person picks pure random in `search-surprise-mode` and presses `search-surprise` twice, **then** the two `surprise.asked` events carry seeds 1 and 2 (on a fresh store) and no keyword, and `search-surprise-result` names pure random.
10. **Given** `/shop` on a fresh store, **then** `search-featured` shows eight cards, one per community, and `search-input` is empty.
11. **Given** `/sell/proof` with no `proof.search_scored` in the store and `report` null, **then** `search-proof-empty` shows. **When** a `proof.search_scored` with four systems is emitted, **then** `search-proof-row-keyword`, `search-proof-row-base`, `search-proof-row-custom` and `search-proof-row-hybrid` show the payload's recall and MRR.
12. **Given** `demo-lang-toggle` set to Chinese, **then** the hero, the chips' labels, the reasons and the proof panel show their Chinese text, and amounts are still dollars.

## Out of scope
- Ranking, embedding or the scripted keyword scorer itself. B12, B11 and `I2-core` own those, and this feature renders what the events carry.
- The embedding map. It's in the process feature's search view.
- Saving searches, accounts, a cart or wish lists.
- Image search.

## Contract additions needed
- `SlotProps.searchParams?: { q?: string; k: string[] }`, filled by the shell on `/shop/search` (I2-core, I2-shell).
- `extractKeywords(text)` in `src/sources/keywords.ts`, exported from `src/sources/index.ts`, returning `{ keywords: string[]; filters: { maxPriceCents?: number } }`. It's deterministic and returns exactly figure 11's keywords for the tour's query (I2-core, settled in contracts section 11).
- The scripted keyword scorer applies `search.queried`'s `filters` (max price, communities), the same as B12 (I2-core).
- `src/core/nav.ts` with typed route builders and `navigate(path)`. On `/demo` the shell decides what `navigate()` does (I2-core, I2-shell, settled in contracts section 11).
- ID prefixes for a person's requests: `qry_user_<n>` for queries and `srp_user_<n>` for surprises. The tour uses `qry_01` and `srp_01`.
- The `src/mock` exports this plan reads: `communities`, `searchIndex`, and `report` from `model.ts`, plus `getById()` for `com_` IDs (S3-catalog).
