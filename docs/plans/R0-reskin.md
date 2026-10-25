# R0-reskin · v1's studio becomes the Diné Weaving and Silver Co-op

Priority: P0 · Wave: V1, step 0, before anything else in V1 · Depends on: V0 · Run by: the orchestrator, who spawns four agents at once (data-smith, integrator, feature-lead, backend-builder) with the SCOPE lines below · Can't be cut: every later plan uses its names · Tag after the commit: `v2-reskin`

**SCOPE:** the four task SCOPE lines below, together. They don't overlap.

## Goal

v1's whole money story moves from the Gu embroidery studio in Shanghai to a fictional Diné (Navajo) co-op on the Navajo Nation. **Every number stays.** Prices, materials, hours, fees, payouts, the gallery's 40% contract, the $340 short payment, the $95 held, the token, the dates and figures 1 to 10 don't change. Only names, words, languages and the placeholder art change, so every v1 check passes once its expected strings follow the data.

Why: Cindia is a platform for underrepresented makers, starting with Native American makers (`docs/v2/fix-plan.md` section 1.1). Gu embroidery and the other dropped communities are "next", and only with their own organizations.

## Rules

- **Every number stays.** If a check fails on a number, the re-skin is wrong. Fix the words, never the number.
- **Mock data only.** Everyone here is fictional. The craft lines below are the only statements about a real craft, and each comes from the source named beside it. Write nothing about Diné weaving or silverwork beyond them.
- **The maker's statement is in English, and the owner's and maker's pages open in English.** Chinese stays as the second interface language, through the language toggle. Every `Text` keeps both languages.
- **Expected strings in tests change with the data.** That's a planned update, not a weakening: the same assertions run, on the new words. The orchestrator logs it in `docs/harness/decisions.md` (one line: "R0: v1 tests' expected names, titles and default languages follow the re-skinned data. No assertion removed"). A spec that read the owner's or maker's page in Chinese by default now reads it in English with the same checks, and each of those spec files keeps at least one check that the toggle still shows the Chinese text.
- **Words, not code names.** In text people read (strings, mock `Text`, server prompts, narration), "studio" for this seller becomes "co-op" and 工作室 becomes 合作社. Code names stay: the `Studio` type, the `studio` export, `studioId`, `Party.kind: "studio"`, `acct_studio`, the `studio-*` cameras and views, `frame-studio`, `studioInfo.ts` and every test ID.
- **Nation names.** English "Diné (Navajo)" on first use and "Diné" after, Chinese 纳瓦霍（Diné）. Never "Navajo" or "Diné" as a product word ("Navajo rug"), never "tribal", "Indian American" or "authentic" in a title or story (A2 R10, R18).
- **Craft words are plain.** Titles name the object and its colors or pattern (A2 R10). Motifs are plain shapes: diamond, stripe, zigzag, chevron, dot, line. Never a named form or design (naja, squash blossom, Yei, sandpainting, whirling log), never what a pattern means, and no "symbolizes", "represents", 象征 or 寓意 anywhere (A2 R14).
- **Kit names stay.** The kit's money thread (`Thread`, `stitchProgress`, `--c-motion-stitch`, "running stitch") and the theme name "Silk and ink" belong to the UI kit, not to Gu embroidery. `I3-redesign` renames the theme later if a Figma drop does.
- Each agent writes only its SCOPE. A file outside it goes under `needs:`.

## Read first

- `docs/v2/fix-plan.md` section 1.1, and `docs/v2/reviews/A2-culture-trust.md` rules R6, R9 to R14 and R18 to R20.
- This plan's tables. They are the whole change list, built from a grep of `src/`, `tests/`, `server/`, `docs/common/`, `public/` and `index.html` on Oct 24 at 4:30 PM.
- Your own files, from disk.

## The old-to-new table

### Names and IDs

