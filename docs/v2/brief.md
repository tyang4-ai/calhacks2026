# Cindia v2 · product brief

Read by the design session, the scribe, every lead and every builder. It says what v2 is and why. The contracts in `docs/common/` (after the v2 contract change lands) say what things are called, and the plans in `docs/plans/` say what to build. Written Oct 24, 2026, from Gordon's decisions that afternoon.

## In one line

Cindia is a platform for underrepresented makers, starting with Native American makers. It does the selling, the marketing and the books for them: buyers find pieces by describing a feeling, every maker keeps their own storefront, and a swarm of small agents answers customers and runs the makers' money, with a person approving anything that moves money.

## The named community

Anthropic's judges ask for one named community, not a broad group. So the platform is built for underrepresented makers, starts with Native American makers, and the demo follows one co-op all the way through: the Diné Weaving and Silver Co-op on the Navajo Nation in Arizona, with its owner Ruth B. and three makers, Grace N., Lena T. and Mae K. It makes wool weavings and silver and turquoise jewelry. Three more Native American communities sit beside it in the catalog, so search, the storefronts and the copy watch have range: an Ojibwe beadwork co-op in Minnesota, an Acoma pottery studio in New Mexico and a Seminole patchwork co-op in Florida.

Every community, maker and story is fictional. The crafts are real traditions, described only with sourced craft facts. We haven't worked with these communities yet, and a real launch starts with them. The pitch says so.

Gordon's framing, from the Anthropic mentors: if we don't help them, who will? Yes, it works like Etsy. But selling online takes time, broadband and marketing reach that many makers on tribal lands don't have. Cindia does that work for them, and it's fair by design: the price split is shown, search ranks by fit and not by ads, and Surprise me leans toward makers who sold less.

## Why it matters

A maker gets her time back for making, sees what each piece earned, and gets paid on time with a statement she can read. A buyer knows who made the piece and sees the maker paid. The v1 problems still hold: makers spend their time selling instead of making (time), young people don't take up a craft that doesn't pay (legacy), and buyers can't tell real from fake while middlemen take the margin (trust). They weigh hard on Native American makers:

- **Reach.** Fixed broadband at the FCC's 100/20 Mbps benchmark hadn't been deployed to more than 23% of people living on Tribal lands, the FCC reported in March 2024.
- **Banking.** In 2023, 12.2% of American Indian or Alaska Native households had no bank account, against 4.2% of all US households (FDIC 2023 survey).
- **Fakes.** On Aug 5, 2026, the U.S. Attorney's Office for the District of Arizona announced that a San Francisco seller had admitted selling over $92,000 of counterfeit Native American jewelry through an eBay store. The jewelry was imported from Asia, and the case was brought under the Indian Arts and Crafts Act.
- **An old problem.** In 2000 the chair of the Senate Committee on Indian Affairs estimated that about half of a roughly $1 billion market for Indian-made goods was counterfeit. The figure is old, so we cite it as old.

Sources:
- FCC, "FCC Increases Broadband Speed Benchmark", March 14, 2024: https://docs.fcc.gov/public/attachments/DOC-401205A1.pdf
- FDIC, 2023 National Survey of Unbanked and Underbanked Households: https://fdic.gov/household-survey/2023-fdic-national-survey-unbanked-and-underbanked-households-executive-summary
- U.S. Department of the Interior, Indian Arts and Crafts Board, on the District of Arizona's Aug 5, 2026 release: https://www.doi.gov/iacb/san-francisco-woman-convicted-selling-counterfeit-native-american-jewelry
- ICT, May 31, 2000: https://ictnews.org/archive/counterfeit-market-reaches-half-billion-dollars/

## Who uses it

| Who | What they need | Where they are in the platform |
|---|---|---|
| Buyer | To find something that means something, know it's real, and see that the maker gets paid | Shop |
| Maker | To be paid on time, see what each piece earned, list new work without writing marketing copy, and answer a buyer in her own words | Their maker page, their storefront |
| Co-op owner or lead | To make, not do books. Approves anything that moves money | Sell |
| Community | To decide how its craft and its stories are shown | Community page, what the demo keeps out |
| Judge at a table | To see in a minute what's real, what the agents do and why it's safe | The process blocks at the top of every page |

## What it does

### Shop (buyers)

