# Cindia · vibe prompts that work

Prompts to type at the judging table, or to hand a judge on the public site.

**How they were tested:** 38 prompts, 43 runs, on the production build of main, at 1440 by 900, in scripted mode, through `/shop/search?q=<prompt>`. Every result below was read off the rendered page and checked against `src/mock/catalog.ts`.

**What the runs showed:**
- No console errors, and no requests beyond localhost.
- Every card had the right title, price, maker and community, its picture and its "Matches ..." line.
- The engine line read "Answered by a rule-based keyword match, in your browser." on every run.

Tested Oct 25, 2026, 4:50 AM PT.

**Scripted search knows only the catalog's own words.** For a judge's own phrasing, switch Live on, so our model reads the request by meaning. During the laptop setup, type "a beaded necklace for my best friend" in Live mode and check that it finds the beaded necklaces. In scripted mode, that request finds nothing.

## The 10 situations

| # | Scene | Type this | Keywords | Top 3 |
|---|---|---|---|---|
| 1 | A teacher's thank-you gift | `a warm thank you gift for my teacher` | warm, thank you | Red and grey wool mini weaving, $48, Diné · Orange and yellow floral beaded pouch, $85, Ojibwe · Small orange and white dotted seed pot, $95, Acoma |
| 2 | A gift for mom | `something soft and cheerful for my mom` | soft, cheerful, gift for mom | Pink and green beaded flower pendant necklace, $92, Ojibwe · Small orange and white dotted bowl, $135, Acoma · Pink and white zigzag patchwork skirt, $260, Seminole |
| 3 | Dad, with a budget | `a bold gift for my dad under $500` | bold, gift for dad, under $500 | Narrow stamped silver cuff bracelet, $95, Diné · Orange and black geometric jar, $320, Acoma · Red and white geometric patchwork jacket, $480, Seminole |
| 4 | A friend, with a budget | `a calm, elegant gift for a friend under $300` | calm, elegant, gift for a friend, under $300 | Purple and green beaded leaf earrings, $40, Ojibwe · Small black and white geometric jar, $260, Acoma · Teal and black striped patchwork skirt, $280, Seminole |
| 5 | Something small for yourself | `a quiet everyday piece for myself under $50` | quiet, everyday, for myself, under $50 | Thin silver ring with stamped chevrons, $38, Diné · Tiny white seed pot with black dots, $45, Acoma · Purple and green beaded leaf earrings, $40, Ojibwe |
| 6 | A kid's birthday | `a cheerful, playful birthday gift for a kid` | cheerful, playful, birthday | Child's yellow and blue patchwork jacket, $165, Seminole · Child's blue and yellow patchwork skirt, $58, Seminole · Red and grey wool mini weaving, $48, Diné |
| 7 | Holiday shopping | `something bright and cheerful for the holidays` | bright, cheerful, holiday | Green jacket with yellow and white patchwork diamonds, $460, Seminole · Silver and turquoise drop earrings, $85, Diné · Red and green floral beaded earrings, $55, Ojibwe |
| 8 | A best friend | `a bright, bold gift for my best friend` | bright, bold | Red and white wool weaving, $175, Diné · Red and green floral beaded earrings, $55, Ojibwe · Black, orange and white geometric jar, $240, Acoma |
| 9 | A housewarming on a budget | `an earthy housewarming gift under $300` | earthy, housewarming, under $300 | Small orange and black banded seed pot, $110, Acoma · Red and white wool weaving, $175, Diné · Brown leather pouch with green and yellow beaded leaves, $280, Ojibwe |
| 10 | A partner's birthday | `something bold and red for my partner's birthday` | bold, red, birthday | Small grey, red and black wool weaving, $180, Diné · Red and white wool weaving, $175, Diné · Red and green floral beaded earrings, $55, Ojibwe |

**Why each one demos well:**
- **1 to 5, 7, 8 and 9** each bring their top 3 from three communities.
- **3, 4, 5 and 9** turn the budget into a chip and a filter:
  - In 3, every result is $480 or less, so the $950 rug that also matches stays out.
  - In 5 and 9, the count drops to 6 instead of padding the grid.
- **2** turns "mom" into the chip "gift for mom", and all three results match all three keywords.
- **6** puts the two child's pieces first, though "kid" isn't a keyword. The vibe words found them.
- **10** is a color plus a mood. All three results match all three words.

**Spares:**
- `a warm, cheerful birthday gift` gives situation 1's three pieces, each matching all three words.
- `a playful birthday gift under $100` gives three communities, from $35 to $58.

## Chip edits worth showing

1. **Add a budget.** Click the first example, type `under $300` in "Add a keyword" and press Enter. The rugs drop out, and the top 3 become:
   - the beaded leather pouch, $280, Ojibwe
   - a black and white geometric jar, $260, Acoma
   - a banded seed pot, $110, Acoma
2. **Remove a chip.** On the earrings example, remove `gift for mom`. The drop earrings move to first, and the pendant necklace to third.
3. **Add a material.** On `a warm, cheerful birthday gift`, add the chip `clay`. The Acoma seed pot moves from third to first.

Don't remove a typed budget chip. Max price keeps the old cap, so the dearer pieces never come back. Set Max price to "Any price" instead.

## Avoid in scripted mode

The search hears these words, and nothing else:
- **moods:** warm, bold, elegant, quiet, earthy, calm, playful, cheerful, bright, soft
- **occasions:** birthday, housewarming, thank you, holiday, everyday
- **people:** mom, mother, mum, dad and father, plus the full phrases "gift for a friend", "gift for a sister" and "for myself"
- **facets:** wool, silver, turquoise, clay, beadwork, patchwork, earrings, rug, jar, bowl, pouch, skirt, jacket, ring and colors

A budget counts only when it's written "under $N" or "below $N".

| Prompt | What goes wrong |
|---|---|
| `a beaded necklace for my best friend` | No keywords, 0 results |
| `a cozy colorful bag for my sister` | No keywords, 0 results |
| `a gift for my coworker, less than $50` | No keywords, 0 results, because "less than" isn't read as a budget |
| `under $100` alone | 0 results. The search needs at least one word |
| `pottery for a housewarming, around $100` | It hears only "housewarming", and the top 3 cost $800 to $1,200 |
| `a turquoise ring for my dad` | Each of the top 3 matches only one word |
| `elegant turquoise jewelry for my grandma` | It fits, but all three come from one community, and "grandma" and "jewelry" are dropped |

Broad prompts lean toward the Diné co-op, because ties go to the lowest piece ID, and its pieces come first.

## The four "Try one" examples on the search page

| Example | Verdict |
|---|---|
| `something calm and earthy for a housewarming` | Works, but it shows Diné rugs only, from $450 to $1,200 |
| `a bright, cheerful birthday gift for a sister` | A good fit, all Ojibwe |
| `a quiet blue and white clay jar for myself` | The weakest. No clay piece is blue, and #3 is an orange and black jar |
| `elegant silver and turquoise earrings for my mom` | Good, all Diné, but a necklace ranks first, because it ties with the earrings and wins on piece ID |

Situations 1, 2, 4 and 9 would show three communities on every button.
