# D-sponsors · README, what's real, the Devpost skeleton and one folder per sponsor track

Priority: P1 · Wave: any (8:00 PM Saturday, then again at the freeze) · Depends on: `docs/harness/status.md` as it stands when the scribe runs · Folder: `README.md`, `docs/devpost/`, `sponsors/` · Made real by: nothing (writing only)

**SCOPE:** `README.md, docs/devpost/, sponsors/`

## Goal

A judge or a sponsor who opens the repo finds their track in one click and sees exactly what to look at, how to run it and what's real. Gordon gets a Devpost skeleton with every fact already in place and clearly marked spaces for his own words, so he writes the story himself and doesn't have to dig for numbers.

## Read first

- `docs/harness/status.md`: the gates, the Features and Upgrades tables (v1 and v2), Cut and simulated, Needs Gordon. This is the source of truth for what's real.
- `docs/v2/brief.md` (what Cindia is, "What each track sees") and `docs/v2/README.md` (the plan list)
- `docs/spec/cindia-pitch.md`: Gordon's own earlier drafts of his story. You may point to them, but you don't rewrite them.
- The plans in `docs/plans/` for the files each track should look at, and `docs/common/api-contract.md` for the endpoints
- `server/b11_embed/report.json`, when it exists: the only source for the search model's numbers
- `docs/common/definition-of-done.md`, "Writing (scribe)"

## Style

- Plain words and short sentences. No em dashes and no semicolons in prose.
- None of these words or phrases: tapestry, realm, foster, esteemed, thrilled, unwavering, bridge the gap, at the intersection of.
- Evidence first: "Cindy matched 23 of 23 payouts" beats "powerful matching".
- Never a number that isn't in `status.md`, a plan, a test, `report.json` or the spec.
- Never a key, an environment variable's value, or a URL with credentials. Variable names are fine.
- Every person and community in the demo is fictional. Say so wherever they appear, and never call Gu embroidery Indigenous.

## What to write

### `README.md`

- What Cindia is in three sentences, and the named community.
- **Run it:**
  - scripted: `npm ci`, `npm run build`, `npm run preview`, then open `/demo` and `/shop`,
  - live: the environment variable names from `docs/common/conventions.md`, never their values, plus `npm run server` and `spacetime start`.
- The guided tour and its controls.
- A short map of the folders, and the test commands.
- A "For sponsors" table linking each `sponsors/` folder.
- The what's-real summary, linked to `docs/devpost/whats-real.md`.

### `docs/devpost/whats-real.md`

- One table: each feature and upgrade, live or simulated, the gate and tag it passed, and its key or service.
- The Cut and simulated list exactly as `status.md` has it.
- One line saying the communities, people and stories are fictional demo data.
- The search model's numbers from `report.json`, or "not trained yet".

### `docs/devpost/devpost.md`

The Devpost skeleton, with these sections. Facts go in. Gordon's own words go only where a marker says so, written exactly as `[GORDON: <what goes here, with one or two questions to start him>]`.
- **Inspiration:** `[GORDON: ...]` only, pointing to his earlier draft in `docs/spec/cindia-pitch.md`.
- **What it does:** facts, as short bullets: Shop, Sell, the swarm, the process blocks, the tour.
- **How we built it:** the stack from `package.json` and `server/requirements.txt`, our own embedding model and how it was tested, Elastic, SpacetimeDB, Apify, Nessie, the Claude models per agent, and the build harness of Claude Code agents with gates.
- **Challenges:** facts from `docs/harness/lessons.md`, then `[GORDON: ...]`.
- **Accomplishments:** gate results, the planted-error score, the search model's numbers.
- **What we learned:** `[GORDON: ...]` only.
- **What's next:** the storefront builder beyond the preview, community review of every page, real makers.
- **Built with:** a plain list.
- **Tracks:** one line per track, linked to its `sponsors/` folder.
- **Links:** the repo, and `[GORDON: video link]`.

### `sponsors/<track>/README.md`

One folder per track, plus `sponsors/README.md` indexing them. Each README has the same parts:
1. The track's name.
2. What its judges look for: a line or two per criterion in your own words, with a short quote only where a criterion's exact wording matters, and a link to the Devpost prizes page as the source.
3. What Cindia does for this track.
4. Where to look: relative links to the exact files and plans.
5. How to run that part.
6. The moment in the tour (beat ID and time from `docs/common/demo-script.md`).
7. What's live and what's simulated for this track, from `status.md`.

