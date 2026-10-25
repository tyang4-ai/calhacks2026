# F-storefront · The storefront builder and the storefront page (preview)

Priority: P1 · Wave: V2 · Depends on: G1b, G2b · Folder: src/features/storefront/ · Made real by: B14

SCOPE: src/features/storefront/, tests/features/storefront-*

## Goal
Each seller on the platform has a page at its own link and keeps the customer relationship. On Sell › Storefront the manager of the Diné Weaving and Silver Co-op rearranges and edits the co-op's page (`sto_01`) from blocks, picks a theme accent, and sees the result live. They can ask the Designer agent for a first draft, choose whether to use it, and publish exactly what the preview shows. `/store/dine-weavers` shows the published page, with every piece linking back to its Shop page. The builder is a simple mock for the demo, and the screen says so plainly. Every storefront is fictional, and its footer says that too. A storefront that isn't published yet says so on its page.

## Read first
- `docs/v2/fix-plan.md`:
  - section 1.1: the four storefronts and their slugs,
  - section 1.2: beat `d16-store`, now in chapter 2,
  - section 1.3, point 6: the storefront is theirs,
  - section 1.5: a real builder is "Backend if time".
- `docs/v2/brief.md`: storefronts, the storefront builder, why it scales
- `docs/v2/contracts.md`, which `docs/common/` holds once I2-core is green:
  - section 2: Storefront `sto_01` to `sto_04` (`slug`, `theme`, `blocks`, `status`) and block kinds
  - section 3: `storefront.drafted`, `storefront.published`, `swarm.step`
  - section 4: route `/store/:slug`, slots `studio.storefront.main` and `store.main`, `SlotProps.slug`, the `store` surface (`frame-store`), test IDs `storefront-*` and `store-page`, cameras `sell-storefront` and `store`
  - section 6: the `designer` agent
  - section 11: `storefront.requested` and `run_03` on `sto_01`, the block props, `storefront-publish`
  - section 12: labels L8 and L13
- `docs/v2/reviews/A2-culture-trust.md`: findings 6 and 22, rules R22 and R23, labels L8 and L13
- `docs/common/design-system.md` and contracts section 7: `BlockEditor`, `PieceCard` and its `demo` prop, `ProjectCard`, `ChatBubble`, `Badge`, `Button`, the color tokens
- `docs/common/glossary.md`: storefront, storefront builder, community project, demo data

