# Data model

Read by the data-smith, every feature and the backend. It fixes every entity, field, ID and unit, the demo-critical figures and the four planted errors. The data-smith writes the dataset in `src/mock/` from this file. Types live in `src/core/types.ts`, which the scaffolder writes from this file in S1.

## Units and rules

- **Money:** integer cents, in fields ending `Cents`. Rates in basis points, in fields ending `Bps` (4000 = 40%). Rounding is half up, applied once per line.
- **Dates:** ISO strings, `YYYY-MM-DD`, all in September and early October 2026. Nothing reads the wall clock.
- **Text shown to people:** `{ en: string; zh: string }`, type `Text`. Chinese is Simplified.
- **IDs:** a prefix, an underscore and a zero-padded number. They never change once written.
- **People are fictional.** Names live in one file, `src/mock/people.ts`, so Gordon can swap them. A real artisan's name goes in only with their OK.
- **The demo month is September 2026** (`monthId: "2026-09"`). The buyer's order is the first order of that month. The month closes on Sep 30, makers are paid on Oct 2.

## Entities

| Entity | ID | Fields |
|---|---|---|
| Studio | `std_gu` | `name: Text`, `craft: Text` (Gu embroidery, 顾绣), `city: Text` (Shanghai, 上海), `ownerId`, `makerIds`, `payoutLimitCents: 50000`, `nessieAccountId?` |
| Person | `own_01`, `mkr_01` to `mkr_03`, `buy_01` to `buy_20` | `role: "owner" \| "maker" \| "buyer"`, `name: Text`, `surnameChar` (one character, for the kit's `MakerMark`), `lang: "zh" \| "en"` |
| Piece | `pc_01` to `pc_12` | `title: Text`, `makerId`, `kind: "featured" \| "series"`, `hours`, `materialsCents`, `priceCents`, `story: Text`, `heritage: Text`, `process: { step: Text; hours: number }[]`, `image` (a path under `/images/`, a marked placeholder until Gordon supplies photos) |
| Channel | `ch_cindia`, `ch_site`, `ch_gallery` | `name: Text`, `kind: "marketplace" \| "own_site" \| "consignment"` |
| Contract | `ctr_gallery_01` | `channelId: "ch_gallery"`, `commissionBps: 4000`, `statementDay: 30`, `signedDate: "2026-03-02"`, `terms: Text` |
| Order | `ord_001` to `ord_030` | `channelId`, `pieceId`, `buyerId`, `date`, `grossCents`, `cardFeeCents`, `platformFeeCents`, `commissionCents`, `materialsCents`, `makerShareCents`, `status: "paid" \| "refunded"` |
| ChannelPayout | `pay_001` onward | `channelId`, `date`, `grossCents`, `feesCents`, `refundCents`, `netCents`, `orderIds`, `refundIds`, `monthId` |
| Refund | `rfd_001` | `orderId`, `date`, `amountCents`, `nettedInPayoutId` |
| Statement | `stm_gallery_2026_09` | `channelId`, `monthId`, `issuedDate`, `lines: { orderId; pieceId; saleCents; commissionBps; commissionCents; netCents }[]`, `totalSaleCents`, `totalCommissionCents`, `totalNetCents` |
| Purchase | `pur_001` onward | `date`, `supplier: Text`, `amountCents`, `memo`, `txnId` (materials bought for the month, paid out of the studio's account) |
| BankTxn | `txn_001` onward | `date`, `direction: "in" \| "out"`, `amountCents`, `counterparty: Text`, `memo`, `refId` (a `pay_`, `mpo_` or `pur_` ID), `nessieId?` |
| Match | `mat_001` onward | `kind: "one_to_one" \| "bundled" \| "refund_netted" \| "carried_over"`, `recordIds`, `monthId` |
| Flag | `flg_01` | `kind: "short_payment"`, `recordIds: [contractId, statementId, txnId]`, `expectedCents`, `actualCents`, `deltaCents`, `trustRecordId`, `explanation: Text` |
| MakerPayout | `mpo_01` to `mpo_03` | `makerId`, `monthId`, `amountCents`, `orderIds`, `heldCents`, `status: "proposed" \| "approved" \| "sent" \| "held"` |
| Approval | `apr_01`, `apr_02` | `kind: "follow_up" \| "maker_payouts"`, `subjectIds`, `proposedBy: "cindy"`, `amountCents?`, `overLimit: boolean`, `decisionDate: "2026-10-01"` (the date any grant or decline carries, so a tap never reads the wall clock), `status: "pending" \| "granted" \| "declined"` |
| FollowUp | `fup_01` | `approvalId`, `to: Text`, `subject: Text`, `body: Text` |
| LedgerEntry | `led_0001` onward | `date`, `account`, `debitCents`, `creditCents`, `refId`, `memo` |
| MakerStatement | `mst_01` to `mst_03` | `makerId`, `monthId`, `lines: { orderId; pieceId; makerShareCents }[]`, `totalCents`, `heldCents`, `payoutDate` |
| PlantedError | `err_01` to `err_04` | `kind`, `recordIds`, `expected` (what a correct matcher reports, used by the answer key) |
| Impact | `imp_2026_09` | `makerShareBps` (average over Cindia sales), `daysCloseToPayout`, `daysCloseToPayoutBefore`, `bookkeepingHoursSaved`, `estimate: true` |

IDs that live only in events: `mv_0001` onward for `money.moved` (in the order they fire), `acct_studio` for the studio's bank account in `account.synced`, `act_0001` onward for `agent.acted`, `ask_01` to `ask_03` for the canned Ask Cindy questions, `ask_user_1` onward for questions the owner types, `scn_01` for the judge's scenario and `scn_` record IDs inside it, and `beat` IDs from `demo-script.md`.

Ledger accounts: `cash`, `sales_cindia`, `sales_site`, `sales_gallery`, `card_fees`, `platform_fees`, `gallery_commission`, `materials`, `maker_pay`, `receivable_gallery`, `refunds`.

## Money rules

| Channel | Card fee | Platform fee | Commission | Maker share |
|---|---|---|---|---|
| `ch_cindia` | 290 bps of gross + 30 cents | 1000 bps of gross | none | gross − card fee − platform fee − materials |
| `ch_site` | 290 bps of gross + 30 cents | none | none | gross − card fee − materials |
| `ch_gallery` | none | none | `commissionBps` from the contract, on gross | gross − commission − materials |

- **Cindia settles each sale the same day,** net of its fees, into the studio's account. One payout per Cindia order.
- **The studio's own site** is paid by a card processor every few days, in bundles, net of fees and refunds.
- **The gallery** pays once a month, the amount on its statement.
- **Maker payouts** pay each maker's share for September orders whose money has arrived. Anything still owed to the studio is held and shown on the statement as held.

## The catalog

| ID | Title (en, zh) | Maker | Kind | Price | Hours | Materials |
|---|---|---|---|---|---|---|
| `pc_01` | Peony fan, 牡丹团扇 | `mkr_01` | featured | $180.00 | 26 | $22.00 |
| `pc_02` | Plum blossom bookmarks, 梅花书签 | `mkr_02` | series | $65.00 | 9 | $8.00 |
| `pc_03` | Koi pond panel, 锦鲤图 | `mkr_03` | featured | $1,200.00 | 160 | $95.00 |
| `pc_04` | Lotus at dawn, 晨荷图 | `mkr_01` | featured | $950.00 | 130 | $80.00 |
| `pc_05` | Orchid scroll, 兰花轴 | `mkr_02` | featured | $800.00 | 110 | $70.00 |
| `pc_06` | Sparrow on bamboo, 竹雀图 | `mkr_03` | featured | $450.00 | 60 | $45.00 |
| `pc_07` | Peony sachet, 牡丹香囊 | `mkr_02` | series | $48.00 | 6 | $6.00 |
| `pc_08` | Silk coasters, 丝绣杯垫 | `mkr_03` | series | $38.00 | 4 | $5.00 |
| `pc_09` | Crane brooch, 仙鹤胸针 | `mkr_01` | series | $120.00 | 14 | $12.00 |
| `pc_10` | Cloud pouch, 祥云荷包 | `mkr_03` | series | $85.00 | 10 | $9.00 |
| `pc_11` | Chrysanthemum fan, 菊花团扇 | `mkr_02` | featured | $175.00 | 24 | $21.00 |
| `pc_12` | Phoenix needle case, 凤凰针盒 | `mkr_01` | series | $95.00 | 11 | $10.00 |

The data-smith writes each piece's story, heritage line and process steps in both languages. Stories describe the craft plainly and never claim a real person made the piece.

## Demo-critical figures

G2 checks every one of these. Nothing else in the dataset may contradict them.

1. **The buyer's order** is `ord_001`: `ch_cindia`, `pc_01`, `buy_01`, `2026-09-01`, gross 18000. Card fee 552, platform fee 1800, materials 2200, maker share 13448. Cindia's same-day payout `pay_001` nets 15648.
2. **The concierge answer** to "a gift under $200 for my mom, she loves peonies" is `pc_01`, `pc_07`, `pc_11`, in that order.
3. **Thirty orders:** `ord_001` to `ord_012` on `ch_cindia`, `ord_013` to `ord_026` on `ch_site`, `ord_027` to `ord_030` on `ch_gallery`.
4. **The gallery's month:** `ord_027` to `ord_030` sell `pc_03`, `pc_04`, `pc_05` and `pc_06`, gross 340000 in total. The contract says 4000 bps, so the studio is owed 204000. The statement `stm_gallery_2026_09` charges 5000 bps on every line and totals 170000 net. The bank shows a deposit of exactly 170000 on `2026-09-30`. Short by 34000.
5. **The bundled payout:** one site payout covers exactly three orders, `ord_015`, `ord_016` and `ord_017`.
6. **The refund:** `ord_020` (`pc_12`, gross 9500) is refunded in full on `2026-09-21` as `rfd_001`, netted out of the next site payout.
7. **The late payout:** the site payout for `ord_025` and `ord_026` lands on `2026-10-02`, after the close, and carries into October.
8. **Maker payouts** `mpo_01` to `mpo_03` are proposed at the close and paid on `2026-10-02` once the owner approves. `mpo_01` includes the 13448 from `ord_001`. The gallery's missing 34000 is held: each maker's held share is their part of it, by the contract math.
9. **Approvals:** `apr_01` is the follow-up to the gallery about the 34000. `apr_02` is the batch of three maker payouts. Any single payout over 50000 is marked `overLimit`. Cindy proposes both and approves neither.
10. **The proof panel** scores 4 caught out of 4.

## Planted errors and the answer key

| ID | Kind | Records | A correct matcher reports |
|---|---|---|---|
| `err_01` | `short_payment` | `ctr_gallery_01`, `stm_gallery_2026_09`, the gallery's bank deposit | A flag: expected 204000, actual 170000, delta 34000, trust the contract |
| `err_02` | `bundled` | the bundled site payout, `ord_015`, `ord_016`, `ord_017` | One match of kind `bundled` covering all three orders |
| `err_03` | `refund_netted` | `rfd_001`, `ord_020`, the payout it's netted from | One match of kind `refund_netted` |
| `err_04` | `carried_over` | the late site payout, `ord_025`, `ord_026` | One match of kind `carried_over` into `2026-10` |

The answer key lives in `src/mock/answerKey.ts` and lists exactly these four. The matcher (scripted in Phase 1, real in B01) is scored against it.

## Files in `src/mock/`

| File | Holds |
|---|---|
| `people.ts` | The owner, makers and buyers, with fictional names |
| `catalog.ts` | The twelve pieces above, and `curatedSet` (`pc_01`, `pc_07`, `pc_11`), the scripted concierge answer |
| `channels.ts` | The three channels and the gallery contract |
| `month.ts` | Orders, payouts, refunds, purchases, the statement, bank transactions, ledger entries, maker payouts, approvals, the follow-up and maker statements for September |
| `answerKey.ts` | The four planted errors and the expected results |
| `ask.ts` | `cannedAnswers`: three canned Ask Cindy answers (`ask_01` to `ask_03`), the first for 这个月哪件作品最赚钱?, and `fallbackAnswer` for any other question in scripted mode |
| `impact.ts` | The impact numbers, marked as estimates |
| `scenario.ts` | One held-back statement for the judge's scenario (W2), not used in September's totals, `sampleFileName` and `sampleRecordIds` (its `scn_` record IDs, which the `scenario.loaded` request carries), and `scenarioReplies`: the events the scripted responder emits, with `at` as an offset from the request |
| `timelines/demo.ts` | The 60-second demo timeline, from `demo-script.md` |
| `timelines/month.ts` | The fast-forward month: every record arriving in date order, with Cindy's matches and the flag |
| `index.ts` | Re-exports everything, and a `getById()` lookup |
