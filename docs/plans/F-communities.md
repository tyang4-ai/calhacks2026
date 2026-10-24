# F-communities · Communities, projects and works in progress

Priority: P0 · Wave: V2 · Depends on: G1b, G2b · Folder: src/features/communities/ · Made real by: B08 (milestone releases)

SCOPE: src/features/communities/, tests/features/communities-*

## Goal
A judge meets the people behind the pieces: eight communities, seven Indigenous and the Gu studio as heritage, each telling who they are, how their makers are verified and what they won't sell. From there a buyer can fund a community project (an apprentice stipend, a weaving school) or follow a commission paid in stages. On the Sell side the owner sees what's been raised and releases a milestone only through an approval. Cindy proposes the release, the owner's seal decides.

## Read first
- `docs/v2/brief.md`: Shop (community pages, projects), Sell (projects and works in progress), cultural care
- `docs/v2/contracts.md`:
  - section 2: Community, Person (changed), Project, WorkInProgress, Storefront (`slug`), Approval kinds, figure 13, the communities table
  - section 3: `project.funded`, `wip.milestone_reached`, `wip.milestone_paid`, the money kinds and Party `community_fund`
  - section 4: routes `/shop/community/:communityId`, `/shop/projects`, `/shop/projects/:id`, `/sell/projects`, slots `shop.home.communities`, `shop.community.main`, `shop.projects.main`, `studio.projects.main`, SlotProps, the `community-`, `project-` and `wip-` test IDs
  - section 7: `CommunityCard`, `ProjectCard`, `MilestoneTimeline`, `VerificationLine`, `PieceCard`, `MakerMark`, `Badge` (Demo data)
  - section 9: the glossary rows
- `docs/common/events.md` (after I2-core): the store, `userEvent()`, the Simulated rule, Requests from people
- `docs/common/data-model.md` (after I2-core): units and rounding (half up, once per line), the fixed decision date
- `docs/common/design-system.md` (after I2-core): words on screen, amounts through `Money`

## Interfaces
- **Reads data** with `getById()` and the `src/mock` exports `S3-catalog` names:
  - the eight communities, in community order,
  - their leads and makers (`name`, `surnameChar`, `nativeName`),
  - their pieces,
  - `projects` and `worksInProgress` with their milestones,
  - each community's storefront `slug`.
