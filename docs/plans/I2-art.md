# I2-art · Original piece illustrations

Priority: P1 · Wave: V1 · Depends on: S3-catalog (G2b), I2-core (`npm run export:mock`) · Area: `scripts/`, `public/images/` · Owner: integrator · Gate: the verifier's contact-sheet review, then `npm run test:smoke`

SCOPE: scripts/make-illustrations.mjs, scripts/lib/art/, public/images/, package.json, artifacts/art/

## Goal

Every one of the 54 pieces has an original illustration at `/images/<pieceId>.svg`, the v1 twelve included, replacing the "Photo coming" squares:
- in one consistent flat style,
- drawn from the piece's own facets (what it is and its colors),
- with no text in the image and nothing copied from a real artwork or a community's protected designs.

The pages look finished before any Figma drop. A drop with better illustrations replaces them later (I3-redesign).

## Read first

- `docs/common/data-model.md` after I2-core and S3-catalog: `Piece.facets` (`object`, `colors`, `motifs`), `Piece.image`, `Piece.imageAlt`, the cultural rules under Communities.
- `docs/v2/brief.md`: Principles (cultural care, labeled illustrations).
- `docs/common/design-system.md`: the palette and the flat, quiet look.
- `artifacts/mock/mock.json`, written by `npm run export:mock`: the `pieces` and `communities` the script reads.

## Interfaces

- **Reads:** `artifacts/mock/mock.json` only. It never imports TypeScript.
- **Writes:**
  - `public/images/pc_01.svg` to `public/images/pc_54.svg`,
  - `artifacts/art/contact-sheet.html` (all 54 in a grid with their IDs and titles),
  - `artifacts/art/contact-sheet.png` (a screenshot of the sheet, taken with the repo's Playwright).
- **npm script:**
  - `npm run art` runs `node scripts/make-illustrations.mjs` and writes everything.
  - `npm run art -- --check` writes nothing. It checks that every piece has an SVG, every SVG is valid XML under 30 KB with a `viewBox` of `0 0 800 800`, and none has a `<text>`, `<image>`, `<script>`, `<foreignObject>` or an outside reference. It exits 1 on any failure. `cmd.exe`-safe.
- **The style:**
  - an 800 by 800 square on a mat-colored ground,
  - one object silhouette, centered, with soft flat shading,
  - a pattern fill built from simple shapes (stripes, steps, diamonds, dots, waves, chevrons, leaf sprigs, and a generic flower rosette when the motifs name a flower),
  - a thin stitch line along the edges, the brand's one recurring touch.

  Nothing reproduces a real piece. Patterns stay generic. No sacred or ceremonial imagery, and no pan-Indigenous clichés (feathers, dreamcatchers, generic "tribal" bands).
- **Silhouette kinds,** picked by keywords in `facets.object.en` through a table in `scripts/lib/art/kinds.mjs`: round fan, bookmark, framed panel, hanging scroll, sachet or pouch, coaster set, brooch, needle case, rug, sash belt, basket, hat, wall hanging, cup, bracelet, woven band, carving (animal forms: bear, owl, seal, loon, whale, or a generic standing figure), print (a framed sheet), shawl, scarf, table runner, collar, embroidered panel, batik cloth, beaded necklace, beaded collar, earrings. Unmatched objects fall back to a framed textile. The run prints each fallback, so the table can grow.
- **Colors:** `facets.colors` names map to hex values through a named-color table in `scripts/lib/art/colors.mjs`. It covers at least these names:
  - reds and pinks: red, deep red, crimson, blush pink, pink, coral,
  - whites and neutrals: ivory, cream, white, natural, black, charcoal, grey,
  - browns and yellows: brown, tan, ochre, gold, yellow, orange,
  - greens and blues: green, jade, olive, teal, turquoise, sky blue, blue, indigo, navy,
  - purples: purple, violet,
  - metals: silver, tin.
  
  An unknown name falls back to the kit's ink and jade and is printed.
- **Determinism:** the same `mock.json` always gives byte-identical files. Any variation is seeded from the piece ID.

## Tasks

The integrator does every task itself, in order.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | The silhouette kinds and the color table, each kind an SVG path builder taking a palette | scripts/lib/art/kinds.mjs, scripts/lib/art/colors.mjs, scripts/lib/art/patterns.mjs | S3-catalog | opus |
| T2 | `scripts/make-illustrations.mjs`: read `mock.json`, pick kind, palette and pattern, compose and write each SVG, print fallbacks and sizes, plus `--check` mode. Add the `art` script to `package.json` | scripts/make-illustrations.mjs, package.json | T1 | sonnet |
| T3 | Write all 54 into `public/images/`, build the contact sheet and its screenshot, and run `npm run art -- --check` | public/images/, artifacts/art/ | T2 | sonnet |

## Acceptance

- Given `npm run export:mock` then `npm run art`, then `public/images/` holds `pc_01.svg` to `pc_54.svg`, and a second run changes no file.
- Given `npm run art -- --check`, then it exits 0. Every file is under 30 KB, valid, 800 by 800, with no text, images, scripts or outside references.
- Given `artifacts/art/contact-sheet.png`, when the verifier reviews it against this plan's style rules, then:
  - every piece is recognizably its object kind,
  - its colors match its facets,
  - no image contains text,
  - nothing reads as a copy of a real artwork, a sacred object or a cliché.
- Given `npm run test:smoke` after the files land, then it exits 0 and no image request fails.

## Out of scope

- Photos of real pieces or real people.
- Generated or downloaded images. The script draws every shape from code.
- The "Illustration" tag on the picture, which the kit's `PieceCard` draws.
- Final art from the design session, which I3-redesign brings in when a drop includes it.

## Contract additions needed

- The npm script `art`, with its `--check` mode, added to the Commands table in `CLAUDE.md` (the orchestrator's file).
- `artifacts/art/` as the contact sheet's home, for the verifier.
