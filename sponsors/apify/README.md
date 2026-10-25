# Apify · Best use of Apify

Written at 8:00 PM PT on Saturday, Oct 24, 2026. Every maker, community and story named here is fictional. **Everything for this track is planned at 8:00 PM.** Nothing in `server/b15_watch/` exists yet, so this page links the plan and not the code.

## What its judges look for

The prizes are on the [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com): $2,000, $1,000, $800, $400 and $400 for the top five, and a separate $400 Best Actor award for building an Actor for this event. The hacker guide's criteria: the project must use Apify "in a meaningful way", and they judge "the quality of the project as well as other criteria". The notes are copied in [`docs/reference/sponsors/ch13-sponsor-apify.md`](../../docs/reference/sponsors/ch13-sponsor-apify.md).

Cindia uses an existing Apify Actor, so it enters Best use of Apify. Wrapping our own scout as an Actor, for Best Actor, is on the "if time" list and is not started.

## What Cindia does for this track

Cindia is a platform for underrepresented makers, starting with Native American makers. Fakes are a live problem for them. In August 2026 a San Francisco seller admitted selling over $92,000 of jewelry imported from Asia as Native-made ([Indian Arts and Crafts Board](https://www.doi.gov/iacb/san-francisco-woman-convicted-selling-counterfeit-native-american-jewelry)). The copy watch looks for copies of the pieces made by the fictional Diné Weaving and Silver Co-op, a co-op of Diné (Navajo) makers.

**It never searches the real web.** The watch crawls a sandbox market: static pages of fictional listings by invented sellers, some of them look-alikes of the co-op's pieces, that ship with the public site at `/market/`. One listing only claims to be Native-made, with no maker named. Every URL in the data is on the sandbox market, `example.com` or `example.org`.

**How a scan works** ([`docs/plans/B15-watch.md`](../../docs/plans/B15-watch.md)):
1. **Scout** (plain code) runs Apify's Cheerio Scraper (`apify/cheerio-scraper`) through the API's synchronous run endpoint, over the sandbox market, with a 45-second budget. It follows only links under `/market/`.
2. **Comparer** (plain code) scores each result's title and snippet against the co-op's pieces with our own embedding model. The score is shown as "Text match", and it is a text match and not a picture match.
3. **Claims** (Claude Haiku) reads what each close listing claims, inside a delimited block marked as untrusted text, and quotes the words that make the claim. The quote has to appear word for word in the listing, or it counts as no claim.
4. **Reporter** (Claude Sonnet) fills a report template for the manager. It names no seller and uses no accusing words.

**The hit rule.** A result is a possible copy only with evidence about this maker: it names the co-op or one of its makers, repeats an 8-word run of a piece's story, or claims a Cindia verification it lacks. A bare claim like "Authentic Native American made" is listed as something the watch can't judge ("Claims to be Native-made. We can't check that."), with no report button.

**Every result Apify returned is on screen**, with its verdict, and not only the hits. Each possible copy sits next to the co-op's piece with its text match. The manager decides whether to report, and nothing is sent: "Nothing was sent. In this demo, reports never leave Cindia." Cindy never accuses anyone.

## Where to look

All of these are **planned**.
- [`docs/plans/B15-watch.md`](../../docs/plans/B15-watch.md): `server/b15_watch/` (`scout.py` and the crawler call, `compare.py`, `evidence.py`, `claims.py`, `reporter.py`) and its tests.
- [`docs/plans/F-watch.md`](../../docs/plans/F-watch.md): `src/features/watch/`, the watch view.
- [`docs/plans/D-deploy.md`](../../docs/plans/D-deploy.md): the sandbox market at `/market/` on the public site, and the script that writes its pages from the mock data.

## How to run that part

Planned. This is the design.
1. Gordon uploaded the public site to Cloudflare Pages ([`D-deploy`](../../docs/plans/D-deploy.md)). It is live at https://cindia.design, and the sandbox market is part of the build, at `/market/`.
2. Set `APIFY_TOKEN` and `PUBLIC_SITE_URL` in the cloud environment or in `.env` (names only here). Set a monthly usage limit on the Apify account.
3. `npm run server`. `GET /api/b15/status` says whether the market is set up.
4. Switch on Live and press Scan now on the watch view. The scan starts, then the browser polls for the result.
5. Without `PUBLIC_SITE_URL`, the watch runs on its fixture, plays scripted and keeps its Simulated badge.

## The moment in the tour

Planned (`I2-tour`). Times are from [`docs/v2/fix-plan.md`](../../docs/v2/fix-plan.md) section 1.2.
- `d14-watch`, 192 to 200 s (chapter 2): the watch scans, lists what it checked, flags one possible copy next to the co-op's piece, and drafts a report that waits for the manager's approval.
- The tour is always scripted, so this beat always plays the scripted scan. A live scan runs only when someone presses Scan now.

## What's live and what's simulated

- `/api/health` read `apify` as true at 7:30 PM, so the token is set in the cloud environment. That is not a gate. The public site is live now at https://cindia.design (Gordon, Oct 25), so the market has an address. B15's gate (G5) has not passed yet.
- **Planned:** the crawl, the comparer, the claims check, the reporter, the watch view and the sandbox market.
- **Simulated by design:** the listings, their sellers and every report. Nothing is sent, and the real web is never searched.

The full list is in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md).

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
