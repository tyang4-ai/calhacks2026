# I2-art · Original piece illustrations

Priority: P0 for T0, P1 for T1 to T3 · Wave: V1 for T0, then V2 · Depends on: T0 on I2-core's first spawn only. T1 to T3 on S3-catalog (G2b) and `npm run export:mock` · Area: `scripts/`, `public/images/`, `tests/smoke/images.spec.ts` · Owner: integrator · Gate: T0 by `npm run art -- --check` at G2b. T1 to T3 by the verifier's contact-sheet review, Gordon's two-minute look before G4v2, then `npm run test:smoke`

SCOPE: scripts/make-illustrations.mjs, scripts/lib/art/, public/images/, package.json, tests/smoke/images.spec.ts, artifacts/art/

**Two spawns.**
1. **T0, in V1,** right after I2-core's first spawn commits and before G1b. It writes a placeholder for every one of the 54 pieces, so no page shows a broken image while the catalog grows from 12 pieces to 54 (B1-22). The orchestrator commits it on its own. S3-catalog T5's test reads these files, so T0 commits before S3's data spawn reaches T5.
2. **T1 to T3, after G2b,** beside the V2 features. They replace the placeholders with drawings.

T0 edits `package.json`, so it never runs beside another integrator task that edits it (I2-core T7, an install).

## Goal

Every one of the 54 pieces, `pc_01` to `pc_54`, has an original illustration at `/images/<pieceId>.svg`. v1's twelve "Photo coming" squares go, and `pc_01` to `pc_12` are drawn as the Diné co-op's pieces they became in R0. The catalog has four crafts (fix-plan 1.1):

| Community | Pieces | What gets drawn |
|---|---|---|
| `com_dine`, the Diné Weaving and Silver Co-op | `pc_01` to `pc_12` | Wool weavings, and silver and turquoise jewelry |
| `com_ojibwe` | `pc_13` to `pc_26` | Floral beadwork: earrings, pouches and necklaces |
| `com_acoma` | `pc_27` to `pc_40` | Coil-built, hand-painted pottery: jars, bowls and seed pots |
| `com_seminole` | `pc_41` to `pc_54` | Patchwork skirts and jackets |

Each drawing is:
- in one consistent flat style,
- drawn from the piece's own facets (what it is, its materials and its colors),
- free of text, of anything copied from a real artwork, and of everything under "Never drawn" below.

The pages look finished before any Figma drop. A drop with better illustrations replaces them later (I3-redesign).

## Read first

- `docs/v2/fix-plan.md` sections 1.1 (the four communities, their crafts and IDs) and 1.6 (mock data only).
- `docs/common/data-model.md` after I2-core and S3-catalog: `Piece.facets` (`object`, `materials`, `techniques`, `motifs`, `colors`), `Piece.communityId`, `Piece.image`, `Piece.imageAlt`, the cultural rules under Communities.
- A2's catalog rules R14 to R17 (motifs, flowers, materials, banned objects) in `docs/v2/reviews/A2-culture-trust.md`, read for the four communities above, and the list S3 wrote from them into `src/mock/contentRules.ts`.
- `docs/v2/brief.md`: Principles (cultural care, labeled illustrations).
- `docs/common/design-system.md`: the palette and the flat, quiet look.
- `artifacts/mock/mock.json`, written by `npm run export:mock`: the `pieces` and `communities` the script reads.

## Interfaces

- **Reads:** `artifacts/mock/mock.json` only. It never imports TypeScript. T0 reads nothing, because the 54 IDs are fixed by the data model.
- **Writes:**
  - `public/images/pc_01.svg` to `public/images/pc_54.svg`,
  - `artifacts/art/contact-sheet.html`: all 54 in a grid, grouped by community, each with its ID, title, object and color names,
  - `artifacts/art/contact-sheet.png`: a screenshot of the sheet, taken with the repo's Playwright.
