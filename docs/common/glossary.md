# Glossary

Every agent loads this file through CLAUDE.md. It fixes what words mean and what the code calls them. If a word you need isn't here, use the closest one that is, and put the gap under `needs:` in your report.

## Build words

| Word | Meaning |
|---|---|
| stage | One step of the build: S0, S1, S2, W1, I1, W2+P2 and freeze for v1, then V0 to V4 and freeze for v2 |
| gate | The checks between stages, G0 to G6, plus G1b, G2b and G4v2 and the R0 and core checks, defined in `definition-of-done.md` |
| plan | One file in `docs/plans/` that says what to build for a stage, feature or upgrade |
| task | One row in a plan's Tasks table, owned by one builder, with its own files |
| lead | A feature-lead agent, which owns one feature plan |
| scripted mode | The site plays events from `src/mock/` timelines. No requests beyond localhost |
| live mode | An event source backed by the FastAPI server, which calls Claude, Nessie, Elastic, Apify or SpacetimeDB. It answers people's own requests, and the tour stays scripted |
| source | Something that emits events into the store: the scripted player, or one live adapter per upgrade |
| Simulated badge | The UI kit badge every panel shows while its events are scripted |
| cut | A feature or upgrade restored to its last green tag and listed as not built |
| green | Passed its gate, committed and tagged |
| tour | The guided 3-minute demo on `/demo`: three pitch cards, the buyer minute and the seller minute, then chapter 2 for questions. Always scripted |
| Phase A | The stretch between I2-shell and I2-tour, when v1's 60-second demo plays on the desktop shell through the camera mapping in `ui-contract.md` |
| migration | A plan (`M-<slug>`) that moves a v1 feature onto the desktop pages, keeping its folder |
| live twin | A live event that repeats a scripted one with only a field added, such as `nessieId` |
| page tag | The 6-character tag a page makes at load, which keeps a live run's IDs unique (`data-model.md`, ID scheme) |

## Domain words

Filled in during planning, one row per word: the word, its code name, the English label, the Chinese label, and a one-line meaning.

