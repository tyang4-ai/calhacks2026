# MLH · Best Domain Name from GoDaddy Registry

Refreshed at the freeze, 5:00 AM PT on Sunday, Oct 25, 2026, from [`docs/harness/status.md`](../../docs/harness/status.md) and Gordon's Oct 25 messages. Every maker, community and story named here is fictional.

**Met or not:** met. The domain is cindia.design, which Gordon registered (Oct 25), and the public site is live at https://cindia.design.

## What its judges look for

The prize is a digital gift card, listed on the [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com) as "[MLH] Best Domain Name from GoDaddy Registry". The one requirement is a domain name registered through GoDaddy Registry. MLH's prizes page has a "Build with GoDaddy Registry" link (`mlh.link/GoDaddyRegistry`) and a button to claim the promo code. Our domain is cindia.design, and .design is a GoDaddy Registry domain (Gordon, Oct 25). The notes are copied in [`docs/reference/sponsors/ch13-sponsor-mlh-godaddy.md`](../../docs/reference/sponsors/ch13-sponsor-mlh-godaddy.md).

## What Cindia does for this track

Cindia is a platform for underrepresented makers, starting with Native American makers. The domain is its front door: it points at the public site, where anyone can play the guided tour.

- **The domain:** cindia.design, a GoDaddy Registry domain. It points at the public site, live at https://cindia.design. The tour runs at https://cindia.design/demo.
- **What it points at:** the public site, a scripted build on Cloudflare Pages (project `cindia`, also at https://cindia-cfn.pages.dev) that Gordon uploaded from commit `b01fc1b`. It plays the tour only, with no Pay button and no Live switch, and nothing on it can be bought (where Pay was, the piece page shows "This is the public demo. Nothing here can be bought."). Every page says that the makers, communities and stories are fictional. Search engines are kept out with a `noindex` tag and a `robots.txt` that disallows everything. The build also holds the sandbox market at `/market/`, the fictional listings the copy watch crawls.
- **A second upload after the freeze:** from the final build, so the site matches the submitted code. The live site is the build from commit `b01fc1b` until then. That upload is Gordon's step.

## Where to look

- [`docs/plans/D-deploy.md`](../../docs/plans/D-deploy.md): the public build (`npm run build:public`), the `_redirects` file for deep links, the sandbox market, and Gordon's upload steps. Green (tag `v2-deploy`, 4dd9243).
- [`docs/v2/fix-plan.md`](../../docs/v2/fix-plan.md) section 1.8: why the public site is scripted only.

## How to run that part

Gordon's steps, from [`docs/plans/D-deploy.md`](../../docs/plans/D-deploy.md). Steps 1, 2, 4 and 5 are done, per his Oct 25 messages. Step 3 is the check to run on the live site, and no result is recorded here. Step 6 happens on Devpost. For the upload after the freeze, repeat steps 1 and 2 from the final build.
1. On Windows, in the repo: `git pull`, `npm ci`, `npm run build:public`. Check that `dist/public-build.json` says `"publicSite": true`. A plain `npm run build` makes the localhost build with the demo checkout, which must never go online.
2. In the Cloudflare dashboard, go to Workers & Pages, choose the drag-and-drop upload, and drag the `dist` folder in. The site is at `https://<project name>.pages.dev`.
3. Check the live site: `/demo` plays, `/shop/piece/pc_01` shows "This is the public demo. Nothing here can be bought." where Pay was, `/market/` lists the sandbox listings, and `/robots.txt` disallows everything.
4. Send the URL to the build session, which writes it in `status.md`.
5. Register the domain through the MLH link, and point it at the project from the project's custom domains settings. Cloudflare's prompts walk through it.
6. On Devpost, select "[MLH] Best Domain Name from GoDaddy Registry" and list the domain.

## The moment in the tour

The domain opens the same tour as everything else. The front door is https://cindia.design/demo, and the tour starts with the three pitch cards (`p01-what` at 0 s), the first of which opens with the tagline "Describe the vibe. Gift the piece. Pay the person." See the [README](../../README.md#the-tour-and-its-controls).

## What's live and what's simulated

- **Done:** the public build script ([`D-deploy`](../../docs/plans/D-deploy.md), green, tag `v2-deploy`), the upload to Cloudflare Pages from commit `b01fc1b`, and the domain cindia.design (Gordon, Oct 25).
- **Simulated by design:** everything on the public site. It plays scripted events and sells nothing.

The full list is in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md).

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
