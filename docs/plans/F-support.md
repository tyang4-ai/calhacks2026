# F-support · Help, answered by the agent swarm

Priority: P0 · Wave: V2 · Depends on: G1b, G2b · Folder: src/features/support/ · Made real by: B14, B13

SCOPE: src/features/support/, tests/features/support-*

## Goal
A buyer asks a real question about a piece ("Did the maker stitch this herself? Can it arrive by October 10?"). Under the conversation they watch the small agents take turns: Intake reads it, the Steward checks the community's page, the Clerk checks shipping, the Writer answers. The reply names the agent whose words it is. When a question needs a person, the screen says plainly that the owner is taking over. Sellers get the same help on the Sell side for payouts and listings.

## Read first
- `docs/v2/brief.md`: Help any time, the agent swarm, the Sell side
- `docs/v2/contracts.md`:
  - section 2: AgentSpec and SwarmRun
  - section 3: `support.asked`, `swarm.step`, `support.answered`, `support.escalated`, the payload rule, the Requests rows (`support.asked` and its timing)
  - section 4: slots `shop.drawer.support`, `studio.drawer.support`, `shop.piece.side`, SlotProps `side` and `pieceId`, the support test IDs
  - section 6: the agent roster
  - section 7: `ChatThread`, `ChatBubble`, `Drawer`, `Badge`
  - section 8: beat `d04-support`
  - section 9: the glossary rows