| Word | Code name | English label | Chinese label | Meaning |
|---|---|---|---|---|
| studio | `Studio`, `std_dine` | Co-op | 合作社 | The fictional Diné weaving and silver co-op the demo follows |
| maker | `Person` with `role: "maker"` | Maker | 匠人 | A fictional artisan who makes pieces: three in the co-op (`mkr_01` to `mkr_03`), seventeen in the catalog |
| owner | `Person` with `role: "owner"` | Co-op manager | 合作社负责人 | Runs the co-op's books and approves anything that moves money. Each community has one, its lead (`own_01` to `own_04`) |
| buyer | `Person` with `role: "buyer"` | Buyer | 买家 | Someone shopping for a piece. The demo's way in |
| Cindy | `agent.acted` | Cindy | Cindy | The AI agent that matches, flags, drafts and proposes. It never approves its own proposals |
| piece | `Piece` | Piece | 作品 | One item in the catalog |
| heritage | `Piece.heritage` | About the craft | 关于这门手艺 | One sourced line about the craft's history, never a meaning |
| concierge | `concierge.asked` | Gift finder | 选购助手 | The buyer's assistant that picks three pieces for a request |
| price split | `split.shown` | Where your money goes | 钱去哪儿了 | The price broken into maker share, materials, Cindia fee and card fee |
| maker share | `makerShareCents` | Maker share | 匠人所得 | What the maker earns from a sale after fees and materials |
| materials | `materialsCents` | Materials | 材料费 | Wool, silver and turquoise for a piece, paid back to the co-op |
| Cindia fee | `platformFeeCents` | Cindia fee | 平台费 | Cindia's 10% of a sale on its own marketplace |
| card fee | `cardFeeCents` | Card fee | 刷卡手续费 | The card network's 2.9% plus 30 cents |
| token | `card.tokenized` | Card token | 支付令牌 | What the card number turns into, so the number itself is never stored |
| receipt | `receipt.updated` | Receipt | 收据 | The buyer's record of the sale, which later shows the maker got paid |
| paid to the maker | `status: "paid_to_maker"` | Paid to the maker | 已付给匠人 | The receipt status once the maker's payout has gone out |
| money map | `money-map` | Money map | 资金流向图 | The picture of money moving between the buyer, Cindia, the co-op and the makers |
| month view | studio view `month` | Month | 本月 | The co-op view with the month's records, matches and flags |
| dashboard | studio view `dashboard` | Dashboard | 仪表盘 | The co-op view with the month's numbers at a glance |
| thread | kit `Thread` | Money flow | 资金线 | One movement of money, drawn as a running stitch |
| balance | `account.synced` | Balance | 账户余额 | What's in the co-op's bank account |
| payout | `ChannelPayout` | Payout | 结款 | Money a sales channel sends to the co-op |
| bundled payout | `kind: "bundled"` | Bundled payout | 合并结款 | One payout that covers several orders |
| refund netted | `kind: "refund_netted"` | Refund taken out | 退款已抵扣 | A refund subtracted from a later payout |
| carried over | `kind: "carried_over"` | Carried to next month | 结转下月 | A payout that lands after the close and counts in the next month |
| match | `Match` | Matched | 已核对 | A payout tied to the orders it pays for |
| consignment | `kind: "consignment"` | Consignment | 寄售 | The gallery sells the co-op's pieces and pays after the sale |
| contract | `Contract` | Contract | 合同 | The signed consignment terms, including the commission |
| commission | `commissionBps` | Commission | 佣金 | The gallery's cut of each sale, 40% by contract |
| statement | `Statement` | Statement | 对账单 | The gallery's monthly list of sales and what it says it owes |
| bank record | `BankTxn` | Bank record | 银行流水 | A deposit or withdrawal in the co-op's bank account |
| the catch | `Flag` with `kind: "short_payment"` | Short payment | 少付款 | Records that disagree: the gallery paid $340 less than the contract says |
| flag | `Flag` | Flag | 异常 | Something Cindy found that doesn't add up, with the evidence |
| evidence | kit `EvidenceCard` | Evidence | 证据 | The records Cindy puts side by side for a flag |
| trust | `trustRecordId` | Trust this record | 以此为准 | Which record Cindy says is right, and why |
| follow-up | `FollowUp` | Follow-up | 跟进邮件 | The message Cindy drafts to the gallery about the short payment |
| approval | `Approval` | Needs your approval | 待您批准 | Something Cindy proposed that only the owner can approve |
| approve | `approval.granted` | Approve | 批准 | The owner's yes. The seal lands on the item |
| seal | kit `Seal` | Sealed | 已盖章 | The owner's mark on an approved item |
| over limit | `overLimit` | Over your $500 limit | 超过500美元限额 | A single payout above $500, which always needs the owner |
| maker payout | `MakerPayout` | Maker payout | 匠人结算 | The co-op paying a maker their share for the month |
| held | `heldCents` | Held | 暂缓发放 | Money owed to a maker but kept back until the gallery pays what it owes |
| ledger | `LedgerEntry` | Ledger | 账本 | The co-op's books, one entry per money movement |
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
| card processor | `Party.kind: "processor"` | Card processor | 收单机构 | Who pays out the co-op website's card sales |
| supplier | `Party.kind: "supplier"` | Supplier | 供应商 | Where the co-op buys wool, silver and stones |
| gallery | `ch_gallery` | Gallery | 画廊 | The San Francisco gallery that sells on consignment |
| order | `Order` | Order | 订单 | One sale of one piece on one channel |
| refund | `Refund` | Refund | 退款 | Money given back to a buyer |
| Cindia | `ch_cindia`, `Party.kind: "cindia"` | Cindia | Cindia | The platform's own marketplace, as a sales channel and as a party in the money map |
| sales | `salesCents` | Sales | 销售额 | Gross of the month's orders, less refunds |
| fees | `feesCents` | Fees | 费用 | Card fees, Cindia fees and gallery commission, as charged |
| maker pay | `makerPayCents` | Maker pay | 匠人报酬 | The approved maker payouts for the month |
| platform | Cindia | Platform | 平台 | What Cindia is: it does the selling, the marketing and the books for makers. Never called an app |
| Native American | `kind: "native_american"` | Native American | 美洲原住民 | The makers Cindia starts with. Never "Indian American" |
| Diné (Navajo) | `com_dine` | Diné (Navajo) | 纳瓦霍（Diné） | The nation of the named co-op, on the Navajo Nation in Arizona |
| Ojibwe | `com_ojibwe` | Ojibwe | 奥吉布瓦（Ojibwe） | The nation of the beadwork co-op in Minnesota |
| Acoma Pueblo | `com_acoma` | Acoma Pueblo | 阿科马（Acoma） | The nation of the pottery studio in New Mexico |
| Seminole | `com_seminole` | Seminole | 塞米诺尔（Seminole） | The nation of the patchwork co-op in Florida |
| community | `Community` | Community | 社区 | A people's co-op or studio whose makers sell on Cindia |
| co-op | `std_dine` | Co-op | 合作社 | The Diné Weaving and Silver Co-op, v1's studio after R0 |
| demo data | `demo: true` | Demo data | 演示数据 | Fictional people and stories, labeled as such |
| demo verification | `demo` prop | Demo verification | 演示认证 | A verification line for a fictional maker. No real check was done |
| verification | `verification` | How makers would be verified | 匠人认证方式 | Who would attest that the maker belongs to the nation, and how |
| protocols | `protocols` | Kept out of this demo | 本演示未收录 | What Cindia's demo leaves out. In a real launch the community sets these rules |
| vibe search | `search` | Vibe search | 按感觉搜索 | Search by describing a feeling |
| keyword | chip | Keyword | 关键词 | A word Cindia's rule-based extractor picked out of the request, editable |
| why it matched | `reason` | Why it matched | 匹配原因 | The facets a result shares with the request |
| surprise me | `surprise` | Surprise me | 给我惊喜 | A random pick, in one of three ways |
| fair random | `fair_random` | Fair random | 公平随机 | A random pick that leans toward makers with fewer sales |
| project | `Project` | Community project | 社区项目 | Something a community raises money for |
| work in progress | `WorkInProgress` | Work in progress | 定制进行中 | A commission paid in stages |
| milestone | `milestoneId` | Milestone | 阶段 | One stage of a commission, paid when reached and approved |
| storefront | `Storefront` | Storefront | 店铺页面 | A community's own page at its own link |
| storefront builder | `storefront` | Storefront builder | 店铺搭建 | Blocks to arrange and edit a storefront. A preview |
| support | `support` | Help | 客服 | Questions answered by the agent swarm |
| agent swarm | `swarm` | Agent swarm | 智能体团队 | The small agents that each do one job |
| rule-based | `kind: "code"` | Rule-based | 规则程序 | An agent that is plain code, not a model |
| ask the maker | `question.forwarded` | Ask the maker | 问匠人 | A buyer's question the records can't answer, put to the maker on her page |
| the maker's own words | `question.answered` | In her own words | 匠人原话 | The maker's answer, shown exactly as she wrote it |
| listing | `ListingDraft` | New listing | 新作品上架 | A maker's new piece, drafted from their notes |
| counterfeit watch | `watch` | Counterfeit watch | 仿冒监测 | The scan of the sandbox market for copies of the co-op's pieces |
| text match | `similarity` | Text match | 文本相似度 | How close a found listing's title and snippet are to a piece's description. Not a picture match |
| possible copy | `verdict: "possible_copy"` | Possible copy | 疑似仿冒 | A result that names the co-op or a maker, copies a piece's story, or claims a verification it lacks |
| claim only | `verdict: "claim_only"` | Claims only | 仅有声明 | A result that claims to be Native-made with nothing Cindia can check |
| sandbox market | `/market/` | Sandbox market | 沙盒市场 | Static pages of fictional listings on the public site, the only place the watch crawls |
| process | `ProcessId` | How it works | 运行过程 | The process blocks and their views |
| the data view | `data` | Data | 数据 | The process view with the database's tables, their row counts and newest rows |
| presenter mode | `?mode=present` | Presenter mode | 演讲模式 | The tour pauses at the end of each beat, and Space or the right arrow plays the next |
| pitch card | `pitch` | Pitch card | 路演卡片 | One of the three full-screen cards that open the tour: what, why, how |
| live | `source: "live"` | Live | 实时 | Came from a real service in this run |
| model | `model` | Search model | 搜索模型 | Cindia's own embedding model |
| index | `IndexEntry` | Index | 索引 | What Cindia keeps about each piece to find it |
| test queries | `SearchQuery` | Test queries | 测试查询 | The 50 held-out queries the search model is scored on |
| community fund | `Party.kind: "community_fund"` | Community fund | 社区基金 | Where project contributions go, in full |

