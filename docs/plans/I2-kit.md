# I2-kit · The v2 UI kit for desktop

Priority: P0 · Wave: V1 · Depends on: I2-core (first spawn) · Area: `src/ui/` · Owner: integrator · Gate: G1b, with I2-core and I2-shell

SCOPE: src/ui/

## Goal

Every component v2's pages need exists in the kit, sized for a 1440 by 900 desktop page, in the silk-and-ink look, with a `testId` prop and motion that follows the player clock. Features build their pages from these and the tokens only. When a Figma drop lands, I3-redesign restyles them in one place and the features follow without edits.

T1 comes first and fast, because I2-shell waits on it.

## Read first

- `docs/common/design-system.md` after I2-core merged section 7: tokens, type, space, corners, motion, the kit list, words on screen.
- `docs/v2/brief.md`: "Components for the design system" and "Under the hood".
- `docs/common/ui-contract.md`: frames and sizes, the process bar and its statuses, test IDs. The kit never hard-codes a test ID. It puts the `testId` it's given on its root.
- The existing kit: `src/ui/index.ts`, `Panel.tsx`, `Badge.tsx`, `ConsoleFrame.tsx`, `motion.ts`, `tokens.css`, `kit.css`.

## Interfaces

- **Reads:** nothing from the store and nothing from `src/mock/`. Components take everything as props. The one exception is the motion helpers, which read the player's time through `usePlayerTime()` as v1's do.
- **Exports:** every component below from `src/ui/index.ts`, with its props type. `PhoneFrame` leaves the index. The file stays until I2-shell no longer imports it. `ConsoleFrame` stays exported for now.
- **Sizes:** text never under 14 px. The page is 1440 by 900. The top bar is 56 px, the process bar 64 px, a drawer 440 px.
- **Rules:**
  - Every amount goes through `Money` or `formatCents`.
  - Every date goes through `formatDate`.
  - Colors come only from `tokens.css`.
  - A color always has a second cue.
  - Under reduced motion, nothing pulses and nothing animates.

| Component | Props (the ones features rely on) |
|---|---|
| `PageFrame` | `testId`, `lang`, `children`. Draws the 1440 by 900 desktop page on the paper ground. Exports `PAGE_WIDTH`, `PAGE_HEIGHT` |
| `TopNav` | `testId`, `left`, `center`, `right` (each a node), `lang`. 56 px, hairline bottom |
| `SideSwitch` | `value: "shop" \| "sell"`, `onChange`, `labels: { shop: Text; sell: Text }`, `testIds: { shop; sell }`, `lang`. Two-segment switch with the selected side marked by fill and weight |
| `ProcessBlock` | `testId`, `label: Text`, `lang`, `status: "idle" \| "working" \| "done" \| "attention"`, `count?: number \| string`, `live: boolean` (shows Live or Simulated), `selected?`, `onClick`. Under 140 px wide, so ten fit in one row. `working` pulses on the player clock |
| `Drawer` | `testId`, `open`, `onClose`, `title: Text`, `lang`, `children`, `width?` (default 440). Slides from the right. Esc and its close button call `onClose`. Focus moves into it on open |
| `Tabs` | `testId`, `tabs: { id; label: Text }[]`, `value`, `onChange`, `lang` |
| `SearchBar` | `testIds: { input; submit; chipPrefix }`, `value`, `onChange`, `chips: string[]`, `onChipsChange`, `onSubmit`, `placeholder: Text`, `lang`. Chip n gets `<chipPrefix><n>`, from 1. Each chip can be removed. A chip can be added from the text with Enter |
| `Chip` | `testId`, `label`, `selected?`, `onRemove?`, `onClick?` |
| `PieceCard` | `testId`, `image`, `imageAlt: Text`, `title: Text`, `makerName: Text`, `makerChar` (for `MakerMark`), `communityName: Text`, `priceCents`, `verification?: Text`, `lang`, `onClick?`, `footer?` (a node, for a reason line). Always shows a small "Illustration" tag over the picture |
| `CommunityCard` | `testId`, `name: Text`, `people: Text`, `place: Text`, `craft: Text`, `kind: "heritage" \| "indigenous"`, `image?`, `lang`, `onClick?`. Shows the kind as a word, never as a color alone |
| `ProjectCard` | `testId`, `progressTestId`, `title: Text`, `summary: Text`, `raisedCents`, `goalCents`, `lang`, `action?` (a node) |
| `MilestoneTimeline` | `testIdPrefix`, `milestones: { milestoneId; label: Text; shareBps; amountCents?; status: "pending" \| "reached" \| "paid"; date? }[]`, `lang`, `renderAction?(milestoneId)` |
| `VerificationLine` | `testId`, `method: "community_attestation" \| "registry_check" \| "ich_listing"`, `by: Text`, `note: Text`, `lang` |
| `ScoreBar` | `testId`, `value` (0 to 1), `label?`, `tone?: "neutral" \| "jade" \| "amber" \| "seal"` |
| `ChatThread` | `testId`, `messages: { id; role: "person" \| "agent" \| "note"; agentName?: Text; agentKind?: "claude" \| "code"; text: Text; at? }[]`, `lang`, `footer?` (the input row) |
| `ChatBubble` | the same message fields, `testId?`. An agent bubble shows the agent's name, and "Rule-based" for a `code` agent |
| `AgentGraph` | `testId`, `nodes: { id; label: Text; kind: "claude" \| "code" }[]`, `edges: { from; to }[]`, `steps: { stepId; agentId; at }[]`, `stepTestIdPrefix?`, `now` (player time), `lang`. The node of the latest step lights, and an edge animates for 600 ms after a handoff. Layout is deterministic (orchestrator at the center, specialists on a ring in roster order) |
| `EmbeddingMap` | `testId`, `points: { id; x; y; group?; label?: Text }[]`, `query?: { x; y; approx?: boolean }`, `highlightIds?`, `linkIds?`, `width`, `height`, `lang`. SVG scatter scaled to fit. The query is a star. Links go from the star to `linkIds`. An approximate query point is drawn hollow and labeled "approximate" |
| `EventLog` | `testId`, `rows: { id; at; type; source: "scripted" \| "live" \| "user"; key? }[]`, `maxRows?` (default 50). Newest last, times as seconds on the player clock |
| `ProcessView` | `testId?`, `title: Text`, `live: boolean`, `lang`, `children`, `log?` (a node). Title row with the Live or Simulated badge, a body, then the log under a hairline |
| `SideBySide` | `testId`, `similarityTestId`, `left`, `right` (nodes), `similarity` (0 to 1), `lang`. Two cards with a labeled similarity bar between them |
| `BlockEditor` | `testIdPrefix`, `blocks: { blockId; kind; title: Text; summary: Text }[]`, `selectedId?`, `onSelect`, `onMove(blockId, "up" \| "down")`, `onEdit(blockId)`, `lang`. A list with move up, move down and edit on each block |
| `Badge` (changed) | variants add `live` ("Live 实时"), `demo` ("Demo data 演示数据"), `rule` ("Rule-based 规则程序"), `estimate` ("Estimate 估算") beside v1's. Labels come from the glossary |

