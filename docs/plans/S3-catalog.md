# S3-catalog · Communities, the 54-piece catalog, the search index and the scripted agents

Priority: P0 · Wave: V1 · Depends on: I2-core (T1 needs only I2-core's types on disk, the rest needs I2-core green) · Folder: `src/mock/`, `tests/data/` · Made real by: B10 (splits), B11 (the model's report), B12 (search answers), B14 (swarm runs), B15 (the counterfeit scan)

**SCOPE:** `src/mock/, tests/data/`

## Goal

v2's data:
- eight communities,
- 54 pieces with the facts, culture and vibe layers the search runs on, plus their index entries,
- the hand-written eval set,
- projects and commissions,
- storefronts,
- the agent roster,
- the scripted runs and scan the demo plays.

Every v1 record and figure stays exactly as it is. Search, the swarm view and the counterfeit watch look real in scripted mode and read honestly as simulated.

## Read first

- `docs/v2/contracts.md`:
  - section 2 (entities, IDs, the passage rule, figures 11 to 15, the file table),
  - section 3 (the payloads the scripted runs carry),
  - section 6 (the agent roster),
  - **section 11**, which settles the export names, the ID scheme, the surprise draw, block props and `splits.ts`, and wins over sections 1 to 10.
  
  Once I2-core is green, the same content is in `docs/common/data-model.md` and `events.md`. Use those.
- `docs/v2/brief.md`: the communities, cultural care, the agents' one-job rule
- `docs/plans/S2-mock-data.md` and the existing `src/mock/` files: the style, `getById()`, the determinism rules, and how v1 builds figures from records instead of typing them
- `src/core/types.ts` after I2-core: the new types, including `ScriptedRun`, `ModelReport`, `DemoSearch`, `DemoSurprise`, `ScriptedScan` and `Policy`
- `src/sources/keywords.ts` (`extractKeywords`), the scripted keyword scorer and `src/sources/surprise.ts` after I2-core. Figures 11 and 12 are checked through them.
- `.claude/rules/mock.md`

## Cultural care (you have no web access, so these rules decide)

- **Describe crafts in general, accurate terms only:** the object, the fiber, the technique, the colors, what it's used for. Write nothing you aren't sure is true of the craft. Never invent what a motif means to a community. If a piece has a flower, it has a flower. It doesn't "symbolize renewal" unless the community page says so.
- **No sacred or ceremonial objects,** and nothing in the banned list in `contracts.md` section 2: no Yei or sandpainting designs, no tā moko, no korowai, no gákti, no ivory, no ceremonial headdresses. No pan-Indigenous clichés (feathers, dreamcatchers, "tribal" patterns).
- **Craft terms** that English-language craft and museum writing uses are fine, spelled with their diacritics: raranga, harakeke, kete, pōtae, whāriki, duodji, guksi. Write no sentences, greetings or names in Indigenous languages. `nativeName` stays unset for every person, because in a real launch the maker writes it.
- **Names are fictional:** a common given name with a common family name for the region. Never a name you associate with a known artist, politician or public figure. A comment at the top of `people.ts` and `communities.ts` says every name and story is fictional demo data that Gordon can swap.
- **Community text is demo text:** each community's `about` is written as the community describing itself, in two or three plain sentences. The file comment says it stands in for text the community would write. Gu embroidery is `heritage`, never called Indigenous anywhere.

## Interfaces

- **Reads:** types and `validateEvent()` from `src/core/`, v1's records in `src/mock/`, and in tests only, the scripted scorer and draw from `src/sources/`. Nothing from `src/ui/`, `src/app/` or `src/features/`.
- **Exports**, exactly as `contracts.md` section 11 names them. `src/mock/index.ts` re-exports every file. `npm run export:mock` writes every non-function export to `artifacts/mock/mock.json`, which B11, B12 and B14 read.

