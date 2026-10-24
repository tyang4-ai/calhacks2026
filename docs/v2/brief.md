# Cindia v2 · product brief

Read by the design session, the scribe, every lead and every builder. It says what v2 is and why. The contracts in `docs/common/` (after the v2 contract change lands) say what things are called, and the plans in `docs/plans/` say what to build. Written Oct 24, 2026, 1:45 PM PT, from Gordon's decisions that afternoon.

## In one line

Cindia is the index and the back office for Indigenous and heritage makers: buyers find pieces by describing a feeling, every maker keeps their own storefront, and a swarm of small agents answers customers and runs the makers' money, with a person approving anything that moves money.

## The named community

Anthropic's judges ask for one named community, not a broad group. So the marketplace is open to Indigenous and heritage makers everywhere, and the demo follows one of them all the way through: the Gu embroidery (顾绣) studio in Shanghai, Gordon's hometown, with its owner and three makers. Gu embroidery is a Han Chinese heritage craft, not an Indigenous one, and Cindia never calls it Indigenous. Seven Indigenous communities sit beside it in the catalog so the search, the storefronts and the counterfeit watch have real range.

## Why it matters

The v1 problems still hold: makers spend their time selling instead of making (time), young people don't take up a craft that doesn't pay (legacy), and buyers can't tell real from fake while middlemen take the margin (trust). They weigh hardest on Indigenous makers:

- There are about 476.6 million Indigenous people, 6.2% of the world's population and 18.2% of the people living in extreme poverty (World Bank).
- In the US, 12.2% of American Indian or Alaska Native households had no bank account in 2023, against 4.2% of all households (FDIC 2023 survey).
- Fakes are an old problem. In 2000 the chair of the Senate Committee on Indian Affairs estimated that about half of a roughly $1 billion market for Indian-made goods was counterfeit. The figure is old, so we cite it as old.

Sources: https://www.worldbank.org/ext/en/topic/social-development/indigenous-peoples, https://fdic.gov/household-survey/2023-fdic-national-survey-unbanked-and-underbanked-households-executive-summary, https://ictnews.org/archive/counterfeit-market-reaches-half-billion-dollars/

## Who uses it

| Who | What they need | Where they are in the product |
|---|---|---|
| Buyer | To find something that means something, know it's real, and see that the maker gets paid | Shop |
| Maker | To be paid on time, see what each piece earned, and list new work without writing marketing copy | Their maker page, their storefront |
| Studio owner or co-op lead | To make, not do books. Approves anything that moves money | Sell |
| Community | To decide how its craft and its stories are shown | Community page, protocols |
| Judge at a table | To see in a minute what's real, what the agents do and why it's safe | The process blocks at the top of every page |

## What it does

### Shop (buyers)

- **Vibe search.** A buyer types a feeling ("something soft and hopeful for my mom, she gardens and loves peonies, under $200"). The Finder agent turns it into keywords the buyer can see and edit as chips, and our own embedding model finds pieces that match the feeling, not just the words. Every result says why it matched.
- **Surprise me.** One button, three ways, and the screen says which one it used:
  - with a keyword: a random pick among the closest matches to that word,
  - pure random: anything in the catalog,
  - fair random: a random pick that leans toward makers who've had fewer sales this month, so discovery doesn't only go to the bestsellers.
