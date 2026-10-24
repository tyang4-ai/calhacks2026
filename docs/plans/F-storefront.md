# F-storefront · The storefront builder and the storefront page (preview)

Priority: P1 · Wave: V2 · Depends on: G1b, G2b · Folder: src/features/storefront/ · Made real by: B14

SCOPE: src/features/storefront/, tests/features/storefront-*

## Goal
Cindia's core is the index and the back office, and each community gets its own storefront at its own link. On Sell › Storefront the owner rearranges and edits the Gu studio's page from blocks, picks a theme accent, and sees the result live. They can ask the Designer agent for a first draft and publish when they're happy. `/store/gu-studio` shows the published page, with every piece linking back to its Shop page. The builder is post-MVP, so the screen says plainly that this is a preview.

## Read first
- `docs/v2/brief.md`: storefronts, the storefront builder, why it scales
- `docs/v2/contracts.md`, which `docs/common/` holds once I2-core is green:
  - section 2: Storefront `sto_01` to `sto_08` (`slug`, `theme`, `blocks`, `status`) and block kinds
  - section 3: `storefront.drafted`, `storefront.published`, `swarm.step`
  - section 4: route `/store/:slug`, slots `studio.storefront.main` and `store.main`, `SlotProps.slug`, the `store` surface (`frame-store`), test IDs `storefront-*` and `store-page`, cameras `sell-storefront` and `store`
  - section 6: the `designer` agent
  - section 8: beat `d16-store`
- `docs/common/design-system.md` and contracts section 7: `BlockEditor`, `PieceCard`, `ProjectCard`, `ChatBubble`, `Badge`, `Button`, the color tokens
- `docs/common/glossary.md`: storefront, storefront builder, community project, demo data

## Interfaces
- **Reads events** through `useCindia()`: `storefront.drafted`, `storefront.published` (the `storefront` key), `swarm.step` for the Designer's run (the `swarm` key), `project.funded` (the `projects` key, for raised amounts), and `sources`.
- **Reads data** with `getById()`: the Storefront (by `slug` on the public page, `sto_01` in Sell, since the Sell site is the Gu studio's), its Community, the pieces a pieces block names, the community's projects, and the `designer` AgentSpec.
- **Emits,** with `source: "user"` through `userEvent()`:
  - `storefront.requested` (`storefrontId`) from "Draft with Designer" (contract addition 1),
  - `storefront.published` (`storefrontId`, `slug`) from publish.
- **Editing is local:** moving a block, editing a block's text, the theme accent and the layout change a working copy in component state, not events. The screen says preview edits aren't saved. That keeps the builder a mock, as the brief asks.
- **What the public page shows:** the blocks of the newest `storefront.drafted` for that storefront when a `storefront.published` for it came after it. Otherwise the mock's blocks.
- **Navigation:** a pieces block's cards and a projects block's cards move to `/shop/piece/<pieceId>` and `/shop/projects/<projectId>` through the kit `Link` (contract addition 2).
- **Exports:** `src/features/storefront/index.ts` default-exports `{ id: "storefront", slots: { "studio.storefront.main": StorefrontBuilder, "store.main": StorePage } }`.
- **Source keys on the badge:** the builder `b14-swarm`. The public page renders no keyed events, so it shows the kit's `Demo data` badge.
- **Test IDs:**
  - From the contracts: `storefront-builder`, `storefront-block-<blockId>`, `storefront-preview`, `storefront-publish`, `store-page`.
  - Internal to this feature: `storefront-designer` ("Draft with Designer"), `storefront-designer-steps`, `storefront-use-draft`, `storefront-accent`, `storefront-layout`, `storefront-preview-note`, `storefront-status`, `store-block-<blockId>` (a rendered block, in the preview and on the page), `store-footer`, `store-missing`.
- **Labels from the glossary:** storefront, storefront builder, community project, demo data, rule-based.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): block names, editor buttons, the preview label ("Preview: the storefront builder is post-MVP"), the footer ("Made with Cindia's storefront builder (preview)"), publish states, English and Chinese side by side | src/features/storefront/strings.ts | none | lead |
| T1 | Spec helper: open the builder or a storefront page, seed events with `window.__cindia.emit` | tests/features/storefront-lib.ts | none | sonnet |
| T2 | The block renderer shared by the preview and the public page | src/features/storefront/StoreBlocks.tsx, src/features/storefront/blocks/HeroBlock.tsx, src/features/storefront/blocks/StoryBlock.tsx, src/features/storefront/blocks/PiecesBlock.tsx, src/features/storefront/blocks/ProcessStepsBlock.tsx, src/features/storefront/blocks/ProjectsBlock.tsx, src/features/storefront/blocks/VisitBlock.tsx, tests/features/storefront-blocks.spec.ts | T0, T1 | opus |
| T3 | The public page at `/store/:slug` | src/features/storefront/StorePage.tsx, tests/features/storefront-page.spec.ts | T0, T1 | sonnet |
| T4 | The editor: the working copy, move up and down, text edits, theme accent and layout | src/features/storefront/workingCopy.ts, src/features/storefront/workingCopy.test.ts, src/features/storefront/BuilderEditor.tsx, tests/features/storefront-editor.spec.ts | T0, T1 | opus |
| T5 | The Designer's draft and publishing | src/features/storefront/DesignerDraft.tsx, src/features/storefront/PublishBar.tsx, tests/features/storefront-publish.spec.ts | T0, T1 | sonnet |
| T6 | Assemble the builder and fill the slots (lead) | src/features/storefront/StorefrontBuilder.tsx, src/features/storefront/index.ts, tests/features/storefront-flow.spec.ts | T2 to T5 | lead |