## Interfaces
- **Reads events** through `useCindia()`: `storefront.drafted`, `storefront.published` (the `storefront` key), `swarm.step` for the Designer's run (the `swarm` key), `project.funded` (the `projects` key, for raised amounts), and `sources`.
- **Reads data** with `getById()`: the Storefront (by `slug` on the public page, and `sto_01` in Sell, since the Sell site is the Diné co-op's), its Community, the pieces a pieces block names, and the community's projects. The `designer` AgentSpec comes from `getAgent("designer")`, since agents have no ID prefix (D1-33).
- **Emits,** with `source: "user"` through `userEvent()`:
  - `storefront.requested` (`storefrontId`) from "Draft with Designer" (contracts section 11),
  - `storefront.published` (`storefrontId`, `slug`, and `blocks`, the working copy at that moment) from publish (B1-43).
- **Editing is local:** moving a block, editing a block's text, the theme accent and the layout change a working copy in component state, not events. Nothing reaches the public page until the owner publishes, and resetting the demo clears what was published. That keeps the builder a mock, as the brief asks.
- **What the public page shows** (B1-43, D1-50):
  - the blocks of the newest `storefront.published` for that storefront, which carries them,
  - otherwise the mock's blocks,
  - and when the mock's `status` is `draft` and the store holds no `storefront.published` for it, the mock's blocks under `store-draft-note` at the top of the page: "Draft. Not published yet." (contracts section 11).

  The page never shows a Designer draft the owner didn't use and publish, and it needs no "came after" rule, so a paused player's tied `at` values can't confuse it.
- **Block props** are single strings or lists of strings, named as in contracts section 11 (D1-25): hero `tagline`, pieces `pieceIds`, projects `projectIds`, visit `address` and `hours`, and story and process `title` and `body`. The story and process blocks render their `title` and never their `body` (T2). Text props are English only, so in Chinese they stay as written.
- **Navigation:** a pieces block's cards and a projects block's cards move to `/shop/piece/<pieceId>` and `/shop/projects/<projectId>` through the kit `Link`.
- **Exports:** `src/features/storefront/index.ts` default-exports `{ id: "storefront", slots: { "studio.storefront.main": StorefrontBuilder, "store.main": StorePage } }`.
- **Source keys on the badge:** the builder `b14-swarm`. The public page renders no keyed events, so it shows the kit's `Demo data` badge.
- **Test IDs:**
  - From the contracts: `storefront-builder`, `storefront-block-<blockId>`, `storefront-preview`, `storefront-publish`, `store-page`, `store-footer` (the footer, with L13).
  - Internal to this feature: `storefront-designer` ("Draft with Designer"), `storefront-designer-steps`, `storefront-use-draft`, `storefront-accent`, `storefront-layout`, `storefront-preview-note`, `storefront-status`, `store-block-<blockId>` (a rendered block, in the preview and on the page), `store-story-note` (L8 in the story block), `store-draft-note`, `store-missing`.
- **Labels from the glossary:** storefront, storefront builder, community project, demo data, rule-based. From contracts section 12: L8 in the story block and L13 in the footer.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): block names, editor buttons, the preview note ("Preview: a simple block editor for this demo. Edits reach the page only when you publish, and a reset clears them."), the footer ("Made with Cindia's storefront builder (preview)") followed by L13 ("Fictional storefront, made for a demo."), L8, the draft note, publish states, English and Chinese side by side | src/features/storefront/strings.ts | none | lead |
| T1 | Spec helper: open the builder or a storefront page, seed events with `window.__cindia.emit`, and re-export `seekToEvent` | tests/features/storefront-lib.ts | none | sonnet |
| T2 | The block renderer shared by the preview and the public page | src/features/storefront/StoreBlocks.tsx, src/features/storefront/blocks/HeroBlock.tsx, src/features/storefront/blocks/StoryBlock.tsx, src/features/storefront/blocks/PiecesBlock.tsx, src/features/storefront/blocks/ProcessStepsBlock.tsx, src/features/storefront/blocks/ProjectsBlock.tsx, src/features/storefront/blocks/VisitBlock.tsx, tests/features/storefront-blocks.spec.ts | T0, T1 | opus |
| T3 | The public page at `/store/:slug` and the rule for what it shows | src/features/storefront/StorePage.tsx, src/features/storefront/pageView.ts, src/features/storefront/pageView.test.ts, tests/features/storefront-page.spec.ts | T0, T1 | sonnet |
| T4 | The editor: the working copy, move up and down, text edits, theme accent and layout | src/features/storefront/workingCopy.ts, src/features/storefront/workingCopy.test.ts, src/features/storefront/BuilderEditor.tsx, tests/features/storefront-editor.spec.ts | T0, T1 | opus |
| T5 | The Designer's draft and publishing | src/features/storefront/DesignerDraft.tsx, src/features/storefront/PublishBar.tsx, tests/features/storefront-publish.spec.ts | T0, T1 | sonnet |
| T6 | Assemble the builder and fill the slots (lead) | src/features/storefront/StorefrontBuilder.tsx, src/features/storefront/index.ts, tests/features/storefront-flow.spec.ts | T2 to T5 | lead |

**How the tasks fit:**
- The lead writes T0 first.
- T1 is small and runs next.
- T2 runs early, because T3, T4 and T6 render through it.
- T2 to T5 own disjoint files and run two at a time.

**T1.** `storefront-lib.ts` exports `openBuilder(page)` (opens `/sell/storefront`), `openStore(page, slug)`, and `seed(page, events)`, which emits through `window.__cindia.emit`. It re-exports `seekToEvent(page, type, match, offsetMs)` from `tests/smoke/lib.ts` and never copies it (contracts section 11).

