# D-deploy · The public site, the sandbox market and the demo laptop

Priority: P0 · Wave: V2, as soon as G1b and G2b are green · Depends on: I2-shell (the site-wide notice L1, the `noindex` tag, `public/robots.txt`, Pay off on the public build), S3-catalog (`counterfeitCandidates`), I2-core (`npm run export:mock`) · Area: `scripts/`, `public/`, `package.json` · Owner: integrator · Gate: the Acceptance commands and a verifier review, through the gate skill with this plan as `PLAN` (`scripts/gate.mjs` has no D-deploy entry, so the orchestrator runs the commands itself), tag `v2-deploy`

**SCOPE:** `scripts/make-market.mjs, scripts/make-market.test.mjs, scripts/build-public.mjs, scripts/check-public.mjs, scripts/check-public.test.mjs, scripts/laptop-setup.mjs, scripts/laptop-setup.test.mjs, scripts/preflight.mjs, public/_redirects, public/market/, package.json`

T2's `package.json` edit never runs beside another integrator task that edits `package.json` (I2-art's `art` script, or an install). The orchestrator queues one behind the other.

## Goal

Three things the build session can't do by itself, made ready so Gordon finishes each in minutes:
- **A public site** that judges and the MLH domain can open: the scripted build only, with the fictional notice on every page, nothing for sale, and search engines kept out (`docs/v2/fix-plan.md` section 1.8). Gordon uploads it to Cloudflare Pages tonight and again after the freeze.
- **The sandbox market** at `/market/`: static pages of fictional listings, some of them look-alikes of the Diné co-op's pieces and one that only claims to be Native-made (`docs/v2/fix-plan.md` section 1.6). B15's crawler reads it, so the copy watch never searches the real web.
- **The demo laptop ready for live mode** (C-1, D2-5): one script Gordon runs Saturday night on a good network, which sets up everything live mode needs and ends with `/api/health` reading all true, plus a checklist that rehearses the scripted fallback.

## Read first

- `docs/v2/fix-plan.md` sections 1.6 (mock data only), 1.7 (the model hand-off) and 1.8 (the public site)
- `docs/tech/cloudflare-pages/direct-upload.mdx` and `docs/tech/cloudflare-pages/redirects.mdx`
- `docs/v2/contracts.md` section 1 (the variable names, `PUBLIC_SITE_URL` among them) and section 12 (the labels, L1 for the market pages)
- `docs/plans/I2-shell.md`: how the public build is told apart, and where L1, `noindex` and `robots.txt` come from. This plan only checks them
- `docs/plans/B11-embed.md` (`fetch_model.py`), `docs/plans/B13-live.md` and `server/b13_spacetime/README.md` (the publish command and the token step), `docs/plans/B15-watch.md` (what the crawler reads)
- `docs/common/conventions.md`, Commands: npm scripts run in `cmd.exe` on Windows, so anything more than one plain command is a Node script under `scripts/`
- `docs/tech/spacetimedb/install-and-run-locally.md` for the CLI install on Windows

## Interfaces

- **`npm run build:public`** runs `node scripts/build-public.mjs`, which:
  1. runs `npm run export:mock` and `node scripts/make-market.mjs`,
  2. runs the Vite production build with `VITE_PUBLIC_SITE=1` set in the child process's environment. A Node script does this the same way on every shell, where a `FOO=1 cmd` prefix fails in `cmd.exe`,
  3. writes `dist/public-build.json`: `{ "publicSite": true, "commit": <full SHA of HEAD>, "builtAt": <ISO time> }`,
  4. runs `node scripts/check-public.mjs` and exits with its code.
  The output goes to `dist/`, like every build, so it never runs beside G4, G4v2, G5 or G6.
- **`public/_redirects`**, which Vite copies to `dist/_redirects`. Cloudflare Pages applies every rule before it looks for a file, so a catch-all `/*` would also serve the page for `/assets/...` and `/market/...`. The file lists the site's own route families instead, each proxied to the root page with status 200, so the address bar keeps the deep link and its query string:
  ```text
  /demo     /  200
  /shop     /  200
  /shop/*   /  200
  /sell     /  200
  /sell/*   /  200
  /store/*  /  200
  /maker/*  /  200
  /buyer    /  200
  /studio/* /  200
  /owner    /  200
  ```
  Add any other route family `src/app/routes.tsx` serves. Never a rule for `/assets/`, `/images/`, `/market/`, `/robots.txt`, `/favicon.svg` or `/public-build.json`. `dist/` holds no top-level `404.html`, which would turn off Cloudflare Pages' own fallback to the root page for paths the file doesn't list.
