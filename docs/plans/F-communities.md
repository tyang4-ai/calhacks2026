# F-communities · Communities, projects and works in progress

Priority: P0 · Wave: V2 · Depends on: G1b, G2b · Folder: src/features/communities/ · Made real by: B08 (milestone releases)

SCOPE: src/features/communities/, tests/features/communities-*

## Goal
A judge meets the people behind the pieces: the four Native American communities on the platform. They are the Diné Weaving and Silver Co-op, the one the demo follows, an Ojibwe beadwork co-op, an Acoma pottery studio and a Seminole patchwork co-op. Each page says what the community makes, how its makers would be verified in a real launch, and what this demo keeps out of the catalog. Every one of them is fictional, and the pages say so plainly: the Cindia team wrote these placeholders, and in a real launch each community writes its own page and sets its own rules. From there a buyer can fund a community project, labeled as a demo that collects no money before anyone clicks, or follow a commission paid in stages. On the Sell side the co-op's manager sees what's been raised and releases a milestone only through an approval. Cindy proposes the release, and the owner's seal decides.

## Read first
- `docs/v2/fix-plan.md`:
  - section 1.1: the four communities, their IDs, makers, pieces, slugs and the words for them,
  - section 1.6: mock data only.
- `docs/v2/brief.md`: Shop (community pages, projects), Sell (projects and works in progress), cultural care
- `docs/v2/contracts.md`:
  - section 2: Community, Person (changed), Project, WorkInProgress, Storefront (`slug`), Approval kinds, figure 13, the communities table
  - section 3: `project.funded`, `wip.milestone_reached`, `wip.milestone_paid`, the money kinds and Party `community_fund`
  - section 4: routes `/shop/community/:communityId`, `/shop/projects`, `/shop/projects/:id`, `/sell/projects`, slots `shop.home.communities`, `shop.community.main`, `shop.projects.main`, `studio.projects.main`, SlotProps, the `community-`, `project-` and `wip-` test IDs
  - section 7: `CommunityCard`, `ProjectCard`, `MilestoneTimeline`, `VerificationLine` and `PieceCard` with their `demo` prop, `MakerMark`, `Badge` (Demo data)
  - section 9: the glossary rows
  - section 11: the Requests rows for a person's `wip.milestone_reached` and for a milestone grant, the ID scheme, `seekToEvent`
  - section 12: labels L4, L7, L8 and L9
- `docs/v2/reviews/A2-culture-trust.md`: findings 3, 4 and 21, rules R4 to R6 and R9, labels L4, L7, L8 and L9
- `docs/common/events.md` (after I2-core): the store, `userEvent()`, the Simulated rule, Requests from people
- `docs/common/data-model.md` (after I2-core): units and rounding (half up, once per line), the fixed decision date
- `docs/common/design-system.md` (after I2-core): words on screen, amounts through `Money`

## Interfaces
- **Reads data** with `getById()` and the `src/mock` exports `S3-catalog` names:
  - the four communities, in community order: `com_dine`, `com_ojibwe`, `com_acoma`, `com_seminole`,
  - their leads and makers (`name`, `surnameChar`, and `nativeName`, which stays unset in v2),
  - their pieces,
  - `projects` and `worksInProgress` with their milestones,
  - each community's storefront `slug`.
