# Glossary

Every agent loads this file through CLAUDE.md. It fixes what words mean and what the code calls them. If a word you need isn't here, use the closest one that is, and put the gap under `needs:` in your report.

## Build words

| Word | Meaning |
|---|---|
| stage | One step of the build: S0, S1, S2, W1, I1, W2+P2, freeze |
| gate | The checks between stages, G0 to G6, defined in `definition-of-done.md` |
| plan | One file in `docs/plans/` that says what to build for a stage, feature or upgrade |
| task | One row in a plan's Tasks table, owned by one builder, with its own files |
| lead | A feature-lead agent, which owns one feature plan |
| scripted mode | The app plays events from `src/mock/` timelines. No requests beyond localhost |
| live mode | An event source backed by the FastAPI server, which calls Claude or Nessie |
| source | Something that emits events into the store: the scripted player, or one live adapter per upgrade |
| Simulated badge | The UI kit badge every panel shows while its events are scripted |
| cut | A feature or upgrade restored to its last green tag and listed as not built |
| green | Passed its gate, committed and tagged |

## Domain words

Filled in during planning, one row per word: the word, its code name, the English label, the Chinese label, and a one-line meaning.

| Word | Code name | English label | Chinese label | Meaning |
|---|---|---|---|---|
| studio | `Studio`, `std_gu` | Studio | 工作室 | The Gu embroidery workshop the demo follows |
| maker | `Person` with `role: "maker"` | Maker | 匠人 | One of the three artisans who make the pieces |
| owner | `Person` with `role: "owner"` | Studio owner | 主理人 | Runs the studio and approves anything that moves money |
| buyer | `Person` with `role: "buyer"` | Buyer | 买家 | Someone shopping for a piece. The demo's way in |
| Cindy | `agent.acted` | Cindy | Cindy | The AI agent that matches, flags, drafts and proposes. It never approves its own proposals |
| piece | `Piece` | Piece | 作品 | One item in the catalog |
| heritage | `Piece.heritage` | Heritage | 非遗 | The craft's place on China's intangible cultural heritage list |
| concierge | `concierge.asked` | Gift finder | 选购助手 | The buyer's assistant that picks three pieces for a request |
| price split | `split.shown` | Where your money goes | 钱去哪儿了 | The price broken into maker share, materials, Cindia fee and card fee |
| maker share | `makerShareCents` | Maker share | 匠人所得 | What the maker earns from a sale after fees and materials |
| materials | `materialsCents` | Materials | 材料费 | Silk, thread and backing for a piece, paid back to the studio |
| Cindia fee | `platformFeeCents` | Cindia fee | 平台费 | Cindia's 10% of a sale on its own marketplace |
| card fee | `cardFeeCents` | Card fee | 刷卡手续费 | The card network's 2.9% plus 30 cents |
| token | `card.tokenized` | Card token | 支付令牌 | What the card number turns into, so the number itself is never stored |
| receipt | `receipt.updated` | Receipt | 收据 | The buyer's record of the sale, which later shows the maker got paid |
| paid to the maker | `status: "paid_to_maker"` | Paid to the maker | 已付给匠人 | The receipt status once the maker's payout has gone out |
| money map | `money-map` | Money map | 资金流向图 | The picture of money moving between the buyer, Cindia, the studio and the makers |
| month view | studio view `month` | Month | 本月 | The studio view with the month's records, matches and flags |
| dashboard | studio view `dashboard` | Dashboard | 仪表盘 | The studio view with the month's numbers at a glance |
| thread | kit `Thread` | Money flow | 资金线 | One movement of money, drawn as a running stitch |
| balance | `account.synced` | Balance | 账户余额 | What's in the studio's bank account |
| payout | `ChannelPayout` | Payout | 结款 | Money a sales channel sends to the studio |
| bundled payout | `kind: "bundled"` | Bundled payout | 合并结款 | One payout that covers several orders |
| refund netted | `kind: "refund_netted"` | Refund taken out | 退款已抵扣 | A refund subtracted from a later payout |
| carried over | `kind: "carried_over"` | Carried to next month | 结转下月 | A payout that lands after the close and counts in the next month |
| match | `Match` | Matched | 已核对 | A payout tied to the orders it pays for |
| consignment | `kind: "consignment"` | Consignment | 寄售 | The gallery sells the studio's pieces and pays after the sale |
| contract | `Contract` | Contract | 合同 | The signed consignment terms, including the commission |
| commission | `commissionBps` | Commission | 佣金 | The gallery's cut of each sale, 40% by contract |
| statement | `Statement` | Statement | 对账单 | The gallery's monthly list of sales and what it says it owes |
| bank record | `BankTxn` | Bank record | 银行流水 | A deposit or withdrawal in the studio's bank account |
| the catch | `Flag` with `kind: "short_payment"` | Short payment | 少付款 | Records that disagree: the gallery paid $340 less than the contract says |
| flag | `Flag` | Flag | 异常 | Something Cindy found that doesn't add up, with the evidence |
| evidence | kit `EvidenceCard` | Evidence | 证据 | The records Cindy puts side by side for a flag |
| trust | `trustRecordId` | Trust this record | 以此为准 | Which record Cindy says is right, and why |
| follow-up | `FollowUp` | Follow-up | 跟进邮件 | The message Cindy drafts to the gallery about the short payment |
| approval | `Approval` | Needs your approval | 待您批准 | Something Cindy proposed that only the owner can approve |
| approve | `approval.granted` | Approve | 批准 | The owner's yes. The seal lands on the item |
| seal | kit `Seal` | Sealed | 已盖章 | The owner's mark on an approved item |
| over limit | `overLimit` | Over your $500 limit | 超过500美元限额 | A single payout above $500, which always needs the owner |
| maker payout | `MakerPayout` | Maker payout | 匠人结算 | The studio paying a maker their share for the month |
| held | `heldCents` | Held | 暂缓发放 | Money owed to a maker but kept back until the gallery pays what it owes |
| ledger | `LedgerEntry` | Ledger | 账本 | The studio's books, one entry per money movement |
| close | `month.closed` | Close the month | 月结 | Cindy finishes the month's books and proposes maker payouts |
| workbook | `workbook.ready` | Excel report | Excel报表 | The month's books as a real .xlsx file |
| maker statement | `MakerStatement` | This month's income | 本月收入 | A maker's monthly list of pieces sold, their share and the payout date |
| proof panel | `proof` | Proof | 验证 | The planted-error test and its score |
| planted error | `PlantedError` | Test case | 测试用例 | A known problem hidden in the month's records to test the matcher |
| score | `proof.scored` | Caught 4 of 4 | 识别4/4 | How many planted errors the matcher caught |
| impact | `Impact` | Impact | 影响 | What Cindia changes for the makers, in numbers |
| days to payout | `daysCloseToPayout` | Days from close to payout | 月结到发放天数 | How long makers wait after the month closes |
| hours saved | `bookkeepingHoursSaved` | Bookkeeping hours saved | 节省记账小时 | The owner's time back each month. An estimate |
| estimate | `estimate: true` | Estimate | 估算 | A number Cindia doesn't measure yet, shown as such |
| Ask Cindy | `ask-cindy` | Ask Cindy | 问Cindy | The owner's question box, answered with a card or a chart |
| audit trail | `audit` | Where this number comes from | 数字来源 | The chain from a number back to its record, rule or person |
| hours of work | `Piece.hours` | Hours of work | 工时 | How long the maker spent on a piece |
| simulated checkout | `checkout.started` | Demo checkout, no real charge | 演示结账，不会扣款 | The checkout is simulated, and the screen says so |
| received | `status: "received"` | Received | 已收款 | The receipt status right after the sale |
| proposed by Cindy | `proposedBy: "cindy"` | Cindy proposed this. Only you can approve it. | Cindy提议，只有您能批准 | Shown on every approval |
| decline | `approval.declined` | Decline | 不批准 | The owner's no, with a reason |
| declined | `status: "declined"` | Declined | 未批准 | An approval the owner turned down |
| approved | `status: "granted"` | Approved | 已批准 | An approval the owner sealed |
| sent | `followup.sent`, `payout.sent` | Sent | 已发送 | A follow-up or payout that went out after approval |
| held note | `heldCents` | Held until the gallery pays what it owes | 待画廊补齐欠款后发放 | Why part of a maker's share is held |
| payout date | `payoutDate` | Payout date | 发放日期 | When the maker's money goes out |
| paid | `status: "sent"` | Paid | 已发放 | A maker payout that went out |
| no sales yet | empty statement | No sales this month yet | 本月暂无销售 | A maker statement with no lines |
| card network | `Party.kind: "card_network"` | Card network | 卡组织 | Who takes the card fee |
| card processor | `Party.kind: "processor"` | Card processor | 收单机构 | Who pays out the studio site's card sales |
| supplier | `Party.kind: "supplier"` | Supplier | 供应商 | Where the studio buys silk and thread |
| gallery | `ch_gallery` | Gallery | 画廊 | The San Francisco gallery that sells on consignment |
| order | `Order` | Order | 订单 | One sale of one piece on one channel |
| refund | `Refund` | Refund | 退款 | Money given back to a buyer |
| Cindia | `ch_cindia`, `Party.kind: "cindia"` | Cindia | Cindia | The marketplace, as a sales channel and as a party in the money map |
| sales | `salesCents` | Sales | 销售额 | Gross of the month's orders, less refunds |
| fees | `feesCents` | Fees | 费用 | Card fees, Cindia fees and gallery commission, as charged |
| maker pay | `makerPayCents` | Maker pay | 匠人报酬 | The approved maker payouts for the month |
