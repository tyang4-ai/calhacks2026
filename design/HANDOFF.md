# Cindia · design handoff

**Drop 1** · Saturday Oct 24, 2026, 14:44 PT · direction B, Warp and weft, picked by Gordon

This drop restyles the kit. It changes no route, slot, event, test ID or data field, and it keeps every token name that exists today.

## What's in drop 1

| File | What it is | Used by |
|---|---|---|
| `design/tokens.json` | All 113 tokens. `css` is ready to paste into `src/ui/tokens.css`, `reducedMotion` is the reduced-motion block, `tokens` is the full tree with roles and old values, `checks` holds the 80 contrast pairs | The integrator, in I3-redesign |
| `design/tokens.md` | The same tokens as tables, the eleven kit changes the restyle needs, fonts, storefront accents, the chart palette, icons, illustrations, elevation, motion and the contrast table | The integrator and every lead |
| `design/layout.md` | The 1440 by 900 page: grids, the beam (top bar and process bar), the process view, drawers, and page templates for Shop, Sell, the maker page and the storefront, with what sits above the fold | The integrator and every lead |
| `design/style-tiles.png` | A screenshot of the Style tiles page in Cindia · Design | Reviewers, the Slides |
| `design/stage-log.md` | The Figma track's stage log, with its evidence | Gordon and the scribe, for Devpost and the Slides |
| `design/ideation/` | The research and moodboard evidence: board screenshots, `checks.json` for all three directions, the three fan sketches, the texture tiles | Reference |

## How to apply it

1. Replace the values in `src/ui/tokens.css` with the `css` object from `tokens.json`, and its reduced-motion block with `reducedMotion`.
2. Make the eleven kit changes listed in `tokens.md` under "What changes in the kit". The biggest are the dark beam for `TopNav` and the process bar, `ProcessBlock`'s thread states, the indigo primary `Button`, and `PageFrame` painting the ground.
3. Fonts: add `@fontsource-variable/source-sans-3` and `@fontsource-variable/source-code-pro` (both 5.3.1), and import `700.css` from the Noto Sans SC package already installed. The two new packages need the orchestrator's OK.
4. Storefront accents need no data change. `jade`, `seal`, `amber` and `ink` keep working, and the builder's accent picker offers all eight names.
5. Check `/dev/kit` against `tokens.md` and the pages against `layout.md`, then rerun G4v2.

Features that use only kit components and tokens follow without edits.

## Decisions in this drop

- **Direction B, Warp and weft,** picked by Gordon from the three moodboards.
- **Borrowed from C:** storefront accents that each community picks, as kit token names for `Storefront.theme.accent`.
- **The four open questions take their defaults:**
  - Cindia's core look stays culture-neutral, and each community's look lives on its storefront.
  - The Gu studio's seal keeps its Chinese character. Another co-op lead's seal shows the lead's initials until their community picks a mark. The demo's approvals are all the Gu studio's, so this changes nothing in the tour.
  - Checkout keeps its card form, labeled Demo checkout, no real charge.
  - The Figma Slides deck opens on the catch, like the video.

## Proposed for drop 2's changes.md

These would change a kit prop or a feature's layout, so they're listed here, not decided:
- a compact `PieceCard` for search results, with a 200 px picture box, so six results fit above the fold,
- the money lattice as the money map's layout (`layout.md`, Sell, `map`),
- `Seal` accepting one or two Latin initials for co-op leads outside the Gu studio.

## Figma

| File | Link | Status |
|---|---|---|
| Cindia · 01 Research (FigJam) | https://www.figma.com/board/T3lxV76Wc6petCKoRE0TNu | Done |
| Cindia · 02 Moodboards (FigJam) | https://www.figma.com/board/KAOXGbhwnS0A0tJ8j5ABj7 | Done. B is the pick |
| Cindia · Design (Figma Design) | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb | Style tiles done. Components and screens come in drop 2 |

**In Cindia · Design:**
- **Variables:** two collections in one mode, "Warp and weft". Color has 39 variables and Size has 40 (space, radius, size, grid, stroke). Each carries its CSS name as web code syntax, for example `var(--c-color-paper)`, and has scopes set, so Dev Mode shows the token the code uses.
- **Styles:** 17 text styles (Hero/64 to Caption/14, Mono/16 and Mono/14, four Chinese styles, Seal/32) and the effect style Elevation/Overlay.
- **The Style tiles page**, every swatch bound to its variable and every label using a text style:

| Tile | Node |
|---|---|
| The whole page | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb?node-id=2-2 |
| Color, with the storefront accents and the chart series | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb?node-id=2-6 |
| Space, corners and lines | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb?node-id=2-214 |
| Elevation | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb?node-id=2-281 |
| Type | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb?node-id=3-2 |
| Chart palette | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb?node-id=3-94 |
| Motion | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb?node-id=3-134 |
| The beam and the kit (the beam at 1440 wide, ten process blocks in every state, buttons, chips, badges, ledger rows) | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb?node-id=4-2 |
| Icons | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb?node-id=4-110 |
| Illustrations | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb?node-id=4-186 |

A screenshot of the whole page is in `design/style-tiles.png`.

All three files sit in Gordon's drafts on his Figma team. Sharing as "Anyone with the link" has to be set in Figma by Gordon.

## Still to come in drop 2

`components.md` (every component's variants, states and Figma node), `screens/` (one PNG per screen and state), `assets/` (piece illustrations and icons as SVG), `flows.md`, `changes.md`, and this file and the stage log updated.
