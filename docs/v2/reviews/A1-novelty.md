# A1 · Innovation and novelty review of the v2 plan

Reviewer A1, one of the review swarm. Written Oct 24, 2026, 2:35 PM PT, while the v2 plans were fresh and before `I2-tour` (wave V3) could start.

Read for this review: `docs/v2/brief.md`, `docs/v2/README.md`, `docs/v2/contracts.md` (all of it, section 8 closely), `docs/spec/cindia-pitch.md`, `docs/spec/cindia-spec.md`, the plans `F-search`, `F-process`, `F-support`, `F-communities`, `F-storefront`, `F-watch`, `F-seller-hub`, `M-buyer`, `S3-catalog`, `B11-embed`, `B12-search`, `B14-swarm`, `I2-tour` and `D-sponsors`, `docs/common/demo-script.md`, `docs/common/data-model.md`, `src/mock/impact.ts`, Gordon's vault notes `judging-criteria-patterns.md` and `winning-patterns-by-domain.md`, the Cal Hacks judging criteria and the Anthropic and Meta track text in the vault, and a web check of the closest incumbents (sources at the end).

## Verdict: at risk

The single most novel thing is v1's closed money loop. One system both sells the piece and keeps the studio's books, so it can show the buyer before paying that $134.48 of the $180 peony fan goes to the maker, Lu Yun (d03, `split.shown` at 16.5 s). It catches the gallery paying $340 less than its own contract says, with the contract, the statement and the bank record side by side (d08, `flag.raised` at 56.5 s). It holds her share of the shortfall and tells her why, in Chinese (d11, `statement.issued` at 72.4 s, $95.00 held). Then it flips the buyer's receipt to "Paid to the maker" (d12, 76.0 s). None of the incumbents I checked does all of that. NOVICA lets artisans set their own prices, but its fair trade page describes no split for buyers and no payout confirmation. QuickBooks' 2025 AI agents categorize, help reconcile and chase late invoices, but they never see the buyer. Etsy's Gift Mode has done gift search by recipient, occasion and interests since January 2024. The tour does not show the loop in its first 20 seconds. Seconds 0 to 14 are vibe search and Surprise me, the two features with the closest incumbents, and in a scripted run the engine label under the results reads "Keyword match, simulated" (`F-search.md` T2, `S3-catalog.md` T6). Only the setup, the split, lands before 20 seconds. The payoff comes at 76 seconds and is followed by 24 more seconds of proof, watch, listing and a storefront labeled "post-MVP", so it isn't even the last thing a judge sees. Video mode's cold open on the catch helps the recording, but the catch alone reads as reconciliation, not as the loop. Most of what v2 adds is familiar on its own, so the fix is order and words, not more features.

## The four judges

### 1. Cal Hacks main-track judge

Devpost's criteria: application, intentionality ("a clear sense of who it's for"), functionality (a live demo that runs smoothly), creativity ("clearly show what makes your project stand out from similar work") and technical complexity.

**What impresses them**
- Real technical depth. A multilingual embedding model is fine-tuned on the catalog and scored against keyword search, the base model and a hybrid on 50 hand-written held-out queries, with a guard that keeps eval queries out of training (`B11-embed.md` T3 and T4). Gordon's own notes rank a custom-trained model as a strong technical signal.
- Agents with typed outputs and a server check after every call (`B14-swarm.md`, the agents table).
- The v1 loop: the month replayed, the catch, the seal, a real Excel close, a statement in Chinese.
- The process views that draw the embedding map (d01 from 6.5 s, when a model report exists) and the agent graph (d04 from 25 s) beside the page.

**What bores or worries them**
- 16 beats in 104 seconds, about 6.5 seconds each (contracts section 8). The judge can't say whether this is a marketplace, a help desk, a bookkeeper or a site builder. That fails "a clear sense of who it's for".
- Gordon's own v1 rule says "Keep the buyer part under 15 seconds. Past that it reads as a shopping app" (`cindia-spec.md` section 3). In v2 the buyer part runs from 0 to 39 s (d01 to d05).
- The last frame is a storefront whose footer says "Made with Cindia's storefront builder (preview)" (`F-storefront.md` T0).
- In a scripted run all ten process blocks show Simulated above every frame (`F-process.md` acceptance 1).
- The impact numbers are about Indigenous people, but the demo follows a Shanghai studio.