**T2.** `StoreBlocks` takes a list of blocks, a theme and the slot's language, and renders each block in order as `store-block-<blockId>`. The theme's `accent` is a kit color token name, used as `var(--c-color-<accent>)`, never a hex. The `layout` is `story_first` or `grid_first`. One component per kind:
- **hero:** the community's name, its place and the block's `tagline`, a plain craft line (A2 R23).
- **story:** the block's `title` as its heading, then the community's `about` text with the `Demo data` badge and `store-story-note` under it, reading L8: "Placeholder written by the Cindia team. In a real launch, the community writes this page." It never renders the block's `body`, from the mock or from a draft, so no agent ever writes a community's story (A2-22).
- **pieces:** kit `PieceCard`s for the block's `pieceIds`, each with `demo={community.demo}`, so its verification line starts with L3. Each card is a `Link` to its Shop page.
- **process steps:** the block's `title`, then the craft's steps from the first listed piece's `process`. It never renders the block's `body`, from the mock or from a draft, so the steps on the page are always the piece data's physical steps and no agent describes how a community works (A2-22).
- **projects:** kit `ProjectCard`s with raised against goal: the mock's `raisedCents` plus the store's `addedCents` for the project, which I2-core sums over distinct contributions. Each card links to its project page.
- **visit:** the block's `address` and `hours` text. The data holds only the community's region there and "Visits by arrangement", never a street address, a phone number, an email or opening hours (A2 R22).

Missing props render a quiet placeholder, never a crash.

**T3.** `pageView.ts` is the pure rule in "What the public page shows": given a mock storefront and the store's newest `storefront.published` for it, if any, it returns the blocks to show and whether to show the draft note. `pageView.test.ts` covers a published mock storefront with no publish event, a publish event carrying edited blocks, a draft with no publish, and a draft that was then published.

`StorePage` (`store-page`) reads `SlotProps.slug`, finds the Storefront in the mock, and renders `pageView`'s blocks through `StoreBlocks` inside `frame-store`, with `store-draft-note` when the rule says so. `store-footer` reads "Made with Cindia's storefront builder (preview)", then L13. An unknown slug shows `store-missing` with a `Link` back to `/shop`.

**T4.**
- `workingCopy.ts` holds pure functions over a blocks list: move up, move down, set a text prop, set the accent, set the layout. Each returns a new list, with unit tests in `src/features/storefront/workingCopy.test.ts`, which this task owns too.
- `BuilderEditor` (`storefront-builder`) shows the kit `BlockEditor` over the working copy. Each block row is `storefront-block-<blockId>`, with move up, move down and its editable text fields.
- `storefront-accent` picks from the kit's accent tokens.
- `storefront-layout` switches the two layouts.
- The working copy starts from the blocks of the newest `storefront.published` for `sto_01` when there is one, otherwise from the mock's. It never starts from a Designer draft, because only `storefront-use-draft` applies one.

**T5.**
- `DesignerDraft` holds the Designer button and its run:
  - `storefront-designer` emits `storefront.requested` for `sto_01`.
  - `storefront-designer-steps` lists the Designer run's `swarm.step` events (`run_03`, whose `threadId` is `sto_01`, contracts section 11) as kit `ChatBubble`s with the agent's name.
  - When `storefront.drafted` arrives, `storefront-use-draft` appears and replaces the working copy with the Designer's blocks when pressed. The owner decides, and the draft is never applied on its own.
- `PublishBar` holds publishing:
  - `storefront-publish` emits `storefront.published` with `sto_01`, its slug and the working copy's blocks, whatever the preview shows at that moment. Publishing is the owner's own decision, so there's no approval.
  - `storefront-status` reads draft or published (preview), with a `Link` to `/store/<slug>`.
  - `storefront-preview-note` always shows T0's preview note.

**T6.** `StorefrontBuilder` lays out the editor and the Designer (a third) beside `storefront-preview` (two thirds), which renders the working copy through `StoreBlocks` scaled to fit. It all sits in one kit `Panel` declaring `b14-swarm`, sized for the Sell frame at 1440 by 900. `index.ts` exports the module. `storefront-flow.spec.ts` edits, drafts with the Designer (seeded or scripted), publishes, and opens `/store/dine-weavers`.

## Acceptance
Every spec checks by test ID only, at 1440 by 900. A spec that needs a timeline event seeks to it with `seekToEvent`, never to a fixed time. A scripted answer to a person counts as arrived when it shows within Playwright's default expect timeout, never inside a wall-clock window (B1-27). Expected values come from `src/mock/`, not typed in.

