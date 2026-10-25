# S3-catalog · Four communities, the 54-piece catalog, the search index and the scripted agents

Priority: P0 · Wave: V1 · Depends on: R0-reskin (the co-op's names and pieces), I2-core (T1 needs only I2-core's types on disk, T2 to T5 and T7 need I2-core's first commit, T6 and T8 need I2-core T5 committed) · Folder: `src/mock/`, `tests/data/` · Made real by: B10 (splits), B11 (the model's report), B12 (search answers), B13 (the database snapshot), B14 (swarm runs), B15 (the copy watch)

**SCOPE:** `src/mock/, tests/data/`

## Goal

v2's data, for a platform that starts with Native American makers:
- four communities: the Diné Weaving and Silver Co-op (R0's re-skinned studio) and three more, an Ojibwe beadwork co-op, an Acoma pottery studio and a Seminole patchwork co-op,
- 54 pieces with the facts, culture and vibe layers the search runs on, plus their index entries,
- 50 held-out test queries, written separately by our data agent,
- projects, commissions, storefronts, the agent roster, the content rules list,
- the scripted runs, the scripted scan of the sandbox market and the scripted database snapshot the tour plays.

Every v1 record and figure stays exactly as R0 left it. Search, the swarm view, the copy watch and the data view look real in scripted mode and read honestly as simulated.

Gu embroidery and the other Peoples of the earlier plan are "next", each only with that community's own organizations. None of them appears anywhere in `src/mock/`.

## Read first

- `docs/v2/fix-plan.md` sections 1.1 (scope C, the names), 1.2 (the tour), 1.6 (mock data only) and 1.9.
- `docs/v2/contracts.md` as FX1 rewrote it: section 2 (communities, entities, the passage rule, figures 11 to 16, the file table), section 3 (payloads), section 6 (the roster), section 11 (exports, IDs, requests, `contentRules`, the surprise draw) and section 12 (labels L1 to L30). It wins over this plan. Once I2-core is green, the same content is in `docs/common/`, so use that.
- `docs/plans/R0-reskin.md`: the co-op's people, its twelve pieces and its two craft lines.
- `docs/plans/I2-core.md`: the types `ScriptedRun`, `ScriptedScan`, `PolicyTopic`, `DemoSearch`, `DemoSurprise` and `ModelReport`, and the responders that read this plan's data.
- `docs/plans/S2-mock-data.md` and the existing `src/mock/` files: the style, `getById()`, determinism, and how v1 builds figures from records instead of typing them.
- `src/sources/keywords.ts`, `keywordSearch.ts` and `surprise.ts` after I2-core T5. Figures 11 and 12 are checked through them.
- `.claude/rules/mock.md`.

## Content rules (you have no web access, so these decide)

These are A2's R1 to R28, rewritten for the four nations. `R` numbers stay as A2 numbered them, so reviews still point at the right rule.

**Communities**
- **R1.** Every community is `kind: "native_american"`. In English write "Native American" and the nation names "Diné (Navajo)" on first use, then "Diné", "Ojibwe", "Acoma Pueblo" or "Acoma", and "Seminole". In Chinese write 美洲原住民 and 纳瓦霍（Diné）, 奥吉布瓦（Ojibwe）, 阿科马（Acoma）, 塞米诺尔（Seminole）. Never "Indian American", "Indian" as our own word for a people, "tribe" as a product word, or "Pueblo pottery" for Acoma work.
- **R2.** `place` is a region: "Navajo Nation, Arizona, USA", "Minnesota, USA", "New Mexico, USA", "Florida, USA". Never a town, a reservation's or a village's own name beyond the Nation, never Sky City, and never a real co-op, studio, gallery, trading post, museum, cultural center or market, including every one named in this plan's sources.
- **R3.** `name` describes and doesn't brand: "Diné Weaving and Silver Co-op" (R0's named community), "An Ojibwe beadwork co-op", "An Acoma pottery studio", "A Seminole patchwork co-op". No names in a Native language.
- **R4.** `about` is two plain sentences in the third person about the craft and what the co-op makes. Never "we", "our", "ancestors", "elders", "for generations", "ancient", "timeless", "spirit" or a hardship story. The file comment says it holds the place of the community's own words (L8).
- **R5.** `protocols` are Cindia's demo exclusions in plain words, shown under L9. Never phrase one as the nation's own rule or belief. These are the only `Text` fields where banned words may appear. Per community:
  - `com_dine`: "No ceremonial pieces or designs, such as Yei or sandpainting designs." "No meanings for patterns. A pattern is described by its shapes and colors."
  - `com_ojibwe`: "No regalia, such as bandolier bags or dance aprons." "No pipe or tobacco bags." "No meanings for flowers or plants."
  - `com_acoma`: "No ceremonial pottery or designs." "No named designs and no meanings for designs."
  - `com_seminole`: "No named patchwork designs and no meanings for them." "Nothing sold as a costume."
- **R6.** `verification` is `{ method: "nation_attestation", by, note }`. `note` follows contracts section 2's pattern word for word, with the nation: "the Navajo Nation", "an Ojibwe tribe or band", "the Pueblo of Acoma", "the Seminole Tribe of Florida". `by` names the nation and the Act, for example "The Navajo Nation, under the U.S. Indian Arts and Crafts Act, in a real launch". Don't write "tribal enrollment".
- **R7.** Never show, name or imply a real authenticity mark, hallmark, certificate or label for a demo maker or piece.
- **R8.** `languages` is `["en"]` for all four, because the demo writes only English and Chinese. In a real launch the community lists its own languages.

**People**
- **R9.** Leads and makers get a common English given name and a family initial, `surnameChar` the initial, different within a community, `lang: "en"`, `nativeName` unset, and the Chinese name the same romanized name. Use these, so no agent picks a real artist's name:

| Community | Lead | Makers, in ID order |
|---|---|---|
| `com_dine` | `own_01` Ruth B. (R0) | `mkr_01` Grace N., `mkr_02` Lena T., `mkr_03` Mae K. (R0) |
| `com_ojibwe` | `own_02` Diane W. | `mkr_04` Sarah P., `mkr_05` Karen J., `mkr_06` Linda H., `mkr_07` Amy R., `mkr_08` Joyce F. |
| `com_acoma` | `own_03` Carol S. | `mkr_09` Helen A., `mkr_10` Nora G., `mkr_11` Patricia D., `mkr_12` Julie M., `mkr_13` Ann E. |
| `com_seminole` | `own_04` Teresa L. | `mkr_14` Brenda C., `mkr_15` Laura W., `mkr_16` Donna H., `mkr_17` Rita P. |

  Never a full family name, a name in a Native language, or a name from this plan's sources (for example Lucy L., Marie C., Jessica O., Jennie T., Jennie K., Ramona M., Alicia C. or Ellen O.).