## Tasks

The integrator does every task itself, in order. T1 reports as soon as it's done, so the orchestrator can start I2-shell while T2 to T4 go on.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Frame components: `PageFrame`, `TopNav`, `SideSwitch`, `ProcessBlock`, `Drawer`, `Tabs`, with unit tests for their pure parts (the block status to style map, the drawer's Esc handling) | src/ui/PageFrame.tsx, src/ui/TopNav.tsx, src/ui/SideSwitch.tsx, src/ui/ProcessBlock.tsx, src/ui/Drawer.tsx, src/ui/Tabs.tsx, src/ui/frames.test.ts, src/ui/kit.css | I2-core | opus |
| T2 | Search and cards: `SearchBar`, `Chip`, `PieceCard`, `CommunityCard`, `ProjectCard`, `MilestoneTimeline`, `VerificationLine`, `ScoreBar`, with tests for the progress and share math | src/ui/SearchBar.tsx, src/ui/Chip.tsx, src/ui/PieceCard.tsx, src/ui/CommunityCard.tsx, src/ui/ProjectCard.tsx, src/ui/MilestoneTimeline.tsx, src/ui/VerificationLine.tsx, src/ui/ScoreBar.tsx, src/ui/cards.test.ts | T1 | sonnet |
| T3 | Agents and data views: `ChatThread`, `ChatBubble`, `AgentGraph`, `EmbeddingMap`, `EventLog`, `ProcessView`, `SideBySide`, `BlockEditor`, with tests for the graph layout, the map's scaling and the log's ordering | src/ui/ChatThread.tsx, src/ui/ChatBubble.tsx, src/ui/AgentGraph.tsx, src/ui/EmbeddingMap.tsx, src/ui/EventLog.tsx, src/ui/ProcessView.tsx, src/ui/SideBySide.tsx, src/ui/BlockEditor.tsx, src/ui/views.test.ts | T1 | opus |
| T4 | The new `Badge` variants, the index exports (`PhoneFrame` out), and `src/ui/gallery.tsx`, which exports `KitGallery`: every component, each state (empty, loading, live, simulated, error where they apply), with sample props labeled "Sample" and no names or amounts from `src/mock/`. Add the kit's strings in both languages | src/ui/Badge.tsx, src/ui/index.ts, src/ui/gallery.tsx, src/ui/strings.ts | T2, T3 | sonnet |

## Acceptance

- Given the kit, when `npm run check:scope -- src/ui/` runs, then it exits 0, with the new unit tests passing.
- Given `KitGallery` mounted at `/dev/kit` by I2-shell, when the page renders, then every component shows with no console errors, and every component's root carries the `testId` it was given.
- Given `ProcessBlock` with `status: "working"` and the player playing, then it pulses on the player clock. Under reduced motion, or with the player paused, it doesn't move.
- Given `EmbeddingMap` with 54 points and a query, then every point and the star sit inside the given width and height, and the links reach exactly the `linkIds`.
- Given `AgentGraph` with the 21 roster nodes, then the layout is the same on every render for the same inputs.
- Given `PieceCard`, then the "Illustration" tag is visible on the picture, and the price is formatted by `Money`.
- Given a `code` agent in `ChatBubble` or `AgentGraph`, then the word "Rule-based" shows next to its name.
- Given every text style the kit uses, then none is under 14 px.

## Out of scope

- Restyling to the Figma design, which is I3-redesign.
- Pages, routes and surfaces, which are I2-shell.
- Anything that reads the store or `src/mock/`. Features pass data in.
- New npm packages. The kit uses React, SVG and the existing tokens.

## Contract additions needed

- `PAGE_WIDTH` and `PAGE_HEIGHT`, the 1440 by 900 constants `PageFrame` exports, which the stage and the demo tests use.
- The `Badge` variant names `live`, `demo`, `rule` and `estimate`.
- `KitGallery` from `src/ui/gallery.tsx`, mounted by I2-shell at `/dev/kit` with the test ID `dev-kit-gallery`.