| Old | New |
|---|---|
| `std_gu` | `std_dine` (every file, code and data) |
| Gu Embroidery Studio / 顾绣工作室 | Diné Weaving and Silver Co-op / 纳瓦霍（Diné）编织与银饰合作社 |
| craft: Gu embroidery / 顾绣 | Wool weavings, silver and turquoise jewelry / 羊毛编织与绿松石银饰 (contracts section 2) |
| city: Shanghai / 上海 | Navajo Nation, Arizona / 亚利桑那州纳瓦霍保留区 (Gordon checks the Chinese) |
| `own_01` Shen Ruolan / 沈若兰, `surnameChar` 沈, `lang: "zh"` | Ruth B. / Ruth B., `surnameChar` "B", `lang: "en"` |
| `mkr_01` Lu Yun / 陆芸, 陆, `zh` | Grace N. / Grace N., "N", `en` |
| `mkr_02` Han Jing / 韩静, 韩, `zh` | Lena T. / Lena T., "T", `en` |
| `mkr_03` Zhou Mei / 周梅, 周, `zh` | Mae K. / Mae K., "K", `en` |
| Studio owner / 主理人 (glossary label) | Co-op manager / 合作社负责人. The role code stays `owner` |
| Studio / 工作室 (glossary label, party name, shell fallback) | Co-op / 合作社 |
| Studio website / 工作室网站 (`ch_site`) | Co-op website / 合作社网站 |
| Heritage / 非遗 (the piece's craft line label) | About the craft / 关于这门手艺 |
| Suzhou Morning Silk Co. / 苏州晨丝坊 (supplier) | Morning Loom Supply Co. / 晨织供应社 (fictional) |
| Fogline Gallery, San Francisco / 雾线画廊（旧金山） | unchanged |
| Harborline Payments (card processor) | unchanged |
| End card title "Cindia · 顾绣" | "Cindia · Diné Weaving and Silver Co-op" |
| B04's Nessie customer "Gu Embroidery" "Studio" and account "Gu studio operating" | "Dine Weaving and Silver" "Co-op" and "Dine co-op operating", in plain ASCII, because the sandbox bank finds them by exact string. Every `Text` people read keeps "Diné" |
| B04's opening line "Opening balance std_gu 2026-09" | "Opening balance std_dine 2026-09" |
| B04's line fallback "Studio record" (`_line_description`) | "Co-op record" |
| B04's customer address (1450 Grant Avenue, San Francisco) | unchanged. Nessie needs one, nobody sees it, and the test checks only its keys |

People's Chinese names are the same romanized names, as v1 already does for buyers. Buyers `buy_01` to `buy_20` don't change.

### Words in the month's records (`src/mock/month.ts`, `channels.ts`, `ask.ts`)

| Old | New |
|---|---|
| file comment "for the Gu embroidery studio", "a fictional silk supplier" | "for the Diné Weaving and Silver Co-op", "a fictional wool and silver supplier" |
| purchase `pur_001` "Mulberry silk ground fabric, 6 m" (18500) | "Wool weaving yarn, 4 kg" (18500) |
| purchase `pur_002` "Silk floss, 40 colors" (7200) | "Silver sheet and wire" (7200) |
| purchase `pur_003` "Backing cotton and fan frames" (4600) | "Turquoise stones and ear wires" (4600) |
| follow-up `fup_01` signature "Gu Embroidery Studio" / 顾绣工作室 | "Diné Weaving and Silver Co-op" / 纳瓦霍（Diné）编织与银饰合作社 |
| the flag's and the follow-up's Chinese 工作室应得 | 合作社应得 |
| `ask_02`'s Chinese 工作室应得 | 合作社应得 |
| `ask_01`'s chart labels (`title.zh` of each piece) | `title.en`, since the co-op's manager reads English. The question keeps both languages, and `questions.zh` stays 这个月哪件作品最赚钱? |
| the contract's terms "the studio's pieces", "pays the studio", 工作室 | "the co-op's pieces", "pays the co-op", 合作社 |

### The twelve pieces

Same IDs, `makerId`, `kind`, `hours`, `materialsCents`, `priceCents` and `image` as v1. Seven weavings and five silver pieces, each an object a source names and I2-art draws: wall weaving, rug, earrings, ring, pendant necklace and cuff bracelet (S3 T5 writes them as `facets.object`). The four gallery pieces (`pc_03` to `pc_06`) are the larger weavings. Every maker works in both crafts, as a co-op member can. Stories follow A2 R11: what the piece is, its materials, one plain detail about colors or size, no lineage, hardship or meaning, and never a real person. The data-smith writes each story's Chinese in natural Simplified Chinese, and Gordon checks it.

| ID | Maker | Kind | Price | Hours | Materials | Title (en / zh) | Story (en) | Process steps (hours) |
|---|---|---|---|---|---|---|---|---|
| `pc_01` | Grace N. | featured | 18000 | 26 | 2200 | Small grey, red and black wool weaving / 灰红黑三色小幅羊毛编织 | A small wool weaving in grey, red and black, with a stepped diamond at its center. About 30 by 40 cm, woven tight so it hangs flat. | yarn 4, warp 3, weave 17, finish 2 |
| `pc_02` | Lena T. | series | 6500 | 9 | 800 | Stamped silver earrings / 压花银耳环 | A pair of small silver ovals, each stamped with a ring of dots. Light enough to wear every day. | cut 3, stamp 3, wires 1, file 2 |
| `pc_03` | Mae K. | featured | 120000 | 160 | 9500 | Brown, white and grey wool rug / 棕白灰三色羊毛地毯 | A rug in undyed brown, white and grey wool, with bands of small diamonds across it. About 75 by 120 cm. | spin 30, warp 10, weave 112, finish 8 |
| `pc_04` | Grace N. | featured | 95000 | 130 | 8000 | Red, black and white wool rug with stepped diamonds / 红黑白三色阶梯菱形羊毛地毯 | Three stepped diamonds in red and black on a white ground. About 60 by 100 cm, with even, tight edges. | yarn 6, dye 10, warp 10, weave 98, finish 6 |
| `pc_05` | Lena T. | featured | 80000 | 110 | 7000 | Indigo and white striped wool weaving / 靛蓝白条纹羊毛编织 | Wide and narrow stripes in indigo blue and natural white. About 60 by 90 cm, for a wall or across a bench. | spin 20, dye 12, warp 8, weave 64, finish 6 |
| `pc_06` | Mae K. | featured | 45000 | 60 | 4500 | Grey and white zigzag wool weaving / 灰白锯齿纹羊毛编织 | Grey and white bands that bend into zigzags across the weaving. About 45 by 60 cm. | yarn 4, warp 5, weave 47, finish 4 |
| `pc_07` | Lena T. | series | 4800 | 6 | 600 | Red and grey wool mini weaving / 红灰双色迷你羊毛编织 | A palm-sized weaving in red and grey, about 15 by 15 cm, for a shelf or a desk. | yarn 1, warp 1, weave 3, finish 1 |
| `pc_08` | Mae K. | series | 3800 | 4 | 500 | Thin silver ring with stamped chevrons / 压印人字纹细银戒 | A narrow silver band stamped all the way around with small chevrons. | cut 1, stamp 1.5, solder 0.5, file 1 |
| `pc_09` | Grace N. | series | 12000 | 14 | 1200 | Silver and turquoise pendant necklace / 绿松石银吊坠项链 | One small oval of turquoise set in silver with a stamped border, on a silver chain. | cut 3, stamp 3, set 4, file 4 |
| `pc_10` | Mae K. | series | 8500 | 10 | 900 | Silver and turquoise drop earrings / 绿松石银坠耳环 | Each earring is a small turquoise stone in a plain silver setting, hanging from a short wire. | cut 2, set 4, wires 1, file 3 |
| `pc_11` | Lena T. | featured | 17500 | 24 | 2100 | Red and white wool weaving / 红白双色羊毛编织 | Red and white stripes with a band of red diamonds through the middle. About 30 by 40 cm. | yarn 2, dye 3, warp 3, weave 14, finish 2 |
| `pc_12` | Grace N. | series | 9500 | 11 | 1000 | Narrow stamped silver cuff bracelet / 压花细银手镯 | A narrow silver cuff stamped with small dots and lines, to wear alone or with others. | cut 3, stamp 4, solder 1, file 3 |

**Process step labels** (`S` in `catalog.ts`, replacing the embroidery steps):

| Key | en | zh |
|---|---|---|
| `yarn` | Preparing the yarn | 整理毛线 |
| `spin` | Spinning the wool | 纺毛线 |
| `dye` | Dyeing the yarn | 染线 |
| `warp` | Setting up the warp on the loom | 在织机上挂经线 |
| `weave` | Weaving | 编织 |
| `finish` | Finishing the edges | 收边 |
| `cut` | Cutting and shaping the silver | 裁切银料并塑形 |
| `stamp` | Stamping the design | 压印花纹 |
| `set` | Setting the turquoise | 镶嵌绿松石 |
| `solder` | Soldering | 焊接 |
| `wires` | Fitting the ear wires | 装耳钩 |
| `file` | Filing and polishing | 锉磨抛光 |

**The craft lines** (`heritage`, A2 R12). One line per craft, the same on every piece of that craft, with no per-piece extra and no meaning. `HERITAGE_BASE`, the `heritage()` helper and every v1 "stands for" line go.

| Craft | en | zh | Source |
|---|---|---|---|
| Weaving (`pc_01`, `03` to `07`, `11`) | Diné weavers weave on an upright loom. Early weavings used the wool of churro sheep in natural white and brown, indigo blue and red, and commercial yarns and dyes arrived in the 1870s. | 纳瓦霍（Diné）织工在立式织机上编织。早期织物用丘罗羊（churro）的羊毛，颜色有天然的白与棕、靛蓝和红色；19世纪70年代起有了商品毛线和染料。 | CU Museum of Natural History, Navajo weaving |
| Silver (`pc_02`, `08`, `09`, `10`, `12`) | Diné smiths have worked silver since the 1850s and 1860s, decorating it mostly with hand stamps, and have set turquoise in silver since about 1880. | 纳瓦霍（Diné）银匠自19世纪50至60年代开始制作银器，主要用手工印模压花装饰，约1880年起在银饰上镶嵌绿松石。 | Heard Museum, Southwest silverwork 1850 to 1940. Rings: Penn Museum, Navajo ring NA10808 |

The verification line (A2 R6) isn't a v1 field. S3 T2 writes it on `com_dine`.

### Text that follows the pieces

| Old | New |
|---|---|
| `DEMO_QUERY` and the concierge query everywhere: "a gift under $200 for my mom, she loves peonies" | "a gift under $200 for my mom, she loves red wool". Figure 2's answer stays `pc_01`, `pc_07`, `pc_11` in that order |
| `curatedSet.reasons.pc_01` "Peonies, under $200, and a gift she can use. One maker stitched it over 26 hours." | "Red wool, under $200, woven by one maker over 26 hours." / "红色羊毛，200美元以内，由一位匠人织了26小时。" |
| `curatedSet.reasons.pc_07` "A peony gift well under $200. Filled with dried osmanthus, to carry or hang." | "A small red and grey weaving, well under $200." / "红灰小幅编织，远低于200美元。" |
| `curatedSet.reasons.pc_11` "A fan like the peony one, under $200, with autumn chrysanthemums. 24 hours of stitching." | "A red and white weaving like the first, under $200. 24 hours of weaving." / "与第一件相似的红白编织，200美元以内。织了24小时。" |
| `src/core/testFixtures.ts` concierge reasons ("Peonies, under $200", "A small peony gift", "A fan like the peony one") | "Red wool, under $200" / "红色羊毛，200美元以内", "A small red weaving" / "红色小幅编织", "A weaving like the first" / "同款编织" |
| test answers "The koi pond panel." / 锦鲤图。 (`src/core/testFixtures.ts`, `src/core/reducers.test.ts`, `src/sources/requests.test.ts`) | "The brown, white and grey rug." / 棕白灰三色地毯。 |
| test answers "I think it was the peony fan.", "The peony fan." / 牡丹团扇。 (`tests/server/test_b07_ask.py`) | "I think it was the grey, red and black weaving.", "The grey, red and black weaving." / 灰红黑三色编织。 |
| price-parser cases "below $1,200.50 and peonies", "给妈妈的礼物，200美元以内，她喜欢牡丹" (`test_b09_concierge.py`) | "below $1,200.50 and red wool", "给妈妈的礼物，200美元以内，她喜欢红色羊毛", same expected values |
| off-topic question "What's the weather in Suzhou?" (`ask-cindy-ask.spec.ts`) | "What's the weather in Denver?" |
| scenario CSV piece "Lotus panel" (`scenario-drop.spec.ts`) | "Large wool rug", same numbers |
| typed concierge query "a silk gift for my sister who likes blue" (`buyer-concierge.spec.ts`) | "a wool gift for my sister who likes blue" |
| comment "from the sketch to the last stitch" (`src/features/buyer/ProcessTimeline.tsx`) | "from the first step to the last" |

### Language defaults

| Where | Old | New |
|---|---|---|
| `src/app/lang.ts` `SURFACE_START_LANG` | owner `zh`, maker `zh` | owner `en`, maker `en`. Buyer and studio stay `en`. With `auto` every surface starts in English, and the toggle still cycles `auto`, `en`, `zh` |
| `docs/common/ui-contract.md` Surfaces table, rows `owner` and `maker` | Chinese | English, with "Chinese through the toggle" |
| `tests/smoke/shell.spec.ts` language test | auto `{ buyer: "en", studio: "en", owner: "zh", maker: "zh" }` | auto `{ buyer: "en", studio: "en", owner: "en", maker: "en" }`. The `en` and `zh` steps are unchanged, and the test name says "every surface starts in English" |
| `tests/demo/beats.ts` d10 figure `maker-statement-total` | 本月收入 | This month's income |
| `docs/common/demo-script.md` narration and figures | see the integrator task | |

### Server prompts

| File | Old | New |
|---|---|---|
| `server/routers/b02_explain.py` | "a small Gu embroidery (顾绣) studio in Shanghai", "the studio owner", sign "Gu Embroidery Studio" and "顾绣工作室" | "a small Diné (Navajo) weaving and silver co-op on the Navajo Nation in Arizona", "the co-op's manager", sign "Diné Weaving and Silver Co-op" and "纳瓦霍（Diné）编织与银饰合作社". "the studio" in the rules becomes "the co-op" |
| `server/routers/b07_ask.py` | "a small Gu embroidery studio with three makers", "The studio owner asks", "the studio's records" | "a small Diné (Navajo) weaving and silver co-op with three makers", "The co-op's manager asks", "the co-op's records" |
| `server/routers/b09_concierge.py` | "a marketplace where buyers get Gu embroidery (顾绣) straight from the studio's makers" | "a platform where buyers get Diné (Navajo) weaving and silverwork straight from the co-op's makers", plus one rule: "Never say what a design or pattern means, and never use a nation's name as a product word." |
| `server/routers/b04_bank.py` | docstring and constants above | as the Names table |

## Where the old strings are, by owner

Every file the grep found. A file not listed had no hit. `index.html`, `src/sources/live/` and `tests/offline/` had none.

| Owner | Files |
|---|---|
| data-smith | `src/mock/people.ts`, `src/mock/catalog.ts`, `src/mock/channels.ts`, `src/mock/month.ts`, `src/mock/ask.ts`, `src/mock/timelines/demo.ts`, `tests/data/figures.test.ts`, `tests/data/reconcile.test.ts`, `tests/data/timelines.test.ts` |
| integrator | `src/app/studioInfo.ts`, `src/app/strings.ts`, `src/app/lang.ts`, `src/app/demo/EndCard.tsx`, `src/core/types.ts` (the `StudioId` comment), `src/core/testFixtures.ts`, `src/core/reducers.test.ts`, `src/sources/requests.test.ts`, `docs/common/data-model.md`, `docs/common/demo-script.md`, `docs/common/glossary.md`, `docs/common/api-contract.md`, `docs/common/ui-contract.md`, `docs/common/design-system.md`, `tests/demo/beats.ts`, `tests/smoke/shell.spec.ts`, `public/images/pc_01.svg` to `pc_12.svg` |
| feature-lead | `src/features/approvals/PayoutLines.tsx`, `src/features/approvals/DecisionBar.tsx`, `src/features/money-map/AccountBalance.tsx`, `src/features/money-map/PartyNodes.tsx`, `src/features/money-map/partyLayout.ts`, `src/features/money-map/strings.ts`, `src/features/buyer/strings.ts`, `src/features/buyer/ProcessTimeline.tsx`, `src/features/close/strings.ts`, `src/features/audit/strings.ts`, `src/features/impact/strings.ts`, `src/features/reconcile/strings.ts`, `src/features/proof/strings.ts`, and the specs `tests/features/approvals-cards.spec.ts`, `approvals-details.spec.ts`, `ask-cindy-ask.spec.ts`, `buyer-concierge.spec.ts`, `buyer-flow.spec.ts`, `buyer-receipt.spec.ts`, `buyer-story.spec.ts`, `maker-statement-flow.spec.ts`, `maker-statement-lines.spec.ts`, `maker-statement-total.spec.ts`, `maker-statement-toast.spec.ts`, `scenario-drop.spec.ts` |
| backend-builder | `server/routers/b02_explain.py`, `server/routers/b04_bank.py`, `server/routers/b07_ask.py`, `server/routers/b09_concierge.py`, `tests/server/test_b02_explain.py`, `tests/server/test_b04_bank.py`, `tests/server/test_b07_ask.py`, `tests/server/test_b09_concierge.py`, and the fixtures `tests/server/b01_month.json`, `b02_records.json`, `b03_month.json`, `b04_history.json`, `b05_month.json`, `b06_month.json`, `b07_records.json`, `b09_catalog.json`, `b10_records.json` |

## Tasks

All four start at once. The integrator's and feature-lead's checks read the data-smith's files, so each agent runs its own scoped checks first and the full set once the orchestrator says all four are in.

| ID | Owner | Task | Model |
|---|---|---|---|
| T1 | data-smith | The data | opus |
| T2 | integrator | Shared code, contracts, the demo and smoke tests, the placeholders | sonnet |
| T3 | feature-lead | The features' strings and code IDs, and their specs | sonnet |
| T4 | backend-builder | The four routers, their tests and the nine fixtures | sonnet |

### T1 · data-smith

**SCOPE:** `src/mock/people.ts, src/mock/catalog.ts, src/mock/channels.ts, src/mock/month.ts, src/mock/ask.ts, src/mock/timelines/demo.ts, tests/data/figures.test.ts, tests/data/reconcile.test.ts, tests/data/timelines.test.ts`

- `people.ts`: the studio, owner and makers as the Names table. The file comment says every name is fictional, that A2 R9's form (a common English given name and a family initial) is used for Native American makers, and that Gordon can swap them here.
- `catalog.ts`: the twelve pieces, the step labels and the two craft lines as the tables say, with a comment naming each line's source. `curatedSet` keeps its IDs and order and takes the new reasons. Its doc comment names the new query.
- `channels.ts`, `month.ts`, `ask.ts`: the words in the month's records table. Every computed figure stays computed.
- `timelines/demo.ts`: `DEMO_QUERY`, and `STUDIO.id` `std_dine`.
- Tests: `reconcile.test.ts` lines 35 to 46 take the new titles (numbers unchanged), line 51 `std_dine`, line 52 the owner's `lang: "en"`. `figures.test.ts` line 52 and `timelines.test.ts` lines 253 and 254 take the new query.
- **Add one test** in `reconcile.test.ts`: no `Text` in `people`, `pieces`, `channels`, `month.ts`'s exports or `cannedAnswers` contains any old name in the acceptance grep below, the word "symbolizes", 象征 or 寓意.
- **Checks:** `npm run check:data` and `npm run check:scope -- src/mock/ tests/data/`.

### T2 · integrator

**SCOPE:** `src/app/studioInfo.ts, src/app/strings.ts, src/app/lang.ts, src/app/demo/EndCard.tsx, src/core/types.ts, src/core/testFixtures.ts, src/core/reducers.test.ts, src/sources/requests.test.ts, docs/common/data-model.md, docs/common/demo-script.md, docs/common/glossary.md, docs/common/api-contract.md, docs/common/ui-contract.md, docs/common/design-system.md, tests/demo/beats.ts, tests/smoke/shell.spec.ts, public/images/pc_01.svg, public/images/pc_02.svg, public/images/pc_03.svg, public/images/pc_04.svg, public/images/pc_05.svg, public/images/pc_06.svg, public/images/pc_07.svg, public/images/pc_08.svg, public/images/pc_09.svg, public/images/pc_10.svg, public/images/pc_11.svg, public/images/pc_12.svg`

- `studioInfo.ts`: `std_dine` in place of `std_gu` on lines 9, 20 and 21. `strings.ts`: `studio` reads Co-op / 合作社, and `studio.map.main` says "the co-op". `lang.ts`: the Language defaults table. `EndCard.tsx`: the new title. `types.ts`: the comment.
- `testFixtures.ts`, `reducers.test.ts`, `requests.test.ts`: the test texts in "Text that follows the pieces".
- `docs/common/`:
  - `data-model.md`: the Studio row (`std_dine`, the new craft and place), the catalog table's titles (numbers unchanged), figure 2's query, the files table (`std_dine`), and in the `ask.ts` row the first question named in English, "Which piece earned the most this month?".
  - `glossary.md`: rows `studio` (`std_dine`, Co-op, 合作社, "The fictional Diné weaving and silver co-op the demo follows"), `owner` (Co-op manager, 合作社负责人, "Runs the co-op's books and approves anything that moves money"), `heritage` (About the craft, 关于这门手艺, "One sourced line about the craft's history, never a meaning"), `materials` ("Wool, silver and turquoise for a piece, paid back to the co-op"), `supplier` ("Where the co-op buys wool, silver and stones"), and "studio" in every Meaning becomes "co-op".
  - `demo-script.md`: d01's query and figures (the three new titles at $180.00, $48.00 and $175.00), d10's figure "This month's income with the weaving's $134.48", and the narration: d01 "My mom loves red wool, so I ask for a gift under two hundred dollars.", d02 "This weaving took one maker 26 hours.", d05 and d06 "the co-op's", d10 "Each maker gets a plain statement, with what's still owed." "After the 60 seconds" asks "Which piece earned the most this month?".
  - `api-contract.md`: B04's seed request `std_dine`, the nickname "Dine co-op operating", the sale's description built from the new `pc_01` title, and B09's query.
  - `ui-contract.md`: the Surfaces rows.
  - `design-system.md` line 7: "Cindia's screens use a paper ground, ink lettering, a red seal and the thread that holds it all together." The theme keeps its name.
- `tests/demo/beats.ts`: d02 figure "Grace N.", d10 figure "This month's income". `tests/smoke/shell.spec.ts`: the language test.
- `public/images/pc_01.svg` to `pc_12.svg`: v1's "Photo coming" squares are replaced, not kept. Each becomes a plain placeholder reading "Illustration coming" and the piece ID, since no photo of a fictional piece will ever come. `I2-art` replaces all twelve with its drawings.
- **Checks:** `npm run check:scope -- src/app/ src/core/ src/sources/ tests/demo/ tests/smoke/`, then `npm run test:smoke`.

### T3 · feature-lead

**SCOPE:** `src/features/approvals/PayoutLines.tsx, src/features/approvals/DecisionBar.tsx, src/features/money-map/AccountBalance.tsx, src/features/money-map/PartyNodes.tsx, src/features/money-map/partyLayout.ts, src/features/money-map/strings.ts, src/features/buyer/strings.ts, src/features/buyer/ProcessTimeline.tsx, src/features/close/strings.ts, src/features/audit/strings.ts, src/features/impact/strings.ts, src/features/reconcile/strings.ts, src/features/proof/strings.ts, tests/features/approvals-cards.spec.ts, tests/features/approvals-details.spec.ts, tests/features/ask-cindy-ask.spec.ts, tests/features/buyer-concierge.spec.ts, tests/features/buyer-flow.spec.ts, tests/features/buyer-receipt.spec.ts, tests/features/buyer-story.spec.ts, tests/features/maker-statement-flow.spec.ts, tests/features/maker-statement-lines.spec.ts, tests/features/maker-statement-total.spec.ts, tests/features/maker-statement-toast.spec.ts, tests/features/scenario-drop.spec.ts`

One lead, no builders: the change is mechanical.
- Code: every `getById<Studio>("std_gu")` and `{ kind: "studio", id: "std_gu" }` takes `std_dine`.
- Strings, user-facing "studio" to "co-op": money-map `studio` Co-op / 合作社, `nessieAccount` "Co-op account on Nessie" / 合作社的Nessie账户, `canvasLabel` "the co-op". Buyer `heritage` About the craft / 关于这门手艺, `receivedNote` "The co-op has your payment." / 合作社已收到您的付款。 Close `builtOnServer` "Built on Cindia's server." / 由Cindia服务器生成。, `salesSite` "Sales, co-op site" / 销售额，合作社网站. Audit `sales_site` "Sales on the co-op site" / 合作社网站销售额. Impact "until a real co-op's month replaces them" / 真实合作社. Reconcile `owedToStudio` "Owed to the co-op" / 合作社应得. Proof `b08-approvals` "Approvals on the manager's phone" / 负责人手机上的审批.
- `ProcessTimeline.tsx`: the comment.
- Specs, the expected strings follow the data, read from `src/mock/` where the spec already imports it:
  - `buyer-story`, `buyer-flow`, `buyer-receipt`: the new titles, "Grace N.", her mark "N" in place of 陆, the craft line, and the sachet test opens `pc_07`'s new title.
  - `buyer-concierge`: the new query and the typed query.
  - `maker-statement-flow`, `-lines`, `-total`, `-toast`: the page opens in English, so each check of `.zh` text or 牡丹团扇 or 2026年10月2日 reads the `.en` text, the new English title and "Oct 2, 2026". The test named "in English the title is Peony fan" becomes "in Chinese the title is" the new `title.zh`, after the toggle.
  - `approvals-cards`, `approvals-details`: the owner's page opens in English. Checks of `.zh` labels read `.en`, the `lang` attribute check expects `en`, and one test per file still toggles to Chinese and checks a `.zh` label. Line 94 of `approvals-details` uses `std_dine`.
  - `ask-cindy-ask`: Denver. `scenario-drop`: "Large wool rug".
- **Checks:** `npm run check:scope -- src/features/ tests/features/`, then `npm run test:feature --` for `buyer`, `maker-statement`, `approvals`, `money-map`, `ask-cindy` and `scenario`.

### T4 · backend-builder

**SCOPE:** `server/routers/b02_explain.py, server/routers/b04_bank.py, server/routers/b07_ask.py, server/routers/b09_concierge.py, tests/server/test_b02_explain.py, tests/server/test_b04_bank.py, tests/server/test_b07_ask.py, tests/server/test_b09_concierge.py, tests/server/b01_month.json, tests/server/b02_records.json, tests/server/b03_month.json, tests/server/b04_history.json, tests/server/b05_month.json, tests/server/b06_month.json, tests/server/b07_records.json, tests/server/b09_catalog.json, tests/server/b10_records.json`

- Routers: the Server prompts table and the B04 constants: `CUSTOMER_FIRST`, `CUSTOMER_LAST`, `ACCOUNT_NICKNAME`, `OPENING_DESCRIPTION` and the "Studio record" fallback in `_line_description`. B16 imports these, so keep their names and change only their values. The seed's other line descriptions are built from the mock's memos, so the three purchase lines take R0's new memos on their own.
- Tests: `test_b04_bank.py` lines 281 and 285 take the new customer and nickname, and lines 361, 381 and 438 `std_dine`. `test_b02_explain.py` lines 53 and 54 the new signature. `test_b09_concierge.py` line 29 the new query, lines 137 and 139 the parser cases, and line 212's needles the new `pc_01` title and "Grace N.". `test_b07_ask.py` lines 334 and 389 the new answers.
- **Fixtures.** The nine JSON files were dumped from `src/mock/`. Wait for the data-smith's T1 report, then rebuild each one's text from the new `src/mock/` with a throwaway dump under `artifacts/r0/`: a Vitest file and its own config there, run with `npx vitest run --config artifacts/r0/vitest.config.ts`. Nothing under `artifacts/` is committed. **Evidence:** a second throwaway script walks each old and new fixture side by side and proves every number, ID, date, key and array length is unchanged, and only strings differ. Its output goes in the report.
- **Nessie.** The first seed after R0 creates the new customer and account on the sandbox. The old Gu account stays there unused. Nothing to clean up.
- **Checks:** `npm run test:server`, with every test passing or skipping for a missing key as before.

## Acceptance

- Given all four tasks, when the orchestrator runs contracts section 10's R0 checks, then every one passes: `npm run check`, `npm run check:data`, `npm run test:smoke`, `npm run build`, `npm run test:demo` three times (v1's 60-second demo on the new names), `npm run test:offline`, `npm run test:server`, the verifier's screenshot review and the old-names search below. The orchestrator runs each command itself, and applies the time rule from `artifacts/demo/report.json` after each demo run: `endedAtWallMs` at most 75 seconds, v1's 60 seconds plus 15, because `scripts/gate.mjs` learns that rule only in I2-core. R0 plays v1's own demo. The Phase A mapping onto the desktop frames arrives later, with I2-shell.
- Given v1's 60-second demo on the new names, when the verifier reviews its screenshots, then d02 shows Grace N., 26 hours and the new `pc_01` title, d03 shows $134.48, $22.00, $18.00 and $5.52, d07 shows $340.00, 40%, 50% and $1,700.00, and d10 shows "This month's income", $134.48 and $95.00 held, in English.
- Given the repo, when it's searched with
  `grep -rIn -E "std_gu|Gu Embroidery|Gu embroidery|Gu studio|顾绣|顾氏|Shen Ruolan|沈若兰|Lu Yun|陆芸|Han Jing|韩静|Zhou Mei|周梅|Shanghai|上海|Songjiang|松江|Suzhou|苏州|晨丝坊|[Pp]eon(y|ies)|牡丹|Plum blossom|梅花|[Kk]oi|锦鲤|Lotus|晨荷|Orchid scroll|兰花轴|Sparrow on bamboo|竹雀|[Ss]achet|香囊|Silk coasters|丝绣|Crane brooch|仙鹤|Cloud pouch|祥云|[Cc]hrysanthemum|菊花|[Pp]hoenix|凤凰|团扇|osmanthus|桂花|Ming dynasty|明代|宋画|刺绣|绢|非遗|主理人|工作室" src tests server docs/common public index.html scripts`,
  then it finds nothing. Hits under `docs/v2/reviews/`, `docs/spec/`, `docs/harness/` (history notes) and `docs/plans/` that describe the past are fine.
- Given the dataset, when `tests/data/` runs, then figures 1 to 10 hold to the cent, and the new no-old-names test passes.
- Given T4's evidence script, then every fixture's numbers and IDs are unchanged.
- Given the four agents' paths, then they land in one commit, `R0: re-skin to the Diné co-op`, tagged `v2-reskin` (`docs/harness/v2-runbook.md`, V1 step 0).

## Out of scope

- v2's fields on the twelve pieces (`communityId`, `facets`, `vibe`, `imageAlt`). R0 adds none. I2-core's fallout step FO2 adds placeholders once the new types exist, and S3 T5 replaces them.
- The real illustrations (`I2-art`), the verification line (S3 T2), the other three communities (S3).
- Any number, ID, route, test ID, event or type.

## Needs (for other plans)

- `docs/harness/v2-runbook.md` V1 step 0 asks for `npm run export:mock` once R0 is in, but `export:mock` arrives with I2-core T7. Run it after V1 step 1 instead. R0's fixtures don't need it (T4 above).
- Every plan written before R0 that names Lu Yun, the Peony fan or `std_gu` takes this table's names. The fix agents are applying it now (`docs/v2/fix-plan.md` section 2).
</content>
</invoke>