**Their question:** "If you could keep only one of these sixteen beats, which one, and why isn't it something Etsy already does?"

### 2. Skeptical product and venture judge

**What impresses them**
- The receipt that proves the maker was paid (d12). Neither NOVICA nor Etsy shows that.
- The three-way check on a consignment gallery: contract 40%, statement 50%, bank $1,700.00, short $340.00 (`demo-script.md` v1 d07). Galleries paying late and short is a specific, believable pain.
- Owning both sides of the ledger is the moat. A marketplace can't see the studio's other channels, and a bookkeeping tool can't see the buyer.

**What bores or worries them**
- Each v2 addition has a well-known incumbent. A gift search for "my mom, she gardens" is Etsy's Gift Mode. A listing drafted from the maker's notes is Shopify Magic. The storefront builder is Shopify, and here it's a mock. A support chat run by agents is any AI help desk.
- The marketplace cold start: 54 pieces, eight fictional communities, no real maker yet.
- The trust pillar is thin where it's shown. "Did the maker stitch this herself?" is answered from the studio's own attestation (`S3-catalog.md` T2, the `com_gu` note), which is also what a faker would say.
- "91% similar" sits beside the maker's illustration, but B15 compares a search snippet's text, not pictures (`contracts.md` section 5, B15).
- The "before" impact numbers are placeholders. 45 days to payout and 12 hours saved are both marked "illustrative, waiting for Gordon's numbers from the studio" (`src/mock/impact.ts`).
- The plan names the 10% Cindia fee but no price for the back office. On Monday the back office is usable by one studio that already sells through a gallery. The marketplace isn't. Gordon needs a one-line answer ready.

**Their question:** "Who pays you on Monday: the buyer, the studio or the gallery? And what does the studio stop doing the day it starts?"

### 3. Anthropic track judge (Claude for Public Benefit)

The criteria: a named community, a real problem you lived or heard first hand, it works ("one thing done well and usable on Monday beats a broad demo"), and thoughtful use of Claude ("you know where it could go wrong for the people using it"). The Slack version adds a clear plan to measure impact, and Claude mattering both in how the product is built and in how it runs.

**What impresses them**
- Claude where it matters and code where it doesn't. Arrival dates come from `arrival_window` code, "so no model does date arithmetic". The Matcher, Bookkeeper, Indexer, Scout and Comparer are code and labeled Rule-based.
- Guards with teeth. The Steward's quote must appear word for word in the record, or the answer becomes "I'll ask the maker and get back to you". The Writer can't state an amount or a date the specialists didn't return. A sweep test proves no run emits `approval.granted`, `payout.sent` or `money.moved` (`B14-swarm.md` T5, T6 and T9).
- Claude in the build too. Claude writes the buyer-style queries that teach the small search model (B11 T3), and Claude Code agents with gates build the product.
- A real tie to the named community. Gordon grew up in Shanghai, and his family-knowledge story opens the v1 pitch.

**What bores or worries them**
- The one-liner names "Indigenous and heritage makers" (brief, "In one line"). That's the "students" register. All three numbers in "Why it matters" describe Indigenous people, while the named community is a Han Chinese studio that "Cindia never calls Indigenous".
- Seven real Indigenous peoples get self-descriptions written in their voice: "each community's `about` is written as the community describing itself" (`S3-catalog.md` T2). The brief's own rule is "communities write their own pages".
- "One thing done well" against 21 agents, 16 beats and 11 tracks.
- The guards are invisible in the tour. `run_01` has no `check` step, so d04 shows agents taking turns, not a guard firing.
- The brief says "The Finder agent turns it into keywords", but the chips come from `extractKeywords()`, which is deterministic code, and no model runs at search time. If a judge asks, that overclaim costs trust in everything else.
- No measure of impact is stated for the studio, and no talk with a real maker yet. Gordon's hub note still has "[ ] Message one heritage artisan" unchecked (`cal-hacks-13.md` line 83).

**Their question:** "Show me a moment where Claude would have gotten it wrong for this studio, and what stopped it."