- **npm script `art`,** running `node scripts/make-illustrations.mjs`, `cmd.exe`-safe:
  - `npm run art` draws all 54 from `mock.json` and builds the contact sheet. Until T2 lands it writes the placeholders instead.
  - `npm run art -- --placeholders` writes the 54 placeholders. `npm run art -- --placeholders pc_07 pc_31` writes only those pieces' placeholders, to take a drawing back out.
  - `npm run art -- --sheet` rebuilds only the contact sheet and its screenshot from whatever is in `public/images/`. I3-redesign uses it for a drop's art.
  - `npm run art -- --check` writes nothing. It checks `pc_01` to `pc_54`, and every piece's `image` path when `mock.json` exists: each file exists, is valid XML under 30 KB with a `viewBox` of `0 0 800 800`, and has no `<text>`, `<image>`, `<script>`, `<foreignObject>` or outside reference. From T2 on, it also checks that `patterns.mjs` exports only the pattern names allowed below. It exits 1 on any failure.
- **The placeholder (T0):** the mat ground, the stitch line along the edges, and a plain rounded frame in the middle. It's the same for every piece and holds no text. The kit's `PieceCard` puts its "Illustration" tag over it as over any drawing.
- **The style (T1 to T3):**
  - an 800 by 800 square on a mat-colored ground,
  - one object silhouette, centered, with soft flat shading,
  - a surface and a pattern from the tables below,
  - a thin stitch line along the edges, the brand's one recurring touch.
- **Silhouette kinds,** picked by words in `facets.object.en` through a table in `scripts/lib/art/kinds.mjs`. These are the object words S3's pieces use, each a sourced form of its craft (S3-catalog):
  - Diné weaving: wall weaving, rug,
  - Diné silver and turquoise: earrings, ring, pendant necklace, cuff bracelet,
  - Ojibwe beadwork: earrings, pouch, pendant necklace, bead necklace,
  - Acoma pottery: jar, bowl, seed pot,
  - Seminole patchwork: skirt, jacket.

  No kind is drawn for a word outside this list. The unsourced ones (barrette, medallion, vase, vest, runner, belt buckle) and "bag" are gone. A sash belt is a sourced Diné form, but no piece uses it, so it has no kind. An unmatched object falls back to a plain flat textile square. The run prints each fallback, so a missing word shows up.
- **Surfaces,** picked from `facets.techniques` and `facets.materials` through `scripts/lib/art/surfaces.mjs`, falling back by `communityId`:
  - woven: flat wool with plain bands, stripes, steps and diamonds,
  - silver: flat metal shading with one plain stone, an oval or a circle, in turquoise or coral,
  - beaded: a dotted bead texture,
  - painted pottery: a slip ground with fine-line bands,
  - patchwork: bands of small pieced squares, triangles, diamonds and zigzags.
- **Patterns** come from `scripts/lib/art/patterns.mjs` and are plain geometry: stripes, bands, steps, diamonds, triangles, squares, zigzags, chevrons, arcs, checks, dots and fine parallel lines. A table there maps every motif word in S3-catalog's R14 lists to its pattern. `line` and `fine line` draw as fine parallel lines, and `geometric` as steps with fine-line bands. Plain flowers, leaves, vines, berries and buds are drawn only on `com_ojibwe` floral beadwork whose motifs name them, because floral beadwork is the one craft here known for flowers (A2 R15). A motif word the table doesn't know draws nothing and is printed. The pattern is never a guess.
- **Never drawn** (A2-23, A2 R14 to R17):
  - Yei or Yeibichai figures, katsina figures, sandpainting designs,
  - the whirling-log shape, and any cross, with bent arms or straight,
  - feathers,
  - any figure, face, animal or bird,
  - clichés of Native American art: arrows, dreamcatchers, tipis, headdresses, thunderbirds.

  Nothing reproduces a real piece or a known named design. `patterns.mjs` has no builder for any of these, and its exported list of builder names is what `--check` reads.
