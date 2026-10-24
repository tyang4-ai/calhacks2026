# S3-catalog · Communities, the 54-piece catalog, the search index and the scripted agents

Priority: P0 · Wave: V1 · Depends on: I2-core (T1 needs only I2-core's types on disk, the rest needs I2-core green) · Folder: `src/mock/`, `tests/data/` · Made real by: B11 (the model's report and map), B12 (search answers), B14 (swarm runs), B15 (the counterfeit scan)

**SCOPE:** `src/mock/, tests/data/`

## Goal

v2's data: eight communities, 54 pieces with the facts, culture and vibe layers the search runs on, the index entries, the hand-written eval set, projects and commissions, storefronts, the agent roster and the scripted swarm runs the demo plays. Every v1 record and figure stays exactly as it is. Search, the swarm view and the counterfeit watch all look real in scripted mode and read honestly as simulated.

## Read first

- `docs/v2/contracts.md` section 2 (entities, IDs, the passage rule, figures 11 to 15, the file table), section 3 (event payloads the scripted runs carry) and section 6 (the agent roster). Once I2-core is green, the same content is in `docs/common/data-model.md` and `events.md`. Use those.
- `docs/v2/brief.md`: the communities, cultural care, the agents' one-job rule
- `docs/plans/S2-mock-data.md` and the existing `src/mock/` files: the style, `getById()`, the determinism rules, and how v1 builds figures from records instead of typing them
- `src/core/types.ts` after I2-core: the new types
- `.claude/rules/mock.md`

## Cultural care (you have no web access, so these rules decide)

- **Describe crafts in general, accurate terms only:** the object, the fiber, the technique, the colors, what it's used for. Write nothing you aren't sure is true of the craft. Never invent what a motif means to a community. If a piece has a flower, it has a flower. It doesn't "symbolize renewal" unless the community page says so.
- **No sacred or ceremonial objects**, and nothing in the banned list in `contracts.md` section 2: no Yei or sandpainting designs, no tā moko, no korowai, no gákti, no ivory, no ceremonial headdresses. No pan-Indigenous clichés (feathers, dreamcatchers, "tribal" patterns).
- **Craft terms** that English-language craft and museum writing uses are fine, spelled with their diacritics: raranga, harakeke, kete, pōtae, whāriki, duodji, guksi. Write no sentences, greetings or names in Indigenous languages. `nativeName` stays unset for every person, because in a real launch the maker writes it.
- **Names are fictional:** a common given name with a common family name for the region. Never a name you associate with a known artist, politician or public figure. A comment at the top of `people.ts` and `communities.ts` says every name and story is fictional demo data that Gordon can swap.
- **Community text is demo text:** each community's `about` is written as the community describing itself, two or three plain sentences, and the file comment says it stands in for text the community would write. Gu embroidery is `heritage`, never called Indigenous anywhere.

## Interfaces

- **Reads:** types and `validateEvent()` from `src/core/`, and v1's records in `src/mock/`. Nothing from `src/ui/`, `src/app/`, `src/sources/` or `src/features/`.
- **Exports**, with these exact names, which the sources responders, the features and `npm run export:mock` rely on:

