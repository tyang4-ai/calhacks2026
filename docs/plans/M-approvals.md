# M-approvals · The owner's approvals on the desktop (v2 migration of F-approvals)

Priority: P0 · Wave: V2 · Depends on: G1b · Folder: src/features/approvals/ · Made real by: B02, B08

SCOPE: src/features/approvals/, tests/features/approvals-*

## Goal
Everything Cindy proposed sits in one inbox on the Sell site. The list is on the left, the selected proposal in full on the right, and "Cindy proposed this. Only you can approve it." is on every one. The owner approves and the cinnabar seal lands. v1's follow-up and maker payouts work as before. v2 adds the new kinds: reporting a look-alike, publishing a listing, publishing a storefront, releasing a milestone, and a support action.

## Read first
- `docs/v2/brief.md`: Sell, the swarm table ("Never does"), the principles
- `docs/v2/contracts.md`, which `docs/common/` holds once I2-core is green:
  - section 2: the new Approval kinds and `apr_03` to `apr_05`
  - section 3: `counterfeit.flagged`, `listing.drafted`, `storefront.drafted`, `wip.milestone_paid`, `support.answered`, `support.escalated`
  - section 4: `owner.main` renders as the Sell `approvals` view, `/owner` redirects to `/sell/approvals`, the camera `sell-approvals`
  - section 8: beat `d09-approve`
- `docs/plans/F-approvals.md`: what each v1 component does and its acceptance
- `docs/common/design-system.md`: `Seal` and its motion, `Button` (`seal`), `Toast`, `MakerMark`, `Money`, `Panel`, `Badge`
- `docs/common/glossary.md`: approval, approve, seal, over limit, follow-up, maker payout, held, decline, approved, sent, and the v2 rows (counterfeit watch, similarity, new listing, storefront, milestone)
- The current code in `src/features/approvals/` and its specs in `tests/features/approvals-*`

## Interfaces
- **Reads events** through `useCindia()`:
  - `approval.requested`, `approval.granted`, `approval.declined`, `followup.drafted`, `followup.sent`, `payout.sent` (the `approvals` key),
  - for the new kinds' details: `counterfeit.flagged` (the `watch` key), `listing.drafted` (the `listings` key), `storefront.drafted` (the `storefront` key), `wip.milestone_reached` and `wip.milestone_paid` (the `wip` key), `support.answered` and `support.escalated` (the `support` key),
  - `sources`.
  
  The language comes from `SlotProps.lang`, which starts in English on the Sell site.
