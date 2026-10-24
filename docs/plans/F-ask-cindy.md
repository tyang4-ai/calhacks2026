# F-ask-cindy · Ask Cindy (F14)

Priority: P0 · Wave: W1 · Depends on: G2 · Folder: src/features/ask-cindy/ · Made real by: B07

## Goal
The owner opens Ask Cindy and asks in Chinese or English. 这个月哪件作品最赚钱? turns into a chart, and "why did you flag this?" gets Cindy's reasons with the records behind them.

## Read first
- `docs/common/data-model.md`: Units and rules, the Piece, Flag and Statement rows, and `src/mock/ask.ts` in the files table.
- `docs/common/events.md`: `ask.asked`, `ask.answered`, `ChartSpec`, the envelope (sources `"user"` and `"scripted"`, the `key` field), the store, and the Simulated badge rule.
- `docs/common/ui-contract.md`: the `studio.drawer.ask` slot, how the console opens drawers, the test IDs below, the language rules, and the test hook for driving the player.
- `docs/common/design-system.md`: `Panel`, `Button`, `Badge`, `MakerMark`, `chartTheme`, the voice rules for Cindy under Words on screen.
- `docs/common/glossary.md`: Ask Cindy, flag, the catch, trust, piece.
- `docs/common/demo-script.md`: what plays after the 60 seconds.

## Interfaces
- Reads:
  - Data: the three canned entries in `src/mock/ask.ts`, each a question in both languages plus the `ask.answered` payload (`questionId`, `answer`, `chart?`, `refIds`). The records named in `refIds` come through `getById()`.
  - Store keys: `ask`, `lang`, `sources`, `clock`.
  - UI kit: `Panel`, `Button`, `Badge` (Simulated), `MakerMark`, `chartTheme` for Recharts.
- Emits:
  - `ask.asked` with `source: "user"`, `questionId`, `text`, `lang`, when the owner sends a question.
  - `ask.answered` with `source: "scripted"` and `key: "b07-ask"`, carrying the matching canned payload, through the store's `emit()` like every scripted event, so B07 can take it over without a screen change.
- Exports: `{ id: "ask-cindy", slots: { "studio.drawer.ask": AskDrawer } }` from `src/features/ask-cindy/index.ts`.
- Test IDs: `ask-cindy-input`, `ask-cindy-answer`, `ask-cindy-chart`. Internal to this feature: `ask-cindy-send`, `ask-cindy-suggestion-<n>` (the three canned questions, `n` from 1), `ask-cindy-refs`.
- Source key it renders: `b07-ask`.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Question matcher: a pure function from typed text and language to one canned entry or none. It trims, ignores case and treats full-width and half-width punctuation alike (？ and ?). Unit tests cover all three canned questions in both languages and a miss | `src/features/ask-cindy/matchQuestion.ts`, `src/features/ask-cindy/matchQuestion.test.ts` | none | opus |
| T2 | Answer view: the answer text in the current language, the chart from a `ChartSpec` (bar or line, Recharts with `chartTheme`, amounts from cents), and the list of records in `refIds` with short labels | `src/features/ask-cindy/AnswerCard.tsx`, `src/features/ask-cindy/AnswerChart.tsx`, `tests/features/ask-cindy-answer.spec.ts` | none | opus |
| T3 | Drawer and input: the question box with send, the three suggestions in the current language, the thread of questions and answers, and on send the two events above. A question with no match gets a short reply that lists the three suggestions. The Simulated badge shows while `sources["b07-ask"]` is `"scripted"` | `src/features/ask-cindy/AskDrawer.tsx`, `src/features/ask-cindy/AskInput.tsx`, `tests/features/ask-cindy-ask.spec.ts` | T1, T2 | opus |
| T4 | Wire the slot (lead) | `src/features/ask-cindy/index.ts` | T3 | lead |

T1 and T2 run side by side. Builders run their own spec with `npm run test:feature -- ask-cindy`.

## Acceptance
- Given the console after the close with the drawer open, when the owner clicks `ask-cindy-suggestion-1` (这个月哪件作品最赚钱?), then `ask-cindy-answer` shows the canned answer in Chinese and `ask-cindy-chart` draws one bar per label in its `ChartSpec`.
- When the owner types "why did you flag this?" in `ask-cindy-input` and sends, then `ask-cindy-answer` shows the English explanation and `ask-cindy-refs` lists the records of `flg_01`.
- When the language toggle switches, then the shown answer switches language without asking again.
- When the owner sends a question that matches nothing, then the reply lists the three suggestions and no `ask.answered` is emitted.
- After a matched send, the store holds an `ask.asked` with `source: "user"` and an `ask.answered` with `key: "b07-ask"` for the same `questionId`. Sending the same question twice shows one answer, not two.
- While `sources["b07-ask"]` is `"scripted"`, the drawer shows `simulated-badge`.
- No request goes beyond localhost.

## Out of scope
- Claude answering free-form questions. That's B07.
- Voice input, saving the history, and opening the audit drawer from a record (F-audit, W2).