| File | Exports |
|---|---|
| `communities.ts` | `communities: Community[]` |
| `people.ts` | v1's exports unchanged (`studio`, `owner`, `makers` stays the three Gu makers, `buyers`, `people`), plus `leads: Person[]` (`own_01` to `own_08`), `allMakers: Person[]` (`mkr_01` to `mkr_17`). `people` now holds everyone |
| `catalog.ts` | `pieces: Piece[]` (all 54, v1 order first), `curatedSet` unchanged |
| `searchIndex.ts` | `searchIndex: IndexEntry[]`, `composeEmbedText(piece, community): string` (the passage rule, pure) |
| `search.ts` | `demoSearchQuery`, `demoSearchAnswer`, `demoSurpriseAsk`, `demoSurpriseDraw`: the payloads of `search.queried`, `search.answered`, `surprise.asked` and `surprise.drawn` for figures 11 and 12 |
| `searchEval.ts` | `searchEval: SearchQuery[]` |
| `projects.ts` | `projects: Project[]`, `worksInProgress: WorkInProgress[]`, `projectApprovals: Approval[]` (`apr_05`) |
| `storefronts.ts` | `storefronts: Storefront[]` |
| `listings.ts` | `listingDrafts: ListingDraft[]` (`lst_01`), `draftedListings: Record<listingId, listing.drafted payload>`, `listingApprovals: Approval[]` (`apr_04`) |
| `agents.ts` | `agents: AgentSpec[]` |
| `swarm.ts` | `swarmScripts: SwarmScript[]` (shape below) |
| `watch.ts` | `counterfeitCandidates: CounterfeitCandidate[]`, `demoScan: { scanId: "wsc_01"; makerId: "mkr_01"; queries: string[] }`, `watchApprovals: Approval[]` (`apr_03`), `watchFollowUps: FollowUp[]` (`fup_02`, the report draft for `apr_03`) |
| `model.ts` | `modelId: "cindia-embed-v1"`, `report: ModelReport \| null`, `map: { points: { pieceId; x; y }[]; demoQuery: { x; y } } \| null` |
| `policy.ts` | `policyTopics: { topicId: string; title: Text; text: Text }[]` (`pol_01` to `pol_05`) |
| `index.ts` | Re-exports all of the above. `getById()` also finds communities, projects, works in progress, milestones (`mls_`), storefronts, blocks (`blk_`), listing drafts, eval queries, counterfeit candidates, policy topics and the new approvals and follow-ups |

