# Cindia · design handoff

**Drop 2, partial** · Saturday Oct 24, 2026, 16:15 PT · direction B, Warp and weft, picked by Gordon

Drop 2 covers the ten screens every version of the plan keeps, with their components, assets and flows. The storefront builder, the store page, listings, the counterfeit watch, the projects pages and the community pages are held until the coordinator says. Like drop 1, this drop changes no route, slot, event, field or test ID.

## What's in drop 2

| File | What it is | Used by |
|---|---|---|
| `design/screens/` | 17 PNGs at 1440 by 900, one per screen and state, named by route and state (list below) | The verifier's review in I3-redesign, the feature leads' polish rounds |
| `design/components.md` | Every component on the screens: the kit file it restyles, anatomy, sizes, tokens, states, Figma node, and what the kit still needs | The integrator, in I3-redesign T4 |
| `design/changes.md` | The layout changes per feature for their polish rounds, what was settled from drop 1's proposals, the sample content, what's held | The integrator's needs list, every lead |
| `design/flows.md` | The buyer's and the studio's paths through the screens in tour order, what each click does, the motion | The leads, the tour (I2-tour) |
| `design/assets/illustrations/` | `pc_01.svg`, `pc_02.svg`, `pc_04.svg`, `pc_07.svg`, `pc_11.svg`: thread drawings named by piece ID, under 11 KB, no text, images or outside references. `samples/` holds three sample pieces for the search screens | I3-redesign T5, then `npm run art -- --check` |
| `design/assets/icons/` | Sixteen line icons as 20 px SVGs | The kit's Icon component |
| `design/stage-log.md` | The stage log, now with the Prototyping entry and its evidence | Gordon and the scribe |

### The screens

| Item | Files |
|---|---|
| 1. The piece page with Where your money goes and checkout | `shop-piece-pc_01--checkout.png`, `shop-piece-pc_01--token.png` |
| 2. The receipt, both states | `shop-receipt-ord_001--received.png`, `shop-receipt-ord_001--paid-to-maker.png` |
| 3. The search results with reasons, and the Shop home hero | `shop-search--results.png`, `shop-home--hero.png` |
| 4. The support drawer with the agent step strip | `shop-piece-pc_01--support-drawer.png`, `shop-piece-pc_01--support-answered.png` |
| 5. Sell › Money map | `sell-map--default.png` |
| 6. Sell › Month with the catch and its three evidence cards | `sell-month--catch.png` |
| 7. Sell › Approvals with the seal | `sell-approvals--waiting.png`, `sell-approvals--sealed.png` |
| 8. Sell › Close with the impact panel | `sell-close--impact.png` |
| 9. The maker page in Chinese | `maker-mkr_01--zh.png` |
| 10. The process bar's states, the swarm view and the search view | `process-bar--states.png` (1440 by 581), `process-swarm--view.png`, `process-search--view.png` |

Every figure on the screens comes from `src/mock/` as of 16:00 PT, except the sample content that `changes.md` lists. Each sample piece of text or art carries a Sample tag on the screen.

## How to apply drop 2

1. Restyle the kit component by component from `components.md`: frames first, then cards, then agents and data views, then badges and chat. Check each one in `/dev/kit`.
2. Copy the five piece illustrations into `public/images/` under the same names, and run `npm run art -- --check`. Leave `samples/` out, because it holds placeholders, not catalog pieces.
3. Put each feature's lines from `changes.md` under needs for that feature's polish round.
4. Compare `artifacts/demo/<beat>.png` with the matching file in `design/screens/`, using the beats in `flows.md`.

## Decisions in drop 2

- **The compact PieceCard** is 318 by 338, with a 190 px picture box. That keeps six results and their header above the fold.
- **The money lattice** replaces the node-and-thread map.
- **Approval cards** reserve a 72 px seal slot at the top right. The seal lands in it, so it never covers a figure and the layout doesn't move when the seal lands.
- **Process blocks** follow the F-process count rules, leave out a zero count, and show "!" when they need attention.
- **The search view** names the eight communities on their clusters instead of coloring them, because the chart palette stops at five series.
- **Only the two estimates** carry the Estimate badge in Impact. This needs a small data change, described in `changes.md`.
- **Chinese labels proposed** where no doc has them: 选购 and 售卖 for the Shop and Sell switch, 尚未训练 for "Not trained yet", and the three verification methods.

## Figma

| File | Link | Status |
|---|---|---|
| Cindia · 01 Research (FigJam) | https://www.figma.com/board/T3lxV76Wc6petCKoRE0TNu | Done |
| Cindia · 02 Moodboards (FigJam) | https://www.figma.com/board/KAOXGbhwnS0A0tJ8j5ABj7 | Done. B is the pick |
| Cindia · Design (Figma Design) | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb | Style tiles, wireframes, components and the drop 2 screens |

**Pages in Cindia · Design:** Style tiles, Wireframes (14 grayscale frames of the ten screens), Components (every component in `components.md`, with each node listed there), Screens (the 17 frames below). Every color is bound to a variable and every text uses a text style. Add `?node-id=` and the node, with the colon as a dash, to the Design link.

| Screen frame | Node |
|---|---|
| shop-piece-pc_01 · checkout | 13:55 |
| shop-piece-pc_01 · token | 13:276 |
| shop-receipt-ord_001 · received | 15:307 |
| shop-receipt-ord_001 · paid to the maker | 15:477 |
| shop-search · results | 17:474 |
| shop-home · hero | 17:904 |
| shop-piece-pc_01 · support drawer, working | 19:1070 |
| shop-piece-pc_01 · support drawer, answered | 19:1325 |
| sell-map · default | 21:1873 |
| sell-month · catch | 23:1635 |
| sell-approvals · waiting | 24:1758 |
| sell-approvals · sealed | 24:1989 |
| sell-close · impact | 26:2023 |
| maker-mkr_01 · zh | 27:2147 |
| process-bar · states | 28:2257 |
| process-swarm · view | 29:2325 |
| process-search · view | 31:2455 |

All three files sit in Gordon's drafts on his Figma team. Sharing as "Anyone with the link" has to be set in Figma by Gordon, because the MCP server has no sharing tool.

## Still to do in Figma

- The held screens, once the coordinator says.
- The clickable prototype: the links in `flows.md` wired between the screen frames.
- The flows board in FigJam. Until then, `flows.md` is the flows.
- The Figma Slides deck, opening on the catch.
- The month's records table, the other seven process views, and the tour's title and end cards.

---

## Drop 1

Saturday Oct 24, 2026, 14:44 PT. This drop restyled the kit through tokens, and it kept every token name that existed.

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
- The four open questions take their defaults:
  - a culture-neutral core look,
  - the Gu seal keeps its character while other leads' seals show initials,
  - the card form is labeled Demo checkout,
  - the Slides open on the catch.

`changes.md` settles drop 1's three proposals.

**Style tiles nodes:** the page 2:2, color 2:6, space 2:214, elevation 2:281, type 3:2, chart 3:94, motion 3:134, the beam and kit 4:2, icons 4:110, illustrations 4:186.