- **Reads data** with `getById()`:
  - the Approval (`kind`, `subjectIds`, `amountCents`, `overLimit`, `decisionDate`),
  - for v1: `mpo_01` to `mpo_03`, the makers, `flg_01`, `own_01` (the seal's character), `std_gu` (`payoutLimitCents`),
  - for v2: the CounterfeitCandidate, the ListingDraft, the Storefront, the WorkInProgress and its milestone, and the Community, as each kind's `subjectIds` name them.
  
  Figures that live events recompute (the follow-up text, the drafted listing, the hit's similarity) render from the event payloads.
- **Which approval is selected:** `SlotProps.refId` when `/sell/approvals?ref=<approvalId>` sets it (contract addition 1). Otherwise the first one still pending, otherwise the newest decided one, as v1's focus rule. Clicking a list card selects it, as UI state only.
- **Emits,** with `source: "user"`, `by: "own_01"`, through `userEvent()`:
  - `approval.granted` dated with the approval's `decisionDate`,
  - `approval.declined` with the typed reason (the same string in `en` and `zh`).
  
  The first decision wins, as v1.
- **Exports:** `src/features/approvals/index.ts` default-exports `{ id: "approvals", slots: { "owner.main": ApprovalsView } }`.
- **Source keys on the badge:** `b08-approvals`, `b02-explain`, `b04-bank`, plus `b14-swarm` and `b15-watch` for the new kinds' details (contract addition 2).
- **Test IDs:**
  - v1, kept: `approvals-item-<approvalId>` (now the list card), `approvals-approve-<approvalId>`, `approvals-seal-<approvalId>` (on the list card, so two seals can show at once).
  - v1 internal, kept: `approvals-decline-<approvalId>`, `approvals-reason-<approvalId>`, `approvals-toast`, `approvals-payout-<makerPayoutId>`.
  - New internal: `approvals-detail` (the right column), `approvals-empty` (nothing proposed yet), `approvals-hit` (a report's found listing), `approvals-listing` (a listing's draft), `approvals-milestone` (a milestone release).
- **Labels from the glossary:** needs your approval, proposed by Cindy, approve, sealed, decline, declined, approved, sent, over your $500 limit, follow-up, maker payout, held, counterfeit watch, similarity, new listing, storefront, milestone, work in progress.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): the desktop strings, and a title, a summary line and a "what happens next" line for each new kind, English and Chinese side by side | src/features/approvals/strings.ts | none | lead |
| T1 | Spec helper: seek to a timeline event, open `/sell/approvals`, seed a v2 state with `window.__cindia.emit` | tests/features/approvals-lib.ts | none | sonnet |
| T2 | The inbox list: a compact card per approval, in request order, with its status, amount and small seal, and select on click | src/features/approvals/approvalSummary.ts, src/features/approvals/ApprovalCard.tsx, src/features/approvals/ApprovalList.tsx, tests/features/approvals-cards.spec.ts | T0, T1 | opus |
| T3 | The detail column for every kind | src/features/approvals/FollowUpDraft.tsx, src/features/approvals/PayoutLines.tsx, src/features/approvals/KindDetails.tsx, tests/features/approvals-details.spec.ts | T0, T1 | opus |
| T4 | Decide: approve, decline with a reason, the large seal on the detail | src/features/approvals/DecisionBar.tsx, tests/features/approvals-decide.spec.ts | T0, T1 | sonnet |
| T5 | Assemble the view and fill the slot (lead). Remove the phone inbox | src/features/approvals/ApprovalsView.tsx, src/features/approvals/OwnerInbox.tsx (deleted), src/features/approvals/index.ts, tests/features/approvals-flow.spec.ts, tests/features/approvals-frame.spec.ts, tests/features/approvals-live.spec.ts | T2 to T4 | lead |

**How the tasks fit:**
- The lead writes T0 first.
- T1 is small and runs first, since every spec imports it.
- T2 to T4 run two at a time.
- The old phone layout code (the compact cards, the scroll keeping and the rounded-corner spacer in `OwnerInbox`) goes away in T5. Nothing from it is needed on the desktop.

**T1.** `approvals-lib.ts` exports:
- `seekToEvent(page, type, match, offsetMs)`: it reads `window.__cindia.player.getTimeline()` and seeks to the first matching event's `at` plus the offset.
- `openApprovals(page, ref?)`: it opens `/sell/approvals`, or `?ref=` when given, and waits for the slot to fill.
- `seed(page, events)`: it emits the given events through `window.__cindia.emit`, so the new kinds can be tested before the tour carries them.

Fixed beat times are never used, because I2-tour moves every beat.

**T2.** `approvalSummary.ts` turns each kind into a title, one summary line and an amount:
- `follow_up`: the gallery and the short amount from `flg_01`.
- `maker_payouts`: three payouts and their total.
- `report_listing`: the hit's title and its similarity, from the `counterfeit.flagged` for the subject.
- `listing_publish`: the draft's title, from the `listing.drafted` for the subject.
- `storefront_publish`: the storefront's community.
- `milestone_release`: the commission's title, the milestone's label and `Approval.amountCents`.
- `support_action`: the thread's latest reply, shortened.

`ApprovalCard` (`approvals-item-<approvalId>`) shows the summary, the status (pending, approved, declined), the proposed-by-Cindy line, the over-limit mark when `overLimit`, and the small seal (`approvals-seal-<approvalId>`) once a grant is in the store. `ApprovalList` stacks the cards in request order. The selected card carries `aria-current`, and clicking a card selects it.

**T3.** `KindDetails` renders the selected approval in `approvals-detail`, by kind:
- `follow_up` uses `FollowUpDraft` as v1: the English `to`, `subject` and `body` from `followup.drafted`, and sent once `followup.sent` arrives.
- `maker_payouts` uses `PayoutLines` as v1: `approvals-payout-<makerPayoutId>` lines with `MakerMark`, name, amount, held amount, the over-limit mark, and sent on `payout.sent`.
- `report_listing` (`approvals-hit`): the found listing's title, its URL as plain text (never a link), the snippet, the similarity and the claim from the `counterfeit.flagged` payload. Then the Reporter's draft through `FollowUpDraft`, when a `followup.drafted` names this approval. And "Cindy doesn't accuse anyone. You decide."
- `listing_publish` (`approvals-listing`): the draft's title in both languages, its summary, its facet and vibe words as kit `Chip`s, and each check with passed or needs review, from `listing.drafted`.
- `storefront_publish`: the drafted blocks in order, from `storefront.drafted`.
- `milestone_release` (`approvals-milestone`): the commission, the maker and the buyer, the milestone's label, `Approval.amountCents` through `Money`, and paid once `wip.milestone_paid` for that milestone arrives.
- `support_action`: the thread's latest reply and escalation reason, and `Approval.amountCents` when set.

Every detail repeats the proposed-by-Cindy line. Before a kind's event has arrived, the detail says what it's waiting for, in plain words.

**T4.** `DecisionBar` sits at the bottom of the detail while the approval is pending:
- approve is the kit `Button` in its `seal` variant (`approvals-approve-<approvalId>`),
- decline (`approvals-decline-<approvalId>`) opens a one-line reason box (`approvals-reason-<approvalId>`).

On a grant from anyone, the large kit `Seal` lands on the detail with the owner's `surnameChar` and the grant's date (no test ID, since the list card carries `approvals-seal-<approvalId>`), and the bar goes. After the grant, the detail shows the kind's "what happens next" line from T0. The report one, for example, says sending is simulated. A second decision on the same approval changes nothing.

**T5.** `ApprovalsView` lays out the list (a third) and the detail (two thirds) inside one kit `Panel` that declares the source keys above, sized for the Sell frame at 1440 by 900.
- `approvals-empty` shows until the first `approval.requested`.
- The kit `Toast` (`approvals-toast`) shows "Needs your approval" when a request arrives while this view is open.
- `OwnerInbox.tsx` is deleted.
- `index.ts` exports the module.
- The three lead-owned specs move to `/sell/approvals` and event-anchored seeks:
  - `approvals-flow.spec.ts` plays the follow-up and payouts from their requests to their grants,
  - `approvals-frame.spec.ts` checks the `d09-approve` IDs inside `frame-studio`,
  - `approvals-live.spec.ts` keeps its B08 two-screen check on the new route.

## Acceptance
Every spec opens `/sell/approvals`, moves the timeline with `seekToEvent` (or seeds events with `seed` for the new kinds), and checks by test ID only. "Inside the frame" means fully inside `frame-studio` and every clipping ancestor at 1440 by 900.

1. **Given** 300 ms after the timeline's `approval.requested` for `apr_01`, **then** `approvals-item-apr_01` shows the follow-up to the gallery for $340.00 as pending, and `approvals-detail` shows the draft from the `followup.drafted` payload.
2. **Given** 300 ms after `approval.requested` for `apr_02`, **when** the owner clicks `approvals-item-apr_02`, **then** `approvals-detail` lists `approvals-payout-mpo_01` to `approvals-payout-mpo_03`, each with the maker's name and amount, shows $340.00 held, and marks each payout over $500.00.
3. **Given** any moment, **then** every card and the detail say Cindy proposed it and only the owner can approve it, and no `approvals-seal-<approvalId>` shows before a grant for it.
4. **Given** 300 ms after the timeline's `approval.granted` for `apr_02`, **then** `approvals-item-apr_01`, `approvals-item-apr_02`, `approvals-seal-apr_01` and `approvals-seal-apr_02` are all inside the frame. **When** `payout.sent` has fired for the three payouts, **then** the detail for `apr_02` reads them sent. These are `d09-approve`'s IDs.
5. **When** the owner presses `approvals-approve-apr_02` before the timeline's grant, **then** the store holds exactly one `approval.granted` for `apr_02` with `source: "user"`, `by: "own_01"` and `2026-10-01`. The seal lands, and after the timeline's own grant nothing on the card changes.
6. **When** the owner presses `approvals-decline-apr_01` and enters a reason before the timeline's grant, **then** the store holds an `approval.declined` with that reason, the card reads declined, and no seal shows.
7. **Given** `/sell/approvals?ref=apr_02` after both requests, **then** `apr_02` is selected and its payouts show (needs addition 1).
8. **Given** a seeded `counterfeit.flagged` for `cft_01`, a `followup.drafted` for `apr_03` and an `approval.requested` for `apr_03`, **when** the owner selects `approvals-item-apr_03`, **then** `approvals-hit` shows the found listing's title, its URL as text with no link, the similarity and the claim, and the Reporter's draft.
9. **Given** a seeded `listing.drafted` for `lst_01` and an `approval.requested` for `apr_04`, **then** `approvals-listing` shows the draft's titles and each check's result. **Given** a seeded `approval.requested` for `apr_05`, **then** `approvals-milestone` shows the milestone's label and amount, and paid after a seeded `wip.milestone_paid` for it.
10. **Given** `demo-lang-toggle` switched to Chinese, **then** every label is Chinese, and the follow-up body to the gallery stays English.
11. **Given** scripted mode, **then** the panel shows `simulated-badge`.

## Out of scope
- Syncing decisions between two screens (B08 does that through its adapter).
- Actually sending a follow-up or a report, publishing a listing or storefront, or moving money. Those come from the timeline or a live upgrade.
- Editing a draft before approving it.
- Approval notifications outside the approvals view. The process bar's approvals block shows that something is waiting.

## Contract additions needed
1. **`/sell/approvals?ref=<approvalId>`** sets `SlotProps.refId` for `owner.main` (v1 only gives `refId` to the audit drawer), and the view selects that approval. The listing and watch features link here.
2. **`owner.main`'s source keys** add `b14-swarm` and `b15-watch`, because the new kinds' details render their payloads.
3. **Demo approvals' data, for the data-smith:**
   - `apr_03` (`report_listing`): `subjectIds: ["cft_01"]`.
   - `apr_04` (`listing_publish`): `subjectIds: ["lst_01"]`.
   - `apr_05` (`milestone_release`): `subjectIds: ["wip_01", "<the milestone ID>"]` and `amountCents` equal to that milestone's share of `wip_01`'s price.
   - A FollowUp `fup_02` for `apr_03` (the Reporter's draft), which the scripted watch run carries as `followup.drafted`.
4. **Granting a `milestone_release`** is answered, in scripted mode, by `wip.milestone_paid` and a `money.moved` of kind `milestone` for that milestone. The detail's "paid" line depends on it. F-communities needs the same rule.
