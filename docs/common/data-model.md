# Data model

Read by the data-smith, every feature and the backend. It fixes every entity, field, ID and unit, the four communities, the demo-critical figures and the four planted errors. The data-smith writes the dataset in `src/mock/` from this file. Types live in `src/core/types.ts`, which the scaffolder wrote from this file in S1 and the integrator keeps in step with it.

## Units and rules

- **Money:** integer cents, in fields ending `Cents`. Rates in basis points, in fields ending `Bps` (4000 = 40%). Rounding is half up, applied once per line.
- **Dates:** ISO strings, `YYYY-MM-DD`, all in September and early October 2026. Nothing reads the wall clock.
- **Text shown to people:** `{ en: string; zh: string }`, type `Text`. Chinese is Simplified.
- **IDs:** a prefix, an underscore and a zero-padded number. They never change once written. IDs made for a person, or for an answer to one, follow the ID scheme at the end of this file.
- **People are fictional.** Names live in one file, `src/mock/people.ts`, so Gordon can swap them. Owners and makers carry a common English given name and a family initial ("Grace N."), never a full family name or a name in a Native language. A real artisan's name goes in only with their OK.
- **Mock data only.** Every community, person, piece, order, story, storefront, approval and statement is fictional demo data in `src/mock/`. SpacetimeDB, Elastic, the model's training pairs, `vectors.json` and every test fixture are built only from it, through `npm run export:mock`.
- **The demo month is September 2026** (`monthId: "2026-09"`). The buyer's order is the first order of that month. The month closes on Sep 30, makers are paid on Oct 2.

## Communities

Four fictional Native American communities. The Diné Weaving and Silver Co-op is the named community the demo follows: the studio `std_dine`, with its owner Ruth B. (`own_01`) and its makers Grace N., Lena T. and Mae K. (`mkr_01` to `mkr_03`). The gallery is Fogline Gallery, San Francisco. Every v1 demo-critical figure (items 1 to 10 below) keeps its value on the co-op, and `docs/plans/R0-reskin.md` holds the full table of names that moved to it.

| ID | Kind | People and place | Craft | Lead | Makers | Pieces | Storefront | Project |
|---|---|---|---|---|---|---|---|---|
| `com_dine` | native_american | Diné Weaving and Silver Co-op (the studio `std_dine`), Navajo Nation, Arizona, USA | Wool weavings, silver and turquoise jewelry | `own_01` | `mkr_01` to `mkr_03` | `pc_01` to `pc_12` | `sto_01`, `dine-weavers` | `prj_01` |
| `com_ojibwe` | native_american | An Ojibwe beadwork co-op, Minnesota, USA | Floral beadwork: earrings, pouches and necklaces | `own_02` | `mkr_04` to `mkr_08` | `pc_13` to `pc_26` | `sto_02`, `ojibwe-beadwork` | `prj_02` |
| `com_acoma` | native_american | An Acoma pottery studio, New Mexico, USA | Coil-built, hand-painted pottery | `own_03` | `mkr_09` to `mkr_13` | `pc_27` to `pc_40` | `sto_03`, `acoma-pottery` | `prj_03` |
| `com_seminole` | native_american | A Seminole patchwork co-op, Florida, USA | Patchwork skirts and jackets | `own_04` | `mkr_14` to `mkr_17` | `pc_41` to `pc_54` | `sto_04`, `seminole-patchwork` | `prj_04` |

- Every community, person, piece, story, storefront, approval and statement is fictional demo data in `src/mock/`. Craft descriptions use only the sourced safe craft lines in `docs/plans/S3-catalog.md` ("Safe craft facts"), one per craft, and write nothing beyond them.
- **Words.** "Native American", and the nation names "Diné (Navajo)", "Ojibwe", "Acoma Pueblo" and "Seminole". In Chinese: 美洲原住民, and 纳瓦霍（Diné）, 奥吉布瓦（Ojibwe）, 阿科马（Acoma）, 塞米诺尔（Seminole）. Never "Indian American", which means Americans of South Asian descent, and never a nation's name as a product word ("Navajo rug").
- **Kept out of the catalog.** No sacred, ceremonial or medicine object, and nothing that copies a nation's protected design. In particular: no Yei or sandpainting designs, no whirling-log designs, no katsina figures, no feathers of any kind, no headdresses or dance regalia, no ceremonial, prayer or medicine items, no pipes, masks, drums or rattles, no dreamcatchers or totems, and none of ivory, bone, whalebone, baleen, sealskin or fur. The color is "cream", never "ivory", and no stitch or pattern is called "feather". These words appear only in a community's `protocols` and in `contentRules`.
- Gu embroidery and the other Peoples of the earlier plan (Māori, Sámi, Inuit, Quechua, Maasai, Miao) are next, each only with that community's own organizations. None of them is in the data, the art, the eval set, the slugs or the labels.
- **Verification.** `verification.note` follows one pattern for all four: "In a real launch, makers would be enrolled members of [nation] or certified by it as Indian artisans, as the U.S. Indian Arts and Crafts Act defines. Cindia would keep only a yes or no, never the record. No real check was done for this demo." [nation] is "the Navajo Nation", "an Ojibwe tribe or band", "the Pueblo of Acoma" or "the Seminole Tribe of Florida", the phrases in `S3-catalog.md` R6. `by` names the nation and the Act. Cards and pages show it as demo verification (L3, L4 in `glossary.md`).

## Entities