- `docs/common/events.md` (after I2-core): the store, `userEvent()`, the Simulated rule
- `docs/common/ui-contract.md` (after I2-core): SlotProps, feature modules, drawers
- `docs/common/design-system.md` (after I2-core): words on screen (Cindy speaks in first person, short and specific, and never claims certainty she doesn't have)

## Interfaces
- **Reads events** through `useCindia()`, from the `support` and `swarm` store keys: `support.asked` (the person's messages), `support.answered` (the reply, its `agentId` and `refIds`), `support.escalated` (the reason and the approval), and `swarm.step` (the steps of each run). It also reads `approvals` (whether an escalation's approval is still pending) and `sources`. The language comes from `SlotProps.lang`.
- **Reads data:**
  - the roster from `src/mock/agents.ts`: an agent's name and its kind, `claude` or `code`,
  - `demoQuestions` from `src/mock/swarm.ts`: the questions scripted mode answers, buyer side and seller side, with the tour's `d04` question first,
  - `getById()` for the pieces and orders a reply's `refIds` name.
- **Reads props:** `SlotProps.side` on the two drawers, `SlotProps.pieceId` on `shop.piece.side` and on the Shop drawer when a piece page is open, and `SlotProps.orderId` on the receipt page.
- **Emits:** `support.asked` with `userEvent()`: `threadId`, `side`, `text`, `lang` (the slot's), and `contextIds` (the piece or order on screen, from SlotProps).
  - The first message on a side starts `thr_user_<n>`, and follow-ups reuse the current thread. "New conversation" starts the next `thr_user_`.
  - The sources registry answers: in scripted mode with the matching run from `src/mock/swarm.ts` or the fallback run, its steps 300 ms apart, and in live mode with B14 (20 seconds at most, scripted on failure).
- **Opens the drawer** with `openDrawer("support")` from `src/core/nav.ts`:
  - when a person asks from the piece page's side panel,
  - and when a buyer `support.asked` whose `contextIds` include the open piece arrives from the timeline. This is the tour's `d04-support`.
- **Exports:** `src/features/support/index.ts` default-exports `{ id: "support", slots: { "shop.drawer.support": SupportDrawer, "studio.drawer.support": SupportDrawer, "shop.piece.side": AskAboutPiece } }`. One component serves both drawers and reads `SlotProps.side`.
- **Source keys on the badge:** `b14-swarm`, `b13-live`.
- **Test IDs from the contract:** `support-drawer`, `support-input`, `support-send`, `support-thread`, `support-reply`, `support-agent`, `support-handoff`.
- **Internal test IDs:**
  - `support-msg-<n>`: one message in the thread, from 1,
  - `support-steps`: the step strip,
  - `support-step-<stepId>`,
  - `support-working`,
  - `support-suggest-<n>`: a suggested question, from 1,
  - `support-new`,
  - `support-ask-piece`: the side panel,
  - `support-refs`: the records a reply names.
- **Labels from the glossary:** help, agent swarm, rule-based, approval, needs your approval, plus each agent's name from the roster.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): every short string these screens need that the glossary lacks, English and Chinese side by side | src/features/support/strings.ts | none | lead |
| T1 | The thread: messages, the reply and its agent, the handoff notice | src/features/support/threadModel.ts, src/features/support/Thread.tsx, tests/features/support-thread.spec.ts | T0 | opus |
| T2 | Asking: the composer and the suggested questions | src/features/support/Composer.tsx, src/features/support/Suggestions.tsx, tests/features/support-ask.spec.ts | T0 | sonnet |
| T3 | The step strip: the agents taking turns | src/features/support/StepStrip.tsx, tests/features/support-steps.spec.ts | T1 (`threadModel.ts`) | opus |
| T4 | The piece page side panel: "Ask about this piece" | src/features/support/AskAboutPiece.tsx, tests/features/support-piece.spec.ts | T2 | sonnet |
| T5 | Assemble the drawer for both sides and fill the slots (lead) | src/features/support/SupportDrawer.tsx, src/features/support/index.ts, tests/features/support-flow.spec.ts | T1 to T4 | lead |

**How the tasks fit:** the lead writes T0 before spawning any builder. T1's `threadModel.ts` is the one place that picks the current thread and its runs from the store, and T3 imports it. Builders run `npm run check:scope` on their files and write their spec. The specs run for the first time once T5 fills the slots, and the lead sends any failure back to the builder who owns the file.

**T1.** `threadModel.ts` exports pure selectors:
- the current thread for a side (the newest thread of that side in the store),
- its messages in order: each `support.asked` as the person's, each `support.answered` and `support.escalated` as Cindia's,
- the newest run for the thread,
- whether that run is still working (it has steps but no `support.answered` or `support.escalated`).

`Thread` (`support-thread`) draws the kit's `ChatThread`, one `ChatBubble` per message (`support-msg-<n>`). The person's are on the right. Cindia's are on the left with the agent's name from the roster and its kind, using the Rule-based badge for `code` agents.
- The newest reply carries `support-reply`, and its agent's name is in `support-agent`.
- A reply's `refIds` show under it as small links (`support-refs`) to the piece or order.
- A `support.escalated` shows `support-handoff`: its reason in the slot's language, and a line that the owner has been asked to decide, while its approval is pending.
- It never shows a reply or a reason that no event carried.

**T2.** `Composer` holds `support-input` and `support-send`. Send (or Enter) emits `support.asked` as above and clears the box. While the current run is working, `support-send` waits, so a person can't stack questions on a running run. `Suggestions` renders `demoQuestions` for a side as buttons (`support-suggest-1` onward). Clicking one sends it as if typed. Scripted mode answers these, so the buyer's first suggestion is the tour's `d04` question.

**T3.** `StepStrip` (`support-steps`) sits under the thread while a run works, and folds to one line once it's answered.
- It shows the newest steps of the current run (`support-step-<stepId>`), each as the agent's name and the step's `summary` in the slot's language, for example "Steward is checking the community page".
- A step's kind sets its small icon (route, call, tool, result, check, handoff, reply).
- `support-working` says the agents are working until the run ends.
- Steps appear as their events arrive, so the strip follows the player clock in the tour and the 300 ms spacing in scripted answers.

**T4.** `AskAboutPiece` (`support-ask-piece`) is the right third of the piece page, for `SlotProps.pieceId`:
- the three buyer suggestions, with the tour's `d04` question first,
- an "Open help" button, and the newest reply about this piece as a one-line preview.

Asking from here emits `support.asked` with `contextIds: [pieceId]` and calls `openDrawer("support")`. It also opens the drawer when a buyer `support.asked` naming this piece arrives from the timeline, so the tour's question shows in the drawer.

**T5.** `SupportDrawer` (`support-drawer`) fills both drawer slots inside one kit `Panel` that declares `b14-swarm` and `b13-live`. It stacks `Thread`, `StepStrip`, `Suggestions` for its side, and `Composer`, with `support-new` at the top. The Shop side uses the buyer's suggestions and passes the open piece or order as context. The Sell side uses the seller's suggestions (payouts, listing help). The drawer fits the kit's 440 px drawer width at 900 px tall, and the newest reply stays in view. `index.ts` exports the module. `support-flow.spec.ts` asks from the piece page and follows the answer.

## Acceptance
Specs open the route named and check by test ID only.
- Until `I2-tour` adds the tour timeline, a spec gets the tour's run by emitting the scripted payloads from `src/mock/swarm.ts` with `window.__cindia.emit()` at the beat's times, after a `seek()`.
- After `I2-tour`, G4v2 checks `d04-support`.

1. **Given** `/shop/piece/pc_01`, **then** `support-ask-piece` shows three suggestions, and `support-suggest-1` reads the tour's `d04` question.
2. **Given** the tour's `support.asked` for `pc_01` emitted, **then** the Shop support drawer opens and `support-drawer` shows the question as `support-msg-1`.
3. **Given** the tour's steps emitted, **then** `support-steps` shows each step as it arrives, with the agent's name (Cindy, Intake, Steward, Clerk, Writer) and its summary, and `support-working` shows until the answer.
4. **Given** the tour's `support.answered` emitted, **then** `support-reply` shows its reply in English, `support-agent` names the Writer, `support-refs` links `pc_01`, and `support-working` is gone.
5. **When** a person clicks `support-suggest-2` on a fresh store, **then** the store holds a `support.asked` with `source: "user"`, `side: "buyer"`, `contextIds` holding `pc_01` and a `thr_user_` thread. About 1.2 seconds later in real time, steps arrive 300 ms apart, followed by the scripted reply.
6. **When** a person types a question no demo run matches and presses `support-send`, **then** the fallback run's reply shows. It says scripted mode answers the demo questions and Live asks the swarm anything.
7. **Given** a `support.escalated` emitted for the current thread with a pending approval, **then** `support-handoff` shows its reason and that the owner has been asked.
8. **Given** `/sell/overview?drawer=support`, **then** `support-drawer` shows the seller's suggestions, and asking one emits a `support.asked` with `side: "seller"`.
9. **Given** scripted mode, **then** both drawers show `simulated-badge`.
10. **Given** `demo-lang-toggle` set to Chinese, **then** the suggestions, the step summaries and the reply show their Chinese text.
11. **While** a run is working, **then** `support-send` doesn't emit a second `support.asked`.

## Out of scope
- Running the agents. B14 does that, and B13 streams the steps. In scripted mode the registry plays the runs in `src/mock/swarm.ts`.
- The swarm graph. It's in the process feature's swarm view.
- Approving anything the swarm proposes. The approvals feature shows those approvals.
- Accounts, email or chat with a real person. The handoff is an approval for the owner.

## Contract additions needed
- `src/mock/swarm.ts` exports `demoQuestions: { side: "buyer" | "seller"; text: Text }[]`: the questions scripted mode answers, the buyer's first being the tour's `d04` question (S3-catalog).
- `src/mock/agents.ts` exports `agents` and `getAgent(agentId)` (S3-catalog).
- `src/core/nav.ts` exports `openDrawer("ask" | "audit" | "support", ref?)`. On `/demo` the shell opens that drawer in the visible frame (I2-core, I2-shell).
- `SlotProps.orderId` is filled on `/shop/receipt/:orderId`, and `SlotProps.pieceId` on the Shop drawer while a piece page is open (I2-shell).
- Thread ID prefixes: `thr_01` for the tour, `thr_user_<n>` for a person's conversations.