| Folder | Track | What its judges look for (from the hacker guide and Devpost) | Look at |
|---|---|---|---|
| `anthropic` | Claude for Public Benefit | A named community, not a broad group. A real problem the builder lived or heard first hand. It works, one thing done well. Thoughtful use of Claude, knowing where it could go wrong for the people using it | `server/b14_swarm/` (the agents, their checks), `server/routers/b02_explain.py`, `b07_ask.py`, `b09_concierge.py`, `server/b11_embed/pairs.py`, `docs/v2/brief.md`, the harness in `.claude/` and `docs/harness/` |
| `hyphenate` | The Hyphenated Enterprise: Autonomous Systems for Finance | Is it real enough. Would you hire it, for which seats, with limited access, a clean record and knowing when to ask. Did we see something new. The moment it catches what others missed. They also want a demo video that opens with the moment, a live demo, one line on the seats, and proof of what's real | `src/features/reconcile/`, `server/routers/b01_match.py`, `b03_proof.py`, `b08_approvals.py`, `src/features/approvals/`, `src/features/proof/`, the swarm's roster |
| `visa` | Reimagining Shopping | Innovation, user experience, technical execution, commerce impact, trust and responsibility | `src/features/search/`, `server/b12_search/`, `src/features/buyer/` (the split, the token, the receipt), `src/features/support/` |
| `microsoft` | Built for the Real World | Customer understanding, measurable usefulness, path from prototype to production, responsible design, end to end functionality | `server/routers/b06_workbook.py`, `src/features/close/`, `src/features/impact/`, `server/b11_embed/report.json`, the approvals |
| `capital-one` | Best Use of Nessie | Completeness, creativity, complexity | `server/routers/b04_bank.py`, `server/routers/b04_nessie.py`, `src/features/money-map/` |
| `meta` | Bringing People Closer Together with AI | How it strengthens human connection, how essential and well integrated the AI is, originality, a strong working demo | `src/features/communities/`, `src/features/storefront/`, `src/features/support/`, the maker page |
| `elastic` | Best use of the Elastic Agent Builder on a Serverless instance | The track's name says it: Agent Builder on Serverless. Show the agent, the index and our own vectors in it | `server/b12_search/` (`elastic.py`, `agent.py`), `server/b11_embed/` |
| `spacetimedb` | Spacetime | SpacetimeDB as the core real-time backend: live shared state, instant sync between users, agents and systems, live dashboards, marketplaces | `server/b13_spacetime/` (the module, the bridge, the stream), `src/sources/live/b13-live.ts`, `src/features/process/` |
| `apify` | Best use of Apify | Apify used in a meaningful way, and the quality of the project | `server/b15_watch/` (`scout.py`), `src/features/watch/` |
| `figma` | Best Figma Workflow Hack | A demo video of 3 minutes at most, a stage log of 200 words at most per stage (ideation, prototyping, handoff, code generation), and Figma Slides with the Make or prototype files embedded and shared with anyone who has the link | `design/` (`HANDOFF.md`, `stage-log.md`, the Figma links), `docs/plans/I3-redesign.md` |
| `mlh-godaddy` | Best Domain Name from GoDaddy Registry | A domain registered through GoDaddy Registry | `[GORDON: the domain and what it points to]` |

If a folder's code doesn't exist yet when the scribe runs (an upgrade still building, or cut), say so in that README, and link the plan instead of the code.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | The what's-real list | `docs/devpost/whats-real.md` | none | sonnet |
| T2 | The README | `README.md` | T1 | sonnet |
| T3 | The Devpost skeleton | `docs/devpost/devpost.md` | T1 | opus |
| T4 | Sponsor folders, part 1: anthropic, hyphenate, visa, microsoft, capital-one, meta | `sponsors/anthropic/README.md`, `sponsors/hyphenate/README.md`, `sponsors/visa/README.md`, `sponsors/microsoft/README.md`, `sponsors/capital-one/README.md`, `sponsors/meta/README.md` | T1 | sonnet |
| T5 | Sponsor folders, part 2: elastic, spacetimedb, apify, figma, mlh-godaddy, and the index | `sponsors/elastic/README.md`, `sponsors/spacetimedb/README.md`, `sponsors/apify/README.md`, `sponsors/figma/README.md`, `sponsors/mlh-godaddy/README.md`, `sponsors/README.md` | T1 | sonnet |
| T6 | At the freeze: refresh every file above from the final `status.md` and the final tags | all of the above | the freeze (R7) | sonnet |

## Acceptance

- Given `status.md`, when the what's-real list is compared with its Cut and simulated section and its Upgrades tables, then they agree line for line.
- Given every relative link in `README.md`, `docs/devpost/` and `sponsors/`, when each is checked with Glob, then it points to a file or folder that exists, or the text says it's still being built and links its plan.
- Given the Devpost skeleton, when it's read, then every section that needs Gordon's voice holds only a `[GORDON: ...]` marker, and every fact traces to `status.md`, a plan, a test, `report.json` or the spec.
- Given any of these files, when it's searched, then it holds no key or variable value, no em dash, no semicolon in prose, and none of the banned words.
- The Writing checklist in `docs/common/definition-of-done.md` passes.

## Out of scope

- Writing Gordon's story, the inspiration or the lessons in his voice.
- Submitting anything, posting anywhere, recording or editing the video.
- Code, tests or contracts.

## Contract additions needed

- `docs/common/conventions.md`, Folders and owners: `sponsors/` owned by the scribe. The edit guard's area for the scribe role must include `sponsors/` (the orchestrator, in `.claude/hooks/`).
