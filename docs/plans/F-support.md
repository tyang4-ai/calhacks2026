# F-support · Help, answered by the agent swarm

Priority: P0 · Wave: V2 · Depends on: G1b, G2b · Folder: src/features/support/ · Made real by: B14, B13

SCOPE: src/features/support/, tests/features/support-*

## Goal
A buyer asks a real question about a piece. In the tour it's whether Grace N. made the weaving herself and whether it can arrive by October 10. Under the conversation they watch the small agents take turns: Intake reads it, the Steward checks the co-op's record, a check confirms the Steward's quote appears in that record word for word, the Clerk checks shipping, and the Writer answers. The reply names the agent whose words it is, and says who attests what. When the records don't say, the agents won't guess. The reply says it will ask Grace N., the question goes to her page, and her answer comes back into the same thread in her own words, so the buyer actually hears from the maker. Every scripted answer is about its own piece, so a question on another piece's page gets an honest "switch to Live" reply instead of the wrong maker's record. When a question needs a person, the screen says plainly that the co-op's manager is taking over. Sellers get the same help on the Sell side for payouts and listings.

## Read first
- `docs/v2/fix-plan.md`:
  - section 1.1: the names,
  - section 1.2: beat `d04-support` with its `check` step, and the note on the "ask the maker" run (a chapter 2 beat only if this plan and F-seller-hub ship it, otherwise a question Gordon clicks during Q&A),
  - section 1.4, pillar 1: the swarm,
  - section 1.5: "Cindy asks the maker for you" is one scripted run, and the live loop is "if time".
- `docs/v2/brief.md`: Help any time, the agent swarm, the Sell side
- `docs/v2/contracts.md`:
  - section 2: AgentSpec and SwarmRun
  - section 3: `support.asked`, `swarm.step`, `support.answered`, `support.escalated`, `question.forwarded`, `question.answered`, the payload rule, the Requests rows (`support.asked` and its timing)
  - section 4: slots `shop.drawer.support`, `studio.drawer.support`, `shop.piece.side`, SlotProps `side`, `pieceId`, `orderId`, `slug` and `makerId`, the support test IDs
  - section 6: the agent roster
  - section 7: `ChatBubble`, `Drawer`, `Badge`, `MakerMark`
  - section 9: the glossary rows
  - section 11: `demoQuestions`, the scripted runs, the ID scheme, `seekToEvent`
  - section 12: labels L11 and L12, and L14 to L16, which arrive inside replies