**How the tasks fit:**
- The lead writes T0 first.
- T1 is small and runs next.
- T2 runs early, because T3, T4 and T6 render through it.
- T2 to T5 own disjoint files and run two at a time.

**T1.** `storefront-lib.ts` exports `openBuilder(page)` (opens `/sell/storefront`), `openStore(page, slug)`, and `seed(page, events)`, which emits through `window.__cindia.emit`.

**T2.** `StoreBlocks` takes a list of blocks, a theme and the slot's language, and renders each block in order as `store-block-<blockId>`. The theme's `accent` is a kit color token name, used as `var(--c-color-<accent>)`, never a hex. The `layout` is `story_first` or `grid_first`. One component per kind:
- **hero:** the community's name, its place and a line from the block's props.
- **story:** the community's `about` text, with the `Demo data` badge.
- **pieces:** kit `PieceCard`s for the piece IDs in the block's props. Each card is a `Link` to its Shop page.
- **process steps:** the craft's steps from the first listed piece's `process`.
- **projects:** kit `ProjectCard`s with raised against goal, raised including `project.funded` amounts in the store. Each card links to its project page.
- **visit:** the block's address and hours text.

Missing props render a quiet placeholder, never a crash.

**T3.** `StorePage` (`store-page`) reads `SlotProps.slug`, finds the Storefront in the mock, and renders it through `StoreBlocks` inside `frame-store`, using the published blocks as described above. `store-footer` says it was made with Cindia's storefront builder, as a preview. An unknown slug shows `store-missing` with a `Link` back to `/shop`.

**T4.**
- `workingCopy.ts` holds pure functions over a blocks list: move up, move down, set a text prop, set the accent, set the layout. Each returns a new list, with unit tests in `src/features/storefront/workingCopy.test.ts`, which this task owns too.
- `BuilderEditor` (`storefront-builder`) shows the kit `BlockEditor` over the working copy. Each block row is `storefront-block-<blockId>`, with move up, move down and its editable text fields.
- `storefront-accent` picks from the kit's accent tokens.
- `storefront-layout` switches the two layouts.
- The working copy starts from the newest `storefront.drafted` for `sto_01` when there is one, otherwise from the mock.

**T5.**
- `DesignerDraft` holds the Designer button and its run:
  - `storefront-designer` emits `storefront.requested` for `sto_01`.
  - `storefront-designer-steps` lists the Designer run's `swarm.step` events (the run's `threadId` is the `storefrontId`, contract addition 1) as kit `ChatBubble`s with the agent's name.
  - When `storefront.drafted` arrives, `storefront-use-draft` replaces the working copy with the Designer's blocks. The owner decides, and the draft is never applied on its own.