- **Colors:** `facets.colors` names map to hex values through a named-color table in `scripts/lib/art/colors.mjs`. T1 gives every color name in `mock.json` a value, starting from these:
  - reds and pinks: red, deep red, rust, terracotta, coral, pink,
  - whites and neutrals: cream, white, natural, black, charcoal, grey, sand,
  - browns and yellows: brown, tan, ochre, gold, yellow, orange,
  - greens and blues: green, sage, olive, teal, turquoise, sky blue, blue, indigo, navy,
  - purples: purple, violet,
  - metals: silver.

  The table has no "ivory", since the data writes "cream" (A2 R16). An unknown name falls back to the kit's ink and is printed.
- **Determinism:** the same `mock.json` always gives byte-identical files. Any variation is seeded from the piece ID. The placeholders are byte-identical on every run.

## Tasks

The integrator does every task itself, in order.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | First spawn. `scripts/make-illustrations.mjs` with `--placeholders` (also the default until T2) and `--check`, the `art` script in `package.json`, the 54 placeholders written over today's twelve files, and `tests/smoke/images.spec.ts`: every `/images/pc_NN.svg` from `pc_01` to `pc_54` answers 200 with an SVG content type, so Vite's `index.html` fallback can't hide a missing file | scripts/make-illustrations.mjs, scripts/lib/art/check.mjs, package.json, public/images/, tests/smoke/images.spec.ts | I2-core first spawn | sonnet |
| T1 | Second spawn, after G2b. The silhouette kinds, the surfaces, the patterns with their exported name list, and the color table covering every color in `mock.json`. Each kind is an SVG path builder taking a palette | scripts/lib/art/kinds.mjs, scripts/lib/art/surfaces.mjs, scripts/lib/art/patterns.mjs, scripts/lib/art/colors.mjs | T0, G2b | opus |
| T2 | `make-illustrations.mjs` draws: read `mock.json`, pick kind, surface, palette and pattern, compose and write each SVG, print fallbacks, unknown words and sizes. `--sheet` builds the contact sheet and its screenshot. `--check` gains the pattern list check | scripts/make-illustrations.mjs, scripts/lib/art/check.mjs, scripts/lib/art/sheet.mjs | T1 | sonnet |
| T3 | Write all 54 into `public/images/`, build the contact sheet and its screenshot, then run `npm run art -- --check` and `npm run test:smoke` | public/images/, artifacts/art/ | T2 | sonnet |

## Acceptance

- Given T0, when `npm run art -- --placeholders` runs, then `public/images/` holds `pc_01.svg` to `pc_54.svg`, each passes `--check`, and a second run changes no file.
- Given T0, when `npm run test:smoke` runs, then `images.spec.ts` passes for all 54.
- Given G2b, when `npm run art -- --check` runs, then it exits 0.
- Given `npm run export:mock` then `npm run art`, then `public/images/` holds the 54 drawings, and a second run changes no file there.
- Given `npm run art -- --check` after T3, then it exits 0. Every file is under 30 KB, valid, 800 by 800, with no text, images, scripts or outside references, and the pattern list holds only the allowed names.
- Given `artifacts/art/contact-sheet.png`, when the verifier reviews it against this plan's style rules, then:
  - every piece is recognizably its object kind,
  - its colors match its facets,
  - no image contains text,
  - flowers appear only on Ojibwe beadwork,
  - nothing from "Never drawn" appears,
  - nothing reads as a copy of a real artwork.
- Given the contact sheet, then Gordon looks at it for two minutes before G4v2 (fix-plan section 5). The gate doesn't wait for him. A drawing he flags goes back to its placeholder with `npm run art -- --placeholders <pieceId>` until it's redrawn.
- Given `npm run test:smoke` after the files land, then it exits 0 and no image request fails.

## Out of scope

- Photos of real pieces or real people.
- Generated or downloaded images. The script draws every shape from code.
- The "Illustration" tag on the picture, which the kit's `PieceCard` draws.
- Final art from the design session, which I3-redesign brings in when a drop includes it.

## Contract additions needed

None open. Each earlier item is settled:
- The npm script `art` with its `--placeholders`, `--sheet` and `--check` modes, and `artifacts/art/` as the contact sheet's home: settled in contracts section 11 and in `CLAUDE.md`'s Commands table.
- `npm run art -- --check` among G2b's commands: settled in contracts section 10.