## On-screen labels

Short labels in English and Chinese, L1 to L30. Each owner copies both into its feature's `strings.ts` (the kit's into `src/ui/strings.ts`, the shell's into `src/app/strings.ts`) word for word, and Gordon checks the Chinese for L1, L4, L8 and L9 himself. L1 carries the site-wide truth, so the badges can stay small. Add no badges beyond these. A label renders inside the test ID its row names, and tests read it there.

| ID | English | Chinese | Where (test ID) | Owner |
|---|---|---|---|---|
| L1 | Demo. Every maker, community and story here is fictional. Nothing is for sale. | 演示版。这里的每位匠人、每个社区和每个故事都是虚构的。所有物品均不出售。 | The top bar's right side, small, on every page and in the tour (`shell-topnav`) | I2-shell |
| L2 | Demo: the Sell side is open so you can look around. In a real launch, only the co-op sees or approves anything here. | 演示：卖家后台对所有人开放，方便您浏览。正式上线后，只有合作社能查看或批准这里的内容。 | The Sell header, beside the co-op's name | I2-shell |
| L3 | Demo verification | 演示认证 | The start of the verification line on every `PieceCard` and result card from a `demo` community | I2-kit |
| L4 | Demo: this shows how verification would work. No real check was done. | 演示：这里展示认证将如何进行。并未做过真实核查。 | `buyer-verification`, `community-verification` | I2-kit, M-buyer, F-communities |
| L5 | Fictional maker and story, written by the Cindia team. | 虚构的匠人和故事，由 Cindia 团队撰写。 | The piece page, under the story, beside the Demo data badge (`buyer-story-card`) | M-buyer |
| L6 | This is the public demo. Nothing here can be bought. | 这是公开演示版。这里的物品都无法购买。 | The piece page, in place of Pay, on the public build only (`buyer-pay-blocked`) | M-buyer |
| L7 | Demo project. No money is collected. | 演示项目。不会收取任何款项。 | Beside every `project-fund-<projectId>` and `buyer-project-addon`, before the click | F-communities, M-buyer |
| L8 | Placeholder written by the Cindia team. In a real launch, the community writes this page. | 由 Cindia 团队撰写的占位内容。正式上线后，由社区自己撰写此页面。 | The community page's `about` box (`community-page`), the storefront's story block | F-communities, F-storefront |
| L9 | Kept out of this demo. In a real launch, the community sets these rules. For this demo, the Cindia team left these out. | 本演示未收录。正式上线后，由社区制定这些规则。本演示中，这些内容由 Cindia 团队排除在外。 | `community-protocols`: the first sentence is the title, the rest the line under it | F-communities, glossary |
| L10 | Demo receipt. Nothing was sold. | 演示收据。没有发生任何交易。 | The receipt for any `ord_user_` order (`buyer-receipt`) | M-buyer |
| L11 | AI agents answer here, using only Cindia's records. A person approves anything that moves money. | 这里由 AI 智能体回答，只使用 Cindia 的记录。任何涉及资金的操作都需由人批准。 | The top of `support-drawer`, both sides | F-support |
| L12 | Live: your question goes to Claude (Anthropic) to answer. Please don't type personal details. | 实时模式：您的问题将发送给 Claude（Anthropic）来回答。请不要输入个人信息。 | Under `support-input`, live mode only | F-support |
| L13 | Fictional storefront, made for a demo. | 虚构的店铺，为演示而制作。 | `store-footer`, after the preview line | F-storefront |
| L14 | Our records don't say, and I won't guess, so I'll ask Grace N. Her answer will show here in her own words. | 我们的记录里没有答案，我不会乱猜，所以我会去问 Grace N.。她的回答会以她自己的原话显示在这里。 | The reply (`support-reply`) when a meaning or authenticity question goes to the maker, with the piece's maker named | B14 Writer template, S3 T8 |
| L15 | The co-op attests that Grace N. wove this herself. That's the co-op's record. Cindia hasn't checked it independently. | 合作社证明这件作品由 Grace N. 亲手织成。这是合作社的记录。Cindia尚未独立核实。 | `run_01`'s reply (`support-reply`), and the pattern for every authenticity reply | S3 T8, B14 |
| L16 | In this demo, scripted answers cover the small grey, red and black wool weaving. Switch to Live to ask about this piece. | 在本演示中，脚本回答只涵盖灰红黑三色小幅羊毛编织。切换到实时模式即可询问这件作品。 | The fallback reply (`support-reply`) when the open piece isn't the run's piece | S3 T8 (`fallbackSupportRun`) |
| L17 | I can only look up the order on your screen. | 我只能查询您屏幕上的这笔订单。 | The buyer-side reply (`support-reply`) for any other order ID | B14 Clerk |
| L18 | Live steps are shared with every open screen in this demo. | 本演示中，实时步骤会同步给所有打开的屏幕。 | The swarm process view (`process-pane-swarm`), live mode | F-process |
| L19 | Text match 0.91. How close the listing's title and snippet are to this piece's description. Not a picture match. | 文本相似度 0.91。表示该商品的标题和摘要与这件作品描述的接近程度。不是图片比对。 | `watch-similarity-<cftId>`, the last two sentences as its hint. The number is 0.91 until the model's first run, then the computed number, read from the data | F-watch |
| L20 | Not verified by Cindia. That alone doesn't make it fake. | 未经 Cindia 认证。仅凭这一点不能说明它是假货。 | After the fairness line, in `watch-fairness` and in the approvals hit card | F-watch, M-approvals |
| L21 | Found on the sandbox market just now. Not checked by a person. | 刚刚在沙盒市场上发现。尚未经人工核查。 | Each live hit card (`watch-live-<cftId>`) | F-watch |
| L22 | Claims to be Native-made. We can't check that. | 声称是美洲原住民手作。我们无法核实。 | A claim-only result, which has no report button (`watch-claim-only-<n>`) | F-watch |
| L23 | Looks fine, dismiss | 看起来没问题，忽略 | The button beside `watch-report-<cftId>` (`watch-dismiss-<cftId>`) | F-watch |
| L24 | Nothing was sent. In this demo, reports never leave Cindia. | 什么都没有发送。在本演示中，举报永远不会离开 Cindia。 | `report_listing`'s "what happens next" after a grant | M-approvals |
| L25 | Cindy looks for listings that use the co-op's name or copy its words. The owner decides, and nothing is sent. | Cindy 会查找使用合作社名称或照搬其文字的商品。由店主决定，不会发送任何内容。 | The `d14-watch` narration | I2-tour |
| L26 | Names another community's craft. A maker lists only their own community's work. | 提到了其他社区的手艺。匠人只能上架自己社区的作品。 | The protocol check's note (`seller-listing-check-<checkId>`) when it fails for that reason | B14 Checker |
| L27 | Translated by the Lister agent. The maker hasn't checked this version. | 由上架智能体翻译。匠人尚未核对此版本。 | Beside the version the maker didn't write, in the approvals listing card and in `seller-listing-translated-<lang>` | M-approvals, F-seller-hub |
| L28 | 50 test queries over the same 54 fictional pieces, written separately by our data agent and never used for training. A small test, not a benchmark. | 50 条测试查询，覆盖同样的 54 件虚构作品，由我们的数据智能体另行编写，从未用于训练。这是一个小测试，不是基准评测。 | `search-proof`, `process-model-card`, the end card (`demo-end-card`) | F-search, F-process, I2-tour |
| L29 | Live means a real service answered in this run. Nessie is a sandbox bank, so no real money moved. | “实时”表示本次运行中由真实服务作答。Nessie 是沙盒银行，没有真实资金流动。 | The end card (`demo-end-card`), the money process view (`process-pane-money`) | I2-tour, F-process |
| L30 | Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them. | 这里的每个社区、每位匠人和每个故事都是虚构的。这些手艺是真实的传统。我们还没有与这些社区合作，正式上线将从与他们合作开始。 | The end card (`demo-end-card`), `README.md`, `docs/devpost/whats-real.md`, the Devpost | I2-tour, scribe |