- **Vibe search.** A buyer types a feeling ("a warm, bold gift for my mom. she loves red wool. under $200"). The Finder agent turns it into keywords the buyer can see and edit as chips, and our own embedding model finds pieces that match the feeling, not just the words. Every result says why it matched.
- **Surprise me.** One button, three ways, and the screen says which one it used:
  - with a keyword: a random pick among the closest matches to that word,
  - pure random: anything in the catalog,
  - fair random: a random pick that leans toward makers who've had fewer sales this month, so discovery doesn't only go to the bestsellers. The rule is on the page, and the weights are in the open in the search view.
- **Community pages:** who the community is (a placeholder that says the community writes this page in a real launch), its craft, how its makers would be verified, what this demo keeps out, its makers, pieces and projects.
- **Projects**, two kinds:
  - community projects anyone can fund, like an apprentice stipend or a weaving school, with a contribution option at checkout that starts off,
  - works in progress: commissions paid in stages as the maker reaches each milestone, with the owner approving each release.
- **The piece page (v1, kept):** the maker's story, hours of work, process steps, the verification line, "Where your money goes" (the price split, with what the maker would get through the gallery under its contract: $86.00 against $134.48 on Cindia for Grace N.'s weaving), the simulated checkout where the card becomes a token, and the receipt that promises to show when Grace N. is paid, then turns to "Paid to the maker" with her own note.
- **Help, any time:** a support drawer answered by the agent swarm. It shows which agent is answering and the guard that checked the answer. When the records don't say, Cindy says "I'll ask Grace N.", the question reaches her page, and her answer comes back in her own words. It hands over to a person when it should.
- **Storefronts:** each community has its own storefront at its own link, built with a block-based page builder. In v2 this is a working mock, labeled as a preview.

### Sell (makers, owners, co-op leads)