- **`scripts/make-market.mjs`** reads `artifacts/mock/mock.json` and writes `public/market/`:
  - `index.html`, which lists every listing with a plain link,
  - one page per entry of `counterfeitCandidates` whose `url` is a path under `/market/`, written at the candidate's own `url`: `/market/listing-01.html` to `/market/listing-04.html` in `cftId` order (S3-catalog, `docs/v2/contracts.md` section 2), so `public/market/listing-01.html` onward, never `public/market/<cftId>.html`. Candidates on `example.com` or `example.org` get no page. Nothing comes from anywhere but the mock data.
  - Each listing page puts the listing inside `<main>`: the title in its `<h1>`, the snippet as the first paragraph, then the claim, an invented seller line, and a price if the data has one. B15's crawler reads the `h1`, the first paragraph and the text of `<main>` (B15-watch).
  - Every market page carries `<meta name="robots" content="noindex">` and shows L1, then the line "A sandbox market made for testing Cindia's copy watch. These listings are fictional.", in a header above `<main>`, so the snippet stays the first paragraph inside it. No script tags, no images, no fonts, no stylesheet links and no URL to another host. Inline CSS only, plain and readable.
  - The claim-only listing names no maker and no community, exactly as its data reads.
  - The pages are committed, so the dev server and every build serve them too. Rerun the script whenever `src/mock/watch.ts` changes.
- **`scripts/check-public.mjs`** checks a built `dist/` without a browser and prints one line per check:
  - `dist/public-build.json` says `"publicSite": true`,
  - `dist/_redirects` parses as Cloudflare's format (one `source destination code` per line, `#` comments), and a matcher with Cloudflare's splat rule sends `/demo`, `/shop`, `/shop/piece/pc_01`, `/sell/month`, `/store/dine-weavers` and `/maker/mkr_01` to `/` with 200, and matches nothing for `/assets/index.js`, `/images/pc_01.svg`, `/market/`, each listing's `/market/` path from the data, and `/robots.txt`,
  - `dist/robots.txt` disallows everything for every agent,
  - `dist/index.html` holds `<meta name="robots" content="noindex">`,
  - there's no `dist/404.html`,
  - `dist/market/index.html` exists and links every listing page, and each page exists,
  - fewer than 1,000 files and none over 25 MiB, the drag-and-drop limits in `direct-upload.mdx`.