1. **Given** `/store/dine-weavers`, **then**:
   - `store-page` shows `sto_01`'s blocks in order as `store-block-<blockId>`, with the Diné co-op's name in the hero,
   - the story block shows the co-op's `about` text with the `Demo data` badge and `store-story-note` (L8),
   - the pieces block's cards each link to `/shop/piece/<pieceId>`,
   - `store-footer` shows the preview line and then L13,
   - there's no `store-draft-note`, and all of it sits inside `frame-store`. These are `d16-store`'s IDs.
2. **When** the visitor clicks a piece card on `/store/dine-weavers`, **then** the page is that piece's Shop page and the store wasn't reset.
3. **Given** `/store/no-such-slug`, **then** `store-missing` shows with a link to `/shop`.
4. **Given** `pageView.test.ts`, **then** a draft storefront with no publish gets its mock blocks and the draft note, and a storefront with a `storefront.published` gets that event's blocks and no note (D1-50).
5. **Given** `/sell/storefront`, **when** the owner moves the second block up and edits the hero's tagline, **then** the `storefront-block-<blockId>` rows show the new order, `storefront-preview` shows the edit at once, and nothing new is emitted to the store.
6. **When** the owner picks a different accent in `storefront-accent`, **then** the preview's accent uses that token's CSS variable.
7. **When** the owner presses `storefront-designer`, **then** the store holds a `storefront.requested` for `sto_01` with `source: "user"`, and the Designer's steps arrive in `storefront-designer-steps`, followed by `storefront-use-draft`. The working copy doesn't change until `storefront-use-draft` is pressed, and then it holds the drafted blocks.
8. **When** the owner edits the hero's tagline and presses `storefront-publish` without the Designer, **then** the store holds a `storefront.published` for `sto_01` carrying the edited blocks, `storefront-status` reads published, and `/store/dine-weavers` shows the edited tagline (B1-43).
9. **When** the Designer's draft has arrived and the owner publishes without pressing `storefront-use-draft`, **then** `/store/dine-weavers` shows the working copy and not the draft. After `storefront-use-draft` and a second publish, it shows the drafted blocks.
10. **Given** any moment on the builder, **then** `storefront-preview-note` shows the preview note. In scripted mode the builder panel shows `simulated-badge`, and the public page shows the `Demo data` badge.
11. **Given** `demo-lang-toggle` switched to Chinese, **then** the builder's labels, L8, L13 and the page's labels are Chinese, and the block text props, which are English strings, stay as written.

## Out of scope
- Saving edits beyond the demo session, custom domains, uploading images, adding or deleting blocks, drag and drop, and any block kind beyond the six. A real builder is "Backend if time" (fix-plan 1.5).
- Hosting storefronts anywhere outside this platform.
- The Designer agent itself (B14) and the swarm view (F-process).
- Writing a community's story. The story block shows the community's `about` text, which a real community would write itself.

## Contract additions needed
Settled in contracts sections 3 and 11 and I2-core, listed so a builder knows where each lives. Nothing is still open:
1. **`storefront.requested`** (`storefrontId`): a person's request on key `b14-swarm`.
   - Scripted answer: the Designer run `run_03`, thread `sto_01`, with its `swarm.step` events, then `storefront.drafted` for `sto_01`. Any other storefront gets no scripted draft, because the Designer drafts only the seller's own storefront (I2-core T8, A2-22).
   - Live answer: `POST /api/b14/storefront`.
2. **Navigation for features:** `navigate(path)` in `src/core/nav.ts` and the kit `Link` (prop `to`), which moves between routes without reloading the store.
3. **`storefront-publish`** reads "Publish". It's the owner's own decision and emits `storefront.published` directly. The `storefront_publish` approval kind stays for a time when Cindy proposes a publish herself.
4. **Block props:** single strings or lists of strings, as the Storefront type allows: a pieces block holds `pieceIds: string[]`, a projects block `projectIds: string[]`, hero `tagline`, visit `address` and `hours`, story `title` and `body`, and process `title` and `body` (D1-25). B14's Designer writes the same names. Neither `body` renders (T2).
5. **`storefront.published`** carries `blocks` (as on Storefront) beside `storefrontId` and `slug` (contracts section 3), and the `storefront` store key keeps the newest one under `published` by `storefrontId`, as `{ slug, blocks, at }` (I2-core T3), so the public page shows what the owner published (B1-43).