- **Community pages:** who the community is (in its own words, labeled as demo text), its craft, how its makers are verified, its protocols (what it doesn't sell), its makers, pieces and projects.
- **Projects**, two kinds:
  - community projects anyone can fund, like an apprentice stipend or a weaving school, with a contribution option at checkout,
  - works in progress: commissions paid in stages as the maker reaches each milestone, with the owner approving each release.
- **The piece page (v1, kept):** the maker's story, hours of work, process steps, the verification line, "Where your money goes" (the price split), the simulated checkout where the card becomes a token, and the receipt that later says "Paid to the maker".
- **Help, any time:** a support drawer answered by the agent swarm, which shows which agent is answering and hands over to a person when it should.
- **Storefronts:** each community or studio has its own storefront at its own link, built with a block-based page builder. In v2 this is a working mock, labeled as a preview.

### Sell (makers, owners, co-op leads)

Everything from v1 stays, desktop-sized: money map, the month (reconcile, the catch, the judge's scenario), approvals with the seal, the close with the Excel file and impact, maker statements, proof, dashboard, Ask Cindy and the audit trail. v2 adds:

- **Overview:** today's sales, money waiting, approvals waiting, flags.
- **Listings:** a maker writes notes in their own language, and the agents draft the listing (Lister), suggest search keywords (Tagger), check it against the community's protocols (Checker) and index it (Indexer). The maker or owner approves before anything goes live.
- **Storefront builder (preview):** blocks (hero, story, pieces, process, projects, visit us) that can be reordered and edited, a theme, and a live preview. The Designer agent drafts a first version from the community page.
- **Projects and works in progress:** what's been raised and which milestones are waiting for approval.
- **Counterfeit watch:** a scan of public web search results, through Apify, for listings that look like the maker's pieces or claim to be Indigenous-made without verification. Each hit shows the found listing next to the maker's piece with a similarity score. The owner decides whether to report it, and Cindy never accuses anyone on her own.
- **Support:** the same swarm, seller side: payouts, listings, policy.

### Maker page

One maker's month in their language: what sold, their share, what's held and why, the payout date, their listings and any work in progress. The Gu makers start in Chinese.

### Under the hood: the process blocks

A bar of clickable blocks across the top of every page. Each block is one process. It shows a live status and a small count, and a Live or Simulated label. Clicking opens that process's view, which draws what's happening and lists the raw events underneath.

| Block | Its view shows |
|---|---|
| Vibe search | The query, the keywords, the embedding map (every piece as a dot, the query as a star, the nearest pieces linked), the scores, which engine answered |
| Agent swarm | The agents as a graph, lighting up as each one works, with each step's input, output, tool, model and time |
| Checkout | Card to token to order, and what is stored and what never is |
| Money | The threads from buyer to Cindia to studio to maker, project funds and milestones |
| Reconcile | Records arriving, matches, the flag and its three pieces of evidence |
| Approvals | What Cindy proposed, what the owner sealed or declined, what happened next |
| Close | Ledger to workbook to maker paid to receipt updated |
| Proof | The planted-error score (4 of 4) and the search model's score against the baselines |
| Counterfeit watch | Search, compare, check the claim, propose a report |
| Model | How the embedding model was trained: base model, training pairs, the eval numbers, the model card link |

## The agent swarm: one small job each

Each agent does one narrow job well, gets only the tools that job needs, and hands back a typed result. The orchestrator routes and merges and has no facts of its own. That makes each agent easy to test, easy to swap and easy to trust. It also answers Hyphenate's question, "would you hire it?": every agent has limited access, a clean record of its work in the swarm view, and knows when to ask.

| Agent | Its one job | Never does |
|---|---|---|
| Cindy (orchestrator) | Decides which agents run, in what order, and merges their results | Answer from her own knowledge |
| Intake | Reads the request: intent, budget, recipient, language, the IDs it mentions | Search or answer |
| Finder | Turns a request into keywords and filters, runs the search, returns candidates with scores | Write prose |
| Curator | Picks and orders the final few from the candidates, one reason each, grounded in the index | Search |
| Steward | Answers "is it real?" and "what does it mean?" only from the community's page and the verification record, and says "I'll ask the maker" otherwise | Invent cultural meaning |
| Clerk | Order status, shipping and returns, from the order records and the policy | Change anything |
| Writer | Writes the reply in the person's language from what the others found | Add facts |
| Lister | Turns a maker's notes into a draft listing in both languages | Publish |
| Describer | Describes what's visible in a piece's picture: object, colors, shapes, motifs | Guess meaning |
| Tagger | Proposes vibe keywords (moods, occasions, who it's for) for the maker to approve | Edit facts |
| Checker | Checks a draft against the community's protocols and the maker's facts | Approve |
| Indexer | Builds the index entry and its embedding. Plain code, no model calls | |
| Matcher, Explainer, Bookkeeper, Scorer | The v1 money team: match payouts (code), explain the catch (Claude), derive the books (code), score the planted errors (code) | Move money |
| Scout, Comparer, Claims, Reporter | Counterfeit watch: run the web search (Apify), compare with our embeddings (code), check what the listing claims (Claude), draft a report for the owner | Send a report |
| Designer | Drafts a storefront from the community page | Publish |

Agents that are plain code are labeled "rule-based" in the swarm view, so no one mistakes them for a model.

## Search and the index

Cindia core holds the index and the management state, not the storefront pages or the images. The design:

- **One index entry per piece.** Its parts, each tagged with who wrote it:
  - the maker's facts: title, story, object, materials, techniques, motifs, colors, size, hours, price, one of a kind or not, lead time,
  - the community's context: community, people, place, craft tradition, verification method and status,
  - the agents' additions, approved by the maker: vibe keywords (moods, occasions, who it's for) and a description of the picture,
  - signals: sales this month (for fair surprise),
  - the picture's link, which lives on the storefront and not in the index,
  - the composed text that was embedded and the vector.
- **The embedding** comes from our own model. We fine-tune an open multilingual sentence model on Cindia's catalog, with training pairs written by an agent (buyer-style queries for each piece, in many voices, English and Chinese) and hard negatives. We then test it on queries written by hand that it never trained on. The proof panel shows recall at 5 against keyword search, the untuned base model and the hybrid.
- **Facts come from the maker and culture comes from the community, never from a model's general knowledge.** Agents only add the vibe layer and the picture description, and the maker approves those.
- **Search is hybrid:** the embedding (for the feeling) plus keyword matching on the facets (for exact things like "wool" or "顾绣"), fused, with filters like price.
- **Storage:**
  - Elastic Serverless holds the index (Elastic track), with an Agent Builder agent for conversational search.
  - SpacetimeDB holds the live shared state: swarm runs and steps, process status, the screens that are watching (SpacetimeDB track).
  - Without those services, the server falls back to a local index and the browser to scripted events.
- **Why it scales:** a 384-number vector is about 1.5 KB per piece, or about 0.4 KB quantized, so a million pieces fit in well under 2 GB and the search index handles that size. Pages and images live with each seller's storefront. The core only grows with the index and the books.

## Principles

- **Desktop only,** 1440 by 900 first. No phone layouts. Judges see the desktop site and a recorded video.
- **Everything visual.** If a process happens, it has a block and a view.
- **A person approves anything that moves money or publishes anything.** Cindy proposes, the seal decides.
- **Label what's simulated.** Every panel fed by scripted events keeps the Simulated badge. Fictional people and communities are labeled as demo data.
- **Cultural care:**
  - no sacred or ceremonial objects in the catalog,
  - no pan-Indigenous clichés (feathers, dreamcatchers, generic "tribal" patterns),
  - communities write their own pages (demo text stands in and says so),
  - no machine translation into Indigenous languages: Cindy works in English and Chinese, and makers write anything in their own language themselves,
  - verification is shown for what it is: who attested, how.
- **Data care:** no real community's data is used to train anything. The model card says so. In a real launch each community controls what's indexed about it.
- **Plain words.** Short sentences. Labels from the glossary.

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
| `/demo` | The guided tour that plays the whole story, with video mode |

A Shop and Sell switch sits in the top bar of every page. Help (the support drawer) is one click from anywhere.

## Screens to design

Every route above, each in its normal state plus empty, loading, live, simulated and error where they apply. Also:
- the process bar in idle, working, done and needs-attention,
- each of the ten process views,
- the support drawer on both sides, with agent handoffs and a handover to a person,
- the listing flow with the agents' checks,
- the storefront builder and two example storefronts,
- the counterfeit side-by-side,
- the maker page in Chinese,
- the guided tour's title and end cards.

## Components for the design system

The v1 kit, restyled: Panel, Button, Money, Thread, Seal, MakerMark, Badge (Simulated, Live, Estimate, Demo data), Flag, EvidenceCard, ShareBar, LedgerTable, Toast, LangToggle, chart theme.

New in v2: TopNav with the Shop and Sell switch, ProcessBlock, ProcessView frame, SearchBar with keyword chips, Chip, PieceCard, CommunityCard, ProjectCard with progress, MilestoneTimeline, VerificationLine, ChatThread and ChatBubble with the agent's name, AgentGraph, EmbeddingMap, ScoreBar, EventLog, Drawer, Tabs, BlockEditor (storefront), SideBySide (counterfeit), PageFrame. Piece illustrations in one consistent style, labeled as illustrations.

## The guided tour (`/demo`)

About 100 seconds at 1x, in this order:
1. Vibe search.
2. Surprise me.
3. The piece page and its price split.
4. A support question answered by the swarm.
5. Pay, plus a contribution to the Gu apprentice project.
6. The money arriving.
7. The month.
8. The catch: the gallery paid $340 less than the contract says.
9. Approvals with the seal.
10. The close.
11. The maker's statement in Chinese.
12. The receipt updates to "Paid to the maker".
13. Proof (4 of 4, and the search model's score).
14. The counterfeit watch.
15. A maker's new listing going through the agents.
16. The Gu storefront.

The finance figures are exactly v1's: the $180 peony fan, $134.48 to the maker, the gallery short $340. Video mode opens with the catch. Gordon records the final video himself.

## What each track sees

| Track | What we show them |
|---|---|
| Anthropic, Claude for Public Benefit | A named community (the Gu studio), a real problem, the swarm's narrow agents on Claude, where it could go wrong and how the design guards against it |
| Hyphenate, Autonomous Systems for Finance | The catch, the seats it fills (bookkeeper, collections, support), limited access, the swarm's record of work, what's real and what's simulated, the proof score |
| Visa, Reimagining Shopping | Vibe search, surprise me, the price split before paying, the card token, the receipt that shows the maker got paid, trust and privacy |
| Microsoft, Built for the Real World | A production-minded agent system with an Excel close, measurable usefulness, a path to production, responsible design |
| Capital One, Best Use of Nessie | Every sale, payout and maker payment against a Nessie bank account |
| Meta, Bringing People Closer Together with AI | Buyers connected to the actual maker and their community, storefronts, community projects |
| Elastic | Our own embeddings in Elastic with hybrid search, and an Agent Builder agent |
| SpacetimeDB | The swarm and the process blocks running on live shared state |
| Apify | The counterfeit watch |
| Figma | The design pipeline from research to code, with the stage log |
| MLH, GoDaddy Registry | The domain Gordon registers |

## What's real and what's simulated

The scribe keeps this list from `status.md`. The rule: anything that ran against a live service in the gate is real, anything still playing scripted events is simulated and badged, and the people and communities are fictional demo data.