- **`scripts/laptop-setup.mjs`**, for the Windows demo laptop (it also runs on Linux for its test). Node 22, no dependencies. It prints each step before it runs it, stops at the first failure with what to do, and never prints a key's value. Steps:
  1. `git pull --ff-only origin main`.
  2. The Python venv: create `.venv` if it's missing (`py -3 -m venv .venv` on Windows, `python3 -m venv .venv` elsewhere), install `server/requirements.txt` with the venv's Python, and check that `torch.__version__` ends in `+cpu`.
  3. `npm ci`, then `npm run export:mock`.
  4. The `.env` names, read inside Node and printed as "present" or "missing", never their values: `CINDIA_ANTHROPIC_API_KEY` or `ANTHROPIC_API_KEY`, `NESSIE_KEY`, `ELASTIC_URL`, `KIBANA_URL`, `ELASTIC_API_KEY`, `APIFY_TOKEN`, `HF_TOKEN`, `CINDIA_HF_REPO` (the model's Hugging Face repo, `<account>/cindia-embed`) and `PUBLIC_SITE_URL`. `SPACETIME_TOKEN` comes later, from step 6. An `ELASTIC_AUTH=proxy` or `APIFY_AUTH=proxy` line fails the step with "Proxy mode works only in the cloud. Put the real key in .env."
  5. The model: `.venv`'s Python runs `server/b11_embed/fetch_model.py`, which pulls the newest published model into `CINDIA_MODEL_DIR` and checks it against `report.json`.
  6. SpacetimeDB, with the commands in `server/b13_spacetime/README.md`:
     - `spacetime --version` must answer, or the step prints the Windows install command from the SpacetimeDB docs and stops. Then `spacetime server set-default local`.
     - If `http://127.0.0.1:3000/v1/ping` doesn't answer, it starts `spacetime start --listen-addr 127.0.0.1:3000` in a window of its own and waits up to 30 seconds.
     - It installs the module's packages, publishes with `spacetime publish -s local cindia`, and runs `server/b13_spacetime/save_token.py` with `.venv`'s Python, which writes `SPACETIME_TOKEN` to `.env` without printing it. Then it checks the name is present.
     - It clears earlier runs with `spacetime call -s local cindia clear_runs`. The API seeds the catalog itself once it's up (`POST /api/b13/seed`, or the B13 adapter in live mode).
  7. The API: if `http://localhost:8000/api/health` doesn't answer, it starts `npm run server` in a window of its own and waits up to 60 seconds. If the API already answers and step 6 wrote a new `SPACETIME_TOKEN` (the script compares the line before and after, in memory), it restarts the API, because a running server keeps the old token: it stops the process listening on port 8000 (`netstat -ano` and `taskkill /PID <pid> /T /F` on Windows), then starts it the same way.
  8. Health: it prints each key and service from `/api/health` as true or false, and the routers it lists. It exits 1 if any is false, naming the step that fixes it.
  9. It prints the rehearsal checklist below.
  
  Flags: `--dry-run` prints every step and its command and runs nothing. `--check` skips the installs and the starts and runs only steps 4 and 8.
- **`scripts/preflight.mjs`** adds port 3000 and the v2 variable names, by presence only and as warnings (D2-28), beside the v1 checks.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | The sandbox market: `make-market.mjs`, its pages in `public/market/`, and a test that the pages match `mock.json` and break no rule above | `scripts/make-market.mjs`, `scripts/make-market.test.mjs`, `public/market/` | G2b | sonnet |
| T2 | The public build: `build-public.mjs`, the `build:public` script in `package.json`, `public/_redirects`, `check-public.mjs` and the test of its redirect matcher | `scripts/build-public.mjs`, `scripts/check-public.mjs`, `scripts/check-public.test.mjs`, `public/_redirects`, `package.json` | T1, I2-shell green | sonnet |
| T3 | The demo laptop: `laptop-setup.mjs`, its test, and the preflight's port 3000 and v2 names | `scripts/laptop-setup.mjs`, `scripts/laptop-setup.test.mjs`, `scripts/preflight.mjs` | none | opus |

T1 and T3 can run side by side. The integrator never starts a server and never runs `laptop-setup.mjs` without `--dry-run` in the cloud.

## Acceptance

- Given `artifacts/mock/mock.json`, when `node scripts/make-market.mjs` runs, then `public/market/` holds `index.html` and one page for each `counterfeitCandidates` entry whose `url` is under `/market/`, at that path (`listing-01.html` to `listing-04.html`), and `node --test scripts/make-market.test.mjs` exits 0. The test proves that each page shows L1 and the sandbox line, carries `noindex`, holds its title in an `h1` and its snippet as the first paragraph inside `<main>`, holds no script, image, font or stylesheet tag and no URL to another host, and that the claim-only listing names no maker.
- Given a clean checkout, when `npm run build:public` runs, then it exits 0, `node scripts/check-public.mjs` passes every check above, and `node --test scripts/check-public.test.mjs` exits 0.
- Given the public build in `dist/`, when `node scripts/secrets-scan.mjs` runs, then it exits 0.
- Given the cloud VM, when `node scripts/laptop-setup.mjs --dry-run` runs, then it exits 0, prints steps 1 to 9 in order with their commands, and runs none of them. The B11 and B13 commands it prints match their plans' "Orchestrator steps" and `server/b13_spacetime/README.md`.
- Given a temporary folder with a `.env` holding fake values, when `node --test scripts/laptop-setup.test.mjs` runs, then it exits 0. The test proves that the names step prints each name with "present" or "missing" and no value, and that a `*_AUTH=proxy` line fails the step with the proxy message.
- Given `node scripts/preflight.mjs`, then it reports port 3000 and each v2 variable name by presence, as warnings.
- `npm run check` and `npm run test:smoke` exit 0. The next production-build gate rebuilds `dist/` for localhost.

## Gordon's steps

### Upload the public site (about 5 minutes, tonight and again after the freeze)

From `docs/tech/cloudflare-pages/direct-upload.mdx`. Direct Upload can't switch to Git integration later, which is fine here.
1. On Windows, in the repo: `git pull`, `npm ci`, `npm run build:public`. Check that `dist/public-build.json` says `"publicSite": true`. A plain `npm run build` makes the localhost build with the demo checkout, which must never go online.
2. In the Cloudflare dashboard, go to **Workers & Pages**, then **Create application** > **Get started** > **Drag and drop your files**.
3. Enter a project name, drag the `dist` folder in, and select **Deploy site**. The site is at `https://<project name>.pages.dev`.
4. Check the live site:
   - `/demo` plays, and its controls have no Live switch,
   - `/shop/piece/pc_01` shows L6 ("This is the public demo. Nothing here can be bought.") where Pay was. Check it in the browser, because `check-public.mjs` reads the files in `dist/` and can't see the rendered page. In the browser console, `document.querySelector('[data-testid=buyer-pay-blocked]')` (L6's test ID, `docs/v2/contracts.md` sections 4 and 12) finds the element and `document.querySelector('[data-testid=buyer-pay-button]')` returns `null`. If the Pay button is there, don't share the site: delete the deployment and tell the build session,
   - `/market/` lists the sandbox listings,
   - `/robots.txt` disallows everything, and the page source of `/shop` holds the `noindex` tag.