- `PublishBar` holds publishing:
  - `storefront-publish` emits `storefront.published` with `sto_01` and its slug. Publishing is the owner's own decision, so there's no approval.
  - `storefront-status` reads draft or published (preview), with a `Link` to `/store/<slug>`.
  - `storefront-preview-note` always shows "Preview: the storefront builder is post-MVP" and that edits here aren't saved.

**T6.** `StorefrontBuilder` lays out the editor and the Designer (a third) beside `storefront-preview` (two thirds), which renders the working copy through `StoreBlocks` scaled to fit. It all sits in one kit `Panel` declaring `b14-swarm`, sized for the Sell frame at 1440 by 900. `index.ts` exports the module. `storefront-flow.spec.ts` edits, drafts with the Designer (seeded or scripted), publishes, and opens `/store/gu-studio`.

## Acceptance
Every spec checks by test ID only, at 1440 by 900.

1. **Given** `/store/gu-studio`, **then**:
   - `store-page` shows `sto_01`'s blocks in order as `store-block-<blockId>`, with the Gu studio's name in the hero,
   - the pieces block's cards each link to `/shop/piece/<pieceId>`,
   - `store-footer` shows the preview line,
   - all inside `frame-store`. These are `d16-store`'s IDs.
2. **When** the visitor clicks a piece card on `/store/gu-studio`, **then** the page is that piece's Shop page and the store wasn't reset.
3. **Given** `/store/no-such-slug`, **then** `store-missing` shows with a link to `/shop`.
4. **Given** `/sell/storefront`, **when** the owner moves the second block up and edits the hero's text, **then** `storefront-block-<blockId>` rows show the new order, `storefront-preview` shows the edit at once, and nothing new is emitted to the store.
5. **When** the owner picks a different accent in `storefront-accent`, **then** the preview's accent uses that token's CSS variable.
6. **When** the owner presses `storefront-designer`, **then** the store holds a `storefront.requested` for `sto_01` with `source: "user"`. Within 4 seconds in real time `storefront-designer-steps` shows the Designer's steps and `storefront-use-draft` appears. Pressing it replaces the working copy with the drafted blocks.
7. **When** the owner presses `storefront-publish` after using the Designer's draft, **then** the store holds a `storefront.published` for `sto_01`, `storefront-status` reads published, and `/store/gu-studio` shows the drafted blocks.
8. **Given** any moment on the builder, **then** `storefront-preview-note` shows the post-MVP line. In scripted mode the builder panel shows `simulated-badge` and the public page shows the `Demo data` badge.
9. **Given** `demo-lang-toggle` switched to Chinese, **then** the builder's labels and the page's labels are Chinese, and community text written only in English stays as written.

## Out of scope
- Saving edits, custom domains, uploading images, adding or deleting blocks, drag and drop, and any block kind beyond the six.
- Hosting storefronts anywhere outside this app.
- The Designer agent itself (B14) and the swarm view (F-process).

## Contract additions needed
1. **`storefront.requested`** (`storefrontId`): a person's request on key `b14-swarm`.
   - Scripted answer: the Designer run in `src/mock/swarm.ts` (its `swarm.step` events, then `storefront.drafted`).
   - Live answer: `POST /api/b14/storefront`.
   - A storefront run's `swarm.step` events carry the `storefrontId` as `threadId`.
2. **Navigation for features:** `navigate(path)` in `src/core/` and a kit `Link` (prop `to`) that moves between routes without reloading the store. M-buyer and F-seller-hub list the same one.
3. **`storefront-publish`'s contract description:** "Publish (the owner's own decision)", emitting `storefront.published`, not "Propose publishing (an approval)". The `storefront_publish` approval kind stays for a time when Cindy proposes a publish herself.
4. **Block props, for the data-smith:**
   - a pieces block holds `pieceIds: string[]`,
   - a projects block holds `projectIds: string[]`,
   - hero holds `tagline`,
   - visit holds `address` and `hours`.
   
   Each is a string or a list of strings, as the Storefront type allows.