- `docs/v2/reviews/A2-culture-trust.md`: findings 9, 10 and 14
- `docs/v2/reviews/C-tracks.md`: finding 13, "ask the maker"
- `docs/common/events.md` (after I2-core): the store, `userEvent()`, the Simulated rule
- `docs/common/ui-contract.md` (after I2-core): SlotProps, feature modules, drawers
- `docs/common/design-system.md` (after I2-core): words on screen (Cindy speaks in first person, short and specific, and never claims certainty she doesn't have)

## Interfaces
- **Reads events** through `useCindia()`:
  - from the `support` key: the thread's messages, each `support.asked` (the person's), `support.answered` (the reply, its `agentId` and `refIds`) and `support.escalated` (the reason and the approval), and `support.questions` by `questionId`, each `{ forwarded, answered }` from `question.forwarded` and `question.answered` (I2-core T3),
  - from the `swarm` key: the steps of each run,
  - `approvals` (whether an escalation's approval is still pending), `mode` (for L12) and `sources`.

  The language comes from `SlotProps.lang`.
- **Reads data:**
  - the roster through `getAgent(agentId)` from `src/mock/agents.ts`: an agent's name and its kind, `claude` or `code`,
  - `demoQuestions` from `src/mock/swarm.ts`: the questions scripted mode answers, buyer side and seller side, with the tour's `d04` question first. Each has its own scripted run (D1-17), so no suggestion gets the fallback on the page it's meant for,
  - `getById()` for the pieces, orders and makers a reply or a question names.
- **Reads props:** `SlotProps.side` on the two drawers. On the Shop drawer, `pieceId` while a piece page is open, `orderId` while a receipt is open, and `slug` on a store page. On the Sell drawer, `makerId` on a maker page. `SlotProps.pieceId` on `shop.piece.side`.
- **Emits:** `support.asked` with `userEvent()`: `threadId`, `side`, `text`, `lang` (the slot's), and `contextIds`, which hold only what's on screen (A2-14):
  - on the Shop side, the piece (`pieceId`) or the order (`orderId`), or on a store page the storefront's community (found from `slug`),
  - on the Sell side, the maker (`makerId`) on a maker page,
  - never any other order.

  More rules:
  - The first message on a side starts `thr_user_<n>`, and follow-ups reuse the current thread. "New conversation" starts the next `thr_user_`.
  - The sources registry answers. In scripted mode that's the run whose question matches and whose `trigger.pieceId`, when it has one, is in `contextIds`, or else the fallback run, whose reply is L16 (I2-core T5, A2-10). Its steps arrive 300 ms apart. In live mode B14 answers, in 20 seconds at most, and the scripted run plays on a failure.
- **Opens the drawer only for a person's own question (B1-18).** Asking from the piece page's side panel calls `openDrawer("support")` from `src/core/nav.ts`. Help in the top bar and a `?drawer=support` link open it too. No timeline event opens or closes it, and this feature has no effect that watches the timeline. On `/demo` the stage opens the tour's drawer from `d04-support`'s `beat.started.drawer`, so a seek replay, start at the catch included, never leaves the drawer open over a later beat.
- **Exports:** `src/features/support/index.ts` default-exports `{ id: "support", slots: { "shop.drawer.support": SupportDrawer, "studio.drawer.support": SupportDrawer, "shop.piece.side": AskAboutPiece } }`. One component serves both drawers and reads `SlotProps.side`.
- **Source keys on the badge:** `b14-swarm`, `b13-live`.
- **Test IDs from the contract:** `support-drawer`, `support-input`, `support-send`, `support-thread`, `support-reply`, `support-agent`, `support-handoff`.
- **Internal test IDs:**
  - `support-msg-<n>`: one message in the thread, from 1,
  - `support-steps`: the step strip,
  - `support-step-<stepId>`,
  - `support-working`,
  - `support-suggest-<n>`: a suggested question in the drawer, from 1,
  - `support-piece-suggest-<n>`: a suggested question in the piece page's side panel, from 1. It's a different prefix because `d04-support` shows the panel and the drawer on one page (D1-44),
  - `support-new`,
  - `support-ask-piece`: the side panel,
  - `support-refs`: the records a reply names,
  - `support-records-note`: L11 at the top of the drawer,
  - `support-live-note`: L12 under the input, live mode only,
  - `support-forwarded-<questionId>`: the line that a question went to the maker,
  - `support-maker-answer-<questionId>`: the maker's own answer in the thread.
- **Labels from the glossary:** help, agent swarm, rule-based, approval, needs your approval, demo data, plus each agent's name from the roster. From contracts section 12: L11 and L12. L14, L15 and L16 come inside the scripted replies from `src/mock/` and B14's, and this feature shows them as written.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings and the spec helper (lead): every short string these screens need that the glossary lacks, English and Chinese side by side, with L11 and L12 as contracts section 12 words them, the forwarded line and the "In her own words" label. Then `support-lib.ts` (below) | src/features/support/strings.ts, tests/features/support-lib.ts | none | lead |
| T1 | The thread: messages, the reply and its agent, the handoff notice, the forwarded question and the maker's answer | src/features/support/threadModel.ts, src/features/support/Thread.tsx, tests/features/support-thread.spec.ts | T0 | opus |
| T2 | Asking: the composer, the suggested questions and the live note | src/features/support/Composer.tsx, src/features/support/Suggestions.tsx, tests/features/support-ask.spec.ts | T0 | sonnet |
| T3 | The step strip: the agents taking turns | src/features/support/StepStrip.tsx, tests/features/support-steps.spec.ts | T1 (`threadModel.ts`) | opus |
| T4 | The piece page side panel: "Ask about this piece" | src/features/support/AskAboutPiece.tsx, tests/features/support-piece.spec.ts | T2 | sonnet |
| T5 | Assemble the drawer for both sides and fill the slots (lead) | src/features/support/SupportDrawer.tsx, src/features/support/index.ts, tests/features/support-flow.spec.ts | T1 to T4 | lead |

**How the tasks fit:** the lead writes T0 before spawning any builder. T1's `threadModel.ts` is the one place that picks the current thread, its messages and its runs from the store, and T3 imports it. Builders run `npm run check:scope` on their files and write their spec, which imports `support-lib.ts`. The specs run for the first time once T5 fills the slots, and the lead sends any failure back to the builder who owns the file.

**T0's spec helper.** `support-lib.ts` re-exports `seekToEvent(page, type, match, offsetMs)` from `tests/smoke/lib.ts` and never copies it (contracts section 11). It adds `tourEvent(page, type, match, offsetMs, seed)`:
- When `window.__cindia.player.getTimeline()` holds the event (after I2-tour), it seeks there with `seekToEvent`.
- Until then, it pauses the player and emits `seed` with `window.__cindia.emit()`: the tour's `support.asked` for `thr_01` and `run_01`'s steps and answer from `src/mock/swarm.ts`, up to the event asked for.

It never seeks to a fixed time.

**T1.** `threadModel.ts` exports pure selectors:
- the current thread for a side (the newest thread of that side in the store),
- its messages in arrival order:
  - each `support.asked` as the person's,
  - each `support.answered` and `support.escalated` as Cindia's,
  - for each question in `support.questions` whose `forwarded.threadId` is this thread, its `forwarded` entry as a note, and its `answered` entry, linked by `questionId`, as the maker's.

  Arrival order is each entry's place in the store's `log`, found through its event ID, and `at` for an entry that has left the log. A paused player gives every answer the same `at`, so `at` alone can't order them.
- the newest run for the thread,
- whether that run is still working (it has steps but no `support.answered` or `support.escalated`).

`Thread` (`support-thread`) lists the messages with the kit's `ChatBubble`, one per message (`support-msg-<n>`). The person's are on the right. Cindia's are on the left with the agent's name from the roster and its kind, using the Rule-based badge for `code` agents.
- The newest agent reply carries `support-reply`, and its agent's name is in `support-agent`. Replies show as written. The scripted authenticity reply names who attests (L15), and an answer the records don't hold says it won't guess (L14).
- A reply's `refIds` show under it as small links (`support-refs`) to the piece, order or maker.
- A `support.escalated` shows `support-handoff`: its reason in the slot's language, and a line that the co-op's manager has been asked to decide, while its approval is pending.
- **Ask the maker (C-13).**
  - A forwarded question shows `support-forwarded-<questionId>`: "Sent to Grace N. Her answer will show here.", with the maker's name from its `makerId`.
  - Her answer shows `support-maker-answer-<questionId>`: her `text` exactly as she wrote it, in her `lang`, never translated by the page, under her name and `MakerMark`, with the line "In her own words" and the `Demo data` badge, since she's a fictional maker. It's a `ChatBubble` on Cindia's side with her name as `agentName` and no `agentKind`, so no agent badge shows.
  - Her answer never carries `support-reply`. The Writer's reply that relays it, which the scripted run for her `question.answered` plays on this thread, follows it and carries `support-reply` as usual.
- It never shows a reply, a reason or a maker's answer that no event carried.

**T2.** `Composer` holds `support-input` and `support-send`.
- Send (or Enter) emits `support.asked` as above and clears the box.
- While the current run is working, `support-send` waits, so a person can't stack questions on a running run.
- In live mode, `support-live-note` under the input reads L12: "Live: your question goes to Claude (Anthropic) to answer. Please don't type personal details." (A2-14).

`Suggestions` renders `demoQuestions` for a side as buttons, with the test ID prefix it's given: `support-suggest-<n>` in the drawer and `support-piece-suggest-<n>` in the side panel (D1-44). Clicking one sends it as if typed. Each one has its own scripted run, about its own piece (D1-17, A2-10). S3 sets their order and words. On the buyer side they hold the tour's `d04` question first, a question about what the piece means to its maker, whose run ends with the reply that it will ask Grace N. and a `question.forwarded` to her, and a find question that goes through Elastic Agent Builder.

**T3.** `StepStrip` (`support-steps`) sits under the thread while a run works, and folds to one line once it's answered.
- It shows the newest steps of the current run (`support-step-<stepId>`), each as the agent's name and the step's `summary` in the slot's language, for example "Steward is checking the co-op's record".
- A step's kind sets its small icon (route, call, tool, result, check, handoff, reply). A `check` step is a guard, so its icon reads as a check, and its summary says what was checked, such as the tour's "Quote found word for word in the co-op's record".
- `support-working` says the agents are working until the run ends.
- Steps appear as their events arrive, so the strip follows the player clock in the tour and the 300 ms spacing in scripted answers.

**T4.** `AskAboutPiece` (`support-ask-piece`) is the right third of the piece page, for `SlotProps.pieceId`:
- the buyer suggestions as `support-piece-suggest-<n>`, with the tour's `d04` question first,
- an "Open help" button, and the newest reply about this piece as a one-line preview.

Asking from here emits `support.asked` with `contextIds: [pieceId]` and calls `openDrawer("support")`, because a person asked. It never opens the drawer for an event from the timeline.

**T5.** `SupportDrawer` (`support-drawer`) fills both drawer slots inside one kit `Panel` that declares `b14-swarm` and `b13-live`. It stacks:
- `support-records-note` at the top, reading L11: "AI agents answer here, using only Cindia's records. A person approves anything that moves money.",
- `support-new`,
- `Thread`, then `StepStrip`,
- `Suggestions` for its side, as `support-suggest-<n>`,
- `Composer`.

The Shop side uses the buyer's suggestions and passes what's on screen as context. The Sell side uses the seller's suggestions (payouts, listing help). The drawer fits the kit's 440 px drawer width at 900 px tall, and the newest message stays in view. `index.ts` exports the module. `support-flow.spec.ts` asks from the piece page and follows the answer.

## Acceptance
Specs open the route named and check by test ID only. A spec reaches the tour's run with `tourEvent()` from `support-lib.ts`: it seeks there with `seekToEvent(page, type, match, offsetMs)` once the timeline holds the event (after I2-tour), and until then it emits `run_01`'s scripted payloads from `src/mock/swarm.ts`. No spec seeks to a fixed time. A spec seeks before it asks, never after, because a seek drops a pending answer (lessons, F-ask-cindy). A scripted answer to a person counts as arrived when it shows within Playwright's default expect timeout, and specs check the order of its steps, not their wall-clock spacing. The 1.2-second start and the 300 ms spacing are I2-core's `planRun` unit test (B1-27). Expected values come from `src/mock/`, not typed in. After I2-tour, G4v2 checks `d04-support`.

1. **Given** `/shop/piece/pc_01`, **then** `support-ask-piece` shows the buyer suggestions as `support-piece-suggest-<n>`, `support-piece-suggest-1` reads the tour's `d04` question, and no `support-suggest-<n>` is on the page while the drawer is closed.
2. **Given** `/shop/piece/pc_01?drawer=support` and the tour's `support.asked` for `pc_01`, **then** `support-drawer` shows `support-records-note` (L11) at the top and the question as `support-msg-1`.
3. **Given** `/shop/piece/pc_01` with no drawer in the URL and a seek past the tour's `support.answered`, **then** the drawer stays closed (B1-18).
4. **Given** the drawer open and the tour's steps up to the Writer's, **then** `support-steps` shows each step of `run_01` in order, with the agent's name and summary, its `check` step included, and `support-working` shows. **Given** the tour's `support.answered`, **then** `support-reply` shows its reply in English, `support-agent` names the Writer, `support-refs` links `pc_01`, and `support-working` is gone.
5. **When** a person clicks `support-piece-suggest-2` on `/shop/piece/pc_01` on a fresh store, **then** the store holds a `support.asked` with `source: "user"`, `side: "buyer"`, `contextIds` holding `pc_01` and a `thr_user_` thread, the drawer opens, and that suggestion's own run arrives: its steps in order, then its reply, which isn't the fallback's.
6. **When** a person clicks each buyer suggestion in turn on `/shop/piece/pc_01`, starting a new conversation before each, **then** each gets the reply of its own run in `src/mock/swarm.ts`, never the fallback's (D1-17).
7. **When** a person clicks `support-piece-suggest-1` on `/shop/piece/pc_20`, an Ojibwe piece, **then** the fallback run's reply (L16) arrives, and `support-refs` holds no `pc_01` (A2-10).
8. **When** a person types a question no demo run matches and presses `support-send`, **then** the fallback run's reply shows. It says what scripted mode answers and that Live asks the swarm anything.
9. **When** a person clicks the question about what the piece means to its maker on `/shop/piece/pc_01`, **then** its reply arrives saying it will ask Grace N., and `support-forwarded-<questionId>` shows under it. **When** the maker's `question.answered` for that question is emitted with `source: "user"`, as her page's Send does, **then** `support-maker-answer-<questionId>` shows her exact text under her name with the `Demo data` badge and "In her own words", and the Writer's relay reply arrives after it as `support-reply`.
10. **Given** a `support.escalated` emitted for the current thread with a pending approval, **then** `support-handoff` shows its reason and that the co-op's manager has been asked.
11. **Given** `/sell/overview?drawer=support`, **then** `support-drawer` shows L11 and the seller's suggestions, and asking one emits a `support.asked` with `side: "seller"`, which its own run answers.
12. **Given** scripted mode, **then** both drawers show `simulated-badge` and no `support-live-note`. **Given** the Live switch on, **then** `support-live-note` shows L12 under `support-input`.
13. **Given** `demo-lang-toggle` set to Chinese, **then** L11, the suggestions, the step summaries and the reply show their Chinese text, and the maker's answer stays as she wrote it.
14. **While** a run is working, **then** `support-send` doesn't emit a second `support.asked`.

## Out of scope
- Running the agents. B14 does that, and B13 streams the steps. In scripted mode the registry plays the runs in `src/mock/swarm.ts`.
- The swarm graph and its L18 note. They're in the process feature's swarm view.
- Approving anything the swarm proposes. The approvals feature shows those approvals.
- The maker's side of "ask the maker": the question on her page and her reply box are F-seller-hub's (`maker.side`). The live loop is "Backend if time" (fix-plan 1.5).
- Accounts, email or a chat with a real person.

## Contract additions needed
Settled in contracts section 11, I2-core and I2-shell, listed so a builder knows where each lives:
- `src/mock/swarm.ts` exports `demoQuestions: { side: "buyer" | "seller", text: Text }[]`, the buyer's first being the tour's `d04` question, with one scripted run per entry (S3 T8, D1-17).
- `src/mock/agents.ts` exports `agents` and `getAgent(agentId)` (S3-catalog).
- `src/core/nav.ts` exports `openDrawer("ask" | "audit" | "support", ref?)`. On `/demo` the stage navigator turns it into an override that the next `beat.started` or a seek clears (I2-shell T1).
- The Shop drawer's props hold `pieceId`, `orderId` and `slug`, and the Sell drawer's `makerId` (I2-shell).
- A scripted run whose trigger names a piece answers only when the request's `contextIds` include it. Otherwise the fallback answers (I2-core T5, A2-10).
- `question.forwarded` `{ questionId, threadId, makerId, pieceId, text, lang }` and `question.answered` `{ questionId, answerId, makerId, text, lang }`, both keyed `b14-swarm`, held in `support.questions`. A person's `question.answered` is answered by the run whose `question` trigger names it, ending in the Writer's `support.answered` on the question's thread (I2-core T3, T8).
- Thread ID prefixes: `thr_01` for the tour, `thr_user_<n>` for a person's conversations.
- `seekToEvent(page, type, match, offsetMs)` in `tests/smoke/lib.ts` (I2-shell T5).

Still open, and in the fix report's needs:
- Each `forwarded` and `answered` entry in `support.questions` keeps its event's `id` as `eventId`, as thread messages do, so T1 can place it in arrival order (I2-core T3).
- `contextIds` may also hold a store page's community and a maker page's maker (contracts section 3).
- S3's run for the meaning question ends with the Writer's reply that it will ask Grace N., then a `question.forwarded` to `mkr_01` about `pc_01` on the asker's thread, and a `question` trigger run relays her answer (S3 T8).
