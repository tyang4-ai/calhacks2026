# F-ask-cindy · Ask Cindy (F14)

Priority: P0 · Wave: W1 · Depends on: G2 · Folder: src/features/ask-cindy/ · Made real by: B07

## Goal
The owner opens Ask Cindy and asks in Chinese or English. 这个月哪件作品最赚钱? turns into a chart, and "Why did you flag the gallery payment?" gets Cindy's reasons with links to the three records.

## Read first
- `docs/common/data-model.md`: Units and rules, the IDs that live only in events (`ask_01` to `ask_03`), the Piece and Flag rows, and `src/mock/ask.ts` in the files table.
- `docs/common/events.md`: `ask.asked`, `ask.answered`, `ChartSpec`, Requests from people (the registry answers `ask.asked`, 1.2 seconds later in real time), and the store.
- `docs/common/ui-contract.md`: the `studio.drawer.ask` slot and its source key, Drawers (the top bar's Ask Cindy button opens this one), Language, Simulated badge, Test hooks, and the test IDs below.
- `docs/common/design-system.md`: `Panel`, `Button`, `MakerMark`, `chartTheme`, and Cindy's voice under Words on screen.
- `docs/common/glossary.md`: Ask Cindy, flag, the catch, trust, piece.
- `docs/common/demo-script.md`: After the 60 seconds, item 1.

## Interfaces
- Reads:
  - Data: `cannedAnswers` from `src/mock/ask.ts` (`ask_01` to `ask_03`, each entry's `questions` in both languages) for the suggestions. The records named in an answer's `refIds` come through `getById()`.
  - Store keys: `ask`, `clock`. The language comes from `SlotProps.lang`.
  - UI kit: `Panel` (declaring `b07-ask`), `Button`, `MakerMark`, `chartTheme` for Recharts.
- Emits: `ask.asked` (`questionId`, `text`, `lang`), built with `userEvent()` from `src/core/events.ts` so it has `source: "user"`, when the owner sends a question. It carries no `key`, since `events.md` gives `ask.asked` none, and the registry routes it to `b07-ask` by its Requests from people table. A suggestion sends its own ID (`ask_01` to `ask_03`). A typed question gets `ask_user_<n>`, counting from 1 in the store's `ask` state. The sources registry answers with `ask.answered`, scripted from `src/mock/ask.ts` or live from B07. The feature never writes an answer itself.
- Exports: `{ id: "ask-cindy", slots: { "studio.drawer.ask": AskDrawer } }` from `src/features/ask-cindy/index.ts`.
- Test IDs: `ask-cindy-input`, `ask-cindy-answer`, `ask-cindy-chart`. Internal to this feature: `ask-cindy-send`, `ask-cindy-suggestion-<n>` (the three canned questions, `n` from 1), `ask-cindy-refs`, `ask-cindy-thinking` (shown while a question waits for its answer).
- Source key: `b07-ask`.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): every short string these screens need that the glossary lacks, English and Chinese side by side | `src/features/ask-cindy/strings.ts` | none | lead |
| T1 | Answer view: the answer text in `SlotProps.lang`, the chart from a `ChartSpec` (bar or line, Recharts with `chartTheme`, amounts from cents), and the list of records in `refIds` with short labels | `src/features/ask-cindy/AnswerCard.tsx`, `src/features/ask-cindy/AnswerChart.tsx`, `tests/features/ask-cindy-answer.spec.ts` | T0 | opus |
| T2 | Drawer and input: the question box with send, the three suggestions, the thread of questions and answers read from the store, the waiting state until the answer for a `questionId` arrives, and `ask.asked` on send | `src/features/ask-cindy/AskDrawer.tsx`, `src/features/ask-cindy/AskInput.tsx`, `tests/features/ask-cindy-ask.spec.ts` | T1 | opus |
| T3 | Wire the slot (lead) | `src/features/ask-cindy/index.ts` | T2 | lead |

The lead writes T0 before spawning any builder, because `design-system.md` puts a feature's short UI strings in its own `strings.ts`. A builder that needs a string T0 lacks lists it under `needs:`, and the lead adds it. Builders run their own spec with `npm run test:feature -- ask-cindy`. Tests move the player past the 1.2-second answer delay with `window.__cindia.player.seek()` instead of waiting.

## Acceptance
- Given `/studio/close?drawer=ask` after the close, when the owner clicks `ask-cindy-suggestion-1` (这个月哪件作品最赚钱?), then `ask-cindy-thinking` shows, and 1.2 seconds later in real time, `ask-cindy-answer` shows the canned answer and `ask-cindy-chart` draws one bar per label in its `ChartSpec`.
- When the owner types "Why did you flag the gallery payment?" in `ask-cindy-input` and sends, then `ask-cindy-answer` shows the explanation and `ask-cindy-refs` lists the three records of `flg_01`.
- When the language toggle switches, then the shown answer switches language without asking again.
- When the owner sends a question that matches none of the three, then the registry's reply (that scripted mode answers the three demo questions) shows in `ask-cindy-answer`, and the suggestions stay visible.
- After a send, the store holds an `ask.asked` with `source: "user"`, and one `ask.answered` for the same `questionId`.
- In scripted mode the drawer shows `simulated-badge`.
- No request goes beyond localhost.

## Out of scope
- Matching questions to answers. The sources registry does that in scripted mode and B07 in live mode.
- Voice input, saving the history, and opening the audit drawer from a record (F-audit, W2).
