# Cindia · design handoff

**Drop 3** · Saturday Oct 24, 2026, 18:05 PT · direction B, Warp and weft, picked by Gordon

Drop 3 is the platform for Native American makers. Every screen shows the fictional Diné Weaving and Silver Co-op and its three makers, with v1's numbers unchanged, plus the three other communities in the catalog. It adds the three pitch cards, the presenter hint, the listing beat with the data view, the community page and the store page. It changes no route, slot, event, field or test ID, and it uses the labels in `docs/v2/contracts.md` section 12 word for word.

## What's in drop 3

| File | What it is | Used by |
|---|---|---|
| `design/screens/` | 24 PNGs, one per screen and state, named by route and state (table below). 21 are 1440 by 900, and three are taller: the states sheet (1440 by 581), the community page (1440 by 1185) and the store page (1440 by 1685) | The verifier's review in I3-redesign, the feature leads' polish rounds |
| `design/components.md` | Every component on the screens: the kit file it restyles, anatomy, sizes, tokens, states, Figma node, and what the kit still needs | The integrator, in I3-redesign T4 and T6 |
| `design/changes.md` | Each feature's layout items for its polish round, the sample content, and what isn't drawn | The integrator's needs list, every lead |
| `design/flows.md` | The tour in beat order with the screen for each beat, what each click does, and the motion | The leads, I2-tour |
| `design/assets/illustrations/` | 15 drawings named by piece ID: `pc_01.svg` to `pc_12.svg` (the co-op's twelve pieces), `pc_14.svg`, `pc_30.svg` and `pc_43.svg` (one piece from each other community). Plain geometry, no text, images, links or scripts, each under 6 KB | I3-redesign T5, then `npm run art -- --check` |
| `design/assets/icons/` | Sixteen line icons as 20 px SVGs | The kit's Icon component |
| `design/layout.md`, `design/tokens.md`, `design/tokens.json`, `design/style-tiles.png` | Drop 1's page grid, tokens and style tiles, now with the co-op's samples, the eleven-block beam and the new `pc_01` drawing | The integrator, reviewers |
| `design/stage-log.md` | The Figma track's stage log and its evidence | Gordon and the scribe |

### The screens, in tour order

| Beat | Screen | File | Figma node |
|---|---|---|---|
| `p01-what` | Pitch card, what it is | `pitch-card--what.png` | 52:135 |
| `p02-why` | Pitch card, why | `pitch-card--why.png` | 52:168 |
| `p03-how` | Pitch card, how it works | `pitch-card--how.png` | 52:202 |
| `d01-vibe` | Shop home with the query typed | `shop-home--hero.png` | 17:904 |
| `d01-vibe` | Search results with reasons and verification | `shop-search--results.png` | 17:474 |
| `d01-vibe` | The vibe search process view | `process-search--view.png` | 31:2455 |
| `d03-piece`, `d05-pay` | Piece page before paying | `shop-piece-pc_01--checkout.png` | 13:55 |
| `d04-support` | Support drawer, working | `shop-piece-pc_01--support-drawer.png` | 19:1070 |
| `d04-support` | The agent swarm process view | `process-swarm--view.png` | 29:2325 |
| `d04-support` | Support drawer, answered | `shop-piece-pc_01--support-answered.png` | 19:1325 |
| `d05-pay` | Piece page after paying, with the promise | `shop-piece-pc_01--token.png` | 13:276 |
| `d05-pay` | Receipt, received | `shop-receipt-ord_001--received.png` | 15:307 |
| `d15-listing` | Sell › Listings with the draft and its checks | `sell-listings--d15.png` | 53:2 |
| `d15-listing` | The data process view | `process-data--view.png` | 54:178 |
| `d06-money` | Sell › Money map | `sell-map--default.png` | 21:1873 |
| `d08-catch` | Sell › Month with the catch | `sell-month--catch.png` | 23:1635 |
| `d09-approve` | Sell › Approvals, waiting and sealed | `sell-approvals--waiting.png`, `sell-approvals--sealed.png` | 24:1758, 24:1989 |
| `d10-close` | Sell › Close with Impact | `sell-close--impact.png` | 26:2023 |
| `d11-maker` | Grace N.'s page, in English | `maker-mkr_01--en.png` | 27:2147 |
| `d12-receipt` | Receipt, paid to the maker, with her note | `shop-receipt-ord_001--paid-to-maker.png` | 15:477 |
| `d16-store` | The co-op's store page | `store-dine-weavers--page.png` | 56:395 |
| none | The co-op's community page | `shop-community-com_dine--page.png` | 55:343 |
| every beat | The process bar's states | `process-bar--states.png` | 28:2257 |

Figures come from `docs/plans/R0-reskin.md` and `docs/plans/S3-catalog.md`. Text the data doesn't hold yet carries a Sample tag, and `changes.md` lists it.

## How to apply drop 3

1. Restyle the kit from `components.md`: frames first (the beam, the process bar, the drawer), then cards (PieceCard, VerificationLine), then agent and data views, then badges and chat. Check each in `/dev/kit`.
2. Restyle the three pitch cards from their screens (I3-redesign T6). The layout reads `pitch.ts` as it is: a title, up to four lines, L1 at the foot. The words stay Gordon's.
3. Copy the 15 drawings into `public/images/` under the same names, then run `npm run art -- --check`. The other 39 pieces keep I2-art's drawings.
4. Put each feature's lines from `changes.md` under needs for that feature's polish round.
5. Compare `artifacts/demo/<beat>.png` with the screen in the table above for that beat.

## Decisions in drop 3

- **The process bar says Simulated once.** Each block's second line is its count and its status word (Idle, Working, Done, Attention). The bar ends with "Live: N of 11" over one Simulated badge (A1-15). The presence line shows only in live mode.
- **Counterfeit watch keeps its contract label.** Its block is 124 px wide so the label fits at 14 px. The other ten are 104 px.
- **Verification reads as the data model has it.** Every community uses `nation_attestation`, shown as "Demo verification · Nation attestation" on cards. The full line adds who would attest, the note and L4.
- **The piece page fits the fold.** The story card holds the picture, the title in both languages, Grace N. with her mark and the Demo data badge, the hours, the story, L5, the steps and the craft line. The verification sits under it, and the price column holds the price, the split with the gallery comparison, and checkout. Everything ends by 860 px in both states.
- **Search result cards carry their verification line.** The picture box is 142 px, so six results still fit above the fold.
- **The support drawer lists the steps while it works.** Once the Writer answers, the list gives way to the reply.
- **The receipt keeps its promise.** "We'll show you when Grace N. is paid." sits under Received, and the paid receipt ends on Grace N.'s note with her mark and the Demo data badge.
- **The seal shows the owner's initials.** "RB" and the date, for Ruth B.

## Figma

| File | Link | Status |
|---|---|---|
| Cindia · 01 Research (FigJam) | https://www.figma.com/board/T3lxV76Wc6petCKoRE0TNu | Done. Written before the scope change, so it still describes the earlier studio |
| Cindia · 02 Moodboards (FigJam) | https://www.figma.com/board/KAOXGbhwnS0A0tJ8j5ABj7 | Done. B is the pick |
| Cindia · Design (Figma Design) | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb | Style tiles, wireframes, components and the drop 3 screens |

**Pages in Cindia · Design:** Style tiles, Wireframes, Components, Screens (the 24 frames in the table). Every color is bound to a variable and every text uses a text style. Add `?node-id=` and the node, with the colon as a dash, to the Design link.

All three files sit in Gordon's drafts on his Figma team. Sharing as "Anyone with the link" has to be set in Figma by Gordon, because the MCP server has no sharing tool.

## Still to do in Figma

- The clickable prototype: the links in `flows.md` wired between the frames.
- The Figma Slides deck that mirrors the three pitch cards.
- Screens not drawn yet: the month's records table (`d07-month`), the proof page (`d13-proof`), the counterfeit watch (`d14-watch`), the Surprise me result after a draw (`d02-surprise`), the projects pages, the storefront builder, the end card, the process views other than swarm, search and data, and the tour's split layout (the frame at 0.66 with the process panel in the right third). The process views here show the centered overlay a person opens with `?process=`.
- The Research board, if it should show the co-op instead of the earlier studio.

---

## Drop 1

Saturday Oct 24, 2026, 14:44 PT. This drop restyled the kit through tokens and kept every token name that existed.

| File | What it is | Used by |
|---|---|---|
| `design/tokens.json` | All 113 tokens. `css` is ready to paste into `src/ui/tokens.css`, `reducedMotion` is the reduced-motion block, `tokens` is the full tree with roles and old values, `checks` holds the 80 contrast pairs | The integrator, in I3-redesign |
| `design/tokens.md` | The same tokens as tables, the eleven kit changes the restyle needs, fonts, storefront accents, the chart palette, icons, illustrations, elevation, motion and the contrast table | The integrator and every lead |
| `design/layout.md` | The 1440 by 900 page: grids, the beam, the process view, drawers, and page templates for Shop, Sell, the maker page and the storefront, with what sits above the fold | The integrator and every lead |
| `design/style-tiles.png` | A screenshot of the Style tiles page | Reviewers, the Slides |
| `design/ideation/` | The research and moodboard evidence | Reference |

**How to apply drop 1:**
1. Replace the values in `src/ui/tokens.css` with the `css` object from `tokens.json`, and its reduced-motion block with `reducedMotion`.
2. Make the eleven kit changes in `tokens.md` under "What changes in the kit".
3. Fonts: add `@fontsource-variable/source-sans-3` and `@fontsource-variable/source-code-pro` (both 5.3.1), and import `700.css` from the installed Noto Sans SC package. The two new packages need the orchestrator's OK.
4. Storefront accents need no data change.
5. Check `/dev/kit` against `tokens.md` and the pages against `layout.md`, then rerun G4v2.

**Decisions in drop 1:**
- Direction B, picked by Gordon.
- Storefront accents that each community picks, borrowed from C.
- The open questions take their defaults: a culture-neutral core look, the card form labeled Demo checkout, and the Slides opening on the catch.

**Style tiles nodes:** the page 2:2, color 2:6, space 2:214, elevation 2:281, type 3:2, chart 3:94, motion 3:134, the beam and kit 4:2, icons 4:110, illustrations 4:186.