Everything from v1 stays, desktop-sized: money map, the month (reconcile, the catch, the judge's scenario), approvals with the seal, the close with the Excel file and impact, maker statements, proof, dashboard, Ask Cindy and the audit trail. v2 adds:

- **Overview:** today's sales, money waiting, approvals waiting, flags.
- **Listings:** a maker writes a few lines of notes, and the agents draft the listing (Lister), suggest search keywords (Tagger), check it against the community's rules and the maker's facts (Checker), and embed it into the index the moment it's drafted (Indexer). The maker or owner approves before anything goes live, and only then does the piece reach search.
- **Storefront builder (preview):** blocks (hero, story, pieces, process, projects, visit us) that can be reordered and edited, a theme, and a live preview. The Designer agent drafts a first version from the community page.
- **Projects and works in progress:** what's been raised and which milestones are waiting for approval.
- **Counterfeit watch:** a crawl of Cindia's sandbox market through Apify for listings that copy the co-op's own pieces: they name the co-op or one of its makers, repeat a piece's story, or claim a Cindia verification they lack. Every result the crawl checked is listed, and each possible copy sits next to the co-op's piece with its text match. A bare claim ("Authentic Native American made", no maker named) is listed as something the watch can't judge, with no report button. The owner decides whether to report, and Cindy never accuses anyone on her own.
- **Support:** the same swarm, seller side: payouts, listings, policy.

### Maker page

One maker's month: what sold, their share, what's held and why, the payout date, their listings, any work in progress, and buyers' questions she can answer in her own words. It opens in English. Chinese stays the platform's second interface language.

### Under the hood: the process blocks

A bar of clickable blocks across the top of every page. Each block is one process. It shows a live status and a small count, and a Live mark when its sources are live. One line on the bar sums it up, "Live: N of 11", and in live mode the bar shows how many screens are watching. Clicking a block opens that process's view, which draws what's happening and lists the raw events underneath.

| Block | Its view shows |
|---|---|
| Vibe search | The query, the keywords, the embedding map (every piece as a dot, the query as a star, the nearest pieces linked), the scores, which engine answered |
| Agent swarm | The agents as a graph, lighting up as each one works, with each step's input, output, tool, model and time, the guard checks, and the Elastic Agent Builder step |
| Checkout | Card to token to order, and what is stored and what never is |
| Money | The threads from buyer to Cindia to the co-op to the maker, project funds and milestones |
| Reconcile | Records arriving, matches, the flag and its three pieces of evidence |
| Approvals | What Cindy proposed, what the owner sealed or declined, what happened next |
| Close | Ledger to workbook to maker paid to receipt updated |
| Proof | The planted-error score (4 of 4) and the search model's score against the baselines |
| Counterfeit watch | Crawl, compare, check the claim, propose a report |
| Model | How the embedding model was trained: base model, training pairs, the eval numbers, the model card |
| Data | The database's tables, their row counts and newest rows |

## Why not Etsy

**Etsy pays the shop. Cindia pays the makers, and proves it.** Etsy is a marketplace that sellers have to learn and work. Cindia is a platform that does the selling, the marketing and the books for the makers, on every channel, Etsy included.

1. **It does the work for them.** A maker writes a few lines of notes, and Cindia's agents draft the listing, index it, answer buyers and run the books. No shop to manage, no ads to buy.
2. **It pays each maker, not one shop account.** A co-op on Etsy gets one payout and splits it by hand. Cindia splits every sale to each maker, holds and explains what's owed, gives each maker a plain statement, and turns the buyer's receipt to "Paid to the maker".
3. **It runs the books across channels.** The gallery's consignment, the co-op's own site, Cindia's marketplace and Etsy all reconcile into one set of books, and Cindy catches the gallery paying $340 short.
4. **Provenance comes from the community, not the seller.** On Etsy the "Handmade" label is the seller's word, and since July 2024 Etsy's "Designed by" label covers items that may be made with an outside production partner, generative AI or other digital tools (TechCrunch, July 9, 2024). On Cindia, each piece shows who made it and under whose authority: the maker's own nation, under the Indian Arts and Crafts Act. Fakes are a live problem: in August 2026 a San Francisco eBay seller admitted selling over $92,000 of jewelry imported from Asia as Native-made (U.S. Attorney, District of Arizona, Aug 5, 2026).
5. **Fair by design, and the math is shown.** Search ranks by fit, not by ads. Surprise me leans toward makers who sold less this month, with the weights in the open. The split is on the page before anyone pays.
6. **The storefront is theirs.** Each seller has a page at their own link and keeps the customer relationship.

We don't claim lower fees. Cindia's own fee is 10%.

Sources: https://techcrunch.com/2024/07/09/etsy-new-seller-policy-2024-generative-ai and https://www.doi.gov/iacb/san-francisco-woman-convicted-selling-counterfeit-native-american-jewelry

## The agent swarm: one small job each

Each agent does one narrow job well, gets only the tools that job needs, and hands back a typed result. The orchestrator routes and merges and has no facts of its own. That makes each agent easy to test, easy to swap and easy to trust. It also answers Hyphenate's question, "would you hire it?": every agent has limited access, a clean record of its work in the swarm view, and knows when to ask. There are 21 roles. Fifteen run on Claude, on Haiku and Sonnet only, with no Opus anywhere in the platform, and six are plain code.

| Agent | Its one job | Never does |
|---|---|---|
| Cindy (orchestrator) | Decides which agents run, in what order, and merges their results | Answer from her own knowledge |
| Intake | Reads the request: intent, budget, recipient, language, the IDs it mentions | Search or answer |
| Finder | Turns a request into keywords and filters, runs the search, returns candidates with scores. Find questions go to the Elastic Agent Builder agent | Write prose |
| Curator | Puts the final few in order, each with the index's own reason | Search |
| Steward | Answers "is it real?" and "what does it mean?" only from the community's page, the verification record and the piece's own story, quoting its source, and says "I'll ask the maker" otherwise | Invent cultural meaning |
| Clerk | Order status, shipping and returns, from the order records and the policy, with arrival dates worked out in code | Change anything |
| Writer | Writes the reply in the person's language from what the others found, and relays a maker's answer in her own words | Add facts |
| Lister | Turns a maker's notes into a draft listing in both languages, marking the version she didn't write | Publish |
| Describer | Describes what's visible in a piece's picture: object, colors, shapes | Guess meaning |
| Tagger | Proposes vibe keywords (moods, occasions, who it's for) for the maker to approve | Edit facts |
| Checker | Checks a draft against the community's rules and the maker's facts, backed by a check in code | Approve |
| Indexer | Builds the index entry and its embedding. Plain code, no model calls | |
| Matcher, Explainer, Bookkeeper, Scorer | The v1 money team: match payouts (code), explain the catch (Claude), derive the books (code), score the planted errors (code) | Move money |
| Scout, Comparer, Claims, Reporter | Counterfeit watch: crawl the sandbox market (Apify), compare with our embeddings (code), check what the listing claims (Claude), fill a report template for the owner | Send a report |
| Designer | Drafts a storefront from the community page | Publish |

Agents that are plain code are labeled "rule-based" in the swarm view, so no one mistakes them for a model.

## Search and the index

Cindia core holds the index and the management state, not the storefront pages or the images. The design:

- **One index entry per piece.** Its parts, each tagged with who writes it:
  - the maker's facts: title, story, object, materials, techniques, motifs, colors, size, hours, price, one of a kind or not, lead time,
  - the community's context: community, nation, place, craft tradition, verification method and status,
  - the agents' additions, approved by the maker: vibe keywords (moods, occasions, who it's for) and a description of the picture,
  - signals: sales this month (for fair surprise),
  - the picture's link, which lives on the storefront and not in the index,
  - the composed text that was embedded and the vector.
- **The embedding** comes from our own model. We fine-tune an open multilingual sentence model on Cindia's catalog, with training pairs written by an agent (buyer-style queries for each piece, in many voices, English and Chinese) and hard negatives. We then test it on queries written by hand that it never trained on. The proof panel shows recall at 5 against keyword search, the untuned base model and the hybrid. The model embeds every seller entry: the Indexer embeds each new listing the moment it's drafted, into a drafts index, and moves it into the live index when the owner approves.
- **Facts come from the maker and culture comes from the community, never from a model's general knowledge.** Agents only add the vibe layer and the picture description, and the maker approves those.
- **Search is hybrid:** the embedding (for the feeling) plus keyword matching on the facets (for exact things like "wool" or "turquoise"), fused, with filters like price.
- **Storage:**
  - SpacetimeDB is the system of record, one database that holds everything: the catalog, listings, orders, approvals, the swarm's runs and steps, each process's status and the screens watching (SpacetimeDB track).
  - Elastic Serverless holds the search index built from it, with our own vectors and an Agent Builder agent for find questions (Elastic track).
  - Without those services, the server falls back to a local index and the browser to scripted events.
- **Why it scales:** a 384-number vector is about 1.5 KB per piece, or about 0.4 KB quantized, so a million pieces fit in well under 2 GB and the search index handles that size. Pages and images live with each seller's storefront. The core only grows with the index and the books.

## Principles

- **Desktop only,** 1440 by 900 first. No phone layouts. Judges see the desktop site and a recorded video.
- **Everything visual.** If a process happens, it has a block and a view.
- **A person approves anything that moves money or publishes anything.** Cindy proposes, the seal decides.
- **Label what's simulated.** Every panel fed by scripted events keeps the Simulated badge. One line in the top bar says every maker, community and story is fictional and nothing is for sale.
- **Cultural care:**
  - no sacred or ceremonial objects in the catalog: no Yei or sandpainting designs, no katsina figures, no feathers, no headdresses or regalia, no ceremonial, prayer or medicine items,
  - no pan-Indian clichés (feathers, dreamcatchers, generic "tribal" patterns), and never a nation's name as a product word,
  - "Native American" and each nation's own name, never "Indian American",
  - communities write their own pages (placeholder text stands in and says so),
  - no machine translation into Native languages: Cindy works in English and Chinese, and makers write anything in their own language themselves,
  - verification is shown for what it is: in a real launch, makers would be enrolled members of their nation or certified by it as Indian artisans under the Indian Arts and Crafts Act, Cindia would keep only a yes or no, and the demo says no real check was done.
- **Plain words.** Short sentences. Labels from the glossary.

## Data care

Mock data only. Nothing real goes into the data, the databases or the embeddings, in scripted mode, in live mode or on the public site.

- Every maker, community, piece, order, story, storefront, approval and statement is fictional and lives in `src/mock/`. Real crafts are described only with sourced safe craft facts, one line per craft.
- SpacetimeDB, Elastic, the model's training pairs, the vectors and every test fixture are built only from `src/mock/`. The training queries are Claude-written about those fictional pieces, and the model card says so and names what the model is not for: classifying, ranking or verifying real makers or their work.
- **The copy watch never searches the real web.** It crawls a sandbox market: static pages of fictional listings, some of them look-alikes of the co-op's pieces, that ship with the public site at `/market/`. Until the public site is up, the watch runs on its fixture and stays scripted. Every URL in data and fixtures is on the sandbox market, `example.com` or `example.org`.
- A claim-only listing on the sandbox market ("Authentic Native American made", no maker named) shows what the watch can't judge: "Claims to be Native-made. We can't check that." It gets no report button.
- Nessie is a sandbox bank with no real money.
- No real person, shop, co-op, gallery, trading post or authenticity mark is named anywhere.
- A test scans the mock data, the fixtures, the training pairs and the model card for URLs outside the allowed hosts and for a nation's name used as a product word.
- In a real launch each community controls what's indexed about it.

## Desktop sitemap

| Route | Page |
|---|---|
| `/shop` | Home: vibe search, surprise me, communities, featured pieces |
| `/shop/search` | Results with reasons, chips and filters |
| `/shop/piece/:pieceId` | The piece page, with "Ask about this piece" |
| `/shop/community/:communityId` | A community |
| `/shop/projects`, `/shop/projects/:id` | Community projects and works in progress |
| `/shop/receipt/:orderId` | The receipt |
| `/store/:slug` | A storefront (preview) |
| `/sell/:view` | Overview, listings, storefront, projects, money, month, close, proof, dashboard, approvals, watch |
| `/maker/:makerId` | A maker's page |
| any page `?process=<id>` | That process's view, over the page |
| `/demo` | The 3-minute tour: auto-play, `?mode=present` for presenter mode, `?start=<beatId>` to open any beat, `?video=1` for video mode |
| `/market/` | The sandbox market on the public site: fictional listings the copy watch crawls |

A Shop and Sell switch sits in the top bar of every page. Help (the support drawer) is one click from anywhere.

## Screens to design

Every route above, each in its normal state plus empty, loading, live, simulated and error where they apply. Also:
- the three pitch cards and the end card,
- the process bar in idle, working, done and needs-attention, with the "Live: N of 11" line and presence,
- each of the eleven process views, the data view included,
- the support drawer on both sides, with agent handoffs, a guard firing, a question put to the maker and her answer, and a handover to a person,
- the listing flow with the agents' checks and the indexed line,
- the storefront builder and two example storefronts,
- the counterfeit side-by-side and the full results list,
- the maker page, with buyers' questions,
- the receipt's promise and the maker's note.

## Components for the design system

The v1 kit, restyled: Panel, Button, Money, Thread, Seal, MakerMark, Badge (Simulated, Live, Estimate, Demo data), Flag, EvidenceCard, ShareBar, LedgerTable, Toast, LangToggle, chart theme.

New in v2: TopNav with the Shop and Sell switch, Link, ProcessBlock, ProcessView frame, SearchBar with keyword chips, Chip, PieceCard, CommunityCard, ProjectCard with progress, MilestoneTimeline, VerificationLine (with a demo state), ChatThread and ChatBubble with the agent's name, AgentGraph, EmbeddingMap, ScoreBar, StatTile, EventLog, Drawer, Tabs, BlockEditor (storefront), SideBySide (counterfeit), PageFrame. Piece illustrations in one consistent style for the four crafts, labeled as illustrations.

## The 3-minute demo

Three minutes, in this order:

1. **The pitch, 1 minute: what it is, why, the tech.** Three full-screen pitch cards at the start of `/demo`, so the whole pitch runs in one window. The Figma Slides deck for the Figma track mirrors the same three cards. Gordon writes the words.
2. **The buyer minute.** Vibe search, the piece and where the money goes, a question answered by the swarm with a guard firing, pay, and a receipt that promises to show when Grace N. is paid.
3. **The seller minute.** A maker's notes become a listing that our model embeds into the index, then the money: map, month, the catch, approve and seal, close, Grace N.'s statement, and the buyer's receipt turning to "Paid to the maker".

How it runs:
- **Everything in the tour is scripted.** It never waits on a network, and it plays the same every time.
- **Presenter mode** pauses at the end of every beat. Space or the right arrow plays the next beat, and the left arrow replays the current one, so Gordon talks at his own pace and can stop for a judge.
- **Try it yourself.** After the tour, Gordon flips the Live switch and a judge types their own search or support question. Live mode answers people's own requests only.
- **Chapter 2, for questions:** Surprise me, the proofs, the counterfeit watch and the storefront, after the end card. Any beat opens directly by its ID.

The finance figures are exactly v1's: the $180 weaving, $134.48 to Grace N., the gallery short $340, and $95 of her pay held until the gallery pays. The video opens on the catch, plays the spine with shorter pitch cards, and stays under 3 minutes. Gordon records it himself.

## Backend if time

The pitch keeps its claims as written. The parts the build hasn't made true yet are listed here, and the cloud build works this list after everything else is green, in this order. On-screen labels stay truthful either way (Simulated badges, the what's-real list), which is also what keeps Q&A safe.