| Entity | ID | Fields |
|---|---|---|
| Studio | `std_dine` | `name: Text`, `craft: Text` (Wool weavings, silver and turquoise jewelry, 羊毛编织与绿松石银饰), `city: Text` (Navajo Nation, Arizona, 亚利桑那州纳瓦霍保留区), `ownerId`, `makerIds`, `payoutLimitCents: 50000`, `nessieAccountId?`. The Diné co-op's books: the one studio with a month of records |
| Community | `com_dine`, `com_ojibwe`, `com_acoma`, `com_seminole` | `name: Text`, `kind: "native_american"`, `people: Text` (the nation, as the Words line writes it), `place: Text`, `craft: Text`, `about: Text` (two plain third-person sentences about the craft and what the co-op makes, shown as a placeholder under L8, never as the community's own words), `protocols: Text[]` (Cindia's demo exclusions in plain words, shown under L9, never phrased as the nation's rule), `verification: { method: "nation_attestation"; by: Text; note: Text }`, `languages: string[]` (BCP 47 tags, display only), `leadId`, `makerIds`, `studioId?` (`std_dine` for `com_dine` only), `storefrontId`, `projectIds`, `demo: true` |
| Person | `own_01` to `own_04`, `mkr_01` to `mkr_17`, `buy_01` to `buy_20` | `role: "owner" \| "maker" \| "buyer"`, `name: Text`, `surnameChar` (one character, for the kit's `MakerMark`: an owner's or maker's family initial), `lang: "zh" \| "en"` (every owner and maker has `"en"`: the maker page opens in English, and Chinese stays the platform's second interface language), `communityId?` (owners and makers), `nativeName?: string` (unset for everyone), `languages?: string[]`, `receiptNote?: Text` (makers: two plain lines for the buyer's paid receipt, demo data) |
| Piece | `pc_01` to `pc_54` | `title: Text`, `makerId`, `kind: "featured" \| "series"`, `hours`, `materialsCents`, `priceCents`, `story: Text`, `heritage: Text`, `process: { step: Text; hours: number }[]`, `image`, `communityId`, `facets: { object: Text; materials: string[]; techniques: string[]; motifs: string[]; colors: string[]; sizeCm?: { w: number; h: number }; oneOfAKind: boolean; leadTimeDays: number }`, `vibe: { moods: string[]; occasions: string[]; recipients: string[] }`, `imageAlt: Text`. Rules below the table |
| IndexEntry | one per piece, keyed by `pieceId` | `pieceId`, `communityId`, `makerId`, `storefrontSlug`, `provenance: Record<string, "maker" \| "community" \| "agent:tagger" \| "agent:describer">` (one entry per field group: `facts`, `culture`, `vibe`, `picture`), `approvedBy` (the maker), `pictureNote: Text` (what the Describer would see), `embedText: string` (the passage, built by the rule below), `salesThisMonth: number`, `status: "active" \| "draft"`. `provenance` shows who writes each layer in a real launch. In this demo the Cindia team wrote every layer, and the Describer never ran |
| Channel | `ch_cindia`, `ch_site`, `ch_gallery` | `name: Text`, `kind: "marketplace" \| "own_site" \| "consignment"` |
| Contract | `ctr_gallery_01` | `channelId: "ch_gallery"`, `commissionBps: 4000`, `statementDay: 30`, `signedDate: "2026-03-02"`, `terms: Text` |
| Order | `ord_001` to `ord_030` | `channelId`, `pieceId`, `buyerId`, `date`, `grossCents`, `cardFeeCents`, `platformFeeCents`, `commissionCents`, `materialsCents`, `makerShareCents`, `status: "paid" \| "refunded"` |
| ChannelPayout | `pay_001` onward | `channelId`, `date`, `grossCents`, `feesCents`, `refundCents`, `netCents`, `orderIds`, `refundIds`, `monthId` |
| Refund | `rfd_001` | `orderId`, `date`, `amountCents`, `nettedInPayoutId` |
| Statement | `stm_gallery_2026_09` | `channelId`, `monthId`, `issuedDate`, `lines: { orderId; pieceId; saleCents; commissionBps; commissionCents; netCents }[]`, `totalSaleCents`, `totalCommissionCents`, `totalNetCents` |
| Purchase | `pur_001` onward | `date`, `supplier: Text`, `amountCents`, `memo`, `txnId` (materials bought for the month, paid out of the co-op's account) |
| BankTxn | `txn_001` onward | `date`, `direction: "in" \| "out"`, `amountCents`, `counterparty: Text`, `memo`, `refId` (a `pay_`, `mpo_` or `pur_` ID), `nessieId?` |
| Match | `mat_001` onward | `kind: "one_to_one" \| "bundled" \| "refund_netted" \| "carried_over"`, `recordIds`, `monthId` |
| Flag | `flg_01` | `kind: "short_payment"`, `recordIds: [contractId, statementId, txnId]`, `expectedCents`, `actualCents`, `deltaCents`, `trustRecordId`, `explanation: Text` |
| MakerPayout | `mpo_01` to `mpo_03` | `makerId`, `monthId`, `amountCents`, `orderIds`, `heldCents`, `status: "proposed" \| "approved" \| "sent" \| "held"` |
| Approval | `apr_01` to `apr_05` | `kind: ApprovalKind`, `subjectIds`, `proposedBy: "cindy"`, `amountCents?`, `overLimit: boolean`, `decisionDate: "2026-10-01"` (the date any grant or decline carries, so a tap never reads the wall clock), `status: "pending" \| "granted" \| "declined"`. `ApprovalKind` is `"follow_up" \| "maker_payouts" \| "listing_publish" \| "storefront_publish" \| "report_listing" \| "milestone_release" \| "support_action"` |
| FollowUp | `fup_01`, `fup_02` | `approvalId`, `to: Text`, `subject: Text`, `body: Text` |
| LedgerEntry | `led_0001` onward | `date`, `account`, `debitCents`, `creditCents`, `refId`, `memo` |
| MakerStatement | `mst_01` to `mst_03` | `makerId`, `monthId`, `lines: { orderId; pieceId; makerShareCents }[]`, `totalCents`, `heldCents`, `payoutDate` |
| PlantedError | `err_01` to `err_04` | `kind`, `recordIds`, `expected` (what a correct matcher reports, used by the answer key) |
| Impact | `imp_2026_09` | `makerShareBps` (average over Cindia sales), `daysCloseToPayout`, `daysCloseToPayoutBefore`, `bookkeepingHoursSaved`, `estimate: true` |
| Project | `prj_01` to `prj_04`, one per community, in community order | `communityId`, `title: Text`, `summary: Text` (what the money pays for and how much, plainly), `goalCents`, `raisedCents`, `addOnCents: 500` (the checkout contribution), `updates: { date; text: Text }[]` |
| WorkInProgress | `wip_01` to `wip_03` | `communityId`, `makerId`, `buyerId`, `title: Text`, `priceCents`, `milestones: { milestoneId; label: Text; shareBps; status: "pending" \| "reached" \| "paid"; date? }[]`. Milestone IDs are `mls_01` onward. The `shareBps` of one commission add up to 10000. `wip_01` is a Diné co-op commission by one of `mkr_01` to `mkr_03`: `mls_01` paid, `mls_02` and `mls_03` pending |
| Storefront | `sto_01` to `sto_04`, in community order | `communityId`, `slug` (`dine-weavers`, `ojibwe-beadwork`, `acoma-pottery`, `seminole-patchwork`), `theme: { accent: string; layout: "story_first" \| "grid_first" }` (accent is a kit color token name, never a raw hex), `blocks: StorefrontBlock[]`, `status: "draft" \| "published"`. A `StorefrontBlock` is `{ blockId; kind: "hero" \| "story" \| "pieces" \| "process" \| "projects" \| "visit"; props: Record<string, string \| string[]> }`, props as "Storefront blocks" below lists them. All four are published. Block IDs are `blk_01` onward |
| ListingDraft | `lst_01` (the demo listing) | `makerId`, `notes: string` (the maker's own words, in English), `lang` |
| AgentSpec | the agent IDs in `api-contract.md`'s roster | `agentId`, `name: Text`, `job: Text`, `kind: "claude" \| "code"`, `model?: "claude-haiku-5-5" \| "claude-sonnet-5-5"`, `tools: string[]`, `never: Text` (the "Never does" column of `docs/v2/brief.md`) |
| SearchQuery (eval) | `sq_001` to `sq_050` | `text`, `lang: "en" \| "zh"`, `grades: Record<pieceId, 1 \| 2>` (2 is a perfect match, 1 a good one), `author: "data_agent" \| "gordon"`. Held-out test queries, written separately by our data agent and never used for training. The pieces they grade are in training, and only the queries are held out. A query Gordon writes or edits carries `author: "gordon"`, and the report scores those as their own row |
| CounterfeitCandidate | `cft_01` to `cft_04` | `url` (its sandbox market page, `/market/listing-01.html` to `/market/listing-04.html` in `cftId` order, or a page on `example.com` or `example.org`), `title`, `snippet`, `pieceId` (the co-op's piece it resembles), `similarity` (normalized, 0 to 1), `claim: Text`, `verdict: "possible_copy" \| "claim_only" \| "neither"`, `seller?: string` (an invented seller name), `priceCents?: number`. D-deploy's market pages print the seller and the price |
| ScriptedRun | `run_01` onward | `runId`, `side`, `threadId`, `trigger`, `steps` (`swarm.step` payloads without `threadId`), `final` (an ordered list of events). The type is in "Shared shapes" below |
| PolicyTopic | `pol_01` onward | `id`, `title: Text`, `body: Text`, `data?: Record<string, string \| number>`. The shipping, returns and care topics the Clerk reads |

**Piece rules.** Facet and vibe words are lowercase English. Titles name the object and its colors or pattern. `heritage` is the community's one safe craft line, the same for each of its pieces. `process` steps are physical (prepare the wool, dye, warp, weave, cast, polish, coil, paint, fire, piece, sew), and their hours still add up. `motifs` are plain visual words and never say what a motif means. `image` is `/images/<pieceId>.svg`, an original illustration, labeled as one, and a placeholder SVG exists for every piece before G2b.

**Party** (in `events.md`) has the kind `community_fund`, with `id` the project's ID.

IDs that live only in events: `mv_0001` onward for `money.moved` (in the order they fire, v1's `mv_0001` to `mv_0006`, then the tour's `mv_0101` and `mv_0102`), `acct_studio` for the co-op's bank account in `account.synced`, `act_0001` onward for `agent.acted`, `ask_01` to `ask_03` for the canned Ask Cindy questions, `ask_user_1` onward for questions the owner types, `scn_01` for the judge's scenario and `scn_` record IDs inside it, `beat` IDs from `demo-script.md`, and every ID the ID scheme below lists for the tour, a person or an answer.

Ledger accounts: `cash`, `sales_cindia`, `sales_site`, `sales_gallery`, `card_fees`, `platform_fees`, `gallery_commission`, `materials`, `maker_pay`, `receivable_gallery`, `refunds`.

## Money rules

| Channel | Card fee | Platform fee | Commission | Maker share |
|---|---|---|---|---|
| `ch_cindia` | 290 bps of gross + 30 cents | 1000 bps of gross | none | gross − card fee − platform fee − materials |
| `ch_site` | 290 bps of gross + 30 cents | none | none | gross − card fee − materials |
| `ch_gallery` | none | none | `commissionBps` from the contract, on gross | gross − commission − materials |

- **Cindia settles each sale the same day,** net of its fees, into the co-op's account. One payout per Cindia order.
- **The co-op's own site** is paid by a card processor every few days, in bundles, net of fees and refunds.
- **The gallery** pays once a month, the amount on its statement.
- **Maker payouts** pay each maker's share for September orders whose money has arrived. Anything still owed to the co-op is held and shown on the statement as held.
- **Project contributions** pass through in full: the buyer pays Cindia, and Cindia pays the whole amount to the project's `community_fund`, with no fee (figure 13).
- **Works in progress** are paid in stages: Cindia holds a commission's money until each milestone is approved, then pays the maker that milestone's `shareBps` of the price (a `milestone` move, Cindia to the maker).
- **The gallery comparison** (figure 16) applies the `ch_gallery` row to a Cindia piece, with `ctr_gallery_01`'s commission. Code computes both shares with these rules. Neither is typed in.

## The catalog

The co-op's twelve pieces:

| ID | Title (en, zh) | Maker | Kind | Price | Hours | Materials |
|---|---|---|---|---|---|---|
| `pc_01` | Small grey, red and black wool weaving, 灰红黑三色小幅羊毛编织 | `mkr_01` | featured | $180.00 | 26 | $22.00 |
| `pc_02` | Stamped silver earrings, 压花银耳环 | `mkr_02` | series | $65.00 | 9 | $8.00 |
| `pc_03` | Brown, white and grey wool rug, 棕白灰三色羊毛地毯 | `mkr_03` | featured | $1,200.00 | 160 | $95.00 |
| `pc_04` | Red, black and white wool rug with stepped diamonds, 红黑白三色阶梯菱形羊毛地毯 | `mkr_01` | featured | $950.00 | 130 | $80.00 |
| `pc_05` | Indigo and white striped wool weaving, 靛蓝白条纹羊毛编织 | `mkr_02` | featured | $800.00 | 110 | $70.00 |
| `pc_06` | Grey and white zigzag wool weaving, 灰白锯齿纹羊毛编织 | `mkr_03` | featured | $450.00 | 60 | $45.00 |
| `pc_07` | Red and grey wool mini weaving, 红灰双色迷你羊毛编织 | `mkr_02` | series | $48.00 | 6 | $6.00 |
| `pc_08` | Thin silver ring with stamped chevrons, 压印人字纹细银戒 | `mkr_03` | series | $38.00 | 4 | $5.00 |
| `pc_09` | Silver and turquoise pendant necklace, 绿松石银吊坠项链 | `mkr_01` | series | $120.00 | 14 | $12.00 |
| `pc_10` | Silver and turquoise drop earrings, 绿松石银坠耳环 | `mkr_03` | series | $85.00 | 10 | $9.00 |
| `pc_11` | Red and white wool weaving, 红白双色羊毛编织 | `mkr_02` | featured | $175.00 | 24 | $21.00 |
| `pc_12` | Narrow stamped silver cuff bracelet, 压花细银手镯 | `mkr_01` | series | $95.00 | 11 | $10.00 |

The data-smith writes each piece's story, heritage line and process steps in both languages. Stories describe the piece plainly (what it is, its materials, one plain detail about colors or size), with no lineage, hardship or meaning, and never claim a real person made the piece.

`pc_13` to `pc_54` belong to the other three communities, as the Communities table assigns them. S3-catalog writes them, and the community, facet, vibe and `imageAlt` fields on all 54, under its content rules.

## The embedded passage

`IndexEntry.embedText` follows this rule exactly. A missing part is left out, along with its label.

```text
passage: {facets.object.en} | craft: {community.craft.en}, {community.people.en} | materials: {materials, comma-separated} | techniques: {...} | motifs: {...} | colors: {...} | mood: {vibe.moods} | for: {vibe.occasions}, {vibe.recipients} | {first sentence of story.en}
```

- Lists join with `, `. In `for:`, when one of the two lists is empty, only the other is written, and when both are empty the part is left out.
- The first sentence of `story.en` is the text up to and including the first `. `, `! ` or `? `, or the whole text when it has none, trimmed.
- A query is `query: ` followed by the person's words, then `, ` and each chip whose words aren't already in the text. A price chip (`under $200`) is never embedded, because it's a filter. Training queries, eval queries, `map`, B12's search and B15's comparer all use this rule through `compose.query_text(text, chips)`.
- Each input carries exactly one `passage: ` or `query: ` prefix, written in the text. The code never uses sentence-transformers' `prompts` or `encode_query()`. The prefixes are what the e5 model family expects.

## Demo-critical figures

G2 checks figures 1 to 10, and G2b checks all sixteen. Nothing else in the dataset may contradict them. Figure 2 (the concierge's curated set) is checked on `curatedSet` and on the scripted concierge answer, because the tour has no concierge beat.

1. **The buyer's order** is `ord_001`: `ch_cindia`, `pc_01`, `buy_01`, `2026-09-01`, gross 18000. Card fee 552, platform fee 1800, materials 2200, maker share 13448. Cindia's same-day payout `pay_001` nets 15648.
2. **The concierge answer** to "a gift under $200 for my mom, she loves red wool" is `pc_01`, `pc_07`, `pc_11`, in that order.
3. **Thirty orders:** `ord_001` to `ord_012` on `ch_cindia`, `ord_013` to `ord_026` on `ch_site`, `ord_027` to `ord_030` on `ch_gallery`.
4. **The gallery's month:** `ord_027` to `ord_030` sell `pc_03`, `pc_04`, `pc_05` and `pc_06`, gross 340000 in total. The contract says 4000 bps, so the co-op is owed 204000. The statement `stm_gallery_2026_09` charges 5000 bps on every line and totals 170000 net. The bank shows a deposit of exactly 170000 on `2026-09-30`. Short by 34000.
5. **The bundled payout:** one site payout covers exactly three orders, `ord_015`, `ord_016` and `ord_017`.
6. **The refund:** `ord_020` (`pc_12`, gross 9500) is refunded in full on `2026-09-21` as `rfd_001`, netted out of the next site payout.
7. **The late payout:** the site payout for `ord_025` and `ord_026` lands on `2026-10-02`, after the close, and carries into October.
8. **Maker payouts** `mpo_01` to `mpo_03` are proposed once September's records are matched, approved by the owner, paid on `2026-10-02`, and then the month closes with that maker pay in its books. `mpo_01` includes the 13448 from `ord_001`. The gallery's missing 34000 is held: each maker's held share is their part of it, by the contract math.
9. **Approvals:** `apr_01` is the follow-up to the gallery about the 34000. `apr_02` is the batch of three maker payouts. Any single payout over 50000 is marked `overLimit`. Cindy proposes both and approves neither.
10. **The proof panel** scores 4 caught out of 4.
11. **The vibe query** in `d01-vibe` is exactly `a warm, bold gift for my mom. she loves red wool. under $200`. Its keywords are exactly `warm`, `bold`, `red`, `wool`, `gift for mom`, `under $200`, in that order (moods, then facet words, then the recipient through the alias `mom`, then the price). The scripted results are six pieces, all priced at 20000 or less, in this order: `pc_01` (Grace N.'s small grey, red and black wool weaving, matching all five word chips), `pc_07` (Lena T.'s red and grey wool mini weaving, four) and `pc_11` (Lena T.'s red and white wool weaving, four), then `pc_14` (red and green floral beaded earrings, Ojibwe, three), `pc_30` (a small black and orange seed pot, Acoma, three) and `pc_43` (a red, yellow and black patchwork skirt, Seminole, three). Each result's `matched` lists exactly the chips that piece carries. Every other piece at 20000 or less carries at most two of the five word chips.
12. **Surprise me** in `d02-surprise` uses keyword `geometric`, method `fair_random` and seed 10, and draws `pc_38`, an Acoma jar by Julie M. (`mkr_12`), who sold nothing this month. Exactly nine pieces carry `geometric`, from two communities, so all nine are candidates. In candidate order (score, then `pieceId`, since every candidate scores the same on one keyword), with each piece's `salesThisMonth` and its weight as the payload carries it (raw weight `1 / (1 + salesThisMonth)` over their total, 194/60): `pc_27` (4) 0.0619, `pc_30` (3) 0.0773, `pc_32` (2) 0.1031, `pc_35` (5) 0.0515, `pc_38` (0) 0.3093, `pc_42` (3) 0.0773, `pc_45` (2) 0.1031, `pc_48` (4) 0.0619, `pc_51` (1) 0.1546. mulberry32 seeded with 10 returns 0.50199 first, so the draw walks to 0.50199 of the total and lands on `pc_38`, the fifth candidate and the one with the largest weight. Any first value from 0.2938 to 0.6031 would land on it. Every piece by `mkr_12` has `salesThisMonth` 0, and every other candidate's maker has at least one sale.
13. **The project add-on:** with `ord_001` the buyer adds 500 to `prj_01`, the Diné co-op's project, as `project.funded` `ctb_01`. `ord_001`'s own figures don't change. Cindia passes the full 500 to the fund: `mv_0101` buyer to Cindia and `mv_0102` Cindia to `community_fund` `prj_01`, both with `refId` `ctb_01` and date `2026-09-01`. The add-on starts off, and the switch reads on once a `project.funded` for this checkout is in the store, so the tour shows it on in `d05-pay`. `src/mock/` exports the records as `demoContribution` and `demoFundMoves`, and the tour builds its events from them.
14. **The counterfeit hit:** `cft_01` copies `pc_01`. Its title names the co-op and Grace N., its snippet repeats `pc_01`'s first story sentence, and its claim says Grace N. of the co-op made it, though she never listed it there. Its text match is 0.91 until the model's first run, then the computed number (S3 T9 writes the real normalized match into `watch.ts`, and F-watch renders the number from the data), its verdict `possible_copy`, and `apr_03` proposes reporting it. `cft_02` is the claim-only listing ("Authentic Native American made", no maker named): verdict `claim_only`, shown with L22 and no report button. `cft_04` covers a low score. Every candidate URL is on the sandbox market, `example.com` or `example.org`.
15. **The search proof** is never invented. `src/mock/model.ts` holds `report: null` until B11's first real training run, then the orchestrator has the data-smith copy that report in. The data tests assert that `report` is null or equals `server/b11_embed/report.json` exactly. Panels with no report say "Not trained yet".
16. **The split comparison:** on `pc_01`'s piece page the split shows what Grace N. would get through the gallery under its contract: 18000 gross minus the contract's 4000 bps commission (7200) minus 2200 materials, 8600 cents, against 13448 on Cindia. Code computes both with the money rules above. Neither is typed in.

## Planted errors and the answer key

| ID | Kind | Records | A correct matcher reports |
|---|---|---|---|
| `err_01` | `short_payment` | `ctr_gallery_01`, `stm_gallery_2026_09`, the gallery's bank deposit | A `flag.raised` of kind `short_payment` with expected 204000, actual 170000, delta 34000. Which record to trust comes later, in `flag.explained`, and isn't scored |
| `err_02` | `bundled` | the bundled site payout, `ord_015`, `ord_016`, `ord_017` | One match of kind `bundled` covering all three orders |
| `err_03` | `refund_netted` | `rfd_001`, `ord_020`, the payout it's netted from | One match of kind `refund_netted` |
| `err_04` | `carried_over` | the late site payout, `ord_025`, `ord_026` | One match of kind `carried_over` with `intoMonthId: "2026-10"` |

The answer key lives in `src/mock/answerKey.ts` and lists exactly these four. The matcher (scripted in Phase 1, real in B01) is scored against it.

## Content rules

Every text in the dataset follows the content rules in `docs/plans/S3-catalog.md`, section "Content rules": A2's R1 to R28, rewritten for the four nations and numbered as A2 numbered them, with the sourced lines in its "Safe craft facts". Those rules decide every word. The Words and Kept-out lines under Communities are their summary here, not a copy.

`contentRules` in `src/mock/contentRules.ts` is the one list the data tests, B11, B14 and B15 check text against. It is `{ bannedObjects, stereotypeWords, meaningWords, accusingWords, peopleNames, allowedHosts }`:
- `bannedObjects`: the "Kept out of the catalog" list,
- `stereotypeWords`: exotic, tribal, primitive, ethnic, mystical, spiritual, shamanic, sacred, ceremonial, spirit, totem, boho, native-inspired, authentic, ancient, timeless, warrior, princess, chief, powwow, smudge, healing, energy, Aztec, Inca,
- `meaningWords`: symbolizes, represents, protects, brings luck, 象征, 寓意,
- `accusingWords` in English and Chinese: fraud, scam, illegal, fake, counterfeit, knockoff, copy, stolen, infringe, violate, 假冒, 仿冒, 冒充, 山寨, 盗版, 侵权, 欺诈, 违法,
- `peopleNames`: by community, each nation's names in English and Chinese, plus Indigenous, Native, Indian, 原住民 and 土著,
- `allowedHosts`: `example.com` and `example.org`, with `/market/` paths allowed as relative URLs.

The data tests scan every `Text` of the communities, people, pieces, index, projects, storefronts, listings, runs and watch records against it, except `communities[].protocols`. A test scans `src/mock/`, the server fixtures, `pairs.jsonl` and the model card for URLs outside `allowedHosts` and for a nation's name used as a product word. The model card may also link `huggingface.co`, where its base model lives.

## Files in `src/mock/`

| File | Holds |
|---|---|
| `people.ts` | The studio `std_dine`, the owners `own_01` to `own_04`, the makers `mkr_01` to `mkr_17` and the buyers, with fictional names, and the exports `leads`, `allMakers` and `receiptNotes` |
| `communities.ts` | The four communities |
| `catalog.ts` | The 54 pieces with every field, and `curatedSet` (`pc_01`, `pc_07`, `pc_11`), the scripted concierge answer |
| `channels.ts` | The three channels and the gallery contract |
| `month.ts` | Orders, payouts, refunds, purchases, the statement, bank transactions, ledger entries, maker payouts, approvals `apr_01` and `apr_02`, the follow-up `fup_01` and maker statements for September |
| `answerKey.ts` | The four planted errors and the expected results |
| `ask.ts` | `cannedAnswers`: three canned Ask Cindy answers (`ask_01` to `ask_03`), the first for "Which piece earned the most this month?" (Chinese 这个月哪件作品最赚钱?), and `fallbackAnswer` for any other question in scripted mode |
| `impact.ts` | The impact numbers, marked as estimates |
| `scenario.ts` | One held-back statement for the judge's scenario (W2), not used in September's totals, `sampleFileName` and `sampleRecordIds` (its `scn_` record IDs, which the `scenario.loaded` request carries), and `scenarioReplies`: the events the scripted responder emits, with `at` as an offset from the request |
| `searchIndex.ts` | The 54 IndexEntry records, `keywordAliases` (a word or phrase people type, mapped to the vocabulary term, such as `mom` to `gift for mom`) and `vibeVocabulary` (the closed vibe list) |
| `search.ts` | `demoSearch`, the scripted vibe-search answer for `d01-vibe`, and `demoSurprise`, the demo's surprise draw |
| `searchEval.ts` | `searchEval`, the 50 held-out eval queries |
| `projects.ts` | `projects`, `worksInProgress` with their milestones, `apr_05`, `demoContribution` and `demoFundMoves` |
| `storefronts.ts` | `storefronts`, the four storefronts |
| `agents.ts` | `agents`, the roster in `api-contract.md`, and `getAgent(agentId)` |
| `swarm.ts` | `swarmRuns` (the scripted runs below), `fallbackSupportRun`, `fallbackListingRun`, `demoQuestions` and `makerQuestions` (`qst_01` and its scripted answer `ans_01`) |
| `listings.ts` | `listings` (`lst_01` and its notes) and `apr_04`. The scripted draft is `run_02`'s `listing.drafted` in `swarm.ts` |
| `watch.ts` | `counterfeitCandidates`, `scriptedScan`, `fup_02` and `apr_03` |
| `model.ts` | `modelId: "cindia-embed-v1"` and `report` (null until the first real run) |
| `policy.ts` | `policy`: the shipping, returns and care topics, which the Clerk reads |
| `splits.ts` | `splits`, one `split.shown` payload per piece under the `ch_cindia` rules, with the gallery comparison on the co-op's twelve, and `gallerySplits`, the same comparison by `pieceId` |
| `database.ts` | `demoDataSync`, the scripted `data.synced` payload for `d15-listing` |
| `contentRules.ts` | `contentRules` (Content rules above) |
| `timelines/demo.ts` | The demo timeline: v1's 60-second demo from `demo-script.md`, until I2-tour replaces it with the tour |
| `timelines/month.ts` | The fast-forward month: every record arriving in date order, with Cindy's matches and the flag |
| `index.ts` | Re-exports everything, a `getById()` lookup, and `allApprovals` and `allFollowUps` |

### Exports

Every file is re-exported by `src/mock/index.ts`. `npm run export:mock` writes each non-function export to `artifacts/mock/mock.json` under its own name (`conventions.md`), which is how the server reads the dataset.
- `pieces` (`catalog.ts`), `communities` (`communities.ts`), `leads`, `allMakers` and `receiptNotes` (`people.ts`, `receiptNotes` a record by `makerId` of each maker's `receiptNote`),
- `searchIndex`, `keywordAliases` and `vibeVocabulary` (`searchIndex.ts`), `demoSearch` and `demoSurprise` (`search.ts`), `searchEval` (`searchEval.ts`),
- `projects`, `worksInProgress`, `demoContribution` and `demoFundMoves` (`projects.ts`), `storefronts` (`storefronts.ts`), `agents` and `getAgent(agentId)` (`agents.ts`),
- `swarmRuns`, `fallbackSupportRun`, `fallbackListingRun`, `demoQuestions` and `makerQuestions` (`swarm.ts`), `listings` (`listings.ts`), `counterfeitCandidates` and `scriptedScan` (`watch.ts`), `modelId` and `report` (`model.ts`), `policy` (`policy.ts`),
- `splits` and `gallerySplits` (`splits.ts`): `splits` is a `Record<pieceId, split.shown payload>`, `pc_01`'s equal to figure 1, and `gallerySplits` a record by `pieceId` with `makerShareCents` under `ctr_gallery_01`'s 40% (`pc_01` is 8600). `buyer-split-compare` reads `gallerySplits`,
- `demoDataSync` (`database.ts`), `contentRules` (`contentRules.ts`),
- `allApprovals` (`apr_01` to `apr_05`) and `allFollowUps` (`fup_01`, `fup_02`), gathered in `index.ts` itself, so `mock.json` holds every approval and follow-up.

**`getById()`** finds every entity by its ID: v1's prefixes, and `com_`, `prj_`, `wip_`, `mls_`, `sto_`, `lst_`, `cft_`, `pol_`, `qst_`, `apr_03` to `apr_05`, `fup_02` and every person. Agents have no prefix: features use `getAgent()`. A person's `ord_user_<n>` lives only in the store (`buyer.orders`).

### Records in detail

- **`demoQuestions`** is `{ side: "buyer" | "seller"; text: Text }[]`, and every entry has its own scripted run. The buyer's first is the d04 question, the second a meaning question that ends in the "ask the maker" run, and the third a find question that goes through Agent Builder. The seller's are the payout question (`run_04`) and "Why is part of my September pay held?" (`run_10`).
- **Approval subjects:** `apr_03.subjectIds` is `["cft_01"]`, `apr_04.subjectIds` is `["lst_01"]`, and `apr_05.subjectIds` is `["wip_01", "mls_02"]`, with `amountCents` that milestone's share of the price.
- **Where the approvals live:** `apr_01` and `apr_02` in `month.ts`, `apr_03` and `fup_02` in `watch.ts`, `apr_04` in `listings.ts`, `apr_05` in `projects.ts`. `getById()` finds them all, and the approvals feature reads them the same way. `fup_02` is the Reporter's draft about `cft_01`.
- **Storefront blocks:** props are single strings or string lists, never `_en` and `_zh` pairs:
  - hero: `tagline` (a plain craft line),
  - story: `title`, `body` (it renders the community's `about` under L8),
  - pieces: `pieceIds`,
  - process: `title`, `body` (the title renders, the body never does, and the steps come from the piece data's `process`),
  - projects: `projectIds`,
  - visit: `address` (the region only, never a street address) and `hours` ("Visits by arrangement"). No phone or email, for every storefront.

  A live Designer draft's block IDs are `blk_user_<tag>_<n>`. `/store/<slug>` shows a draft storefront with the label "Draft. Not published yet." at the top.
- **`policy`** is a `Policy`: a list of topics, never three `Text` fields. `pol_01` (shipping) holds `data: { transitDaysMin: 6, transitDaysMax: 10 }`.
- **`nativeName`** stays unset for everyone. No Native-language text appears beyond standard craft terms.

### The scripted runs

`swarmRuns` in `swarm.ts`. Every run has the fields of `ScriptedRun`.

| Run | Thread | Side | Trigger | What it is | Final events, in order |
|---|---|---|---|---|---|
| `run_01` | `thr_01` | buyer | support, `pieceId` `pc_01` | The d04 question | `support.answered` |
| `run_02` | `lst_01` | seller | listing `lst_01`, its notes | The d15 listing | `listing.drafted`, `listing.indexed`, `approval.requested` `apr_04` |
| `run_03` | `sto_01` | seller | storefront `sto_01` | The Designer drafts the co-op's storefront | `storefront.drafted` |
| `run_04` | `thr_02` | seller | support, `makerId` `mkr_01` | "When do I get paid for September?" | `support.answered` |
| `run_05` | `thr_00` | buyer | none (fallback) | `fallbackSupportRun`, L16 | `support.answered` |
| `run_06` | `thr_00` | seller | none (fallback) | `fallbackListingRun`, a draft labeled as a sample | `listing.drafted` |
| `run_07` | `thr_03` | buyer | support, `pieceId` `pc_01` | The meaning question that goes to the maker | `support.answered` (L14), `question.forwarded` `qst_01` |
| `run_08` | `thr_04` | buyer | support, `pieceId` `pc_01` | The find question through Elastic Agent Builder | `support.answered` |
| `run_09` | `thr_03` | buyer | question `qst_01` | The "ask the maker" relay of Grace N.'s answer | `support.answered` quoting her words |
| `run_10` | `thr_05` | seller | support, `makerId` `mkr_01` | "Why is part of my September pay held?" | `support.answered` |

- A run with `pieceId` or `makerId` answers only when the request's `contextIds` include it. So `run_04` and `run_10`, which name `mkr_01`, answer only on Grace N.'s pages, and the seller drawer anywhere else gets the fallback.
- The tour's listing run ends with `listing.drafted`, `listing.indexed` and `approval.requested` `apr_04`. `pc_55` is the piece `lst_01` drafts in the tour, event-only until `apr_04` is granted.

## Shared shapes (`src/core/types.ts`)

The scripted data and the responders in `src/sources/` share these types:

```ts
// One event a scripted run plays, without id, source, key or at. In code it is a union with one
// { type, payload } member per event type, so each payload is type-checked against its event.
type PlannedEvent = { type: EventType, payload: object }

type ScriptedRun = {
  runId: string,                       // run_01 onward
  side: "buyer" | "seller",
  threadId: string,                    // thr_01 onward, the listingId, the storefrontId, or thr_00 for a fallback
  trigger:
    | { kind: "support", matches: string[], pieceId?: string, makerId?: string }   // matches: normalized en and zh texts
    | { kind: "listing", listingId: string, notes: string }      // matched on the normalized notes
    | { kind: "storefront", storefrontId: string }
    | { kind: "question", questionId: string }                   // the "ask the maker" relay
    | { kind: "fallback" },                                      // run_05 and run_06: no trigger, played when nothing else matches
  steps: Omit<Payloads["swarm.step"], "threadId">[],
  final: PlannedEvent[],               // in order: the run's last events, approvals and follow-ups included
}

type ModelReport = { trained: Payloads["model.trained"], scored: Payloads["proof.search_scored"], points: { pieceId: string, x: number, y: number }[] }
type DemoSearch = { query: Omit<Payloads["search.queried"], "queryId">, answer: Omit<Payloads["search.answered"], "queryId"> }
type DemoSurprise = { ask: Omit<Payloads["surprise.asked"], "surpriseId">, draw: Omit<Payloads["surprise.drawn"], "surpriseId"> }
type ScriptedScan = { scanId: string, makerId: string, queries: string[], cftIds: string[], followUpId?: string, approvalId?: string }
type PolicyTopic = { id: string, title: Text, body: Text, data?: Record<string, string | number> }   // pol_01 onward
type Policy = PolicyTopic[]
```

- `ScriptedRun.final` is an ordered list. The listing run ends with `listing.drafted`, `listing.indexed` and `approval.requested` `apr_04`. The watch scan (`scriptedScan`) carries `followup.drafted` `fup_02` before `approval.requested` `apr_03`.
- `trigger.pieceId` names the piece a buyer run talks about, and `trigger.makerId` the maker a seller run talks about. The responder plays such a run only when the question's `contextIds` include that ID.
- `DemoSearch.query` has no `queryId`. The tour's timeline adds `qry_01`, and its surprise `srp_01`.
- `InlineApproval`, the approval object an `approval.requested` may carry, is in `events.md`.

## Keyword chips and the keyword scorer

The chips under the search box come from a rule-based extractor in both modes. `extractKeywords(text)` in `src/sources/keywords.ts` is deterministic and returns `{ keywords: string[]; filters: { maxPriceCents?: number } }`, with its vocabulary from `keywordVocab()`:
1. Lowercase the text and split it into words. `under $N` and `below $N` become the chip `under $N` and the filter `maxPriceCents: N * 100`, and their words are used up.
2. Match multi-word vocabulary terms and multi-word `keywordAliases` keys, longest first.
3. Match single-word alias keys. A word that is an alias key always resolves through its alias.
4. Match the remaining single words against the vocabulary, as they are, then with simple plural stripping (`ies` to `y`, then `es`, then `s`).
5. Every matched word is used up, so no later pass matches it again, and each chip appears once.

- **Order:** moods, then facet words (any of object, materials, techniques, motifs or colors, together, in text order), then occasions and recipients, then the price chip. Within each group the order is the order of first appearance in the text. A term in two groups counts in the earlier one. For figure 11's text it returns figure 11's six chips in figure 11's order.
- **The vocabulary:** `keywordVocab(index, aliases)` in `src/sources/keywordSearch.ts` builds it from every facet and vibe word in the index, plus `keywordAliases`. `keywordAliases` never map a stereotype word to anything.
- **The scorer:** `scoreKeywords(keywords, filters, index, pieces)` returns at most 12 results, best first, with `score` from 0 to 1, `matched` and a `reason` as `Text`. The score is the share of the request's keywords (the price chip left out) found in the piece's facets or vibe. Pieces that score 0 are left out. The filters (`maxPriceCents`, `communityIds`) apply before ranking. Ties sort by `pieceId`.
- **Reasons:** `reason` is `{ en: "Matches " + words, zh: "匹配：" + words }`, with the matched facet words joined by ", ". The words stay English, as the facets are.

## The surprise draw

`src/sources/surprise.ts` exports `mulberry32(seed)` and `drawSurprise({ keyword?, method, seed }, index, pieces)`, which returns the `surprise.drawn` payload without `surpriseId`. B12 ports it exactly.
- **Candidates:** for `keyword_random` and `fair_random` with a keyword, the keyword's top 12 from `scoreKeywords`, only pieces scoring above 0, sorted by score, then `pieceId`. For `pure_random`, with no keyword, or when the keyword matches nothing, all 54 in `pieceId` order, with the method's weights.
- **Weights:** the raw weights are 1 for `keyword_random` and `pure_random`, and `1 / (1 + salesThisMonth)` from the piece's `searchIndex` entry for `fair_random`.
- **The draw:** the random number generator is `mulberry32`, seeded with `seed`. The draw takes `r = rng() * total` over the raw weights and walks them with a plain loop in candidate order. B12's Python port walks the same way.
- **The payload:** `candidates` lists every candidate with `weight` as its raw weight divided by the total, so the weights sum to 1.
- The data's `salesThisMonth` values make figure 12's seed land on its piece. A person's seed is 1 plus the number of `surprise.asked` events already in the store.

## The ID scheme

One scheme for every plan.

| Who makes it | IDs |
|---|---|
| The tour and the scripted data | `qry_01`, `srp_01`, `thr_00` to `thr_05` (`thr_00` is the fallback runs' placeholder thread), `wsc_01` (the tour's scan), `run_01` to `run_10` (one per scripted run), `pc_55` (the piece `lst_01` drafts in the tour, event-only until `apr_04` is granted), `stp_0001` onward, `chk_01` onward (listing checks), `ctb_01` onward, `qst_01` onward (questions put to a maker), `ans_01` onward (a maker's scripted answers), `blk_01` onward (storefront blocks), `mls_01` onward (milestones), `pol_01` onward (policy topics). `lst_` and `run_` are also record prefixes in `src/mock/` |
| A person, through `userEvent()` payloads (features number them by counting what's in the store) | `qry_user_<n>`, `srp_user_<n>`, `thr_user_<n>`, `wsc_user_<n>`, `lst_user_<n>`, `ctb_user_<n>`, `ord_user_<n>`, `ans_user_<n>` (a maker's answer on her page) |
| A scripted answer to a person (`answerId()`) | `run_user_<n>`, `stp_user_<n>`, `chk_user_<n>`, `pc_user_<n>`, `cft_user_<n>`, `fup_user_<n>`, `apr_user_<n>`, `mv_user_<n>`, `qst_user_<n>`, `blk_user_<n>`, plus `evt_reply_<n>` for its events and `act_reply_<n>` for its `agent.acted` lines |
| A live answer to a person | the same prefixes with the page tag, `<prefix>_user_<tag>_<n>`, for example `stp_user_k3x9qa_1` |

- `src/sources/ids.ts` hands out the numbers. A scripted answer's numbers start at 1 for each prefix, are reserved the moment the answer is planned (so two pending answers never share one), and start over when the player's epoch changes.
- A live run reserves its numbers with `liveIdStart(prefix, count)` and sends the first as `idStart`, with the page tag as `idTag`. Live numbers never start over within a page.
- `pageTag()` is a 6-character tag of lowercase letters and digits, made once per page load. Only live adapters use it, so scripted mode never uses a random value.
- Event IDs follow `events.md`: `evt_` (the timeline), `evt_user_` (a person), `evt_reply_<n>` (a scripted answer), `evt_live_` (a live answer).