- **Reads events** through `useCindia()`, from the `projects`, `wip`, `approvals` and `agent` store keys:
  - `project.funded` (added to a project's raised amount and listed as a contribution),
  - `wip.milestone_reached` and `wip.milestone_paid` (a milestone's status and the paid amount),
  - `approval.requested`, `approval.granted` and `approval.declined` (whether a release is waiting),
  - Cindy's newest `agent.acted` line on the Sell page.
  
  Also reads `sources`. A project's raised amount is the mock's `raisedCents` plus every `project.funded` for it in the store. A milestone's status is the newest of the mock's status and its events. The language comes from `SlotProps.lang`.
- **Reads props:** `SlotProps.communityId` on `shop.community.main`, and `SlotProps.projectId` on `shop.projects.main` (a `prj_` or a `wip_`, absent on the list).
- **Emits** with `userEvent()`:
  - `project.funded` (`contributionId` from the next `ctb_user_` number, `projectId`, `amountCents` the person picked, `buyerId: "buy_01"`, no `orderId`) on "Fund this project". It's applied directly, with no answer.
  - On the Sell side, `wip.milestone_reached` (`wipId`, `milestoneId`, `date: "2026-10-01"`) on `wip-release-<milestoneId>`. The registry's scripted answer is Cindy's proposal: `agent.acted` plus `approval.requested` `apr_05` for `wip_01`'s second milestone.
- **Navigates** with the `src/core/nav.ts` helpers: a community card to its page, a piece card to its piece page, a project card to its project page, and the storefront link to `/store/:slug`.
- **Exports:** `src/features/communities/index.ts` default-exports `{ id: "communities", slots: { "shop.home.communities": CommunityStrip, "shop.community.main": CommunityPage, "shop.projects.main": ProjectsView, "studio.projects.main": SellProjects } }`.
- **Source keys on the badge:**
  - `shop.projects.main` and `studio.projects.main` declare `b08-approvals`.
  - The strip and the community page declare none, so they show no Simulated badge. They do show the kit's Demo data badge, because every community is fictional.
- **Test IDs from the contract:** `community-card-<communityId>`, `community-page`, `community-verification`, `community-protocols`, `project-card-<projectId>`, `project-progress-<projectId>`, `project-fund-<projectId>`, `wip-milestone-<milestoneId>`, `wip-release-<milestoneId>`.
- **Internal test IDs:**
  - `communities-strip`,
  - `communities-makers`, `communities-maker-<makerId>`,
  - `communities-pieces`,
  - `communities-storefront-link`,
  - `communities-amount-<cents>`: the picker's amounts 500, 1000 and 2500,
  - `communities-thanks`,
  - `communities-list`: the projects page without an ID,
  - `communities-wip-page`,
  - `communities-sell`,
  - `communities-contributions`,
  - `communities-cindy-note`.
- **Labels from the glossary:** community, Indigenous, heritage, demo data, how makers are verified, what we don't sell, community project, work in progress, milestone, storefront, needs your approval, approved, paid, maker.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): every short string these screens need that the glossary lacks, English and Chinese side by side | src/features/communities/strings.ts | none | lead |
| T1 | The communities strip on Shop home | src/features/communities/CommunityStrip.tsx, tests/features/communities-strip.spec.ts | T0 | sonnet |
| T2 | The community page | src/features/communities/CommunityPage.tsx, tests/features/communities-page.spec.ts | T0 | opus |
| T3 | The project model and funding a project | src/features/communities/projectModel.ts, src/features/communities/FundProject.tsx, tests/features/communities-fund.spec.ts | T0 | opus |
| T4 | A work in progress and its milestones | src/features/communities/WipTimeline.tsx, tests/features/communities-wip.spec.ts | T3 (`projectModel.ts`) | sonnet |
| T5 | Sell › Projects: raised, contributions, releasing a milestone | src/features/communities/SellProjects.tsx, tests/features/communities-sell.spec.ts | T3, T4 | opus |
| T6 | Assemble the projects route and fill the slots (lead) | src/features/communities/ProjectsView.tsx, src/features/communities/index.ts, tests/features/communities-flow.spec.ts | T1 to T5 | lead |

**How the tasks fit:** the lead writes T0 before spawning any builder. T3's `projectModel.ts` is the one place that merges the mock with the store (raised amounts, contributions, milestone statuses and amounts), and T4 and T5 import it. T5 reuses T4's `WipTimeline` without editing it. Builders run `npm run check:scope` on their files and write their spec. The specs run for the first time once T6 fills the slots, and the lead sends any failure back to the builder who owns the file.

**T1.** `CommunityStrip` (`communities-strip`) is a row of eight kit `CommunityCard`s (`community-card-<communityId>`) in community order:
- the community's name, people and place, and its craft,
- the label Indigenous or heritage (Gu embroidery is always heritage),
- the Demo data badge,
- a link to the projects page.

A card navigates to the community's page. It fits the 1440 px page width, in one row or in two rows of four.

**T2.** `CommunityPage` (`community-page`) for `SlotProps.communityId`:
- **Top:** the name, people, place and craft, the Indigenous or heritage label, the Demo data badge, and `about` in the slot's language, set as the community's own words.
- **`community-verification`:** the kit `VerificationLine` with the method, who attested, and the note.
- **`community-protocols`:** each protocol, plainly.
- **`communities-makers`:** each maker (`communities-maker-<makerId>`) with their `MakerMark`, name and `nativeName` when the community gave one. Never a machine translation.
- **`communities-pieces`:** a grid of `PieceCard`s that open the piece page.
- The community's project as a `ProjectCard`.
- **`communities-storefront-link`:** goes to `/store/<slug>`.

An unknown ID shows a short "community not found" note and a link back to Shop.

**T3.** `projectModel.ts` exports pure selectors:
- a project's raised amount and its contributions in order,
- a work in progress's milestones with their status, their amount (`priceCents × shareBps / 10000`, rounded half up, once per milestone), and whether a release approval for one is pending, granted or declined.

`FundProject` is the project page's funding block:
- the kit `ProjectCard` (`project-card-<projectId>`) with `project-progress-<projectId>` (raised against goal, through `Money`),
- the amount picker (`communities-amount-500`, `communities-amount-1000`, `communities-amount-2500`, 500 picked first, the project's `addOnCents`),
- `project-fund-<projectId>`, which emits `project.funded` as above.

A short thank-you line (`communities-thanks`) follows, and the progress rises from the store. It says plainly that the demo moves no real money.

**T4.** `WipTimeline` (`communities-wip-page`) shows a work in progress for a `wipId` with the kit `MilestoneTimeline`:
- the commission's title, maker and price,
- each milestone (`wip-milestone-<milestoneId>`) with its label, its share and amount, and its status (pending, reached, waiting for approval, paid with its date).

It takes a `mode` prop. Shop mode is read-only. Sell mode shows a release button (`wip-release-<milestoneId>`) on each milestone that is pending and comes next.

**T5.** `SellProjects` (`communities-sell`) is Sell › Projects for the Gu studio's community (`com_gu`), inside one kit `Panel` that declares `b08-approvals`:
- the studio's project with `project-progress-prj_01`,
- the list of contributions (`communities-contributions`), each with its ID, amount and order when it came with one,
- the studio's works in progress through `WipTimeline` in Sell mode.

Pressing `wip-release-<milestoneId>` emits `wip.milestone_reached` as above. The milestone then shows "needs your approval" once `apr_05` is in the store, with Cindy's newest `agent.acted` line in `communities-cindy-note`. When the owner grants it on Sell › Approvals and the `wip.milestone_paid` arrives, the milestone shows paid with its amount.

**T6.** `ProjectsView` reads `SlotProps.projectId`:
- without one, it lists every project's `ProjectCard` and every work in progress (`communities-list`),
- with a `prj_` ID, it shows the project's summary, its updates and `FundProject`,
- with a `wip_` ID, it shows `WipTimeline` in Shop mode.

It's all inside one `Panel` that declares `b08-approvals`. `index.ts` exports the module. `communities-flow.spec.ts` walks home to a community to its project and funds it.

## Acceptance
Specs open the route named and check by test ID only. Expected values come from `src/mock/`, not typed in. Where a line needs a timeline event before `I2-tour`, the spec emits the scripted payload with `window.__cindia.emit()`.

1. **Given** `/shop`, **then** `communities-strip` shows eight `community-card-<communityId>` in community order. `community-card-com_gu` reads heritage and the other seven read Indigenous, and every card shows the Demo data badge.
2. **When** a person clicks `community-card-com_dine`, **then** the page is `/shop/community/com_dine`. `community-page` shows its about text, `community-verification` shows its method and who attested, `community-protocols` lists each protocol, `communities-makers` shows `mkr_04` and `mkr_05`, `communities-pieces` shows `pc_13` to `pc_18`, and `communities-storefront-link` points to `/store/dine-weavers`.
3. **Given** `/shop/community/com_gu`, **then** the kind label reads heritage, the page never labels the studio Indigenous, and `community-verification` names the heritage listing method.
4. **Given** `/shop/projects`, **then** `communities-list` shows `project-card-prj_01` to `project-card-prj_08` and the three works in progress, and each `project-progress-<projectId>` shows raised against goal.
5. **When** on `/shop/projects/prj_01` a person picks `communities-amount-1000` and presses `project-fund-prj_01` on a fresh store, **then** the store holds a `project.funded` with `source: "user"`, `contributionId: "ctb_user_1"`, `amountCents: 1000` and `buyerId: "buy_01"`. `project-progress-prj_01` rises by $10.00 and `communities-thanks` shows.
6. **Given** the tour's `project.funded` `ctb_01` (500 for `prj_01`) emitted, **then** `project-progress-prj_01` includes it, and on `/sell/projects` `communities-contributions` lists `ctb_01` at $5.00 with `ord_001`.
7. **Given** `/shop/projects/wip_01`, **then** `communities-wip-page` shows one `wip-milestone-<milestoneId>` per milestone, and their amounts add up to the commission's price.
8. **When** on `/sell/projects` the owner presses `wip-release-<milestoneId>` for `wip_01`'s second milestone, **then** the store holds a `wip.milestone_reached` with `source: "user"` and date `2026-10-01`. About 1.2 seconds later in real time `apr_05` is requested, the milestone shows "needs your approval", and `communities-cindy-note` shows Cindy's proposal.
9. **Given** `apr_05` granted and its `wip.milestone_paid` emitted, **then** that milestone shows paid with its amount on both `/sell/projects` and `/shop/projects/wip_01`.
10. **Given** scripted mode, **then** `/sell/projects` and the projects pages show `simulated-badge`, and the strip and community pages don't.
11. **Given** `demo-lang-toggle` set to Chinese, **then** the community text, protocols, project text and milestone labels show their Chinese text, `nativeName` stays as the community wrote it, and amounts are still dollars.

## Out of scope
- Moving real money, accounts or payment details. Funding is a demo event.
- The checkout add-on at the piece page. That's `buyer-project-addon` in the buyer migration (`M-buyer`).
- Granting or declining the release. The approvals feature does that on Sell › Approvals.
- Editing a community's page. In a real launch the community writes it.
- The storefront pages. The storefront feature owns `/store/:slug`.

## Contract additions needed
- **Requests rows (I2-core):**
  - `wip.milestone_reached` from a person goes to key `b08-approvals`. The scripted answer is an `agent.acted` (`propose`) plus `approval.requested` `apr_05` when the milestone is `wip_01`'s second. For any other milestone it's only an `agent.acted` line saying scripted mode proposes the demo release.
  - `approval.granted` for a `milestone_release` approval gets the scripted answer `wip.milestone_paid` plus a `money.moved` of kind `milestone` (Cindia to the maker, the next `mv_01` ID), dated `2026-10-02`.
- **A person's `wip.milestone_reached`** carries `date: "2026-10-01"`, the same fixed demo date approvals use, so a tap never reads the wall clock (I2-core, data-model).
- **`wip_01` belongs to `com_gu`** and its maker is one of `mkr_01` to `mkr_03`, so Sell › Projects (the Gu studio) can release it (S3-catalog).
- **The `src/mock` exports this plan reads:** `communities`, `projects`, `worksInProgress`, `storefronts`, plus `getById()` for `com_`, `prj_`, `wip_` and `sto_` IDs (S3-catalog).
- **`src/core/nav.ts` route builders** for the community, projects, piece and storefront routes (I2-core).
- **Contribution ID prefix** `ctb_user_<n>` for a person's contributions. The tour uses `ctb_01`.