5. Send the site's URL in the build session's chat. It isn't a secret. The orchestrator writes it in `status.md` and restarts the API with it. Also add `PUBLIC_SITE_URL` with that URL to the cloud environment's variables, for later VM rebuilds, and to the laptop's `.env`.
6. Point the MLH domain at the project, from the project's custom domains settings. Those steps aren't in `docs/tech/`, so follow Cloudflare's prompts.
7. After the freeze: pull the final commit, run `npm run build:public` again, then in the project select **Create a new deployment**, choose production, and drag `dist` in.

### Prepare the demo laptop (Saturday night, on a good network, not venue Wi-Fi)

1. Put the real keys in the laptop's `.env` (the names in step 4 above). Never paste a key into a chat.
2. Run `node scripts/laptop-setup.mjs`. Fix what it names and run it again until `/api/health` reads all true.
3. Start the platform locally with `npm run build` and `npm run preview`, then open `http://localhost:4173/demo?mode=present`.
4. **Rehearse the scripted fallback:**
   - Play the whole tour in presenter mode with Live off: Space or the right arrow for each beat, the left arrow to replay one.
   - Turn Live on, then type a search and a support question of your own. Each answers live, and the badges say Live.
   - Close the API's window and ask again. The answer comes from the scripted source with the Simulated badge, and the tour still plays the same.
   - Start `npm run server` again in a window of its own, then run `node scripts/laptop-setup.mjs --check` to confirm health.
5. Right before judging, clear the swarm runs with `spacetime call -s local cindia clear_runs` and restart the API, as `server/b13_spacetime/README.md` says, so the swarm view starts empty.
6. Reserve an ethernet cable and bring a USB-C ethernet adapter. Hotspots are banned. If the network drops during judging, the tour needs none.

## Out of scope

- Deploying from the session. The build session never uploads, logs in to Cloudflare or touches DNS. Gordon does.
- A hosted live API. It stays in "Backend if time" (`docs/v2/fix-plan.md` section 1.5).
- `robots.txt`, the `noindex` tag, L1, the missing Live switch and L6 in place of Pay on the public build. They come from I2-shell and M-buyer, and their own tests cover them. This plan only checks them (L6 by Gordon's browser check, since `check-public.mjs` can't render a page), and writes no second `robots.txt`. The market pages carry their own `noindex` meta tag.
- Anything in `server/`. The laptop script calls `fetch_model.py` and the B13 commands as their plans define them.