- **`SwarmScript`:** `{ runId; threadId; side: "buyer" | "seller"; for: { kind: "support"; questions: string[] } | { kind: "listing"; listingId } | { kind: "storefront"; storefrontId } | { kind: "fallback" }; steps: swarm.step payloads in order; finish: { type; payload }[] }`. `finish` holds the run's last events: `support.answered`, `listing.drafted`, `storefront.drafted` or `approval.requested`. Scripted step IDs are fixed (`stp_0001` onward across all scripts), because the tour plays them. The sources responder gives fresh IDs when it replays a script for a person (I2-core).
- **IDs that live only in events,** added to v1's list: `qry_` (search queries, `qry_01` the demo's), `srp_` (surprise draws, `srp_01`), `thr_` (support threads, `thr_01` to `thr_04`), `run_` and `stp_` (scripted runs and steps), `wsc_` (counterfeit scans, `wsc_01`, never `scn_`, which is the scenario's marker), `chk_` (listing checks), `ctb_` (project contributions, `ctb_01`).
- **Determinism:** no `Math.random`, no `Date.now`, no `new Date()` without an argument, as v1. Any figure that comes from v1's records is computed from them, never typed.

## Tasks

The data-smith does these in order, one at a time, so a later task may finish a file an earlier one stubbed (T1's stubs, `index.ts`). Each task ends with its own test passing under `npm run check:data`.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Typed stubs for every new file, so I2-core's responders compile | `src/mock/communities.ts`, `src/mock/searchIndex.ts`, `src/mock/search.ts`, `src/mock/searchEval.ts`, `src/mock/projects.ts`, `src/mock/storefronts.ts`, `src/mock/listings.ts`, `src/mock/agents.ts`, `src/mock/swarm.ts`, `src/mock/watch.ts`, `src/mock/model.ts`, `src/mock/policy.ts`, `src/mock/index.ts` | I2-core's types | sonnet |
| T2 | Communities and people | `src/mock/communities.ts`, `src/mock/people.ts`, `tests/data/v2-communities.test.ts` | T1 | opus |
| T3 | Catalog, part A: Diné, Māori and Sámi pieces, `pc_13` to `pc_30` | `src/mock/catalog/part-a.ts`, `tests/data/v2-catalog-a.test.ts` | T2 | opus |
| T4 | Catalog, part B: Inuit, Quechua, Miao and Maasai pieces, `pc_31` to `pc_54` | `src/mock/catalog/part-b.ts`, `tests/data/v2-catalog-b.test.ts` | T2 | opus |
| T5 | Facets and vibe for the twelve Gu pieces, the merge into `catalog.ts`, and the search index | `src/mock/catalog/gu-facets.ts`, `src/mock/catalog.ts`, `src/mock/searchIndex.ts`, `tests/data/v2-index.test.ts` | T3, T4 | opus |
| T6 | The demo search and surprise, and the 50 eval queries | `src/mock/search.ts`, `src/mock/searchEval.ts`, `tests/data/v2-search.test.ts` | T5 | opus |
| T7 | Projects, works in progress, storefronts, listings, policy, the agent roster, the counterfeit candidates, the empty model | `src/mock/projects.ts`, `src/mock/storefronts.ts`, `src/mock/listings.ts`, `src/mock/policy.ts`, `src/mock/agents.ts`, `src/mock/watch.ts`, `src/mock/model.ts`, `tests/data/v2-records.test.ts` | T5 | opus |
| T8 | The scripted swarm runs, the lookups, and the cross-file integrity and figures tests | `src/mock/swarm.ts`, `src/mock/index.ts`, `tests/data/v2-figures.test.ts`, `tests/data/v2-integrity.test.ts` | T6, T7 | opus |
| T9 | After B11's first real training run: copy `server/b11_embed/report.json` and the PCA points from `server/b11_embed/vectors.json` into `src/mock/model.ts` | `src/mock/model.ts`, `tests/data/v2-model.test.ts` | B11 T5 | sonnet |

### T1 · Stubs

Every file in the exports table exists with its exact export names and types, holding the smallest valid value: empty arrays, `report: null`, `map: null`, and one placeholder entry only where a type needs one. `index.ts` re-exports them. `npm run check` passes. Tell the orchestrator in the report that the stubs are ready, because I2-core's responders import them.

### T2 · Communities and people

- `communities.ts`: the eight communities in the order of the `contracts.md` table, every field filled.
  - `com_gu` is `heritage`, with `studioId: "std_gu"`, `leadId: "own_01"`, its three makers and `verification.method: "ich_listing"`. Its `by` says the craft is on China's national list, and its `note` says the studio attests each piece is stitched by the maker named on it.
  - `com_dine` uses `registry_check`. Its `note` says a person checks each maker against tribal enrollment, and that the US Indian Arts and Crafts Act makes it illegal to sell work as Native-made when it isn't.
  - The other six use `community_attestation` by the co-op lead or the collective.
  - `protocols` lists two or three things each community doesn't sell or show, including the banned items that apply to it.
  - `languages` uses BCP 47 tags, for example `zh`, `en`, `nv`, `mi`, `se`, `iu`, `qu`, `es`, `hmn`, `mas`, `sw`. They are display only.
  - `storefrontId` is `sto_01` to `sto_08` and `projectIds` is `[prj_01]` to `[prj_08]`, in the same order. Every community has `demo: true`.
- `people.ts`: add `own_02` to `own_08` (one lead per community, in order), and `mkr_04` to `mkr_17` (two per Indigenous community, in the order of the table). Each gets `role`, `name` (en and zh), `surnameChar` (a Chinese surname character for Chinese names, otherwise the family name's first letter, all different within a community), `lang`, `communityId` and `languages`. Set `lang` to `"zh"` for the Gu and Miao makers and leads, and `"en"` for everyone else. v1's `own_01` and `mkr_01` to `mkr_03` gain `communityId: "com_gu"` and nothing else changes.
- **Test:** eight communities, every `leadId`, `makerIds`, `studioId`, `storefrontId` and `projectIds` entry resolves, `com_gu` is the only `heritage` one, every Indigenous maker's community lists them, and no person has `nativeName`.

### T3 and T4 · The catalog, 42 new pieces

Six pieces per Indigenous community, in the ID ranges of the `contracts.md` table. Each piece:
- has every v1 field: `title` (en and zh), `makerId` (one of the community's two makers, three pieces each), `kind` (two `featured`, four `series` per community), `hours`, `materialsCents`, `priceCents`, `story` (two or three plain sentences, en and zh, never claiming a real person made it), `heritage` (one sentence on the craft tradition, en and zh), `process` (three or four steps whose hours add up to `hours`) and `image` (`/images/<pieceId>.svg`),
- has v2's `communityId`, `facets` (object as `Text`, at least one each of materials, techniques and colors, motifs where the piece has them, `oneOfAKind` true for featured pieces, `leadTimeDays`, `sizeCm` where it makes sense), `vibe` (two to four moods, one to three occasions, one to three recipients, lowercase English), and `imageAlt` (what the illustration shows, en and zh).

The pieces should be ordinary things a community sells to the public, for example: Diné wool rugs in regional styles and sash belts; Māori kete, a pōtae, a small whāriki wall piece; Sámi guksi, tin-thread bracelets, woven bands; Inuit stone carvings of animals and stonecut prints; Quechua naturally dyed shawls, table runners and belts; Miao embroidered panels, a pouch and a batik cloth; Maasai beaded bracelets, collars and a key ring. Prices are believable for handmade work, from about $25 to about $4,500. Each community gets at least one piece under $60 and at least one over $400.

For figure 11, at least three pieces from three different Indigenous communities must be priced at 20000 or less and carry `garden` or flowers in their motifs or vibe and `soft` or `hopeful` in their moods. For figure 12, `pc_46` is a Miao piece with motif `peony`.

**Tests:** each file's pieces have every field, process hours add up, IDs are in range, makers belong to the piece's community, and no banned object or material appears in any title, facet or story (the banned words from `contracts.md` section 2, plus `sacred` and `ceremonial`).

### T5 · Gu facets and the index

- `catalog/gu-facets.ts`: `facets`, `vibe`, `imageAlt` and `communityId: "com_gu"` for `pc_01` to `pc_12`, from each piece's v1 story and process. `pc_01` has motif `peony`, mood `soft` and `hopeful`, occasion `gift`, recipient `mom`.
- `catalog.ts` merges v1's twelve with their v2 fields and the 42 new pieces into `pieces`. v1's fields and every v1 figure stay exactly as they were, and v1's tests still pass.
- `searchIndex.ts`:
  - `composeEmbedText()` implements the passage rule in `contracts.md` section 2 exactly, labels and separators included, leaving out a missing part with its label.
  - One `IndexEntry` per piece: `storefrontSlug` from the community's storefront, `provenance` (`facts: "maker"`, `culture: "community"`, `vibe: "agent:tagger"`, `picture: "agent:describer"`), `approvedBy` (the piece's maker), `pictureNote` (en and zh, what's visible in the illustration) and `status: "active"`.
  - `salesThisMonth` is computed from v1's September orders for the Gu pieces (paid orders of that piece). For the other pieces it's a small typed number from 0 to 6, with a comment saying it's demo data.
- **Test:** 54 entries, one per piece, each `embedText` equal to an independent reimplementation of the rule in the test file (and `pc_01`'s exact string checked literally), and the Gu sales counts equal to the orders.

### T6 · Demo search, surprise and the eval set

- `search.ts`:
  - `demoSearchQuery`: `qry_01`, figure 11's text and keywords, `lang: "en"`, `filters.maxPriceCents: 20000`.
  - `demoSearchAnswer`: six results in order, starting `pc_01`, `pc_07`, `pc_11`, then the three Indigenous pieces from T3 and T4. Each has a `score` (falling from about 0.9), `matched` (the query keywords found in that piece's facets or vibe) and a `reason` (en and zh, one sentence built only from those facets). Engine `keyword_scripted`. `modelId` is unset, because no model ranked it.
  - `demoSurpriseAsk`: `srp_01`, keyword `peony`, `fair_random`, seed 7.
  - `demoSurpriseDraw`: `pc_46`, with `candidates` being every piece with motif or vibe `peony`, each weighted `1 / (1 + salesThisMonth)` and normalized to sum to 1. `pc_46` has the lowest `salesThisMonth` among them and so the largest weight.
- `searchEval.ts`: 50 queries, `sq_001` to `sq_050`, written by hand.
  - About ten in Chinese.
  - Mixed voices: a mood only ("something calm for a reading corner"), an occasion, who it's for, what it looks like, a material, a technique, a craft term (`kete`, `guksi`, `顾绣`), a misspelling, very short and long.
  - Each grades two to six pieces: 2 for a perfect match, 1 for a good one, at least one 2.
  - None repeats figure 11's text.
  - A comment says these never enter training. B11 enforces that.
- **Test:** figures 11 and 12 field by field, every graded piece exists, at least 8 eval queries are Chinese, and no eval text equals the demo query.

### T7 · Records

- `projects.ts`:
  - Eight projects, `prj_01` the Gu apprentice stipend, one per community in order, each with `goalCents`, `raisedCents` (below the goal), `addOnCents: 500` and one or two dated September updates.
  - Three works in progress, each with three milestones whose `shareBps` sum to 10000:
    - `wip_01`: a Gu commission by `mkr_01`. `mls_01` paid, `mls_02` reached, `mls_03` pending.
    - `wip_02`: a Diné rug commission.
    - `wip_03`: a Quechua shawl commission.
  - `apr_05` is a `milestone_release` for `wip_01`'s `mls_02`, `proposedBy: "cindy"`, `amountCents` the milestone's share of the price, `overLimit` by the v1 rule, `decisionDate: "2026-10-01"`, `pending`.
- `storefronts.ts`:
  - Eight storefronts with the slugs in `contracts.md`.
  - `theme.accent` is a kit color token's short name (`jade`, `seal`, `amber` or `ink`).
  - Four to six blocks each, block IDs `blk_01` onward across all of them.
  - `props` holds only strings, numbers and string arrays, with `_en` and `_zh` suffixes for text. A `pieces` block lists piece IDs from its community. A `projects` block lists its project ID.
  - All are `published` except `sto_07`, which is a `draft` with two blocks, so the Designer run has something to fill.
- `listings.ts`:
  - `lst_01` for `mkr_02`, `lang: "zh"`, with notes in plain Chinese: a new pair of embroidered bookmarks, the silk, the colors, roughly how many hours, who they'd suit, and no price.
  - Its `listing.drafted` payload: title and summary in both languages, facets and vibe drawn only from the notes, and three checks:
    - `chk_01`: protocol, ok.
    - `chk_02`: facts, ok, "hours, silk and colors match the notes".
    - `chk_03`: price, not ok, "the notes don't give a price, the maker sets it".
  - `apr_04` is a `listing_publish` for `lst_01`, pending.
- `policy.ts`, `pol_01` to `pol_05`:
  - shipping: per community where it ships from, with tracked air times, and the Gu studio ships within the piece's `leadTimeDays`,
  - returns,
  - care,
  - authenticity (how verification works and what Cindia does when a piece isn't as described),
  - commissions (milestones, approvals, what happens to unreleased money).
- `agents.ts`: the 21 agents exactly as `contracts.md` section 6, in its order. Each `job` is the table's text, `never` is the brief's "Never does" column, and `name` is the English name with a short Chinese one (for example Intake 接待, Finder 检索, Steward 文化与认证). `code` agents have no `model`.
- `watch.ts`:
  - Four candidates on `example.com` or `example.org` only, all resembling Gu pieces:
    - `cft_01`: like `pc_01`, similarity 0.91, claims "hand-stitched Gu embroidery" with no verification. Figure 14.
    - `cft_02`: below the 0.75 threshold.
    - `cft_03`: similar, but honestly says machine-embroidered and Gu-inspired.
    - `cft_04`: an unrelated peony print with low similarity.
  - `demoScan`: three queries in English and Chinese for `mkr_01`.
  - `apr_03`: a `report_listing` for `cft_01`, pending.
  - `fup_02`: a calm, factual draft report to the marketplace's trust and safety team. It describes what the listing claims and what's unverified, and accuses no one. It is never sent.
- `model.ts`: `modelId: "cindia-embed-v1"`, `report: null`, `map: null`, and a comment that only T9 fills them, from B11's real run.
- **Test:** milestone shares sum to 10000 and their statuses match the plan above, the approvals' kinds, subjects and fields, every storefront slug and block reference resolves, the roster matches the section 6 table (IDs, kinds, models, tools), candidate URLs use only the two example domains, and `report` and `map` are null.

### T8 · Swarm runs, lookups, integrity

- `swarm.ts`, five scripts:
  - **`run_01`, `thr_01`, buyer:** the tour's support question, "Did the maker stitch this herself? Can it arrive by October 10?" `questions` holds that text and two close variants.
    - Steps:
      1. `cindy` route.
      2. `intake` result: authenticity and delivery, `pc_01`, the date, English.
      3. `cindy` call: steward and clerk.
      4. `steward` tool `verification_record`.
      5. `steward` result: the studio's attestation, the maker's name.
      6. `clerk` tool `policy`.
      7. `clerk` result: the lead time and tracked air, so an order placed on 2026-09-01 arrives well before Oct 10, with the dates computed from `pc_01`'s `leadTimeDays` and `pol_01`.
      8. `writer` reply.
    - Each step has a short `summary` (en and zh), its `toolName` where it called one, `ms` between 200 and 2000, and `model` from the roster (none for code agents).
    - `finish`: `support.answered` from `writer`, with the reply in English and Chinese and `refIds` `pc_01`, `com_gu`, `mkr_01`, `pol_01`.
  - **`run_02`, `thr_02`, seller, `lst_01`:** steps `cindy`, `lister`, `tagger`, `checker` (one `check` step per check), `indexer`. `finish` is `listing.drafted` (from `listings.ts`), then `approval.requested` `apr_04`.
  - **`run_03`, `thr_03`, seller, `sto_07`:** `cindy`, `designer` tool `community_page`, `designer` result. `finish` is `storefront.drafted` with five blocks for `sto_07`.
  - **`run_04`, `thr_04`, seller:** "When do I get paid for September?" `cindy`, `bookkeeper` (rule-based) reading `mpo_01` and `mst_01`, `writer`. The reply names the payout and the held amount, computed from v1's records.
  - **`run_05`, fallback:** `cindy` route and `writer` reply. The reply says scripted mode answers the demo questions, names them, and says Live mode asks the agent swarm anything.
- `index.ts`: re-exports, and `getById()` covering every new collection, including milestones and blocks nested inside their parents.
- `tests/data/v2-figures.test.ts`: figures 11 to 15, one test each, with exact values. Also: `ord_001`'s figures are untouched beside the `ctb_01` add-on of 500, which belongs to `prj_01`, and `report` is null.
- `tests/data/v2-integrity.test.ts`:
  - every ID is unique across all collections and matches its format,
  - every ID inside a record or a script resolves through `getById()` (the event-only IDs above excepted),
  - every script's steps use roster agents, the tools that agent is allowed, and `stepId`s that are unique and ascending,
  - every `finish` payload passes `validateEvent()`,
  - no banned word appears anywhere in `src/mock/` text,
  - the v1 determinism test still covers the new files.

### T9 · The real model report

When `server/b11_embed/report.json` and `vectors.json` exist from B11's training run, copy them into `model.ts`. `report` gets the fields `model.trained` and `proof.search_scored` carry. `map` gets the PCA points and the demo query's point. Copy the values exactly, rounded to 4 decimals and never edited. Add a comment with the report's `modelId` and the run's date. **Test:** the values in `model.ts` equal the JSON files' values.

## Acceptance

- Given the dataset, when `npm run check:data` runs, then every v1 test and every v2 test passes, and `npm run check` and `npm run check:scope -- src/mock/ tests/data/` exit 0. That's G2b's data step.
- Given `ord_001`, when its figures are read, then they're v1's to the cent.
- Given `searchIndex`, when each `embedText` is rebuilt by the rule, then all 54 match.
- Given `demoSearchAnswer` and `demoSurpriseDraw`, when they're checked, then figures 11 and 12 hold.
- Given `swarmScripts`, when each `finish` event is validated, then all pass, and `run_01`'s reply cites only `pc_01`, `com_gu`, `mkr_01` and `pol_01`.
- Given `model.ts` before B11's run, when it's read, then `report` and `map` are null and nothing in `src/mock/` holds an eval number.
- Given `src/mock/`, when it's searched, then it holds no banned words, no unseeded randomness and no wall-clock reads.

## Out of scope

- The tour's timeline (`timelines/demo.ts`). I2-tour's data task writes it from these files.
- Images. I2-art draws them from the facets.
- Any UI, any live call, any contract change. A field the data needs that a contract doesn't define goes under `needs:`.
- Real communities' names, real people, real photos, and any text in an Indigenous language beyond the craft terms above.

## Contract additions needed

- The export names in the Interfaces table, and `SwarmScript`'s shape.
- The event-only ID prefixes `qry_`, `srp_`, `thr_`, `run_`, `stp_`, `wsc_`, `chk_`, `ctb_`, and `pol_01` to `pol_05` for policy topics.
- `fup_02` (the report draft for `apr_03`) and `run_04` and `run_05` (the seller payout question and the fallback), which `contracts.md` section 2 doesn't list by ID.
