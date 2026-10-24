# F-approvals · The owner approves (F9)

Priority: P0 · Wave: W1 · Depends on: G2 · Folder: src/features/approvals/ · Made real by: B02, B08

## Goal
The owner's phone buzzes, in Chinese. Cindy has drafted a follow-up to the gallery about the $340.00 it owes, and proposed this month's three maker payouts. Cindy can't approve her own proposals, and the screen says so plainly. The owner approves, and a cinnabar seal lands on each item.

## Read first
- `docs/common/events.md`: the Approvals section, the envelope (user events), the store, sources and the Simulated rule
- `docs/common/data-model.md`: Approval, FollowUp, MakerPayout, Flag, Person, demo-critical figures 8 and 9
- `docs/common/ui-contract.md`: `owner.main`, the phone frame, SlotProps, Language, the `studio-owner` camera, the approvals test IDs
- `docs/common/design-system.md`: `Seal` and its motion token, `Button` (the `seal` variant), `Toast`, `MakerMark`, `Money`, `Panel`, `Badge`, the idea "the seal means a person decided"
- `docs/common/demo-script.md`: the end of `d07-catch` and beat `d08-approve`
- `docs/common/glossary.md`: approval, approve, seal, over limit, follow-up, maker payout, held

## Interfaces
- **Reads events** through `useCindia()`: `approval.requested`, `approval.granted`, `approval.declined`, `followup.drafted`, `followup.sent`, `payout.sent`. Which store key holds each is in `src/core/store.ts` (the `approvals` key for most). Also reads `sources`. The language comes from `SlotProps.lang`, which starts in Chinese on this surface.
- **Reads data** with `getById()`: approvals `apr_01` and `apr_02`, maker payouts `mpo_01` to `mpo_03`, the makers (name, `surnameChar`), the flag `flg_01` for the short amount, the owner `own_01` for the seal's character, and the studio `std_gu` for `payoutLimitCents`. The follow-up's `to`, `subject` and `body` come from the `followup.drafted` payload, never from `fup_01`, because a live B02 rewrites them.
- **Emits,** with `source: "user"`, `by: "own_01"`, through `emit()` and `userEvent()` from `src/core/events.ts`: `approval.granted` when the owner taps approve, and `approval.declined` with the typed reason (the same string in `en` and `zh`) when the owner declines.
- **Dates and the limit come from the mock,** never the wall clock or a typed number. A grant carries the approval's `decisionDate` (`2026-10-01`). The over-limit mark on a payout compares its amount with `std_gu.payoutLimitCents` (50000), and the card as a whole follows `Approval.overLimit`.
- **Exports:** `src/features/approvals/index.ts` default-exports `{ id: "approvals", slots: { "owner.main": OwnerInbox } }`, typed with `FeatureModule` from `src/core/featureTypes.ts`.
- **Source keys on the badge:** `b08-approvals`, `b02-explain`, `b04-bank`. The panel shows `simulated-badge` while any of them is `"scripted"`.
- **Test IDs:** `approvals-item-apr_01`, `approvals-item-apr_02`, `approvals-approve-<approvalId>`, `approvals-seal-<approvalId>`. Internal to this feature: `approvals-decline-<approvalId>`, `approvals-reason-<approvalId>`, `approvals-toast`, `approvals-payout-<makerPayoutId>`.
- **Labels from the glossary:** needs your approval, approve, sealed, over your $500 limit, follow-up, maker payout, held, Cindy, proposed by Cindy ("Cindy proposed this. Only you can approve it."), decline, declined, approved and sent. Each one has a glossary row.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): every short string these screens need that the glossary lacks, English and Chinese side by side | src/features/approvals/strings.ts | none | lead |
| T1 | Approval cards | src/features/approvals/approvalSummary.ts, src/features/approvals/ApprovalCard.tsx, tests/features/approvals-cards.spec.ts | T0 | opus |
| T2 | The follow-up draft and the payout lines | src/features/approvals/FollowUpDraft.tsx, src/features/approvals/PayoutLines.tsx, tests/features/approvals-details.spec.ts | T0 | opus |
| T3 | Approve, decline and the seal | src/features/approvals/DecisionBar.tsx, tests/features/approvals-decide.spec.ts | T0 | opus |
| T4 | Assemble the inbox and fill the slot (lead) | src/features/approvals/OwnerInbox.tsx, src/features/approvals/index.ts, tests/features/approvals-flow.spec.ts | T1 to T3 | lead |