| The pitch says | What the demo has | What "if time" builds |
|---|---|---|
| "Cindy turns your words into keywords" | A rule-based keyword extractor in both modes | In live mode the Finder (Haiku) returns the chips and filters with the search answer, and the rule-based one stays the instant preview |
| "Tested on queries written by hand" | 50 held-out queries written by the data agent | Gordon writes or edits 15 of them (about 10 minutes), reported as their own row |
| "The Describer reads each photo" | No photo upload | A photo on the listing form, the Describer's layer, image vectors |
| "Every screen reads from SpacetimeDB" | The listed tables, the data view, presence | The approval queue moves onto SpacetimeDB, so the seal crosses two screens through it |
| "Judges can try it live online" | The public site plays scripted | A hosted live API |
| "Each seller builds their own storefront" | A mock block editor | A real builder |
| "Cindy asks the maker for you" | One scripted run | The live loop |
| "A bigger model trained on a GPU" | The cloud CPU run | A longer run on the lab GPU machine |
| "An Apify actor others can use" | B15 calls an Apify crawler | Scout and Comparer wrapped as our own actor for Best Actor |

## What each track sees

| Track | What we show them |
|---|---|
| Anthropic, Claude for Public Benefit | A named community (the Diné co-op), a real problem with sourced figures, the swarm's narrow agents on Claude, a guard firing in the tour, and a "where it could go wrong" table with the impact measurement plan |
| Hyphenate, Autonomous Systems for Finance | The catch, the reconcile and approvals views open during the month and the seal, the seats Cindy's agents fill (bookkeeper, collections and support), limited access, the swarm's record of work, the proof score |
| Visa, Reimagining Shopping | Vibe search, Surprise me, the price split with the gallery comparison before paying, the card token, a contribution that starts off, the receipt that shows the maker got paid, trust and privacy |
| Microsoft, Built for the Real World | A production-minded agent system with an Excel close, measurable usefulness, a path to production page, responsible design |
| Capital One, Best Use of Nessie | Sales and maker payouts on Nessie, the $340 catch found against Nessie's own bank records, and the fund and milestone moves posted to it |
| Meta, Bringing People Closer Together with AI | The buyer meets the maker by name and share, puts a question to her through Cindy and gets her answer in her own words, and reads her note on the paid receipt |
| Elastic | Our own embeddings in Elastic with hybrid search, and find questions routed in code to the Agent Builder agent, labeled in the swarm view |
| SpacetimeDB | One database that holds everything, the data view, and presence on the process bar |
| Apify | The copy watch crawling our sandbox market, with every result Apify returned on screen |
| Figma | The design pipeline from research to code, with the stage log, the Slides deck that mirrors the pitch cards and the workflow video |
| MLH, GoDaddy Registry | The domain Gordon registers, pointing at the public site |

## What's real and what's simulated

The scribe keeps this list from `status.md`. The rule: anything that ran against a live service in the gate is real, anything still playing scripted events is simulated and badged, and the people and communities are fictional demo data.

## Next: other communities

The platform is for underrepresented makers, and Native American makers are where it starts. Next are heritage crafts such as Gu embroidery and Miao embroidery, and Indigenous makers such as Māori, Sámi, Inuit, Quechua and Maasai communities. Each one joins only with that community's own organizations: co-design with Indigenous-led arts organizations, and the authenticity marks communities already run instead of a mark Cindia issues. There are about 476.6 million Indigenous people in the world, 6.2% of the global population and 18.2% of the people living in extreme poverty (World Bank: https://www.worldbank.org/ext/en/topic/social-development/indigenous-peoples).