- **Reads events** through `useCindia()`, from the `projects`, `wip`, `approvals` and `agent` store keys:
  - `project.funded`, listed as a contribution. A project's raised amount is the mock's `raisedCents` plus the store's `addedCents` for it, which I2-core sums over distinct contribution IDs, so a replayed `project.funded` counts once (B1-44). This feature never adds amounts up as they arrive,
  - `wip.milestone_reached` and `wip.milestone_paid` (a milestone's status and the paid amount),
  - `approval.requested`, `approval.granted` and `approval.declined` (whether a release is waiting),
  - Cindy's newest `agent.acted` line on the Sell page.

  Also reads `sources`. A milestone's status is the newest of the mock's status and its events. The language comes from `SlotProps.lang`.
- **Reads props:** `SlotProps.communityId` on `shop.community.main`, and `SlotProps.projectId` on `shop.projects.main` (a `prj_` or a `wip_`, absent on the list).
- **Emits** with `userEvent()`:
  - `project.funded` (`contributionId` from the next `ctb_user_` number, `projectId`, `amountCents` the person picked, `buyerId: "buy_01"`, no `orderId`) on "Fund this project". It's applied directly, with no answer.
  - On the Sell side, `wip.milestone_reached` (`wipId`, `milestoneId`, `date: "2026-10-01"`) on `wip-release-<milestoneId>`. The registry's scripted answer is Cindy's proposal: `agent.acted` plus `approval.requested` `apr_05` for `wip_01`'s second milestone, `mls_02`.
- **Navigates** with the `src/core/nav.ts` helpers: a community card to its page, a piece card to its piece page, a project card to its project page, and the storefront link to `/store/:slug`.
- **Exports:** `src/features/communities/index.ts` default-exports `{ id: "communities", slots: { "shop.home.communities": CommunityStrip, "shop.community.main": CommunityPage, "shop.projects.main": ProjectsView, "studio.projects.main": SellProjects } }`.
- **Source keys on the badge:**
  - `shop.projects.main` and `studio.projects.main` declare `b08-approvals`.
  - The strip and the community page declare none, so they show no Simulated badge. They do show the kit's Demo data badge, because every community is fictional.
- **Test IDs from the contract:** `community-card-<communityId>`, `community-page`, `community-verification`, `community-protocols`, `project-card-<projectId>`, `project-progress-<projectId>`, `project-fund-<projectId>`, `wip-milestone-<milestoneId>`, `wip-release-<milestoneId>`.
- **Internal test IDs:**
  - `communities-strip`,
  - `communities-about-note`: L8 under the about box,
  - `communities-protocols-note`: the rest of L9, under the protocols' title,
  - `communities-makers`, `communities-maker-<makerId>`,
  - `communities-pieces`,
  - `communities-storefront-link`,
  - `communities-amount-<cents>`: the picker's amounts 500, 1000 and 2500,
  - `communities-fund-note-<projectId>`: L7 beside the fund button,
  - `communities-thanks`,
  - `communities-list`: the projects page without an ID,
  - `communities-wip-page`,
  - `communities-sell`,
  - `communities-contributions`,
  - `communities-cindy-note`.
- **Labels from the glossary:** community, the communities' kind label (Native American, 美洲原住民), demo data, how makers are verified, community project, work in progress, milestone, storefront, needs your approval, approved, paid, maker. From contracts section 12: L4, which the kit's `VerificationLine` prints with `demo`, and L7, L8 and L9. L9's first sentence is the protocols' title, in place of the glossary's old "What we don't sell".

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings and the spec helper (lead): every short string these screens need that the glossary lacks, English and Chinese side by side, with L7, L8 and L9 as contracts section 12 words them. Gordon checks the Chinese of L8 and L9 himself (A2), so the file marks them. Then `communities-lib.ts` (below) | src/features/communities/strings.ts, tests/features/communities-lib.ts | none | lead |
| T1 | The communities strip on Shop home | src/features/communities/CommunityStrip.tsx, tests/features/communities-strip.spec.ts | T0 | sonnet |
| T2 | The community page | src/features/communities/CommunityPage.tsx, tests/features/communities-page.spec.ts | T0 | opus |
| T3 | The project model and funding a project | src/features/communities/projectModel.ts, src/features/communities/FundProject.tsx, tests/features/communities-fund.spec.ts | T0 | opus |
| T4 | A work in progress and its milestones | src/features/communities/WipTimeline.tsx, tests/features/communities-wip.spec.ts | T3 (`projectModel.ts`) | sonnet |
| T5 | Sell › Projects: raised, contributions, releasing a milestone | src/features/communities/SellProjects.tsx, tests/features/communities-sell.spec.ts | T3, T4 | opus |
| T6 | Assemble the projects route and fill the slots (lead) | src/features/communities/ProjectsView.tsx, src/features/communities/index.ts, tests/features/communities-flow.spec.ts | T1 to T5 | lead |

**How the tasks fit:** the lead writes T0 before spawning any builder. T3's `projectModel.ts` is the one place that merges the mock with the store (raised amounts, contributions, milestone statuses and amounts), and T4 and T5 import it. T5 reuses T4's `WipTimeline` without editing it. Builders run `npm run check:scope` on their files and write their spec, which imports `communities-lib.ts`. The specs run for the first time once T6 fills the slots, and the lead sends any failure back to the builder who owns the file.

**T0's spec helper.** `communities-lib.ts` re-exports `seekToEvent(page, type, match, offsetMs)` from `tests/smoke/lib.ts` and never copies it (contracts section 11). It adds `tourEvent(page, type, match, offsetMs, seed)`, which seeks to the tour's `project.funded` `ctb_01` once the timeline holds it (after I2-tour), and until then pauses the player and emits `demoContribution`, figure 13's contribution from `src/mock/projects.ts`, with `window.__cindia.emit()`. It never seeks to a fixed time.

**T1.** `CommunityStrip` (`communities-strip`) is a row of four kit `CommunityCard`s (`community-card-<communityId>`) in community order:
- the community's name, people and place, and its craft,
- its kind label, as a word,
- the Demo data badge,
- a link to the projects page.

A card navigates to the community's page. The four fit the 1440 px page width in one row.

**T2.** `CommunityPage` (`community-page`) for `SlotProps.communityId`:
- **Top:** the name, people, place and craft, the kind label, and the Demo data badge.
- **The about box:** `about` in the slot's language, in a placeholder box. It's never set as a quote or as the community's own words, because no community wrote it (A1-5, A2-4). The data holds two plain third-person sentences about the craft and what the community makes (A2 R4). `communities-about-note` under it reads L8: "Placeholder written by the Cindia team. In a real launch, the community writes this page."
- **`community-verification`:** the kit `VerificationLine` with the method, who would attest, and the note, with `demo={community.demo}`, so it starts with L3 and shows L4 under it: "Demo: this shows how verification would work. No real check was done." For the Diné co-op, the note says a real launch would have the Navajo Nation's own enrollment or certification under the Indian Arts and Crafts Act, keep only a yes or no, and that no real check was done for this demo (A2 R6).
- **`community-protocols`:** titled with L9's first sentence, "Kept out of this demo." Under the title, `communities-protocols-note` reads the rest of L9: "In a real launch, the community sets these rules. For this demo, the Cindia team left these out." Then each protocol, plainly. They are Cindia's demo exclusions (A2 R5), and the page never phrases one as the community's own rule or belief.
- **`communities-makers`:** each maker (`communities-maker-<makerId>`) with their `MakerMark` and name, a common English given name and a family initial such as Grace N. (A2 R9). A `nativeName` shows only if a community gave one, and it's never a machine translation.
- **`communities-pieces`:** a grid of `PieceCard`s with `demo={community.demo}`, so each verification line starts with L3. They open the piece page.
- The community's project as a `ProjectCard`.
- **`communities-storefront-link`:** goes to `/store/<slug>`.

An unknown ID shows a short "community not found" note and a link back to Shop.

**T3.** `projectModel.ts` exports pure selectors:
- a project's raised amount (the mock's `raisedCents` plus the store's `addedCents`) and its contributions in order,
- a work in progress's milestones with their status, their amount (`priceCents × shareBps / 10000`, rounded half up, once per milestone), and whether a release approval for one is pending, granted or declined.

`FundProject` is the project page's funding block:
- the kit `ProjectCard` (`project-card-<projectId>`) with `project-progress-<projectId>` (raised against goal, through `Money`),
- the amount picker (`communities-amount-500`, `communities-amount-1000`, `communities-amount-2500`, with 500 picked first, the project's `addOnCents`),
- `communities-fund-note-<projectId>` beside the button, before any click, reading L7: "Demo project. No money is collected." (A2-21),
- `project-fund-<projectId>`, which emits `project.funded` as above.

A short thank-you line (`communities-thanks`) follows, and the progress rises from the store. It repeats plainly that the demo moves no real money.

**T4.** `WipTimeline` (`communities-wip-page`) shows a work in progress for a `wipId` with the kit `MilestoneTimeline`:
- the commission's title, maker and price,
- each milestone (`wip-milestone-<milestoneId>`) with its label, its share and amount, and its status (pending, reached, waiting for approval, paid with its date).

It takes a `mode` prop. Shop mode is read-only. Sell mode shows a release button (`wip-release-<milestoneId>`) on one milestone only: the first pending one, when every milestone before it is paid. S3 gives `wip_01` `mls_01` paid, `mls_02` pending and `mls_03` pending (B1-12), so the button starts on `mls_02`.

**T5.** `SellProjects` (`communities-sell`) is Sell › Projects for the Diné co-op (`com_dine`), since the Sell site is the co-op's, inside one kit `Panel` that declares `b08-approvals`:
- the co-op's project with `project-progress-prj_01`,
- the list of contributions (`communities-contributions`), each with its ID, amount and order when it came with one,
- the co-op's works in progress through `WipTimeline` in Sell mode.

Pressing `wip-release-<milestoneId>` emits `wip.milestone_reached` as above. The milestone shows reached, then "needs your approval" once `apr_05` is in the store, with Cindy's newest `agent.acted` line in `communities-cindy-note`. When the owner grants it on Sell › Approvals and the `wip.milestone_paid` arrives, the milestone shows paid with its amount, and the button moves to the next pending milestone.

**T6.** `ProjectsView` reads `SlotProps.projectId`:
- without one, it lists every project's `ProjectCard` and every work in progress (`communities-list`),
- with a `prj_` ID, it shows the project's summary, its updates and `FundProject`,
- with a `wip_` ID, it shows `WipTimeline` in Shop mode.

It's all inside one `Panel` that declares `b08-approvals`. `index.ts` exports the module. `communities-flow.spec.ts` walks home to a community to its project and funds it.

## Acceptance
Specs open the route named and check by test ID only. Expected values come from `src/mock/`, not typed in. A spec reaches the tour's `project.funded` `ctb_01` with `tourEvent()` from `communities-lib.ts`: it seeks there with `seekToEvent(page, type, match, offsetMs)` once the timeline holds it (after I2-tour), and until then it emits `demoContribution` from `src/mock/`. No spec seeks to a fixed time. A scripted answer to a person counts as arrived when it shows within Playwright's default expect timeout, never inside a wall-clock window (B1-27).

1. **Given** `/shop`, **then** `communities-strip` shows four `community-card-<communityId>` in community order, `com_dine`, `com_ojibwe`, `com_acoma` and `com_seminole`, each with its kind label and the Demo data badge.
2. **When** a person clicks `community-card-com_ojibwe`, **then** the page is `/shop/community/com_ojibwe`, and:
   - `community-page` shows its about text in the placeholder box, with `communities-about-note` (L8),
   - `community-verification` shows its method and note, with L4,
   - `community-protocols` is titled "Kept out of this demo.", shows `communities-protocols-note` and lists each protocol,
   - `communities-makers` shows `mkr_04` to `mkr_08`, and `communities-pieces` shows `pc_13` to `pc_26`,
   - `communities-storefront-link` points to `/store/ojibwe-beadwork`.
3. **Given** `/shop/community/com_dine`, **then** `community-page` shows the co-op's name and people as the data writes them, `communities-makers` shows `mkr_01` to `mkr_03` with Grace N. among them, `communities-pieces` shows `pc_01` to `pc_12`, `community-verification` shows the co-op's note, which ends "No real check was done for this demo.", with L4 under it, and the page's text never contains "Indian American".
4. **Given** `/shop/projects`, **then** `communities-list` shows `project-card-prj_01` to `project-card-prj_04` and every work in progress in `src/mock/`, and each `project-progress-<projectId>` shows raised against goal.
5. **Given** `/shop/projects/prj_01` on a fresh store, **then** `communities-fund-note-prj_01` shows L7 beside `project-fund-prj_01` before any click. **When** a person picks `communities-amount-1000` and presses `project-fund-prj_01`, **then** the store holds a `project.funded` with `source: "user"`, `contributionId: "ctb_user_1"`, `amountCents: 1000` and `buyerId: "buy_01"`, `project-progress-prj_01` rises by $10.00, and `communities-thanks` shows.
6. **Given** the tour's `project.funded` `ctb_01` (500 for `prj_01`), **then** `project-progress-prj_01` includes it once, even after a second seek to the same event, and on `/sell/projects` `communities-contributions` lists `ctb_01` at $5.00 with `ord_001`.
7. **Given** `/shop/projects/wip_01`, **then** `communities-wip-page` shows one `wip-milestone-<milestoneId>` per milestone, `mls_01` paid and `mls_02` and `mls_03` pending, and their amounts add up to the commission's price.
8. **When** on `/sell/projects` the owner presses `wip-release-mls_02`, **then** the store holds a `wip.milestone_reached` with `source: "user"`, `milestoneId: "mls_02"` and date `2026-10-01`, and no milestone shows a release button. Once `apr_05` arrives, `mls_02` shows "needs your approval", and `communities-cindy-note` shows Cindy's proposal.
9. **Given** `apr_05` granted (the owner's `approval.granted` emitted) and the `wip.milestone_paid` that answers it arrived, **then** `mls_02` shows paid with its amount on both `/sell/projects` and `/shop/projects/wip_01`, and `wip-release-mls_03` shows on `/sell/projects`.
10. **Given** scripted mode, **then** `/sell/projects` and the projects pages show `simulated-badge`, and the strip and community pages don't.
11. **Given** `demo-lang-toggle` set to Chinese, **then** the community text, L4, L7, L8 and L9, the protocols, the project text and the milestone labels show their Chinese text, the kind label reads 美洲原住民, and amounts are still dollars.

## Out of scope
- Moving real money, accounts or payment details. Funding is a demo event.
- The checkout add-on at the piece page. That's `buyer-project-addon` in the buyer migration (`M-buyer`).
- Granting or declining the release. The approvals feature does that on Sell › Approvals.
- Editing a community's page or its rules. In a real launch the community writes both.
- The storefront pages. The storefront feature owns `/store/:slug`.

## Contract additions needed
Settled in contracts sections 2, 9 and 11, I2-core and S3, listed so a builder knows where each lives. Nothing is still open:
- **Requests rows (I2-core T8):**
  - `wip.milestone_reached` from a person goes to key `b08-approvals`. The scripted answer is an `agent.acted` (a proposal) plus `approval.requested` `apr_05` when the milestone is `wip_01`'s second. For any other milestone it's only an `agent.acted` line saying scripted mode proposes the demo release.
  - `approval.granted` for a `milestone_release` approval gets the scripted answer `wip.milestone_paid` plus a `money.moved` of kind `milestone`, Cindia to the maker, dated `2026-10-02`.
- **A person's `wip.milestone_reached`** carries `date: "2026-10-01"`, the same fixed demo date approvals use, so a tap never reads the wall clock.
- **`wip_01` belongs to `com_dine`**, its maker is one of `mkr_01` to `mkr_03`, and its milestones start as `mls_01` paid, `mls_02` pending and `mls_03` pending (S3 T7, B1-12), so Sell › Projects, the co-op's, can release `mls_02`.
- **`addedCents`** is the sum of a project's contributions, never a running increment (I2-core T3, B1-44).
- **The `src/mock` exports this plan reads:** `communities`, `projects`, `worksInProgress`, `storefronts`, `demoContribution`, plus `getById()` for `com_`, `prj_`, `wip_` and `sto_` IDs (S3-catalog).
- **`src/core/nav.ts` route builders** for the community, projects, piece and storefront routes (I2-core).
- **Contribution ID prefix** `ctb_user_<n>` for a person's contributions. The tour uses `ctb_01`.
- **`seekToEvent(page, type, match, offsetMs)`** in `tests/smoke/lib.ts` (I2-shell T5).
- **The glossary rows:** `protocols` reads L9's title, "Kept out of this demo" (本演示未收录), and the kind label reads Native American, 美洲原住民 (contracts section 9, fix-plan 1.1).
- **Figure 13's contribution** `ctb_01` is the `src/mock/projects.ts` export `demoContribution`, beside `demoFundMoves`, so specs can emit it before I2-tour and the tour builds its event from it (contracts sections 2 and 11, D1-38).