**How the tasks fit:** the lead writes T0 before spawning any builder, because `design-system.md` puts a feature's short UI strings in its own `strings.ts`. A builder that needs a string T0 lacks lists it under `needs:`, and the lead adds it. Builders run `npm run check:scope` on their files and write their spec. The specs run for the first time once T4 fills the slot, and the lead sends any failure back to the builder who owns the file.

**T1.** `approvalSummary.ts` turns an approval into what its card shows: the kind's title, one summary line (for `apr_01`, the gallery and the short amount from `flg_01`, for `apr_02`, three payouts and their total), the amount, and the over-limit mark. `ApprovalCard` (`approvals-item-<approvalId>`) shows that, the status (pending, approved, declined) and, on every card, the line saying Cindy proposed it and only the owner can approve it. It leaves room for the details (T2) and the decision bar (T3).

**T2.** `FollowUpDraft` shows the latest `followup.drafted` for `apr_01` inside its card: `to`, `subject` and `body` from the payload, collapsed to two lines and opened with one tap. Before that event it shows nothing. The draft goes to the gallery in San Francisco, so it shows the payload's English `to`, `subject` and `body` (what the gallery gets) in either language, while its labels follow the slot's language. On `followup.sent` it reads sent. `PayoutLines` lists `mpo_01` to `mpo_03` inside the `apr_02` card (`approvals-payout-<makerPayoutId>`): `MakerMark`, the maker's name, the amount, the held amount, and the over-limit mark when the amount is over `payoutLimitCents`. On `payout.sent` a line reads sent.

**T3.** `DecisionBar` shows approve (the kit `Button` in its `seal` variant, `approvals-approve-<approvalId>`) and decline (`approvals-decline-<approvalId>`, which opens a one-line reason box, `approvals-reason-<approvalId>`) while the approval is pending. Approve emits `approval.granted` dated with the approval's `decisionDate`. Decline emits `approval.declined` with the reason. Once `approval.granted` is in the store, from the owner or the timeline, the kit `Seal` (`approvals-seal-<approvalId>`) lands on the card with the owner's `surnameChar` and the grant's date, and the buttons go. A second grant for the same approval changes nothing.

**T4.** `OwnerInbox` lists the cards in request order inside one kit `Panel` that declares `b08-approvals`, `b02-explain` and `b04-bank`, each card with its details and its decision bar. On each `approval.requested` the kit `Toast` (`approvals-toast`) slides up with the needs-your-approval label, as the phone's buzz. `index.ts` exports the module. `approvals-flow.spec.ts` plays the end of `d07-catch` through `d08-approve`.

## Acceptance
Every spec opens `/owner`, moves the demo timeline with `window.__cindia.player.seek(ms)` to the moment named (beat times are in `demo-script.md`), reads state through `window.__cindia.store`, and checks by test ID only.

1. **Given** 36.5 seconds (after `approval.requested` for `apr_01`), **then** `approvals-toast` shows, and `approvals-item-apr_01` shows the follow-up to the gallery for the $340.00 short payment, in Chinese, with the draft from the `followup.drafted` payload one tap away.
2. **Given** 39 seconds (after `approval.requested` for `apr_02`), **then** `approvals-item-apr_02` lists `mpo_01`, `mpo_02` and `mpo_03` with each maker's name and amount, shows $340.00 held in total, carries the over-limit mark when `apr_02.overLimit` is true, and marks each payout over $500.00.
3. **Given** any moment, **then** every card says Cindy proposed it and only the owner can approve it, and no card shows a seal before an `approval.granted` for it.
4. **Given** the end of `d08-approve`, **then** `approvals-seal-apr_01` and `approvals-seal-apr_02` show the owner's seal with its date, and both cards read approved and sent.
5. **When** the owner taps `approvals-approve-apr_02` at 39 seconds, **then** the store holds exactly one `approval.granted` for `apr_02`, with `source: "user"` and `by: "own_01"`, the seal lands, and after the timeline's own grant at 41 seconds nothing on the card changes.
6. **When** the owner taps `approvals-decline-apr_01` at 37 seconds and enters a reason, **then** the store holds an `approval.declined` with that reason, and the card reads declined with no seal. Check this before the timeline's own grant at 39.8 seconds, since `events.md` doesn't say what a grant does after a decline.
7. **Given** `demo-lang-toggle` switched to English, **then** every label on the cards is English, and the follow-up body is unchanged.
8. **Given** scripted mode, **then** the panel shows `simulated-badge`.

## Out of scope
- Syncing approvals between two screens or two tabs (B08).
- Claude writing the follow-up or the payout reasons (B02). Phase 1 shows the scripted `followup.drafted`, whose text S2 copies from `fup_01`.
- Actually sending email or moving money. `followup.sent` and `payout.sent` come from the timeline.
- Editing the draft before approving it.