### 4. Meta track judge (Bringing People Closer Together with AI)

The criteria: how meaningfully it strengthens human connection, how essential and well integrated the AI is, originality, and the strength of the working demo.

**What impresses them**
- The buyer meets the maker by name, hours and share before paying (d03: 26 hours, $134.48).
- The receipt names her when she is paid (d12).
- The $5.00 apprentice add-on ties a buyer to the craft's next generation (d05, `project.funded` `ctb_01` at 35.0 s).
- Community pages that say what each community won't sell.

**What bores or worries them**
- In the tour the AI stands between the two people. d04's question is about the maker ("Did the maker stitch this herself?"), five agents answer it from records, and nothing reaches her. `run_01` has no handoff step.
- There is no moment where buyer and maker exchange a single word.
- The apprentice fund, the most human feature, is one switch inside a 6-second pay beat.
- The storefront and listing beats are seller tooling, not connection.

**Their question:** "When does the buyer actually hear from the maker, and what does the AI do to make that happen?"

## Findings

| # | Severity | Where | What's wrong | Evidence | Fix |
|---|---|---|---|---|---|
| 1 | blocker for I2-tour | `docs/v2/contracts.md` section 8, d01 and d02 (0 to 14 s), and the events table in `docs/plans/I2-tour.md` | The tour opens on the two features with the closest incumbents. The novel loop's setup lands at 16.5 s and its payoff at 76 s | Etsy Gift Mode (Jan 2024) asks for the recipient, the occasion and interests, and builds gift guides with GPT-4. `split.shown` 16.5, `flag.raised` 56.5, `receipt.updated` paid 76.0 | Re-cut the tour (Top change 2) before I2-tour T1 writes the timeline. After that, the same change costs a timeline rewrite and three G4v2 runs |
| 2 | major | `S3-catalog.md` T6 (engine `keyword_scripted`, `modelId` unset), `F-search.md` T2, `I2-tour.md` d01 (`search.mapped` only with a report) | In a scripted run the first beat contradicts the pitch. The words say "our own embedding model". The screen says "Keyword match, simulated", and the map may be missing | The three lines named | Judge in live mode for `b11-embed` and `b12-search`. The `local_hybrid` path needs no Elastic. Add a pre-judging check that d01's `search-engine` names `cindia-embed-v1`. If B11 never trained, open the live pitch on the piece page |
| 3 | major | `contracts.md` section 1 (`CINDIA_MODEL_DIR`, listed in `.gitignore`), `B11-embed.md` T8 (publishes only with `HF_TOKEN`) | The trained model exists only in the cloud VM. The Windows demo laptop can't embed a judge's own query, so live vibe search and the live map fail at the table | B12 "embeds the query with the B11 model". `vectors.json` holds the piece vectors and the PCA, not the model | Needs Gordon: set `HF_TOKEN` so `publish.py` pushes the model, or copy `models/cindia-embed-v1/` to the laptop. Before judging, `GET /api/b11/model` on the laptop says `trained: true` |
| 4 | major | `docs/v2/brief.md` "In one line" and "Why it matters", the five lines in `CLAUDE.md` | The pitch names a broad group, and every number describes Indigenous people. The named community is a Han Chinese studio that is never called Indigenous | Anthropic: "'Students' is too broad." The brief: "Gu embroidery is a Han Chinese heritage craft, not an Indigenous one" | Lead with the Gu studio and Gordon's story. Use the Indigenous numbers in one "who else" line. Find one sourced number about the named community's world, or use none (Top change 1) |
| 5 | major | `S3-catalog.md` T2 ("written as the community describing itself"), `F-communities.md` T2 ("set as the community's own words") | First-person self-descriptions for seven real Indigenous peoples, written by someone outside them. The Demo data badge labels the data but doesn't fix the voice | The brief's "Cultural care": "communities write their own pages" | Write the seven `about` texts in third person, as visible placeholders that say the community writes this page. Keep first person only for the Gu studio |
| 6 | major | `brief.md` "Vibe search" ("The Finder agent turns it into keywords") against `F-search.md` Interfaces (`extractKeywords()`) and `contracts.md` section 5, B12 (the reason is built with "no model call") | The brief overclaims Claude in the search path. No model runs at search time | The lines named | Say the true version, which is also the better Anthropic story: Claude wrote the training queries, and a small open model does the search with no LLM call. Fix the brief before the scribe copies it into Devpost |
| 7 | major | `contracts.md` section 8 d04, `S3-catalog.md` T8 `run_01` (steps 1 to 8) | The swarm beat shows agents taking turns, not a guard firing. The plan's best safety work is invisible in the tour | `run_01`'s steps are route, result, call, tool, result, tool, result and reply. No `check` | Add a `check` step and a second scripted question that ends in "I'll ask Lu Yun" (Top change 5) |
| 8 | major | `contracts.md` section 8 d04 and d12, `F-support.md` Goal | No moment where buyer and maker meet. Agents answer a question about the maker, and the question never reaches her | `run_01` ends in `support.answered` from `writer`, with no handoff | The "I'll ask Lu Yun" run (Top change 5) and her own note on the paid receipt (Top change 7) |
| 9 | major | `S3-catalog.md` T2, the `com_gu` verification | "Did the maker stitch this herself?" is answered by the studio's own word. Trust is one of the three founding problems | `by`: the craft is on China's national list. `note`: "the studio attests each piece is stitched by the maker named on it" | The reply says what kind of evidence it is: "The studio attests this. Cindia hasn't checked it independently yet." Name the stronger check as what's next. The v1 pitch already lists checking makers against China's lists of recognized practitioners |
| 10 | major | `contracts.md` section 8 d03, `S3-catalog.md` T7 `splits.ts` (Cindia rules only), `src/mock/impact.ts` | No quantified comparison on screen. The split shows what she gets, not what she'd get otherwise, and the only "before" numbers are placeholders | `impact.ts` marks 45 days and 12 hours "ESTIMATE: illustrative". The data model's gallery rule is gross minus commission minus materials, so by my arithmetic the fan pays her 18000 - 7200 - 2200 = 8600 cents ($86.00) through the gallery at its contract's 40% | Compute a gallery split for the open piece with the same code and show one line under the split (Top change 6). Name the number Gordon will measure for the studio |
| 11 | minor | `contracts.md` section 8 d16 (100 to 104 s), `F-storefront.md` T0 | The tour ends on its most familiar beat, and that beat calls itself "post-MVP" | `storefront-preview-note`, `store-footer` | End the spine on the receipt. Move d16 to chapter 2 |
| 12 | minor | `contracts.md` section 8 d11 (72 to 75 s), the narration in `I2-tour.md` | The maker's statement gets 3 seconds, and nothing links the catch to her | `demo-script.md` v1 d10: "$95.00 held". Narration: "with what's still owed" | Give d11 6 seconds and say it: "Because the gallery paid short, $95 of Lu Yun's pay is held, and she can read why in Chinese" |
| 13 | minor | `F-watch.md` T3 (`watch-similarity`, "91% similar", beside the maker's `PieceCard`), `contracts.md` section 5, B15 | The side-by-side implies a picture match. The score compares a search snippet's text | The Comparer "scores each result's title and snippet" | Label it "Text match 91%" and show the claim first: "Claims hand-stitched Gu embroidery. No verification found." The claim is the part that matters, and it's what the US Indian Arts and Crafts Act covers (already in the `com_dine` note) |
| 14 | minor | `S3-catalog.md` T8 `run_02` | The listing beat's only visible failure is the dullest check, a missing price. The novel check, against the community's protocols, passes silently. AI listing drafts are common (Shopify Magic) | `chk_01` protocol ok, `chk_03` price not ok | If d15 stays, make the visible catch the novel one. The Lister's scripted draft adds a heritage claim the notes don't make, such as "Ming-dynasty technique", and the facts check strikes it. Label it a planted test, like v1's planted errors |
| 15 | minor | `F-process.md` acceptance 1, the brief's "Under the hood" | Ten Simulated badges sit above every frame of a scripted run. The glass box is a good idea, but it says "not real" ten times while the judge decides whether it works | "Every block shows `simulated-badge` in scripted mode" | Add one summary on the bar, "Live: N of 10", and judge in live mode wherever a source is green |
| 16 | minor | `contracts.md` section 8 d02 (9 to 14 s), `F-search.md` T4 | Fair random is one of v2's few original ideas, but "Surprise me" reads as a toy and its point sits in a sub-line | T4: "its line says it leans toward makers with fewer sales this month" | In chapter 2, put the principle on screen in one line: "Bestseller lists send buyers to the same makers. This draw leans the other way." Show the drawn maker's weight next to the top seller's |
| 17 | minor | `contracts.md` section 2 IndexEntry `provenance`, `F-search.md` T2 (the reason chips) | The plan's most original principle, "facts come from the maker and culture comes from the community, never from a model's general knowledge", is stored in every index entry and shown nowhere in the tour | `provenance`: facts `maker`, culture `community`, vibe `agent:tagger`, with `approvedBy` the maker. No test ID renders it | On each result's reason, mark every matched keyword by its source: "peony, from the maker" and "hopeful, suggested by the Tagger, approved by Lu Yun". About an hour in F-search T2 |
| 18 | minor | `brief.md` "What each track sees" (11 tracks), `contracts.md` section 6 (21 agents) | One beat per sponsor is how a 60-second story became 16 beats | The counts | Keep every track, but let the live pitch serve Anthropic, Hyphenate, Visa and Meta. The others get chapter 2, a `?start=<beatId>` link and their `sponsors/` folder |

## Top 7 changes, by judge impact per hour of build time

### 1. Lead with the named community, and stop speaking for the others

About 20 minutes, mostly words.
- The brief's one-liner, the pitch opening and the scribe's README and Devpost lines: "Cindia is the shop and the back office for a Gu embroidery studio in Shanghai, my hometown: one owner and three makers." Then the v1 family-knowledge story. Then one line on scale: "The same problems hit Indigenous makers hardest," with the World Bank number.
- `S3-catalog.md` T2: the seven Indigenous `about` texts become third-person placeholders that say the community will write this page.
- The brief's "Vibe search": replace "The Finder agent turns it into keywords" with "Claude wrote the training queries, and a small open model trained on them does the search with no LLM call."
- One sentence on measuring impact, for the pitch and Devpost: the maker's share of each sale and the days from close to payout, measured from the studio's own books, with today's "before" numbers marked as placeholders until the studio gives real ones.
- Narrows the pitch. Spreads nothing.

### 2. Re-cut the tour around one purchase, and end it on the receipt

About 45 minutes in `contracts.md` section 8 and `I2-tour.md`, before I2-tour T1 starts.
- The spine, about 79 seconds: d01 vibe (0 to 9), d03 piece (9 to 16), d04 support (16 to 28), d05 pay (28 to 34), d06 money (34 to 40), d07 month (40 to 50), d08 catch (50 to 58), d09 approve (58 to 63), d10 close (63 to 67), d11 maker (67 to 73, 3 seconds longer), d12 receipt (73 to 79).
- Chapter 2, "How it works", after a 1-second card: d02 surprise, d13 proof, d14 watch, d15 listing, d16 store. The full run is about 109 seconds, inside the 130-second test limit.
- `/demo?cut=pitch` stops after d12 and shows the end card, which already carries the planted-error score and the search proof. Keep `proof.scored` inside the spine, off camera at the end of d12 as v1 did at 59.0 s, so the end card has the score. The video plays both chapters. Generalize `?start=catch` to `?start=<beatId>`, so an Apify or Elastic judge starts at their beat.
- A line under `buyer-receipt-status` in d05: "We'll show you when Lu Yun is paid." Then d12 pays off a promise. The d11 narration: "Because the gallery paid short, $95 of her pay is held, and she can read why in Chinese."
- Removes breadth from the live pitch. Nothing leaves the product.

### 3. Let a judge drive one live query

About 30 minutes beyond B11 and B12, which are P0 anyway, plus getting the model onto the laptop (finding 3).
- After the spine, Gordon says "Describe a gift for someone you love" and hands over the keyboard. The answer comes from `cindia-embed-v1` (`local_hybrid` needs no Elastic), and the search process view draws the map.
- The pre-judging check: `GET /api/b11/model` on the demo laptop says trained, and the search block reads Live.
- Fallbacks, in order: the second support question from change 5, live through B14, then Surprise me, which is seeded and always answers.
- Adds no beat. It turns the most familiar feature into proof that the system works.

### 4. Show the model's score where the search is

About 30 minutes.
- Move `model.trained` and `proof.search_scored` from 80.8 s and 81.0 s into d01's first second (`I2-tour.md` T1), and let `search-engine` (F-search T2) read the store's `model` key.
- With a report, the line reads "Cindia's own model. Recall at 5: [custom] against [keyword] for keyword search, on 50 held-out queries." The numbers come only from `report.json`.
- If the custom model doesn't beat keyword search, the B11 honesty rule holds: say so, or leave the line off d01.
- One line on an existing label.

### 5. Show a guard firing and a limit kept, in d04

About an hour in `S3-catalog.md` T8 and `contracts.md` section 8.
- Add a `check` step to `run_01` after the Steward's result: "Quote found word for word in the studio's record." The swarm view and the step strip already draw `check` steps.
- The reply says what the evidence is: "The studio attests that Lu Yun stitched it. Cindia hasn't checked this independently."
- Add buyer suggestion 2, "What do the peonies mean to her?", with its own scripted run. The Steward returns `unknown`, and the Writer says "I don't have her words on that. I'll ask Lu Yun and get back to you." It's already a B14 acceptance case, so live mode behaves the same. If there's time, end that run in `support.escalated` so `support-handoff` shows a person taking over (it needs one more demo approval).
- Play it inside d04 (about 4 more seconds) or click it live during questions.
- Deepens a beat already in the spine. It answers Anthropic's "where it could go wrong" and gives Meta a handoff to a person.

### 6. Put one computed comparison on the price split

About an hour in `S3-catalog.md` T7 (a gallery split from the channel rules in `data-model.md`) and M-buyer's split card.
- One line under the split: "Through the gallery, by its contract, Lu Yun gets $86.00 for this fan. On Cindia, $134.48." Code computes both, never typed. My arithmetic from the rules is 18000 - 7200 - 2200 = 8600 cents.
- The d08 narration can reuse it: the gallery charged 50%, which would leave her $68.00.
- One line on an existing card. No new surface.

### 7. Close the loop with the maker's own voice

About 45 minutes: one note per Gu maker in `src/mock/`, shown by M-buyer's `Receipt` when the status is `paid_to_maker`, with a glossary row.
- Two lines from Lu Yun in Chinese, written by Gordon, with an English line under them, and the Demo data badge. No "translated by Cindy" label unless Claude actually translated it.
- It becomes the spine's last frame. The books are what let the maker reach the buyer, which is Meta's question, and it gives every judge a closing image.
- Flag: a small new element, but it deepens the existing payoff and adds no beat.

## What spreads the demo too thin

Against Anthropic's "one thing done well":
- In the live pitch: d02 surprise, d13 proof, d14 watch, d15 listing and d16 store. That's five separate ideas in 29 seconds. Move them to chapter 2. The end card keeps the proof scores in view.
- The 11-track table shaping the tour (finding 18).
- Naming 21 agents. At the table, name only the five in d04.
- Of the Top 7, changes 5, 6 and 7 add an element each, but each deepens a beat that's already in the spine. None adds a beat.

## Not a build item, and the best return of all

Gordon messages one heritage artisan tonight, in Chinese. Shanghai is 15 hours ahead, so his evening is their morning. His hub note still lists it unchecked. One real sentence from a maker about being paid late answers Anthropic's "real problem" better than any feature, and it can open the pitch.

## Sources

- Etsy Gift Mode, TechCrunch, Jan 24, 2024: https://techcrunch.com/2024/01/24/etsy-launches-gift-mode-a-new-ai-powered-feature-that-generates-200-gift-guides/
- NOVICA fair trade principles: https://www.novica.com/gb/fair-trade
- Intuit's QuickBooks AI agents, CPA Practice Advisor, 2025: https://www.cpapracticeadvisor.com/2025/06/27/intuit-rolls-out-ai-agents-for-quickbooks/163868/
- Shopify Magic product descriptions: https://apps.shopify.com/built-in-features/magic-product-descriptions
