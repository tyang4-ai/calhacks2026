# M-approvals · The owner's approvals on the desktop (v2 migration of F-approvals)

Priority: P0 · Wave: V2 · Depends on: G1b, G2b (its acceptance reads S3's `apr_03` to `apr_05`), and B13-live's B08 owner-route task (T7, D1-19) before its G3 · Folder: src/features/approvals/ · Made real by: B02, B08, B14, B15

SCOPE: src/features/approvals/, tests/features/approvals-*

## Goal
Everything Cindy proposed sits in one inbox on the Sell site of the Diné Weaving and Silver Co-op. The list is on the left, the selected proposal in full on the right, and "Cindy proposed this. Only you can approve it." is on every one. The owner, Ruth B., approves and the cinnabar seal lands. v1's follow-up and maker payouts work as before. v2 adds the new kinds: reporting a possible copy, publishing a listing, publishing a storefront, releasing a milestone, and a support action. Each one says plainly what is a demo and what Cindia hasn't checked.

## Read first
- `docs/v2/brief.md`: Sell, the swarm table ("Never does"), the principles
- `docs/v2/fix-plan.md`: section 1.1 (the names), section 1.6 (the sandbox market), section 1.9 (who the watch looks for)
- `docs/v2/contracts.md`, which `docs/common/` holds once I2-core is green:
  - section 2: the new Approval kinds and `apr_03` to `apr_05`
  - section 3: `counterfeit.flagged`, `listing.requested`, `listing.drafted`, `storefront.drafted`, `wip.milestone_paid`, `support.answered`, `support.escalated`
  - section 4: `owner.main` renders as the Sell `approvals` view, `/owner` redirects to `/sell/approvals`, the camera `sell-approvals`
  - section 8: beat `d09-approve`
  - section 11: the inline `approval` object on `approval.requested`, `/sell/approvals?ref=<approvalId>`, the ID scheme
  - section 12: labels L20, L24 and L27
- `docs/plans/F-approvals.md`: what each v1 component does and its acceptance
- `docs/common/design-system.md`: `Seal` and its motion, `Button` (`seal`), `Toast`, `MakerMark`, `Money`, `Panel`, `Badge`
- `docs/common/glossary.md`: approval, approve, seal, over limit, follow-up, maker payout, held, decline, approved, sent, and the v2 rows (counterfeit watch, similarity, new listing, storefront, milestone)
- The current code in `src/features/approvals/` and its specs in `tests/features/approvals-*`

## Interfaces
- **Reads events** through `useCindia()`:
  - `approval.requested`, `approval.granted`, `approval.declined`, `followup.drafted`, `followup.sent`, `payout.sent` (the `approvals` key),
  - for the new kinds' details: `counterfeit.flagged` (the `watch` key), `listing.requested` and `listing.drafted` (the `listings` key), `storefront.drafted` (the `storefront` key), `wip.milestone_reached` and `wip.milestone_paid` (the `wip` key), `support.answered` and `support.escalated` (the `support` key),
  - `sources`, and each event's `source` in the store's `log`, to tell a live hit from a scripted one.
  
  The language comes from `SlotProps.lang`, which starts in English on the Sell site.
- **Reads data** with `getById()`:
  - the Approval (`kind`, `subjectIds`, `amountCents`, `overLimit`, `decisionDate`),
  - for v1: `mpo_01` to `mpo_03`, the makers, `flg_01`, `own_01` (the seal's character), `std_dine` (`payoutLimitCents`),
  - for v2: the CounterfeitCandidate, the ListingDraft, the Storefront, the WorkInProgress and its milestone, and the Community, as each kind's `subjectIds` name them.
  
  **When `getById()` finds no Approval** (a live `apr_user_<n>` from B14 or B15), the feature uses `approvals.items[approvalId].approval`, the inline object the store kept from that `approval.requested`: `kind`, `subjectIds`, `amountCents`, `overLimit`, `summary` and its `decisionDate` (B1-15, D1-16). An approval with neither shows its ID and "Details not available" and can still be declined.
  
  Figures that live events recompute (the follow-up text, the drafted listing, the hit's similarity) render from the event payloads.
- **The Phase A stage:** until I2-tour removes the legacy boxes, I2-shell shows `owner.main` in a 390 by 844 box, v1's phone size, on the `/demo` stage only, so the v1 demo keeps playing. Routes never use that box, so this plan builds and tests at the full Sell frame, 1440 by 900.
- **Which approval is selected:** `SlotProps.refId` when `/sell/approvals?ref=<approvalId>` sets it. Otherwise the approval named by the newest `approval.requested`, `approval.granted` or `approval.declined` in the store, by its place in the store's `log`. So in `d09-approve` the detail follows the tour's grants for `apr_01` and `apr_02` and the large seal lands there, while `apr_04` stays pending from earlier in the tour. Clicking a list card selects it, as UI state only.
- **Emits,** with `source: "user"`, `by: "own_01"`, through `userEvent()`:
  - `approval.granted` dated with the approval's `decisionDate`,
  - `approval.declined` with the typed reason (the same string in `en` and `zh`).
  
  The first decision wins, as v1.
- **Exports:** `src/features/approvals/index.ts` default-exports `{ id: "approvals", slots: { "owner.main": ApprovalsView } }`.
- **Source keys on the badge:** `b08-approvals`, `b02-explain`, `b04-bank`, plus `b14-swarm` and `b15-watch` for the new kinds' details (contracts section 11).
- **Test IDs:**
  - v1, kept: `approvals-item-<approvalId>` (now the list card), `approvals-approve-<approvalId>`, `approvals-seal-<approvalId>` (on the list card, so two seals can show at once).
  - v1 internal, kept: `approvals-decline-<approvalId>`, `approvals-reason-<approvalId>`, `approvals-toast`, `approvals-payout-<makerPayoutId>`.
  - New internal: `approvals-detail` (the right column), `approvals-empty` (nothing proposed yet), `approvals-hit` (a report's found listing), `approvals-hit-unverified` (L20), `approvals-confirm-<approvalId>` (the owner's check before approving a live report), `approvals-listing` (a listing's draft), `approvals-translated-<lang>` (L27 beside the version the maker didn't write), `approvals-milestone` (a milestone release), `approvals-next` (the "what happens next" line after a grant).
- **Labels from the glossary:** needs your approval, proposed by Cindy, approve, sealed, decline, declined, approved, sent, over your $500 limit, follow-up, maker payout, held, counterfeit watch, similarity, new listing, storefront, milestone, work in progress. From contracts section 12: L20, L24 and L27.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): the desktop strings, and a title, a summary line and a "what happens next" line for each new kind, English and Chinese side by side, with L20, L24 and L27 as contracts section 12 words them | src/features/approvals/strings.ts | none | lead |
| T1 | Spec helper: re-export `seekToEvent` from `tests/smoke/lib.ts`, open `/sell/approvals`, seed a v2 state with `window.__cindia.emit` | tests/features/approvals-lib.ts | none | sonnet |
| T2 | The inbox list: a compact card per approval, in request order, with its status, amount and small seal, and select on click | src/features/approvals/approvalSummary.ts, src/features/approvals/ApprovalCard.tsx, src/features/approvals/ApprovalList.tsx, tests/features/approvals-cards.spec.ts | T0, T1 | opus |
| T3 | The detail column for every kind | src/features/approvals/FollowUpDraft.tsx, src/features/approvals/PayoutLines.tsx, src/features/approvals/KindDetails.tsx, tests/features/approvals-details.spec.ts | T0, T1 | opus |
| T4 | Decide: approve, decline with a reason, the owner's check on a live report, the large seal on the detail | src/features/approvals/DecisionBar.tsx, tests/features/approvals-decide.spec.ts | T0, T1 | sonnet |
| T5 | Assemble the view and fill the slot (lead). Remove the phone inbox | src/features/approvals/ApprovalsView.tsx, src/features/approvals/OwnerInbox.tsx (deleted), src/features/approvals/index.ts, tests/features/approvals-flow.spec.ts, tests/features/approvals-frame.spec.ts, tests/features/approvals-live.spec.ts | T2 to T4 | lead |

**How the tasks fit:**
- The lead writes T0 first.
- T1 is small and runs first, since every spec imports it.
- T2 to T4 run two at a time.
- **Defaults keep v1 until T5.** The slot still renders `OwnerInbox` until T5 swaps it, and `OwnerInbox` imports `approvalSummary.ts`, `FollowUpDraft.tsx` and `PayoutLines.tsx`. So T2 to T4 keep every existing export and prop working as it does in v1, add new props as optional with v1 defaults, and add new components beside the old ones. The v1 approvals specs and the Phase A demo pass after each task, not only after T5 (B1's SCOPE note).
- I2-core's fallout step left placeholder entries for the new kinds in `approvalSummary.ts`. T2 replaces them.
- The old phone layout code (the compact cards, the scroll keeping and the rounded-corner spacer in `OwnerInbox`) goes away in T5. Nothing from it is needed on the desktop.

**T1.** `approvals-lib.ts` exports:
- `seekToEvent(page, type, match, offsetMs)`, re-exported from `tests/smoke/lib.ts`, never copied,
- `openApprovals(page, ref?)`: it opens `/sell/approvals`, or `?ref=` when given, and waits for the slot to fill,
- `seed(page, events)`: it emits the given events through `window.__cindia.emit`, so the new kinds can be tested before the tour carries them.

Fixed beat times are never used, because I2-tour moves every beat.

**T2.** `approvalSummary.ts` turns each kind into a title, one summary line and an amount:
- `follow_up`: the gallery and the short amount from `flg_01`.
- `maker_payouts`: three payouts, their total and the $340.00 held in total (the sum of their `heldCents`), as v1's card showed it.
- `report_listing`: the found listing's title and its text match, from the `counterfeit.flagged` for the subject.
- `listing_publish`: the draft's title, from the `listing.drafted` for the subject.
- `storefront_publish`: the storefront's community.
- `milestone_release`: the commission's title, the milestone's label and `Approval.amountCents`.
- `support_action`: the thread's latest reply, shortened.
- an inline approval: its `summary` in the slot's language, then the kind's own line when its subject's event is in the store.

`ApprovalCard` (`approvals-item-<approvalId>`) shows the summary, the status (pending, approved, declined), the proposed-by-Cindy line, the over-limit mark when `overLimit`, and the small seal (`approvals-seal-<approvalId>`) once a grant is in the store. `ApprovalList` stacks the cards in request order. The selected card carries `aria-current`, and clicking a card selects it.

**T3.** `KindDetails` renders the selected approval in `approvals-detail`, by kind:
- `follow_up` uses `FollowUpDraft` as v1: the English `to`, `subject` and `body` from `followup.drafted`, and sent once `followup.sent` arrives.
- `maker_payouts` uses `PayoutLines` as v1: `approvals-payout-<makerPayoutId>` lines with `MakerMark`, name, amount, held amount, the over-limit mark, and sent on `payout.sent`.
- `report_listing` (`approvals-hit`): the found listing's title, its URL as plain text (never a link), the snippet, the text match as F-watch shows it ("Text match" and the payload's `similarity` to two places, L19's first sentence) and the claim from the `counterfeit.flagged` payload. Then the Reporter's draft through `FollowUpDraft`, when a `followup.drafted` names this approval. Then the fairness line, "Possible look-alike. Cindy doesn't accuse anyone. You decide.", followed by `approvals-hit-unverified` with L20: "Not verified by Cindia. That alone doesn't make it fake." (A2-13)
- `listing_publish` (`approvals-listing`): the draft's title and summary in both languages, its facet and vibe words as kit `Chip`s, and each check with passed or needs review, from `listing.drafted`. The version in the language the maker didn't write (not the `lang` of the listing's `listing.requested`, or `ListingDraft.lang` for `lst_01`) carries `approvals-translated-<lang>` with L27: "Translated by the Lister agent. The maker hasn't checked this version." (A2-15)
- `storefront_publish`: the drafted blocks in order, from `storefront.drafted`.
- `milestone_release` (`approvals-milestone`): the commission, the maker and the buyer, the milestone's label, `Approval.amountCents` through `Money`, and paid once `wip.milestone_paid` for that milestone arrives.
- `support_action`: the thread's latest reply and escalation reason, and `Approval.amountCents` when set.

Every detail repeats the proposed-by-Cindy line. Before a kind's event has arrived, the detail says what it's waiting for, in plain words.

**T4.** `DecisionBar` sits at the bottom of the detail while the approval is pending:
- approve is the kit `Button` in its `seal` variant (`approvals-approve-<approvalId>`),
- decline (`approvals-decline-<approvalId>`) opens a one-line reason box (`approvals-reason-<approvalId>`),
- for a `report_listing` whose `counterfeit.flagged` came from a live scan, approve stays disabled until the owner ticks `approvals-confirm-<approvalId>`: "I've looked at this listing myself." (A2-1, point 3). A scripted hit needs no tick.

On a grant from anyone, the large kit `Seal` lands on the detail with the owner's `surnameChar` and the grant's date (no test ID, since the list card carries `approvals-seal-<approvalId>`), and the bar goes. After the grant, `approvals-next` shows the kind's "what happens next" line from T0. For `report_listing` it reads L24: "Nothing was sent. In this demo, reports never leave Cindia." (A2-13). A second decision on the same approval changes nothing.

**T5.** `ApprovalsView` lays out the list (a third) and the detail (two thirds) inside one kit `Panel` that declares the source keys above, sized for the Sell frame at 1440 by 900.
- `approvals-empty` shows until the first `approval.requested`.
- The kit `Toast` (`approvals-toast`) shows "Needs your approval" when a request arrives while this view is open.
- `OwnerInbox.tsx` is deleted.
- `index.ts` exports the module.
- The three lead-owned specs move to `/sell/approvals` and event-anchored seeks:
  - `approvals-flow.spec.ts` plays the follow-up and payouts from their requests to their grants,
  - `approvals-frame.spec.ts` checks the `d09-approve` IDs inside `frame-studio`,
  - `approvals-live.spec.ts` keeps its B08 two-screen check, with the owner screen on `/sell/approvals?screen=owner`, the route B13-live's T7 makes the adapter poll (D1-19, D2-8). It keeps its skip when `/api/health` doesn't list `b08`. If that task hasn't landed when T5 runs, the lead reports it under `needs:` instead of changing the spec's checks.

## Acceptance
Every spec opens `/sell/approvals`, moves the timeline with `seekToEvent(page, type, match, offsetMs)` from `tests/smoke/lib.ts` (or seeds events with `seed` for the new kinds), never a fixed time, and checks by test ID only. Arrival is asserted with Playwright's default expect timeout, never a wall-clock window. "Inside the frame" means fully inside `frame-studio` and every clipping ancestor at 1440 by 900.

1. **Given** 300 ms after the timeline's `approval.requested` for `apr_01`, **then** `approvals-item-apr_01` shows the follow-up to Fogline Gallery for $340.00 as pending, and `approvals-detail` shows the draft from the `followup.drafted` payload.
2. **Given** 300 ms after `approval.requested` for `apr_02`, **then** `approvals-item-apr_02` reads $340.00 held, as v1's card did (the Phase A `test:demo` and G4v2's `d09-approve` read it there). **When** the owner clicks `approvals-item-apr_02`, **then** `approvals-detail` lists `approvals-payout-mpo_01` to `approvals-payout-mpo_03`, each with the maker's name (Grace N., Lena T. and Mae K.) and amount, shows $340.00 held, and marks each payout over $500.00.
3. **Given** any moment, **then** every card and the detail say Cindy proposed it and only the owner can approve it, and no `approvals-seal-<approvalId>` shows before a grant for it.
4. **Given** 300 ms after the timeline's `approval.granted` for `apr_02`, **then** `approvals-item-apr_01`, `approvals-item-apr_02`, `approvals-seal-apr_01` and `approvals-seal-apr_02` are all inside the frame. **When** `payout.sent` has fired for the three payouts, **then** the detail for `apr_02` reads them sent. These are `d09-approve`'s IDs.
5. **When** the owner presses `approvals-approve-apr_02` before the timeline's grant, **then** the store holds exactly one `approval.granted` for `apr_02` with `source: "user"`, `by: "own_01"` and `2026-10-01`. The seal lands, and after the timeline's own grant nothing on the card changes.
6. **When** the owner presses `approvals-decline-apr_01` and enters a reason before the timeline's grant, **then** the store holds an `approval.declined` with that reason, the card reads declined, and no seal shows.
7. **Given** `/sell/approvals?ref=apr_02` after both requests, **then** `apr_02` is selected and its payouts show.
8. **Given** a seeded `counterfeit.flagged` for `cft_01`, a `followup.drafted` for `apr_03` and an `approval.requested` for `apr_03`, **when** the owner selects `approvals-item-apr_03`, **then** `approvals-hit` shows the found listing's title, its URL as text with no link, "Text match" and `cft_01.similarity` from `src/mock/watch.ts` to two places (0.91 until S3 T9 replaces it, never typed), the claim, the Reporter's draft and `approvals-hit-unverified` with L20. **When** the owner approves it, **then** `approvals-next` reads L24.
9. **Given** the same events with the `counterfeit.flagged` seeded as live, **then** `approvals-approve-apr_03` is disabled until `approvals-confirm-apr_03` is ticked.
10. **Given** a seeded `listing.drafted` for `lst_01` and an `approval.requested` for `apr_04`, **then** `approvals-listing` shows the draft's titles, each check's result, and `approvals-translated-<lang>` beside the version not in `lst_01.lang` only. **Given** a seeded `approval.requested` for `apr_05`, **then** `approvals-milestone` shows the milestone's label and amount, and paid after a seeded `wip.milestone_paid` for it.
11. **Given** a seeded `approval.requested` for `apr_user_1` that carries only the inline `approval` object (kind `listing_publish`, subject `lst_user_1`) and a seeded `listing.drafted` for `lst_user_1`, **then** `approvals-item-apr_user_1` shows the inline summary, the detail shows that draft, and approving it emits `approval.granted` dated with the inline `decisionDate`.
12. **Given** a seeded `support.escalated` and its `approval.requested` (kind `support_action`, inline object), **then** the detail shows the thread's latest reply and the escalation reason. Only B14 sends `support.escalated` unless a scripted run ends in one, so this is tested with seeded events on purpose (D1-32).
13. **Given** `demo-lang-toggle` switched to Chinese, **then** every label is Chinese, and the follow-up body to the gallery stays English.
14. **Given** scripted mode, **then** the panel shows `simulated-badge`.

## Out of scope
- Syncing decisions between two screens (B08 does that through its adapter). Moving the approval queue onto SpacetimeDB is "Backend if time" (fix-plan 1.5).
- Actually sending a follow-up or a report, publishing a listing or storefront, or moving money. Those come from the timeline or a live upgrade.
- Editing a draft before approving it.
- Approval notifications outside the approvals view. The process bar's approvals block shows that something is waiting.

## Contract additions needed
Settled in contracts sections 3 and 11, kept here for the record:
1. **`decisionDate` on the inline `approval` object** of `approval.requested` (B1-15, contracts section 3), so a live approval can be granted with a date.
2. `/sell/approvals?ref=<approvalId>` sets `SlotProps.refId` for `owner.main`, `owner.main`'s keys add `b14-swarm` and `b15-watch`, the demo approvals `apr_03` to `apr_05` and `fup_02` (contracts section 11), and a granted `milestone_release` answered by `wip.milestone_paid` and one `money.moved` of kind `milestone` (`mv_user_<n>`), Cindia to the maker.