| File | Exports |
|---|---|
| `communities.ts` | `communities` |
| `people.ts` | v1's exports unchanged (`studio`, `owner`, `makers` stays the three Gu makers, `buyers`, `people`), plus `leads` (`own_01` to `own_08`) and `allMakers` (`mkr_01` to `mkr_17`). `people` now holds everyone |
| `catalog.ts` | `pieces` (all 54, v1's twelve first), `curatedSet` unchanged |
| `searchIndex.ts` | `searchIndex`, `keywordAliases` (at least `mom` to `gift for mom`) |
| `search.ts` | `demoSearch`, `demoSurprise` |
| `searchEval.ts` | `searchEval` |
| `projects.ts` | `projects`, `worksInProgress` |
| `storefronts.ts` | `storefronts` |
| `listings.ts` | `listings` |
| `agents.ts` | `agents`, `getAgent(agentId)` |
| `swarm.ts` | `swarmRuns`, `fallbackSupportRun`, `fallbackListingRun`, `demoQuestions` |
| `watch.ts` | `counterfeitCandidates`, `scriptedScan` |
| `model.ts` | `modelId`, `report` |
| `policy.ts` | `policy` |
| `splits.ts` | `splits` |
| `index.ts` | Re-exports all of the above. `getById()` also finds `com_`, `prj_`, `wip_`, `sto_`, `lst_`, `cft_`, the new people, the new approvals `apr_03` to `apr_05` and the follow-up `fup_02` |

- **IDs** (section 11's scheme, the scripted side):
  - `qry_01`, `srp_01`, `thr_01`, `wsc_01` (the tour's scan),
  - `run_01` (the support run), `run_02` (the listing run), `run_03` (the Designer run), plus this plan's `run_04` (the seller payout question), `run_05` (`fallbackSupportRun`) and `run_06` (`fallbackListingRun`),
  - `stp_0001` onward across all runs, `chk_01` onward, `ctb_01`.
  
  People's IDs (`*_user_<n>`) are made by the sources code, never stored here.
- **Threads:**
  - `run_01` uses `thr_01` and `run_04` uses `thr_02`.
  - The listing run uses its `listingId` (`lst_01`) and the Designer run its storefront ID (`sto_07`).
  - The fallback runs carry `thr_00`, which the responder replaces with the person's thread when it replays them.
- **Determinism:** no `Math.random`, no `Date.now`, no `new Date()` without an argument, as in v1. Any figure that comes from v1's records is computed from them, never typed.

## Tasks

The data-smith does these in order, one at a time, so a later task may finish a file an earlier one stubbed (T1's stubs, `index.ts`). Each task ends with its own test passing under `npm run check:data`.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Typed stubs for every new file, so I2-core's responders compile | `src/mock/communities.ts`, `src/mock/searchIndex.ts`, `src/mock/search.ts`, `src/mock/searchEval.ts`, `src/mock/projects.ts`, `src/mock/storefronts.ts`, `src/mock/listings.ts`, `src/mock/agents.ts`, `src/mock/swarm.ts`, `src/mock/watch.ts`, `src/mock/model.ts`, `src/mock/policy.ts`, `src/mock/splits.ts`, `src/mock/index.ts` | I2-core's types | sonnet |
| T2 | Communities and people | `src/mock/communities.ts`, `src/mock/people.ts`, `tests/data/v2-communities.test.ts` | T1 | opus |
| T3 | Catalog, part A: Diné, Māori and Sámi pieces, `pc_13` to `pc_30` | `src/mock/catalog/part-a.ts`, `tests/data/v2-catalog-a.test.ts` | T2 | opus |
| T4 | Catalog, part B: Inuit, Quechua, Miao and Maasai pieces, `pc_31` to `pc_54` | `src/mock/catalog/part-b.ts`, `tests/data/v2-catalog-b.test.ts` | T2 | opus |
| T5 | Facets and vibe for the twelve Gu pieces, the merge into `catalog.ts`, the search index and the aliases | `src/mock/catalog/gu-facets.ts`, `src/mock/catalog.ts`, `src/mock/searchIndex.ts`, `tests/data/v2-index.test.ts` | T3, T4 | opus |
| T6 | The demo search and surprise, and the 50 eval queries | `src/mock/search.ts`, `src/mock/searchEval.ts`, `tests/data/v2-search.test.ts` | T5, I2-core green | opus |
| T7 | Splits, projects, works in progress, storefronts, listings, policy, the agent roster, the counterfeit scan, the empty model | `src/mock/splits.ts`, `src/mock/projects.ts`, `src/mock/storefronts.ts`, `src/mock/listings.ts`, `src/mock/policy.ts`, `src/mock/agents.ts`, `src/mock/watch.ts`, `src/mock/model.ts`, `tests/data/v2-records.test.ts` | T5 | opus |
| T8 | The scripted swarm runs, the lookups, and the cross-file integrity and figures tests | `src/mock/swarm.ts`, `src/mock/index.ts`, `tests/data/v2-figures.test.ts`, `tests/data/v2-integrity.test.ts` | T6, T7 | opus |
| T9 | After B11's first real training run: copy `server/b11_embed/report.json` and the PCA points from `server/b11_embed/vectors.json` into `src/mock/model.ts`'s `report` | `src/mock/model.ts`, `tests/data/v2-model.test.ts` | B11 T5 | sonnet |

### T1 · Stubs

Every file in the exports table exists with its exact export names and types, holding the smallest valid value: empty arrays, `report: null`, and one placeholder entry only where a type needs one. `index.ts` re-exports them. `npm run check` passes. Tell the orchestrator in the report that the stubs are ready, because I2-core's responders import them.

### T2 · Communities and people

- `communities.ts`: the eight communities in the order of the `contracts.md` table, every field filled.
  - `com_gu` is `heritage`, with `studioId: "std_gu"`, `leadId: "own_01"`, its three makers and `verification.method: "ich_listing"`. Its `by` says the craft is on China's national list, and its `note` says the studio attests each piece is stitched by the maker named on it.
  - `com_dine` uses `registry_check`. Its `note` says a person checks each maker against tribal enrollment, and that the US Indian Arts and Crafts Act makes it illegal to sell work as Native-made when it isn't.
  - The other six use `community_attestation` by the co-op lead or the collective.
  - `protocols` lists two or three things each community doesn't sell or show, including the banned items that apply to it.
  - `languages` uses BCP 47 tags, for example `zh`, `en`, `nv`, `mi`, `se`, `iu`, `qu`, `es`, `hmn`, `mas`, `sw`. They're display only.
  - `storefrontId` is `sto_01` to `sto_08` and `projectIds` is `[prj_01]` to `[prj_08]`, in the same order. Every community has `demo: true`.
- `people.ts`: add `own_02` to `own_08` (one lead per community, in order) and `mkr_04` to `mkr_17` (two per Indigenous community, in the table's order).
  - Each gets `role`, `name` (en and zh), `surnameChar`, `lang`, `communityId` and `languages`.
  - `surnameChar` is a Chinese surname character for Chinese names, otherwise the family name's first letter, all different within a community.
  - `lang` is `"zh"` for the Gu and Miao makers and leads, and `"en"` for everyone else.
  - v1's `own_01` and `mkr_01` to `mkr_03` gain `communityId: "com_gu"` and nothing else changes.
- **Test:**
  - there are eight communities,
  - every `leadId`, `makerIds` entry, `studioId`, `storefrontId` and `projectIds` entry resolves,
  - `com_gu` is the only `heritage` one,
  - every Indigenous maker's community lists them,
  - no person has `nativeName`.

### T3 and T4 · The catalog, 42 new pieces

Six pieces per Indigenous community, in the ID ranges of the `contracts.md` table. Each piece has:
- every v1 field:
  - `title` (en and zh),
  - `makerId` (one of the community's two makers, three pieces each),
  - `kind` (two `featured`, four `series` per community),
  - `hours`, `materialsCents` and `priceCents`,
  - `story` (two or three plain sentences, en and zh, never claiming a real person made it),
  - `heritage` (one sentence on the craft tradition, en and zh),
  - `process` (three or four steps whose hours add up to `hours`),
  - `image` (`/images/<pieceId>.svg`),
- v2's fields:
  - `communityId`,
  - `facets`: the object as `Text`, at least one each of materials, techniques and colors, motifs where the piece has them, `oneOfAKind` true for featured pieces, `leadTimeDays`, and `sizeCm` where it makes sense,
  - `vibe`: two to four moods, one to three occasions and one to three recipients, lowercase English,
  - `imageAlt`: what the illustration shows, en and zh.

The pieces should be ordinary things a community sells to the public, for example:
- Diné: wool rugs in regional styles and sash belts,
- Māori: kete, a pōtae, a small whāriki wall piece,
- Sámi: guksi, tin-thread bracelets, woven bands,
- Inuit: stone carvings of animals and stonecut prints,
- Quechua: naturally dyed shawls, table runners and belts,
- Miao: embroidered panels, a pouch and a batik cloth,
- Maasai: beaded bracelets, collars and a key ring.

Prices are believable for handmade work, from about $25 to about $4,500. Each community gets at least one piece under $60 and one over $400.

- **For figure 11,** at least three pieces from three different Indigenous communities are priced at 20000 or less, carry `garden` or a flower in their motifs, and `soft` or `hopeful` in their moods. `garden` and `peony` are motif words in the vocabulary (section 11).
- **For figure 12,** `pc_46` is a Miao piece with motif `peony`.

**Tests:**
- each file's pieces have every field,
- process hours add up,
- IDs are in range,
- makers belong to the piece's community,
- no banned object or material appears in any title, facet or story: the banned words in `contracts.md` section 2, plus `sacred` and `ceremonial`.

### T5 · Gu facets, the index and the aliases

- `catalog/gu-facets.ts`: `facets`, `vibe`, `imageAlt` and `communityId: "com_gu"` for `pc_01` to `pc_12`, from each piece's v1 story and process. `pc_01` has motif `peony`, moods `soft` and `hopeful`, occasion `gift`, and recipients `mom` and `gift for mom`.
- `catalog.ts` merges v1's twelve, with their v2 fields, and the 42 new pieces into `pieces`. v1's fields and every v1 figure stay exactly as they were, and v1's tests still pass.
- `searchIndex.ts`:
  - **Rule:** a local, non-exported helper implements the passage rule in `contracts.md` section 2 exactly, labels and separators included, leaving out a missing part along with its label.
  - **Entries:** one `IndexEntry` per piece:
    - `storefrontSlug` from the community's storefront,
    - `provenance`: `facts: "maker"`, `culture: "community"`, `vibe: "agent:tagger"`, `picture: "agent:describer"`,
    - `approvedBy`: the piece's maker,
    - `pictureNote`: what's visible in the illustration, en and zh,
    - `status: "active"`,
    - `salesThisMonth`: computed from v1's September paid orders for the Gu pieces. For the other pieces it's a small typed number from 0 to 6 with a comment saying it's demo data, set so that figure 12's draw holds (T6 checks it).
  - **Aliases:** `keywordAliases` maps buyer words to vocabulary phrases, at least `mom` to `gift for mom`.
- **Test:**
  - there are 54 entries, one per piece,
  - each `embedText` equals an independent reimplementation of the rule in the test file, and `pc_01`'s exact string is checked literally,
  - the Gu sales counts equal the orders.

### T6 · Demo search, surprise and the eval set

- `search.ts`: `demoSearch` and `demoSurprise`, with the fields of `DemoSearch` and `DemoSurprise`.
  - **The search, figure 11:** `qry_01`, the exact text and keywords, `lang: "en"`, `filters.maxPriceCents: 20000`.
    - The answer is six results in order, starting `pc_01`, `pc_07`, `pc_11`, then the three Indigenous pieces from T3 and T4.
    - Each result has a `score` (falling from about 0.9), `matched` (the query keywords found in that piece's facets or vibe) and a `reason` (en and zh, one sentence built only from those facets).
    - Engine `keyword_scripted`. `modelId` is unset.
  - **The surprise, figure 12:** `srp_01`, keyword `peony`, `fair_random`, seed 7, drawing `pc_46`. `candidates` are the keyword's top 12 by the scripted scorer, sorted by score and then `pieceId`, each weighted `1 / (1 + salesThisMonth)` and normalized to sum to 1.
- `searchEval.ts`: 50 queries, `sq_001` to `sq_050`, written by hand.
  - About ten are in Chinese.
  - Mixed voices: a mood only ("something calm for a reading corner"), an occasion, who it's for, what it looks like, a material, a technique, a craft term (`kete`, `guksi`, `顾绣`), a misspelling, very short and long.
  - Each grades two to six pieces: 2 for a perfect match, 1 for a good one, at least one 2.
  - None repeats figure 11's text.
  - A comment says these never enter training. B11 enforces it.
- **Test:**
  - figure 11 field by field, and `extractKeywords()` on its text gives its six keywords in order,
  - figure 12 through the real scripted draw: `src/sources/surprise.ts` over the scripted scorer with seed 7 draws `pc_46`, and `pc_46` has the lowest `salesThisMonth` among the candidates,
  - every graded piece exists,
  - at least 8 eval queries are Chinese,
  - no eval text equals the demo query.

### T7 · Records

- **`splits.ts`:** one split per piece under the `ch_cindia` money rules from `data-model.md`: card fee 290 bps plus 30 cents, platform fee 1000 bps, materials, and maker share as the rest, with half-up rounding. `pc_01`'s split equals figure 1 to the cent (552, 1800, 2200, 13448). All 54 are computed from the catalog, never typed.
- **`projects.ts`:**
  - Eight projects, one per community in order, `prj_01` being the Gu apprentice stipend. Each has `goalCents`, `raisedCents` (below the goal), `addOnCents: 500` and one or two dated September updates.
  - Three works in progress, each with three milestones whose `shareBps` sum to 10000:
    - `wip_01`: a Gu commission by `mkr_01`. `mls_01` paid, `mls_02` reached, `mls_03` pending.
    - `wip_02`: a Diné rug commission.
    - `wip_03`: a Quechua shawl commission.
  - The approval `apr_05`:
    - kind `milestone_release`, `subjectIds: ["wip_01", "mls_02"]`,
    - `proposedBy: "cindy"`, `amountCents` the milestone's share of the price, `overLimit` by the v1 rule,
    - `decisionDate: "2026-10-01"`, `pending`.
- **`storefronts.ts`:**
  - Eight storefronts with the slugs in `contracts.md`.
  - `theme.accent` is a kit color token's short name (`jade`, `seal`, `amber` or `ink`).
  - Four to six blocks each, with block IDs `blk_01` onward across all of them.
  - Props follow section 11: hero `tagline`, pieces `pieceIds` (from its community), projects `projectIds`, visit `address` and `hours`. The story and process blocks take `title` and `body` strings. Every prop is a string, a number or a string array.
  - All are `published` except `sto_07`, which is a `draft` with two blocks, so the Designer run has something to fill.
- **`listings.ts`:**
  - `listings` holds `lst_01` for `mkr_02`, `lang: "zh"`, with notes in plain Chinese: a new pair of embroidered bookmarks, the silk, the colors, roughly how many hours, who they'd suit, and no price.
  - The approval `apr_04`, kind `listing_publish`, `subjectIds: ["lst_01"]`, pending.
- **`policy.ts`:** `policy`, with the fields of `Policy`, holding five topics, `pol_01` to `pol_05`:
  - **shipping** (`pol_01`): where each community ships from, tracked air times, and that the Gu studio ships within the piece's `leadTimeDays`. `pol_01` also carries `data: { transitDaysMin: 6, transitDaysMax: 10 }`, which B14's `arrival_window` and the scripted `run_01` both use,
  - **returns,**
  - **care,**
  - **authenticity:** how verification works, and what Cindia does when a piece isn't as described,
  - **commissions:** milestones, approvals, and what happens to unreleased money.
- **`agents.ts`:**
  - The 21 agents exactly as `contracts.md` section 6, in its order.
  - Each `job` is the table's text and `never` is the brief's "Never does" column.
  - `name` is the English name plus a short Chinese one (for example Intake 接待, Finder 检索, Steward 文化与认证).
  - `code` agents have no `model`.
  - `getAgent(agentId)` returns one spec or `undefined`.
- **`watch.ts`:**
  - Four candidates on `example.com` or `example.org` only, all resembling Gu pieces:
    - `cft_01`: like `pc_01`, similarity 0.91, claims "hand-stitched Gu embroidery" with no verification (figure 14),
    - `cft_02`: below the 0.75 threshold,
    - `cft_03`: similar, but honestly says machine-embroidered and Gu-inspired,
    - `cft_04`: an unrelated peony print with low similarity.
  - `scriptedScan`, with the fields of `ScriptedScan`: `wsc_01` for `mkr_01` with three queries in English and Chinese, then its events in order:
    1. `watch.scanned` (4 candidates),
    2. `counterfeit.flagged` `cft_01`,
    3. `followup.drafted` `fup_02`: a calm, factual draft to the marketplace's trust and safety team. It describes what the listing claims and what's unverified, accuses no one, and is never sent,
    4. `approval.requested` `apr_03`.
  - The approval `apr_03`: kind `report_listing`, `subjectIds: ["cft_01"]`, pending.
- **`model.ts`:** `modelId: "cindia-embed-v1"`, `report: null`, and a comment that only T9 fills it, from B11's real run.
- **Test:**
  - all 54 splits follow the rules, and `pc_01`'s equals figure 1,
  - milestone shares sum to 10000, and statuses match the plan above,
  - the three approvals' kinds, subjects and fields,
  - every storefront slug and block reference resolves,
  - the roster matches the section 6 table (IDs, kinds, models, tools),
  - candidate URLs use only the two example domains,
  - `report` is null.

### T8 · Swarm runs, lookups, integrity

- `swarm.ts`: `swarmRuns`, `fallbackSupportRun`, `fallbackListingRun` and `demoQuestions`, each run with the fields of `ScriptedRun`:
  - **`run_01`, `thr_01`, buyer:** the tour's question, "Did the maker stitch this herself? Can it arrive by October 10?"
    - Steps:
      1. `cindy` route.
      2. `intake` result: authenticity and delivery, `pc_01`, the date, English.
      3. `cindy` call: steward and clerk.
      4. `steward` tool `verification_record`.
      5. `steward` result: the studio's attestation and the maker's name.
      6. `clerk` tool `policy`.
      7. `clerk` result: the lead time and tracked air, so an order on `2026-09-01` arrives well before Oct 10, with the dates computed from `pc_01`'s `leadTimeDays` and `pol_01`'s `data`.
      8. `writer` reply.
    - Each step has a short `summary` (en and zh), its `toolName` where it called one, `ms` between 200 and 2000, and `model` from the roster (none for code agents).
    - It ends in `support.answered` from `writer`, with the reply in English and Chinese, and `refIds` `pc_01`, `com_gu`, `mkr_01`, `pol_01`.
  - **`run_02`, thread `lst_01`, seller:** `cindy`, `lister`, `tagger`, `checker` (one `check` step per check), `indexer`. It ends in `listing.drafted` with title and summary in both languages, facets and vibe drawn only from the notes, and three checks:
    - `chk_01`: protocol, ok,
    - `chk_02`: facts, ok, "hours, silk and colors match the notes",
    - `chk_03`: price, not ok, "the notes don't give a price, the maker sets it",
    
    then `approval.requested` `apr_04`.
  - **`run_03`, thread `sto_07`, seller:** `cindy`, `designer` tool `community_page`, `designer` result. It ends in `storefront.drafted` with five blocks for `sto_07`.
  - **`run_04`, `thr_02`, seller:** "When do I get paid for September?" `cindy`, `bookkeeper` (rule-based) reading `mpo_01` and `mst_01`, then `writer`. The reply names the payout and the held amount, computed from v1's records.
  - **`fallbackSupportRun` (`run_05`) and `fallbackListingRun` (`run_06`):** thread `thr_00`.
    - The support fallback's reply says scripted mode answers the demo questions, names them, and says Live mode asks the agent swarm anything.
    - The listing fallback drafts a sample listing labeled as a sample.
  - **`demoQuestions`:** `{ side, text: Text }` entries, the buyer's first being `run_01`'s question and the seller's first `run_04`'s.
- `index.ts`: re-exports, and `getById()` covering every new collection plus `apr_03` to `apr_05` and `fup_02`.
- **`tests/data/v2-figures.test.ts`:** figures 11 to 15, one test each, with exact values. Also: `ord_001`'s figures are untouched, `ctb_01` (500 to `prj_01`) is separate from it, and `report` is null.
- **`tests/data/v2-integrity.test.ts`:**
  - every ID is unique across all collections and matches its format,
  - every ID inside a record or a run resolves through `getById()`, the event-only IDs excepted,
  - every run's steps use roster agents, the tools that agent is allowed, and `stepId`s that are unique and ascending,
  - every event in a run or the scan passes `validateEvent()`,
  - no banned word appears anywhere in `src/mock/` text,
  - the v1 determinism test still covers the new files.

### T9 · The real model report

When `server/b11_embed/report.json` and `vectors.json` exist from B11's training run, copy them into `model.ts`'s `report`, with the fields of `ModelReport`: what `model.trained` and `proof.search_scored` carry, plus the PCA points. Copy the values exactly, rounded to 4 decimals, and never edit them. Add a comment with the report's `modelId` and the run's date. **Test:** the values in `model.ts` equal the JSON files' values.

## Acceptance

- Given the dataset, when `npm run check:data` runs, then every v1 test and every v2 test passes, and `npm run check` and `npm run check:scope -- src/mock/ tests/data/` exit 0. That's G2b's data step.
- Given `ord_001`, when its figures are read, then they're v1's to the cent, and `splits` gives `pc_01` the same split.
- Given `searchIndex`, when each `embedText` is rebuilt by the rule, then all 54 match.
- Given figure 11's text, when `extractKeywords()` runs, then it gives the six keywords in order, and `demoSearch` holds figure 11.
- Given seed 7, when the scripted draw runs for `peony`, then it draws `pc_46`.
- Given `swarmRuns`, when each run's events are validated, then all pass, and `run_01`'s reply cites only `pc_01`, `com_gu`, `mkr_01` and `pol_01`.
- Given `model.ts` before B11's run, when it's read, then `report` is null and nothing in `src/mock/` holds an eval number.
- Given `src/mock/`, when it's searched, then it holds no banned words, no unseeded randomness and no wall-clock reads.

## Out of scope

- The tour's timeline (`timelines/demo.ts`). I2-tour's data task writes it from these files.
- Images. I2-art draws them from the facets.
- Any UI, any live call, any contract change. A field the data needs that a contract doesn't define goes under `needs:`.
- Real communities' names, real people, real photos, and any text in an Indigenous language beyond the craft terms above.

## Contract additions needed

- `leads` and `allMakers` from `people.ts`.
- `run_04` (the seller payout question, `thr_02`), and the fallback runs' IDs `run_05` and `run_06` with the placeholder thread `thr_00`.
- `getById()` finding `apr_03` to `apr_05` and `fup_02`, and where those records live: `watch.ts`, `listings.ts` and `projects.ts` hold them beside the exports section 11 lists.
- `Policy`'s topics carrying an optional `data` record (`pol_01`'s transit days), which B14's `arrival_window` reads.