**Pieces**
- **R10.** Titles name the object and its colors or pattern: "Red and green floral beaded earrings". Never a nation's name as a product word ("Navajo rug", "Ojibwe earrings", "Acoma pot", "Seminole skirt"), and never "tribal", "Aztec", "chief", "Indian", "authentic", "-style" or "inspired".
- **R11.** `story` is two or three plain sentences about the piece: what it is, its materials, one plain detail about colors or size. No lineage, spirituality, hardship, poverty, "dying art" or "last weaver", and never a claim that a real person made it.
- **R12.** `heritage` is the community's craft line from the safe facts table, word for word, the same on every piece of that craft. The co-op has two crafts and two lines (R0). No piece gets a meaning.
- **R13.** `process` steps are physical, from the safe facts. Weaving: prepare, spin, dye, warp, weave, finish. Silver: cut, stamp, solder, set, file. Beadwork: draw the design, stitch the beads, back and edge, attach the findings. Pottery: prepare the clay, coil, smooth, slip, polish, paint, fire. Patchwork: cut the strips, sew the bands, cut and turn, piece the rows, sew the garment, add rickrack. No clay sources, gathering places, prayers, blessings or ceremonies. Hours still add up.
- **R14.** `motifs` are plain visual words from one list per craft. Weaving: diamond, stripe, zigzag, step, band. Silver: dot, line, chevron, arc. Beadwork: flower, leaf, vine, berry, bud. Pottery: geometric, fine line, band, step, dot. Patchwork: stripe, band, diamond, zigzag, square, triangle. Never a named design or form (naja, squash blossom, Yei, sandpainting, whirling log, the Acoma parrot or deer, a patchwork design's name), and never what a motif means ("symbolizes", "represents", "protects", "brings luck", 象征, 寓意).
- **R15.** Flower, leaf, vine, berry and bud go only on `com_ojibwe` pieces, where floral beadwork is the craft.
- **R16.** Materials come from the safe facts. Diné: wool, silver, turquoise. Ojibwe: glass beads, cloth, leather, thread. Acoma: clay, slip, paint. Seminole: cotton, thread, rickrack. No feathers, fur, bone, ivory, shell, quills or eagle parts. The color is "cream", never "ivory", and no stitch or pattern is called "feather".
- **R17.** Nothing from contracts section 2's "Kept out of the catalog" list, and none of: bandolier bags, dance aprons, jingle dresses, bow guards, katsina figures, ceremonial or storage pots made for ceremony, costumes.
- **R18.** `vibe` words come from one closed list, kept in `searchIndex.ts`. Moods: warm, bold, calm, bright, cheerful, quiet, earthy, playful, elegant, soft. Occasions: birthday, housewarming, thank you, holiday, everyday. Recipients: gift for mom, gift for dad, gift for a friend, gift for a sister, for myself. Never a stereotype word from `contentRules`. Never bare `gift`, `mom` or `love` as a word on any piece (B1-13).
- **R19.** In Chinese, nation names take the standard name with the self-name (R1). Craft terms with no standard Chinese name stay in Latin script with a gloss: "churro（丘罗羊）", "yucca（丝兰）".
- **R20.** Spell Diné with its mark in every `Text`. Plain ASCII appears only in slugs and B04's sandbox-bank strings (R0).

**Projects, storefronts and listings**
- **R21.** Project text says what the money pays for and how much, plainly. No rescue language.
- **R22.** Visit blocks hold the region (`address`) and "Visits by arrangement" (`hours`). No street address, phone, email or opening hours, for every storefront.
- **R23.** Hero taglines are plain craft lines ("Handwoven wool and stamped silver"). No slogans about spirit, ancestors or authenticity.

**Search, the eval set, the watch and the swarm**
- **R24.** `keywordAliases` never map a stereotype word ("tribal", "native", "indian") to anything.
- **R25.** The 50 eval queries are "held-out test queries, written separately by our data agent", with `author: "data_agent"`. Gordon may write or edit up to 15 later, which then carry `author: "gordon"` (fix-plan 1.5). No banned or stereotype words.
- **R26.** Watch candidates are the sandbox market's listings, with invented sellers, and they resemble the Diné co-op's pieces only. Their URLs are paths under `/market/`. A listing's own words (title, snippet, claim) are the fictional seller's, so they're the one place a claim like "Authentic Native American made" appears.
- **R27.** Scripted authenticity replies name who attests (L15), and `run_01` answers only for `pc_01`.
- **R28.** One list in code, `src/mock/contentRules.ts`, exports `contentRules` with the fields contracts section 11 gives (`bannedObjects`, `stereotypeWords`, `meaningWords`, `accusingWords`, `peopleNames` by community, `allowedHosts`). `peopleNames` holds, by community: Diné, Navajo and 纳瓦霍. Ojibwe, Ojibwa, Chippewa, Anishinaabe and 奥吉布瓦. Acoma, Pueblo and 阿科马. Seminole and 塞米诺尔. Plus Native American, Indigenous, Native, Indian, 美洲原住民, 原住民 and 土著.

## Safe craft facts

Checked against the sources below on Oct 24, 2026. Write nothing about these crafts beyond them. "Objects" are the forms this plan uses, each named by a source and drawable by I2-art.

| Community and craft | Safe to write | Objects | Keep out | Sources |
|---|---|---|---|---|
| `com_dine`, weaving | Diné weavers weave on an upright loom. Early weavings used handspun wool of churro sheep, in natural white and brown, indigo blue and red. Commercial machine-spun yarns and aniline dyes arrived in the 1870s. Sash belts are woven too, warp-faced, in wool | rug, wall weaving, sash belt | Yei and sandpainting designs, ceremonial weavings, regional style names (most are named after trading posts), pattern meanings, "Navajo" as a product word | [CU Museum of Natural History, Navajo weaving](https://cumuseum-archive.colorado.edu/Exhibits/ThreeCultures/additional.html), [MFA Boston, sash belt 2018.207](https://mfaboston6.emuseum.com/objects/656907/sisichii-sash-belt), [Moab Sun News on Yei weaving](https://moabsunnews.com/2023/06/29/moab-history-what-is-the-yeibechai-style-of-weaving/) |
| `com_dine`, silver | Diné smiths have worked silver since the 1850s and 1860s. Silver was never mined by Native people of the Southwest: smiths melted coins, later worked silver stock. Hand stamps became the main way to decorate silver, alongside sand casting. Turquoise has been set in silver since about 1880 | cuff bracelet, ring, earrings, pendant necklace | named forms (naja, squash blossom), bow guards, any spiritual story about a form (the Heard calls those false), meanings | [Heard Museum, Southwest silverwork 1850 to 1940](https://heard.org/southwest-silverwork-1850-1940/), [Penn Museum, Navajo silver and turquoise ring NA10808](https://penn.museum/collections/object/230755) |
| `com_ojibwe`, beadwork | Ojibwe beadworkers stitch glass seed beads directly onto cloth or leather, and also weave beads on a loom. Floral designs are common. Glass beads reached the Ojibwe through the fur trade in the 1600s, most of them made in Murano, Italy | earrings, pouch, pendant necklace, bead necklace | regalia (bandolier bags, dance aprons), pipe and tobacco bags, culturally sensitive items, what flowers or plants mean or are used for | [Minnesota Historical Society, Ojibwe artists](https://www.mnhs.org/sites/default/files/2025-05/ft-06-ojibwe-artists.pdf), [MNHS, Ojibwe material culture](https://www.mnhs.org/ojibwematerialculture), [Smithsonian NMNH, floral beaded phone grip, Red Lake](https://dashboard.si.edu/object/beaded-popsocket-and-cellphone-case:nmnhanthropology_16792271), [Smithsonian NMNH, beaded shoulder bag](https://si.edu/object/beaded-shoulder-bag%3Anmnhanthropology_8450754), [Spencer Museum, necklace with flower pendant](https://spencerart.ku.edu/art/collections-online/object/36949), [Wisconsin Historical Society, Ojibwe beaded earrings workshop](https://calendar.wisconsinhistory.org/?p=11208), [Hood Museum, Anishinaabe beaded belt](https://hoodmuseum.dartmouth.edu/objects/985.47.26580), [U of Minnesota, bandolier bag as regalia](https://ojibwe.lib.umn.edu/collection/bandolier-bag-326d557f-cf8f-490a-aacb-2a9669300584) |
| `com_acoma`, pottery | Acoma potters coil their pots by hand, with thin walls. The clay is mixed with finely ground shards of old pottery. A white slip covers the pot, which is polished with a smooth stone, painted with a yucca brush and fired. Black and orange are the traditional colors, in geometric designs with fine lines | jar, bowl, seed pot | what designs mean (the sources name rain, sun and others: keep them all out), named designs (parrots, deer, rainbow bands), where the clay comes from, ceremonial pottery, katsina | [Acoma Sky City Cultural Center, Acoma pottery](https://acomaskycity.org/page/acoma_pottery), [National Trust, Preservation magazine, Fall 2021](https://savingplaces.org/stories/the-ancient-art-of-pottery-at-new-mexicos-acoma-pueblo) |
| `com_seminole`, patchwork | Seminole patchwork is made by sewing strips of cloth into long bands on a sewing machine, cutting the bands and sewing the pieces back together in rows. Sewing machines arrived in the 1890s, the earliest known patchwork dates from around World War I, and rickrack later replaced appliquéd ribbon. Women make skirts, jackets, shirts, dresses and children's clothes | skirt, jacket | named designs and what they stand for, presenting any piece as a costume, copying a living artist's design | [Ah-Tah-Thi-Ki Museum, It's Not a Costume: history](https://www.ahtahthiki.com/its-not-a-costume/history/), [Florida Seminole Tourism, Seminole patchwork](https://floridaseminoletourism.com/seminole-patchwork/), [NPR, Seminole patchwork: admiration and appropriation](https://www.npr.org/sections/codeswitch/2017/02/18/510241789/seminole-patchwork-admiration-and-appropriation) |

**The craft lines** (`heritage`, R12). The co-op's two are in `R0-reskin.md`. The other three:

| Community | en | zh |
|---|---|---|
| `com_ojibwe` | Ojibwe beadworkers stitch glass seed beads directly onto cloth or leather, often in floral designs. Glass beads reached the Ojibwe through the fur trade in the 1600s. | 奥吉布瓦（Ojibwe）串珠匠人把玻璃小珠直接缝在布或皮革上，常做成花卉图案。玻璃珠在17世纪随毛皮贸易传到奥吉布瓦人手中。 |
| `com_acoma` | Acoma potters coil their pots by hand with thin walls, cover them with a white slip and paint them with a yucca brush. Black and orange are the traditional colors. | 阿科马（Acoma）陶匠手工盘筑薄壁陶器，施白色泥浆，再用yucca（丝兰）笔绘制。传统颜色是黑色和橙色。 |
| `com_seminole` | Seminole patchwork is sewn from strips of cloth joined into bands on a sewing machine, then cut and pieced back together in rows. It grew after sewing machines arrived in the 1890s. | 塞米诺尔（Seminole）拼布是用缝纫机把布条缝成长条，再裁开、重新拼成一排排花样。19世纪90年代缝纫机传入后，这门手艺逐渐发展起来。 |

## Interfaces

- **Reads:** types and `validateEvent()` from `src/core/`, R0's records in `src/mock/`, and in tests only, the scripted scorer and draw from `src/sources/` and the file list of `public/images/`. Nothing from `src/ui/`, `src/app/` or `src/features/`.
- **Exports**, exactly as contracts section 11 names them. `src/mock/index.ts` re-exports every file. `npm run export:mock` writes every non-function export to `artifacts/mock/mock.json`, which B11, B12, B13, B14, B15 and D-deploy read.

| File | Exports |
|---|---|
| `communities.ts` | `communities` (four, in the contracts' order) |
| `people.ts` | R0's exports unchanged (`studio` is `std_dine`, `owner`, `makers` stays the co-op's three, `buyers`, `people`), plus `leads` (`own_01` to `own_04`) and `allMakers` (`mkr_01` to `mkr_17`). `people` now holds everyone. Makers `mkr_01` to `mkr_03` carry `receiptNote`, and `receiptNotes` (a record by `makerId` of those notes) is built from them in code |
| `catalog.ts` | `pieces` (all 54, the co-op's twelve first), `curatedSet` unchanged |
| `searchIndex.ts` | `searchIndex`, `keywordAliases` |
| `search.ts` | `demoSearch`, `demoSurprise` |
| `searchEval.ts` | `searchEval` |
| `projects.ts` | `projects`, `worksInProgress`, `demoContribution`, `demoFundMoves`, and `apr_05` beside them |
| `storefronts.ts` | `storefronts` |
| `listings.ts` | `listings`, and `apr_04` beside it |
| `agents.ts` | `agents`, `getAgent(agentId)` |
| `swarm.ts` | `swarmRuns`, `fallbackSupportRun`, `fallbackListingRun`, `demoQuestions`, and the question record `qst_01` (export name under Needs) |
| `watch.ts` | `counterfeitCandidates`, `scriptedScan`, and `fup_02` and `apr_03` beside them |
| `model.ts` | `modelId`, `report` |
| `policy.ts` | `policy` |
| `splits.ts` | `splits`, a `Record<pieceId, split.shown payload>`, and `gallerySplits` (a record by `pieceId` of the gallery comparison, built from `splits` in code) |
| `contentRules.ts` | `contentRules` |
| `database.ts` | the scripted `data.synced` payload for d15 (export name under Needs) |
| `index.ts` | Re-exports all of the above. `getById()` also finds `com_`, `prj_`, `wip_`, `mls_`, `sto_`, `lst_`, `cft_`, `pol_`, `qst_`, `apr_03` to `apr_05`, `fup_02` and the new people |

- **IDs** (contracts section 11, the scripted side): `qry_01`, `srp_01`, `thr_00` to `thr_05`, `wsc_01`, `run_01` to `run_10`, `stp_0001` onward across all runs in run order, `chk_01` onward, `ctb_01`, `qst_01`, `ans_01`, `blk_01` onward (storefronts first, then `run_03`'s drafted blocks), `mls_01` onward, `pol_01` to `pol_05`. People's IDs (`*_user_<n>`) are made by the sources code, never stored here.
- **Determinism:** no `Math.random`, no `Date.now`, no `new Date()` without an argument. Any figure that comes from R0's records is computed from them, never typed.

## Figures 11 and 12, for contracts section 2

FX1 copies these two paragraphs into the `[FIGURE11]` and `[FIGURE12]` places.

**11. The vibe query** in `d01-vibe` is exactly `a warm, bold gift for my mom. she loves red wool. under $200`. Its keywords are exactly `warm`, `bold`, `red`, `wool`, `gift for mom`, `under $200`, in that order (moods, then facet words, then the recipient through the alias `mom`, then the price). The scripted results are six pieces, all priced at 20000 or less, in this order: `pc_01` (Grace N.'s small grey, red and black wool weaving, matching all five word chips), `pc_07` (Lena T.'s red and grey wool mini weaving, four) and `pc_11` (Lena T.'s red and white wool weaving, four), then `pc_14` (red and green floral beaded earrings, Ojibwe, three), `pc_30` (a small black and orange seed pot, Acoma, three) and `pc_43` (a red, yellow and black patchwork skirt, Seminole, three). Each result's `matched` lists exactly the chips that piece carries. Every other piece at 20000 or less carries at most two of the five word chips.

**12. Surprise me** in `d02-surprise` uses keyword `geometric`, method `fair_random` and seed 10, and draws `pc_38`, an Acoma jar by Julie M. (`mkr_12`), who sold nothing this month. Exactly nine pieces carry `geometric`, from two communities, so all nine are candidates. In candidate order (score, then `pieceId`, since every candidate scores the same on one keyword), with each piece's `salesThisMonth` and its weight as the payload carries it (raw weight `1 / (1 + salesThisMonth)` over their total, 194/60): `pc_27` (4) 0.0619, `pc_30` (3) 0.0773, `pc_32` (2) 0.1031, `pc_35` (5) 0.0515, `pc_38` (0) 0.3093, `pc_42` (3) 0.0773, `pc_45` (2) 0.1031, `pc_48` (4) 0.0619, `pc_51` (1) 0.1546. mulberry32 seeded with 10 returns 0.50199 first, so the draw walks to 0.50199 of the total and lands on `pc_38`, the fifth candidate and the one with the largest weight. Any first value from 0.2938 to 0.6031 would land on it. Every piece by `mkr_12` has `salesThisMonth` 0, and every other candidate's maker has at least one sale.

## The scripted runs, for contracts section 11

FX1 copies this list into the `[RUNLIST]` place. Every run has the fields of I2-core's `ScriptedRun`. Step summaries are short, in English and Chinese.

| Run | Thread | Side | Trigger | What it is | Final events, in order |
|---|---|---|---|---|---|
| `run_01` | `thr_01` | buyer | support, `pieceId` `pc_01` | The d04 question | `support.answered` |
| `run_02` | `lst_01` | seller | listing `lst_01`, its notes | The d15 listing | `listing.drafted`, `listing.indexed`, `approval.requested` `apr_04` |
| `run_03` | `sto_01` | seller | storefront `sto_01` | The Designer drafts the co-op's storefront | `storefront.drafted` |
| `run_04` | `thr_02` | seller | support | "When do I get paid for September?" | `support.answered` |
| `run_05` | `thr_00` | buyer | none (fallback) | `fallbackSupportRun`, L16 | `support.answered` |
| `run_06` | `thr_00` | seller | none (fallback) | `fallbackListingRun`, a draft labeled as a sample | `listing.drafted` |
| `run_07` | `thr_03` | buyer | support, `pieceId` `pc_01` | The meaning question that goes to the maker | `support.answered` (L14), `question.forwarded` `qst_01` |
| `run_08` | `thr_04` | buyer | support, `pieceId` `pc_01` | The find question through Elastic Agent Builder | `support.answered` |
| `run_09` | `thr_03` | buyer | question `qst_01` | The "ask the maker" relay of Grace N.'s answer | `support.answered` quoting her words |
| `run_10` | `thr_05` | seller | support | "Why is part of my September pay held?" | `support.answered` |

L16's place `[L16PIECE]` reads "the small grey, red and black wool weaving".

## Tasks

The data-smith does each spawn's tasks in order, one at a time, so a later task may finish a file an earlier one stubbed. Each task ends with its own test passing under `npm run check:data`. The spawns follow B1-20 and `docs/harness/v2-runbook.md` V1:
- **Spawn 1** (V1 step 2): T1 alone. The orchestrator commits it as soon as `npm run check` passes, because I2-core T5's responders import the stubs.
- **Spawn 2** (V1 step 3): T2, T3, T4, T5 and T7. None needs I2-core T5.
- **Spawn 3** (V1 step 4, after I2-core T5 is committed): T6 and T8, which test through `src/sources/`.
- **Spawn 4**, after B11's first real training run: T9's first pass. **Spawn 5**, after the orchestrator runs `python server/b11_embed/train.py --eval-only`: T9's second pass.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Typed stubs for every new file | `src/mock/communities.ts`, `src/mock/searchIndex.ts`, `src/mock/search.ts`, `src/mock/searchEval.ts`, `src/mock/projects.ts`, `src/mock/storefronts.ts`, `src/mock/listings.ts`, `src/mock/agents.ts`, `src/mock/swarm.ts`, `src/mock/watch.ts`, `src/mock/model.ts`, `src/mock/policy.ts`, `src/mock/splits.ts`, `src/mock/contentRules.ts`, `src/mock/database.ts`, `src/mock/index.ts` | I2-core's types | sonnet |
| T2 | Communities, people, receipt notes and the content rules | `src/mock/communities.ts`, `src/mock/people.ts`, `src/mock/contentRules.ts`, `tests/data/v2-communities.test.ts` | T1 | opus |
| T3 | Catalog part A: Ojibwe and Acoma, `pc_13` to `pc_40` | `src/mock/catalog/part-a.ts`, `tests/data/v2-catalog-a.test.ts` | T2 | opus |
| T4 | Catalog part B: Seminole, `pc_41` to `pc_54` | `src/mock/catalog/part-b.ts`, `tests/data/v2-catalog-b.test.ts` | T2 | opus |
| T5 | The co-op's facets, the merge, the index and the aliases | `src/mock/catalog/dine-facets.ts`, `src/mock/catalog.ts`, `src/mock/searchIndex.ts`, `tests/data/v2-index.test.ts`, `tests/data/reconcile.test.ts` | T3, T4 | opus |
| T6 | The demo search and surprise, and the 50 eval queries | `src/mock/search.ts`, `src/mock/searchEval.ts`, `tests/data/v2-search.test.ts` | T5, I2-core T5 committed | opus |
| T7 | Splits, projects, storefronts, the listing, policy, the roster, the watch, the empty model | `src/mock/splits.ts`, `src/mock/projects.ts`, `src/mock/storefronts.ts`, `src/mock/listings.ts`, `src/mock/policy.ts`, `src/mock/agents.ts`, `src/mock/watch.ts`, `src/mock/model.ts`, `tests/data/v2-records.test.ts` | T5 | opus |
| T8 | The scripted runs, the question, the database snapshot, the lookups, and the integrity and figures tests | `src/mock/swarm.ts`, `src/mock/database.ts`, `src/mock/index.ts`, `tests/data/v2-figures.test.ts`, `tests/data/v2-integrity.test.ts` | T6, T7 | opus |
| T9 | After B11's first real run: copy the report and the PCA points into `model.ts`, grade `unjudged.json`, and compute `cft_01`'s real text match. After `train.py --eval-only`: copy the report again | `src/mock/model.ts`, `src/mock/searchEval.ts`, `src/mock/watch.ts`, `tests/data/v2-model.test.ts`, `tests/data/v2-records.test.ts`, `tests/data/v2-figures.test.ts` | B11 T5 | sonnet |

### T1 · Stubs

Every file in the exports table exists with its exact export names and the types I2-core gives, holding the smallest valid value: empty arrays and records, `report: null`, and one placeholder entry only where a type needs one. They cover at least what I2-core's responders import: `catalog` (FO2's placeholders are already there), `searchIndex`, `search`, `swarm`, `watch`, `model`, `splits`, `projects` and `listings`. `index.ts` re-exports them. `npm run check` passes. Tell the orchestrator in the report that the stubs are ready.

### T2 · Communities, people, receipt notes and the content rules

- `communities.ts`: the four communities in the contracts' order, every field filled by R1 to R8. The file comment says every community is fictional demo data, that `about` stands in for words the community would write (L8), and that `protocols` are Cindia's choices (L9).
  - `com_dine`: `name` and `place` from R0, `people` "Diné (Navajo)" / 纳瓦霍（Diné）, `craft` "Wool weavings, silver and turquoise jewelry" / 羊毛编织与绿松石银饰, `studioId: "std_dine"`, `leadId: "own_01"`, makers `mkr_01` to `mkr_03`.
  - `com_ojibwe`, `com_acoma`, `com_seminole`: `craft` "Floral beadwork: earrings, pouches and necklaces", "Coil-built, hand-painted pottery", "Patchwork skirts and jackets" (see Needs for the contracts' wording). Chinese names: 一个奥吉布瓦（Ojibwe）串珠合作社, 一个阿科马（Acoma）陶艺坊, 一个塞米诺尔（Seminole）拼布合作社.
  - `storefrontId` `sto_01` to `sto_04` and `projectIds` `[prj_01]` to `[prj_04]`, in order. `demo: true` on all four.
- `people.ts`: add `own_02` to `own_04` and `mkr_04` to `mkr_17` from R9's table, with `role`, `name`, `surnameChar`, `lang: "en"`, `communityId` and `languages: ["en"]`. R0's four gain `communityId: "com_dine"` and nothing else changes.
  - **Receipt notes** (A1 top change 7): `mkr_01` to `mkr_03` carry `receiptNote`, two plain lines in the maker's voice and in plain English, written as placeholders Gordon may rewrite, with a comment saying they're demo data. Grace N.'s: "Thank you for choosing my weaving." and "My share of your purchase reached me on Oct 2." / 谢谢您选择我的编织作品。 and 您这笔购买中我的那份已在10月2日到账。 The date matches `makerPayoutDate`, which the T2 test checks. No meaning, lineage or hardship. `receiptNotes` is the same notes as a record by `makerId`, for M-buyer.
- `contentRules.ts`: R28, with a comment naming A2 and contracts section 11.
- **Test** (`v2-communities.test.ts`):
  - there are four communities, all `native_american`, with the IDs, slugs' storefronts and projects of the contracts' table,
  - every `leadId`, `makerIds` entry, `studioId`, `storefrontId` and `projectIds` entry resolves,
  - each community's makers are R9's, every maker's community lists them, initials differ within a community,
  - every owner and maker has `lang: "en"`, and no person has `nativeName`,
  - every `verification.note` follows the contracts' pattern and ends "No real check was done for this demo.",
  - no `about` uses a word R4 bans, and no `Text` outside `protocols` holds a `bannedObjects` word.

### T3 and T4 · The catalog, 42 new pieces

Fourteen pieces per community, in the contracts' ID ranges. Makers in ID order: Ojibwe 3, 3, 3, 3 and 2 pieces, Acoma the same, Seminole 4, 4, 3 and 3. Four `featured` and ten `series` per community. Each piece has:
- every v1 field: `title` (en, zh), `makerId`, `kind`, `hours`, `materialsCents`, `priceCents`, `story` (R11), `heritage` (R12), `process` (three to five steps whose hours add up to `hours`, R13), `image` (`/images/<pieceId>.svg`),
- v2's fields:
  - `communityId`,
  - `facets`, with `object` as `Text` using only that craft's object words from the safe facts table, at least one each of materials, techniques and colors from R16, motifs from R14 where the piece has them, `oneOfAKind` true for featured pieces, `leadTimeDays`, and `sizeCm` where it makes sense,
  - `vibe` from R18 (two to four moods, one to three occasions, one to three recipients),
  - `imageAlt` (en, zh) saying what the illustration shows.

The mix: Ojibwe five earrings, six pouches, two pendant necklaces and one bead necklace. Acoma six seed pots, five jars and three bowls. Seminole eight skirts and six jackets, with at least one child's piece. Prices are believable for handmade work, from about $25 to about $4,500, and each community gets at least one piece under $60 and one over $400.

Pieces the figures and runs name:
- **`pc_14`** (Ojibwe, `mkr_04`): "Red and green floral beaded earrings", under 6000, object earrings, materials glass beads and leather, colors red and green, motifs flower and leaf, moods bold and bright, recipients `gift for mom` and `gift for a friend`. It matches `bold`, `red` and `gift for mom` of figure 11, and never `warm` or `wool`.
- **`pc_38`** (Acoma, `mkr_12` Julie M.): a jar carrying the motif `geometric`, figure 12's draw. Every piece by `mkr_12` (`pc_36` to `pc_38`) has `salesThisMonth` 0.
- **`pc_30`** (Acoma, `mkr_10`): "Small black and orange seed pot", at most 20000, colors black, orange and white, motifs `geometric` and `fine line`, moods warm and bold, recipients `gift for mom`. It matches `warm`, `bold` and `gift for mom`, and never `red` or `wool`.
- **`pc_43`** (Seminole): "Red, yellow and black patchwork skirt", at most 20000, materials cotton and rickrack, colors red, yellow and black, motifs stripe and zigzag, moods warm and bright, recipients `gift for mom`. It matches `warm`, `red` and `gift for mom`, and never `bold` or `wool`.
- **`geometric`** goes on exactly nine pieces and no others: `pc_27`, `pc_30`, `pc_32`, `pc_35` and `pc_38` (Acoma) and `pc_42`, `pc_45`, `pc_48` and `pc_51` (Seminole), with figure 12's `salesThisMonth` values.
- **Figure 11's ceiling:** no other piece at 20000 or less carries more than two of `warm`, `bold`, `red`, `wool` and `gift for mom`.
- **For `run_08`:** at least two pieces from other communities under 10000 that share two or more of `pc_01`'s words. `pc_14` is one.

**Tests** (`v2-catalog-a.test.ts`, `v2-catalog-b.test.ts`):
- each piece has every field, IDs are in range, makers belong to the piece's community, and the maker split, kinds and price spread hold,
- process hours add up,
- `heritage` equals the community's craft line,
- objects, materials and motifs come from the piece's craft lists, and flowers only on Ojibwe pieces,
- no title, story, facet, vibe word or `imageAlt` holds a `contentRules` banned, stereotype or meaning word, and no title or facet holds a `peopleNames` word,
- the named pieces above have the stated words.

### T5 · The co-op's facets, the index and the aliases

- `catalog/dine-facets.ts`: `facets`, `vibe`, `imageAlt` and `communityId: "com_dine"` for `pc_01` to `pc_12`, from R0's stories, replacing I2-core's fallout placeholders (FO2). Objects: wall weaving for `pc_01`, `05`, `06`, `07` and `11`, rug for `pc_03` and `04`, earrings for `pc_02` and `10`, ring for `pc_08`, pendant necklace for `pc_09` and cuff bracelet for `pc_12`. Then, for figure 11:
  - `pc_01`: materials wool, technique handwoven, colors grey, red and black, motifs diamond and step, moods warm and bold, occasions birthday, recipients `gift for mom` only. `leadTimeDays` 3.
  - `pc_07`: wool, red and grey, motif stripe, mood warm (not bold), recipients `gift for mom`.
  - `pc_11`: wool, red and white, motifs stripe and diamond, mood bold (not warm), recipients `gift for mom`.
  - The silver pieces at 20000 or less carry at most two of figure 11's word chips.
- `catalog.ts` merges the twelve with their v2 fields, then parts A and B, into `pieces`. R0's fields and every v1 figure stay as they were.
- `searchIndex.ts`:
  - **Rule:** a local, non-exported helper implements the passage rule in contracts section 2 exactly, including the sentence split and the `for:` join.
  - **Entries:** one `IndexEntry` per piece, with `storefrontSlug` from the community's storefront, `provenance` (`facts: "maker"`, `culture: "community"`, `vibe: "agent:tagger"`, `picture: "agent:describer"`), `approvedBy` the piece's maker, `pictureNote` (what the illustration shows, en and zh), `status: "active"`, and `salesThisMonth`. A comment says provenance shows who writes each layer in a real launch, that in this demo the Cindia team wrote every layer, and that the Describer never ran (A2-18).
  - `salesThisMonth` for `pc_01` to `pc_12` is computed from R0's September paid orders, refunds excluded (`pc_01` 1, `pc_02` 5, `pc_07` 4 and so on). For the other 42 it's a typed number from 0 to 6 with a comment saying it's demo data: figure 12's nine candidates take its values, every piece by `mkr_12` is 0, and every other candidate's maker has at least one sale.
  - The closed vibe list (R18) is exported for B14's Tagger as part of `searchIndex.ts`'s module, under the name the contracts give (see Needs).
  - **Aliases:** `keywordAliases` maps `mom`, `mother` and `mum` to `gift for mom`, `dad` and `father` to `gift for dad`, and nothing from `stereotypeWords` (R24).
- **`tests/data/reconcile.test.ts`:** line 66's check that `pieces` equals the twelve-piece table narrows to the co-op's twelve (`communityId` `com_dine`), keeping every v1 field check. The orchestrator logs it in `decisions.md` as a planned update, not a weakening (B1-21).
- **Test** (`v2-index.test.ts`):
  - 54 entries, one per piece,
  - each `embedText` equals an independent reimplementation of the rule in the test file, and `pc_01`'s exact string is checked literally,
  - the co-op's sales counts equal the orders,
  - no piece's vibe holds bare `gift`, `mom` or `love`, and every vibe word is in the closed list,
  - every piece's `image` file exists under `public/images/` (I2-art's placeholders, B1-22).

### T6 · The demo search, the surprise and the eval set

- `search.ts`: `demoSearch` and `demoSurprise` with I2-core's `DemoSearch` and `DemoSurprise` fields. The tour's timeline adds `qry_01` and `srp_01` (D1-49).
  - **Figure 11:** the text, keywords, `lang: "en"`, `filters.maxPriceCents: 20000`, and the six results in order. Each result's `score` and `matched` are what `scoreKeywords` returns for that piece on figure 11's keywords and filters, and its `reason` is I2-core's code-built one. Engine `keyword_scripted`, `modelId` unset.
  - **Figure 12:** keyword `geometric`, `fair_random`, seed 10, drawing `pc_38`, with `candidates` and weights as the real draw gives them (weights sum to 1, and they equal figure 12's to 4 decimals). If `scoreKeywords` orders the nine differently from `pieceId`, retune the typed `salesThisMonth` values so seed 10 still lands on a piece by the maker with the fewest sales, and report the new weights so FX1's figure 12 can follow.
- `searchEval.ts`: 50 queries, `sq_001` to `sq_050`, `author: "data_agent"`, held out (R25).
  - About ten in Chinese, at least eight.
  - Mixed voices: a mood only ("something calm for a reading corner"), an occasion, who it's for, what it looks like, a material, a technique, a craft word ("seed pot", "patchwork", "beadwork", "turquoise"), a misspelling, very short and long.
  - Each grades two to six pieces, 2 for a perfect match and 1 for a good one, at least one 2, and the grades follow the pieces' real words.
  - None repeats figure 11's text, and none holds a `contentRules` word.
  - A comment says these never enter training (B11 enforces it), that the graded pieces are in training and only the queries are held out (B2-7), and that a query Gordon writes or edits carries `author: "gordon"`.
- **Test** (`v2-search.test.ts`):
  - figure 11 field by field, and `extractKeywords()` on its text gives its six keywords in order,
  - each result's `matched` equals the chips that piece carries, and `scoreKeywords` puts the same six first in the same order,
  - figure 11's ceiling holds over all 54 pieces,
  - figure 12 through the real scripted draw: `src/sources/surprise.ts` with seed 10 draws `pc_38`, the nine candidates come from two communities, `pc_38` isn't the first candidate and has the largest weight, and `mkr_12` has the fewest sales among the candidates' makers,
  - every graded piece exists, at least 8 eval queries are Chinese, every one has `author: "data_agent"`, and no eval text equals the demo query.

### T7 · Records

- **`splits.ts`:** `splits[pieceId]` is a `split.shown` payload per piece under the `ch_cindia` money rules (card fee 290 bps plus 30 cents, Cindia fee 1000 bps, materials, maker share as the rest, half-up rounding), computed from the catalog, never typed. `pc_01` equals figure 1 to the cent (552, 1800, 2200, 13448).
  - **The gallery comparison** (A1-10, figure 16): each of the co-op's twelve carries `compare: { channelId: "ch_gallery", commissionBps, makerShareCents }`, computed from `galleryContract.commissionBps` (`ctr_gallery_01`, 40%) and the `ch_gallery` rule (gross minus commission minus materials). `pc_01`'s is 4000 bps and 8600, the line behind `buyer-split-compare`. The other communities sell through no gallery in this demo, so their splits carry no `compare`. `gallerySplits[pieceId]` is the same comparison, built from `splits` in code, for M-buyer.
- **`projects.ts`:**
  - Four projects, `prj_01` to `prj_04`, by R21, each with `goalCents`, `raisedCents` below the goal, `addOnCents: 500` and one or two dated September updates:
    - `prj_01`: "Looms for two new weavers": two upright looms and a year of yarn for two new weavers at the co-op, $2,400 in all.
    - `prj_02`: "Beads for a beadwork class": glass beads, needles and cloth for a ten-week class at the co-op, $1,500.
    - `prj_03`: "Work tables and drying shelves": two work tables and drying shelves for the studio's potters, $1,800.
    - `prj_04`: "Two sewing machines": two new machines for the co-op's sewing room, $1,400.
  - Three works in progress, each with three milestones whose `shareBps` sum to 10000:
    - `wip_01`: a co-op rug commission by `mkr_01`. `mls_01` paid, `mls_02` pending, `mls_03` pending (B1-12, D1-15).
    - `wip_02`: an Ojibwe beaded pouch commission. `wip_03`: a Seminole patchwork jacket commission.
  - `apr_05`: kind `milestone_release`, `subjectIds: ["wip_01", "mls_02"]`, `proposedBy: "cindy"`, `amountCents` the milestone's share of the price, `overLimit` by the v1 rule, `decisionDate: "2026-10-01"`, pending.
  - `demoContribution`: `ctb_01`, 500 to `prj_01`, `buy_01`, `ord_001`. `demoFundMoves`: `mv_0101` (`project_fund`, buyer to Cindia) and `mv_0102` (`project_fund`, Cindia to `community_fund` `prj_01`), each 500, `refId` `ctb_01`, date `2026-09-01` (D1-37, D1-38).
- **`storefronts.ts`:** four, with the contracts' slugs, `theme.accent` a kit color token's short name (`jade`, `seal`, `amber` or `ink`), four to six blocks each, block IDs `blk_01` onward. Props are strings or string lists only: hero `tagline` (R23), story `title` and `body` (the body is the community's `about`), pieces `pieceIds` from its community, process `title` and `body`, projects `projectIds`, visit `address` (the region) and `hours` ("Visits by arrangement", R22). All four are `published`.
- **`listings.ts`:** `lst_01` for `mkr_02` (Lena T.), `lang: "en"`, notes in her plain words, no price: "New small weaving, about 30 by 40 cm. Store-bought wool yarn in red, grey and white, with a zigzag band across the middle. About 20 hours on the loom. Good for someone who likes warm colors." Beside it `apr_04`: kind `listing_publish`, `subjectIds: ["lst_01"]`, pending.
- **`policy.ts`:** five topics, `pol_01` to `pol_05`, each `{ id, title, body, data? }`:
  - shipping (`pol_01`): every community ships from its region with tracked shipping, each piece ships within its `leadTimeDays`, and `data: { transitDaysMin: 6, transitDaysMax: 10 }`, which B14's `arrival_window` and `run_01` use,
  - returns, care (plain handling for wool, silver, beadwork, pottery and cotton, no craft claims),
  - authenticity: how verification would work in a real launch (R6), that no real check was done for this demo, and that Cindia refunds a piece that isn't as described,
  - commissions: milestones, approvals, and what happens to unreleased money.
- **`agents.ts`:** the 21 agents exactly as contracts section 6, in its order, `job` the table's text, `never` the brief's "Never does" column, `name` the English name plus a short Chinese one (Intake 接待, Finder 检索, Steward 文化与认证). Code agents have no `model`, and no agent has a model other than `claude-haiku-5-5` or `claude-sonnet-5-5`. `getAgent(agentId)` returns one spec or `undefined`.
- **`watch.ts`:** the sandbox market's four listings as `counterfeitCandidates` (R26). Their `url` values are `/market/listing-01.html` to `/market/listing-04.html`, in `cftId` order. D-deploy writes a market page at each `/market/` path, with the title in an `h1` and the snippet as the first paragraph, so the title and snippet read as a seller's own listing:
  - `cft_01`, `possible_copy`, similarity 0.91 (figure 14): its title names the co-op and Grace N. ("Grace N. wool weaving, Diné Weaving and Silver Co-op, grey red black"), its snippet repeats `pc_01`'s first story sentence word for word, and its claim reads "Says it's woven by Grace N. of the Diné Weaving and Silver Co-op. She didn't list it there." A comment says the scripted 0.91 is illustrative and T9 computes the real one (B2-9).
  - `cft_02`, `claim_only`: "Authentic Native American made wool rug, grey and red", names no maker or community, and its claim reads "Claims to be Native American made. Names no maker." It gets no report (L22).
  - `cft_03`, `neither`: a machine-woven grey and red throw whose snippet says plainly that it's factory made and not Native made, similarity about 0.8.
  - `cft_04`, `neither`: an unrelated grey wool blanket, similarity about 0.3.
  - Each has an invented seller and a price, under the field names Needs asks for.
  - `scriptedScan`: `{ scanId: "wsc_01", makerId: "mkr_01", queries, cftIds: ["cft_01"], followUpId: "fup_02", approvalId: "apr_03" }`. `queries` follow F-watch's rule: the co-op's name, "Grace N. wool weaving", and the first eight words of `pc_01`'s story. I2-core's responder builds `watch.scanned.results` from all four candidates, hits and non-hits alike.
  - `fup_02`: a calm, factual draft to the sandbox market's trust team. It says what the listing claims and what Cindia can't confirm, uses no `accusingWords` in either language, cites no law, and is never sent.
  - `apr_03`: kind `report_listing`, `subjectIds: ["cft_01"]`, pending.
- **`model.ts`:** `modelId: "cindia-embed-v1"`, `report: null`, and a comment that only T9 fills it, from B11's real run.
- **Test** (`v2-records.test.ts`):
  - all 54 splits follow the rules, `pc_01`'s equals figure 1, its `compare` equals figure 16, and only the co-op's twelve carry `compare`,
  - milestone shares sum to 10000, the statuses match, and `apr_05`'s amount and `overLimit` follow the rules,
  - `demoContribution` and `demoFundMoves` match figure 13,
  - the three approvals' kinds, subjects and fields,
  - every storefront slug, block ID and block reference resolves, all four are published, and no visit block holds a digit sequence that looks like a street number, a phone number or an email,
  - the roster matches section 6 (IDs, kinds, models, tools), and no model ID is outside Haiku and Sonnet,
  - every candidate URL is a `/market/` path or on an `allowedHosts` host, `cft_01`'s snippet holds an 8-word run of `pc_01`'s story, `cft_02` names no maker and no community, and `fup_02` holds no accusing word,
  - `report` is null, or equals `server/b11_embed/report.json` once T9 has run (D1-27).

### T8 · The scripted runs, the question, the database snapshot, the lookups and the integrity tests

`swarm.ts` holds the runs in the table above. Each step has a short `summary` (en, zh), its `toolName` where it called one, `ms` from 200 to 2000, and `model` from the roster, none for code agents or check steps.

The tour keeps each run's step order and gaps (`I2-tour.md`), so the two tour runs fit its windows: `run_01`'s steps play inside 87.6 to 95.5 s, so the `ms` of its first nine steps sum to at most 7900, and `run_02`'s inside 121.0 to 126.0 s, so the `ms` of its first six steps sum to at most 5000. The T8 test checks both sums.

- **`run_01`** (the d04 question): "Did the maker weave this herself? Can it arrive by October 10?" Steps:
  1. `cindy` route,
  2. `intake` result: authenticity and delivery, `pc_01`, the date, English,
  3. `cindy` call: steward and clerk,
  4. `steward` tool `verification_record`,
  5. `steward` result: the co-op's attestation and Grace N.'s name, with the quoted line,
  6. **`steward` check** (A1-7): "Quote found word for word in the co-op's record." / 在合作社的记录中逐字找到了这句引文。,
  7. `clerk` tool `policy`, 8. `clerk` tool `arrival_window`, 9. `clerk` result: an order on `2026-09-01` ships within `pc_01`'s `leadTimeDays` and arrives in `pol_01`'s window, well before Oct 10, with the dates computed, never typed,
  10. `writer` reply.
  
  The reply (L15, then A1-9's line, then the dates): "The co-op attests that Grace N. wove this herself. That's the co-op's record, and Cindia hasn't checked it independently." and the arrival dates, in English and Chinese. `refIds` `pc_01`, `com_dine`, `mkr_01`, `pol_01`.
- **`run_02`** (the d15 listing, A1-14): `cindy` route, `lister` result (the draft), `tagger` result (vibe words from the closed list), three `checker` check steps, `indexer` result (the draft embedded into `cindia-drafts`). The final events:
  1. `listing.drafted`: title and summary in both languages, the Chinese marked as the Lister's translation (L27), `facets` and `vibe` drawn only from the notes (`oneOfAKind` and `leadTimeDays` left out, D1-26), `hours: 20` from the notes, and three checks:
     - `chk_01` protocol, ok: "Names only the co-op's own craft. Nothing from the kept-out list.",
     - `chk_02` facts, **not ok, the planted test**: the scripted draft's summary adds "Woven from hand-spun churro wool, the old way." on purpose. The note reads "Planted test: the draft says hand-spun churro wool, but Lena T.'s notes say store-bought yarn. A person must fix this before it publishes." A comment in `swarm.ts` says the claim is planted, like v1's planted errors,
     - `chk_03` price, ok: "The notes give no price, so the draft leaves it for the maker to set.",
  2. `listing.indexed`: `lst_01`, the draft's `pieceId` (Needs), `modelId: "cindia-embed-v1"`, `embedText` built by the passage rule from the draft, `index: "cindia-drafts"`, an approximate `point` and `approx: true`,
  3. `approval.requested` `apr_04`.
- **`run_03`** (the Designer, thread `sto_01`): `cindy` route, `designer` tool `community_page`, `designer` result. It ends in `storefront.drafted` with five blocks for `sto_01`: the co-op's pieces and `prj_01`, a tagline that passes `contentRules`, block IDs after the storefronts' own. No other storefront gets a scripted draft.
- **`run_04`** (seller): "When do I get paid for September?" `cindy` route, `bookkeeper` result (rule-based) reading `mpo_01` and `mst_01`, `writer` reply naming Grace N.'s payout, its date and the held amount, computed from R0's records. It answers for Grace N. only: its trigger names `mkr_01` (the field is under Needs), so the seller drawer on another maker's page gets the fallback, as `trigger.pieceId` does for pieces.
- **`run_05`** (`fallbackSupportRun`, `thr_00`): its reply is L16 with `[L16PIECE]` filled: "In this demo, scripted answers cover the small grey, red and black wool weaving. Switch to Live to ask about this piece." It names no piece ID in `refIds`.
- **`run_06`** (`fallbackListingRun`, `thr_00`): a sample draft labeled as a sample, its checks all ok.
- **`run_07`** (the meaning question, `thr_03`): "What does the pattern on this weaving mean?" `cindy` route, `intake` result (meaning, `pc_01`), `cindy` call steward, `steward` tool `community_page`, `steward` tool `verification_record`, `steward` result: unknown, no record says, **`steward` check**: "No quote about a meaning in the records, so no answer is given." / 记录中没有关于含义的引文，因此不作回答。, `writer` reply. Final: `support.answered` with L14 ("Our records don't say, and I won't guess, so I'll ask Grace N. Her answer will show here in her own words."), then `question.forwarded` `{ questionId: "qst_01", threadId: "thr_03", makerId: "mkr_01", pieceId: "pc_01", text, lang: "en" }`.
- **`run_08`** (the find question, `thr_04`, C-3): "Anything like this under $100?" `cindy` route, `intake` result (find, budget 10000, like `pc_01`), `cindy` call finder, `finder` tool `elastic_agent` with the summary "Elastic Agent Builder (cindia-finder): pieces like pc_01 under $100" / "Elastic Agent Builder（cindia-finder）：100美元以内、与pc_01相似的作品", `finder` result, `curator` result (the order only, B12's code-built reasons), `writer` reply naming `pc_07` and the two pieces from other communities with their prices. `refIds` are those pieces. All are under 10000 and share two or more of `pc_01`'s words.
- **`run_09`** (the "ask the maker" relay, C-13, trigger `{ kind: "question", questionId: "qst_01" }`, thread `thr_03`): `cindy` route, `writer` reply. Final: `support.answered` on `thr_03` that quotes the maker's answer exactly and says it's her own words, with the Chinese labeled as Cindy's translation.
- **`run_10`** (seller, `thr_05`): "Why is part of my September pay held?" `cindy` route, `bookkeeper` result reading `mst_01` and `flg_01`, `writer` reply: what is held (`mst_01.heldCents`), why (the gallery paid `flg_01.deltaCents` short against its contract), and that it's paid once the gallery sends the difference, every figure computed. Like `run_04`, it answers for `mkr_01` only.
- **The question `qst_01`**, a record `getById()` finds: `{ id: "qst_01", threadId: "thr_03", makerId: "mkr_01", pieceId: "pc_01", text, lang: "en" }` and Grace N.'s scripted answer `ans_01`, the `question.answered` payload the tour plays and the maker page offers in scripted mode: "I picked grey, red and black because I like how they sit together, and the stepped diamond is a shape I enjoy weaving. That's all there is to it." A comment says it's a placeholder in the maker's voice for Gordon to edit, and it holds no meaning, lineage or hardship.
- **`demoQuestions`**: buyer `run_01`'s, `run_07`'s and `run_08`'s questions, in that order, and seller `run_04`'s and `run_10`'s. Every entry has its run (D1-17), and each support trigger's `matches` holds the normalized English and Chinese texts.
- **`database.ts`**, the scripted `data.synced` for d15 (contracts section 11, B13's shape): `tables` for B13's eight tables (`catalog`, `listings`, `orders`, `approvals`, `runs`, `steps`, `processes`, `screens`), each with `rows` counted from the mock data (54 pieces, `lst_01`, 30 orders, the five approvals, the ten runs, every scripted step, eleven processes, one screen), never typed, and `newest` the last three records by ID as `{ id, label }`, the label built in code from the record's kind, state, status, amount or catalog title, never a person's words. `screens: 1`. `processes`: one `{ processId, status }` per `ProcessId` in order, `swarm` and `data` `working`, the rest `done`. A comment says it's a scripted snapshot shown under the Simulated badge.
- `index.ts`: re-exports, and `getById()` covering every new collection plus `apr_03` to `apr_05`, `fup_02` and `qst_01`.
- **`tests/data/v2-figures.test.ts`:** figures 11 to 16, one test each, with exact values. Also: `ord_001`'s figures are untouched, `ctb_01` is separate from it, figure 2 holds on `curatedSet`, and `report` is null or equals the real report.
- **`tests/data/v2-integrity.test.ts`:**
  - every ID is unique across all collections and matches its format,
  - every ID inside a record or a run resolves through `getById()` or `getAgent()`, event-only IDs excepted (`mv_`, `chk_`, `stp_`, `ans_`, `blk_` in drafts, the draft's piece ID),
  - every run's steps use roster agents and the tools that agent is allowed, and `stepId`s are unique and ascending,
  - every event in a run, the scan, the question and the snapshot passes `validateEvent()`,
  - `run_01`'s reply cites only `pc_01`, `com_dine`, `mkr_01` and `pol_01`, `run_09`'s reply contains `ans_01`'s text exactly, and `run_02`'s planted claim is the only failing check,
  - **the content scan:** every v2 `Text`, facet, vibe word, alias, eval query, step summary and reply holds no `bannedObjects`, `stereotypeWords` or `meaningWords` word, except `communities[].protocols` and the market listings' own title, snippet and claim (R26), and no title, facet, vibe word or alias holds a `peopleNames` word,
  - **the host scan:** every URL in `src/mock/` is a `/market/` path or on an `allowedHosts` host,
  - **the old-names scan:** no `src/mock/` text holds a Gu-era name from R0's acceptance grep, or the name of a dropped People (Māori, Sámi, Inuit, Quechua, Maasai, Miao, Hmong),
  - the v1 determinism test still covers the new files.

### T9 · The real model report and the pooled grading

T9 runs twice, as `B11-embed.md`'s orchestrator steps say.

1. **First pass,** when `server/b11_embed/report.json`, `vectors.json` and `unjudged.json` exist from B11's training run:
   - Copy the report and the PCA points into `model.ts`'s `report`, with the fields of `ModelReport`, rounded to 4 decimals and never edited, plus a comment with the report's `modelId` and the run's date.
   - Grade `unjudged.json` once (pooled grading, B2-8). For each eval query it lists the pieces any system put in its top 5 that the query doesn't grade. Add a 2 or a 1 by T6's rules wherever a listed piece really matches, judged from its words, and leave the rest ungraded, so they count as misses. `author` doesn't change. A comment in `searchEval.ts` says how many grades the pooled pass added.
   - Set `cft_01.similarity` to its real normalized text match against `pc_01`, computed with B15's formula and the trained model, rounded to 2 decimals (B2-9). Until then the comment in `watch.ts` marks the scripted 0.91 as illustrative.
2. **Second pass,** after the orchestrator runs `python server/b11_embed/train.py --eval-only` on the new grades: copy the new `report.json` into `report` again, the same way.

In both passes, the checks in `v2-records.test.ts` and `v2-figures.test.ts` compare `report` with the files, and figure 14's test takes 0.91 before T9 and the computed number after it.

**Test** (`v2-model.test.ts`): the values in `model.ts` equal the JSON files' values, and every piece `unjudged.json` lists for a query is either graded now or still ungraded, never removed from the catalog.

## Acceptance

- Given the dataset, when `npm run check:data` runs, then every v1 test and every v2 test passes, and `npm run check` and `npm run check:scope -- src/mock/ tests/data/` exit 0. That's G2b's data step.
- Given `ord_001`, when its figures are read, then they're v1's to the cent, and `splits.pc_01` gives the same split with figure 16's comparison.
- Given `searchIndex`, when each `embedText` is rebuilt by the rule, then all 54 match.
- Given figure 11's text, when `extractKeywords()` runs, then it gives the six keywords in order, `demoSearch` holds figure 11, and `scoreKeywords` ranks the same six first.
- Given seed 10, when the scripted draw runs for `geometric`, then it draws `pc_38`, the fifth of nine candidates from two communities, by the maker with the fewest sales this month.
- Given `swarmRuns`, when each run's events are validated, then all pass, every `demoQuestions` entry has a run, and `run_01`'s reply cites only `pc_01`, `com_dine`, `mkr_01` and `pol_01`.
- Given `run_07` and `run_09`, then the buyer gets L14, `qst_01` goes to Grace N., and her answer comes back word for word.
- Given `run_02`, then its one failing check is the planted claim, labeled as a planted test, and it ends with `listing.indexed` before `apr_04`.
- Given `model.ts` before B11's run, when it's read, then `report` is null and nothing in `src/mock/` holds an eval number.
- Given `src/mock/`, when it's scanned, then it holds no banned, stereotype or meaning words outside the allowed fields, no nation's name as a product word, no URL outside the sandbox market and the example hosts, no Gu-era or dropped-People name, no unseeded randomness and no wall-clock reads.

## Out of scope

- The tour's timeline (`timelines/demo.ts`). I2-tour's data task writes it from these files, including `qst_01`'s answer and the `data.synced` snapshot.
- Images. I2-art draws them from the facets, and makes the placeholders.
- The sandbox market's pages. D-deploy renders them from `counterfeitCandidates`.
- Any UI, any live call, any contract change. A field the data needs that a contract doesn't define goes under `needs:`.
- Real people, real shops, real photos, and any text in a Native language beyond the craft terms in the safe facts.

## Needs (for FX1's contracts and the other plans)

- **Contracts section 2, the craft lines:** `com_ojibwe` "Floral beadwork: earrings, pouches and necklaces" (no source found for barrettes) and `com_seminole` "Patchwork skirts and jackets" (no source found for bags). Also `CounterfeitCandidate` gains optional `seller: string` and `priceCents?: number`, which D-deploy's market pages print.
- **Contracts section 11, export names this plan needs:** the question record in `swarm.ts` (proposed `makerQuestions`, holding `qst_01` and its scripted answer `ans_01`), the scripted `data.synced` payload in a new `database.ts` (proposed `demoDataSync`), and the closed vibe list in `searchIndex.ts` (proposed `vibeVocabulary`, which B14's listing request already carries by that name). Add `database.ts` to the file table.
- **Contracts section 11 and FX6's plans, one name each:** FX6 asked for `gallerySplits` and `receiptNotes`, while section 2 puts the comparison on `split.shown.compare` and the note on `Person.receiptNote`. This plan writes both, the records built in code from the fields, so they always agree. FX1 adds `gallerySplits` (`splits.ts`) and `receiptNotes` (`people.ts`) to the export list, or FX6's plans read the fields and the two records go.
- **I2-core (`ScriptedRun`):** a support trigger gains `makerId?`, matched against the request's `contextIds` the way `pieceId` is, so `run_04` and `run_10` answer only on Grace N.'s pages. Until then they answer on every seller page.
- **The draft's piece ID** in the tour's `listing.indexed` for `lst_01`: proposed `pc_55`, event-only, joining the catalog only when `apr_04` is granted.
- **I2-core (`planRun`):** a person's own `question.answered` must have its text quoted in `run_09`'s reply, so `planRun` substitutes the answer's text where the reply quotes `ans_01`.
- **Figure 14 and L19 (FX1, contracts sections 2 and 12):** the scripted 0.91 is illustrative until T9 computes `cft_01`'s real text match, which then replaces it in `watch.ts`. Word figure 14 and L19 as "0.91 until the model's first run, then the computed number", and F-watch renders the number from the data.
- **Figure 12** uses seed 10, decided at 5 PM, so the weights visibly pick the piece. FX1 copies this plan's figure 12 paragraph, seed, piece and weights included.
- **R0-reskin:** its acceptance grep includes 工作室, so the Acoma studio's Chinese name here is 陶艺坊.
</content>
</invoke>
