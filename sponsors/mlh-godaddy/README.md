# MLH · Best Domain Name from GoDaddy Registry

Written at 8:00 PM PT on Saturday, Oct 24, 2026. Every maker, community and story named here is fictional. **This track depends on two of Gordon's own steps, and neither is done at 8:00 PM:** registering the domain and uploading the public site.

## What its judges look for

The prize is a digital gift card, listed on the [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com) as "[MLH] Best Domain Name from GoDaddy Registry". The one requirement is a domain name registered through GoDaddy Registry. MLH's prizes page has a "Build with GoDaddy Registry" link (`mlh.link/GoDaddyRegistry`) and a button to claim the promo code. The page doesn't say which extensions are free or for how long, so check it in a browser. The notes are copied in [`docs/reference/sponsors/ch13-sponsor-mlh-godaddy.md`](../../docs/reference/sponsors/ch13-sponsor-mlh-godaddy.md).

## What Cindia does for this track

Cindia is a platform for underrepresented makers, starting with Native American makers. The domain is its front door: it points at the public site, where anyone can play the guided tour.

- **The domain:** [GORDON: the domain, and that it points at the public site]
- **What it points at:** the public site, a scripted build on Cloudflare Pages that Gordon uploads. It plays the tour only, and nothing on it can be bought (the Pay button shows "This is the public demo. Nothing here can be bought."). Every page says that the makers, communities and stories are fictional. Search engines are kept out with a `noindex` tag and a `robots.txt` that disallows everything. It also serves the sandbox market at `/market/`, the fictional listings the copy watch crawls.
- **The Public site line from `status.md`:** empty at 8:00 PM. Gordon has not uploaded the site yet. The orchestrator writes the site's URL there once he does.
- **A second upload after the freeze:** from the final build, so the site matches the submitted code.

## Where to look

- [`docs/plans/D-deploy.md`](../../docs/plans/D-deploy.md): the public build (`npm run build:public`), the `_redirects` file for deep links, the sandbox market, and Gordon's upload steps. **Planned.** None of it is built yet.
- [`docs/v2/fix-plan.md`](../../docs/v2/fix-plan.md) section 1.8: why the public site is scripted only.

## How to run that part

Gordon's steps, from [`docs/plans/D-deploy.md`](../../docs/plans/D-deploy.md):
1. On Windows, in the repo: `git pull`, `npm ci`, `npm run build:public`. Check that `dist/public-build.json` says `"publicSite": true`. A plain `npm run build` makes the localhost build with the demo checkout, which must never go online.
2. In the Cloudflare dashboard, go to Workers & Pages, choose the drag-and-drop upload, and drag the `dist` folder in. The site is at `https://<project name>.pages.dev`.
3. Check the live site: `/demo` plays, `/shop/piece/pc_01` shows "This is the public demo. Nothing here can be bought." where Pay was, `/market/` lists the sandbox listings, and `/robots.txt` disallows everything.
4. Send the URL to the build session, which writes it in `status.md`.
5. Register the domain through the MLH link, and point it at the project from the project's custom domains settings. Cloudflare's prompts walk through it.
6. On Devpost, select "[MLH] Best Domain Name from GoDaddy Registry" and list the domain.

## The moment in the tour

The domain opens the same tour as everything else. The front door is `/demo` on the public site, and the planned tour starts with the three pitch cards (`p01-what` at 0 s). See the [README](../../README.md#the-tour-and-its-controls).

## What's live and what's simulated

- **Not done:** the domain, the upload and the public build script. They are Gordon's steps and a planned integrator task ([`D-deploy`](../../docs/plans/D-deploy.md)).
- **Simulated by design:** everything on the public site. It plays scripted events and sells nothing.

The full list is in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md).

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
