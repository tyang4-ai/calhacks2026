# Apify · Best use of Apify

Refreshed at the freeze, 5:00 AM PT on Sunday, Oct 25, 2026, from [`docs/harness/status.md`](../../docs/harness/status.md). Every maker, community and story named here is fictional.

**Met or not: not met at the freeze.** The live Apify call didn't pass. Apify answered status 403 to the live crawl (`POST /v2/actors/apify~cheerio-scraper/run-sync-get-dataset-items`) in both the worktree and the main tree, so B15's G5 failed and the watch plays scripted. `status.md` calls it an Apify account or token-permission problem, and not code. Gordon decides whether to select this track. If he does, say plainly that the crawl is built and its live call was blocked.

## What its judges look for

The prizes are on the [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com): $2,000, $1,000, $800, $400 and $400 for the top five, and a separate $400 Best Actor award for building an Actor for this event. The hacker guide's criteria: the project must use Apify "in a meaningful way", and they judge "the quality of the project as well as other criteria". The notes are copied in [`docs/reference/sponsors/ch13-sponsor-apify.md`](../../docs/reference/sponsors/ch13-sponsor-apify.md).

Cindia uses an existing Apify Actor, so it would enter Best use of Apify. Wrapping our own scout as an Actor, for Best Actor, is B15's T7. It was not built.

## What Cindia does for this track

Cindia is a platform for underrepresented makers, starting with Native American makers. Fakes are a live problem for them. In August 2026 a San Francisco seller admitted selling over $92,000 of jewelry imported from Asia as Native-made ([Indian Arts and Crafts Board](https://www.doi.gov/iacb/san-francisco-woman-convicted-selling-counterfeit-native-american-jewelry)). The copy watch looks for copies of the pieces made by the fictional Diné Weaving and Silver Co-op, a co-op of Diné (Navajo) makers.

**It never searches the real web.** The watch crawls a sandbox market: static pages of fictional listings by invented sellers that ship with the public site at `/market/` (https://cindia.design/market/). The market has an index and four listings. One names Grace N. and the co-op, one only claims to be Native-made with no maker named, and two are ordinary listings (a machine-woven throw and a plain blanket). Every URL in the data is on the sandbox market, `example.com` or `example.org`.

**How a scan works** ([`docs/plans/B15-watch.md`](../../docs/plans/B15-watch.md)):
1. **Scout** (plain code) runs Apify's Cheerio Scraper (`apify/cheerio-scraper`) through the API's synchronous run endpoint, over the sandbox market, with a 45-second budget. It follows only links under `/market/`. **This is the call Apify answered with a 403.**
2. **Comparer** (plain code) scores each result's title and snippet against the co-op's pieces with our own embedding model. The score is shown as "Text match", and it is a text match and not a picture match. The threshold is 0.22, measured with the trained model. The look-alike `cft_01` scores 0.74.
3. **Claims** (Claude Haiku) reads what each close listing claims, inside a delimited block marked as untrusted text, and quotes the words that make the claim. The quote has to appear word for word in the listing, or it counts as no claim.
4. **Reporter** (Claude Sonnet) fills a report template for the manager. It names no seller and uses no accusing words.

**The hit rule.** A result is a possible copy only with evidence about this maker: it names the co-op or one of its makers, repeats an 8-word run of a piece's story, or claims a Cindia verification it lacks. A bare claim like "Authentic Native American made" is listed as something the watch can't judge ("Claims to be Native-made. We can't check that."), with no report button.

**Every result Apify returned is on screen**, with its verdict, and not only the hits. Each possible copy sits next to the co-op's piece with its text match. The manager decides whether to report, and nothing is sent: "Nothing was sent. In this demo, reports never leave Cindia." Cindy never accuses anyone.

## Where to look

- [`server/b15_watch/`](../../server/b15_watch/): `scout.py` (the crawler call), `compare.py`, `evidence.py`, `claims.py`, `reporter.py`, `scan.py`, `calibrate.py` and `thresholds.py`. Router: [`server/routers/b15_watch.py`](../../server/routers/b15_watch.py). Plan: [`docs/plans/B15-watch.md`](../../docs/plans/B15-watch.md).
- [`src/features/watch/`](../../src/features/watch/): the watch view. Green ([`docs/plans/F-watch.md`](../../docs/plans/F-watch.md)).
- [`src/sources/live/b15-watch.ts`](../../src/sources/live/b15-watch.ts): the adapter.
- [`public/market/`](../../public/market/): the sandbox market's pages. [`docs/plans/D-deploy.md`](../../docs/plans/D-deploy.md) has the script that writes them from the mock data.
- [`tests/server/test_b15_watch.py`](../../tests/server/test_b15_watch.py): the tests. Most run on a fixture with Apify faked. `test_live_crawl_of_the_sandbox_market` is the live one, and it is the test that fails on Apify's 403. [`tests/features/watch-live.spec.ts`](../../tests/features/watch-live.spec.ts) is the live feature spec, which stayed scripted at the freeze.

## How to run that part

1. The public site is live at https://cindia.design (Gordon uploaded it), and the sandbox market is part of the build, at `/market/`.
2. Set `APIFY_TOKEN` and `PUBLIC_SITE_URL` in the cloud environment or in `.env` (names only here). Set a monthly usage limit on the Apify account. **Check that the token may run `apify~cheerio-scraper` and that the account's plan allows a synchronous run.** That is the fix `status.md` names for the 403.
3. `npm run server`. `GET /api/b15/status` says whether the market is set up. It read true with `PUBLIC_SITE_URL` set.
4. Switch on Live and press Scan now on the watch view. The scan starts, then the browser polls for the result.
5. Then rerun the gate: `npm run gate -- G5 b15-watch tests/features/watch-live.spec.ts`. `status.md` suggests the demo laptop.
6. Without `PUBLIC_SITE_URL`, or when Apify refuses, the watch runs on its fixture, plays scripted and keeps its Simulated badge.

## The moment in the tour

Beat IDs and times are from [`docs/common/demo-script.md`](../../docs/common/demo-script.md).
- `d14-watch`, 192 to 200 s (chapter 2): the watch scans, lists what it checked, flags one possible copy next to the co-op's piece, and drafts a report that waits for the manager's approval.
- The tour is always scripted, so this beat always plays the scripted scan. A live scan runs only when someone presses Scan now.

## What's live and what's simulated

- **Live:** the claims check (Claude Haiku) and the Reporter (Claude Sonnet, 3.3 s). The market is served at https://cindia.design/market/.
- **Blocked:** the Apify crawl. Status 403 in both trees at the freeze, so there is no passed live Apify call and no G5 pass.
- **Built and passing on the fixture:** the Comparer (threshold 0.22), the evidence rules, the report template and the watch view.
- **Not built:** B15's T7, our own Apify Actor for Best Actor.
- **Simulated by design:** the listings, their sellers and every report. Nothing is sent, and the real web is never searched. The tour's scan is scripted.

The full list is in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md).

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
