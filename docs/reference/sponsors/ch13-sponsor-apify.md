---
type: source
domain: hackathon
hackathon: "Cal Hacks 13.0"
year: 2026
sponsor: "Apify"
captured: 2026-10-24
tags: [domain/hackathon, type/source, hackathon/cal-hacks, year/2026]
date-created: 2026-10-24
date-modified: 2026-10-24
---

# Apify · Best use of Apify

Everything I found for Apify's Cal Hacks 13.0 track, copied Oct 24, 2026 from Devpost, the Hacker Guide and the pre-event email. Hub: [[cal-hacks-13]] · Spec: [[cindia-spec]] · v2 brief: the repo's `docs/v2/brief.md`

## At a glance

- **Prizes (Devpost):** 1st $2,000, 2nd $1,000, 3rd $800, 4th $400, 5th $400, all cash. The Hacker Guide calls it $5,000 total.
- **Best Actor ($400):** a separate award for building an Actor for this event. Cindia uses an existing Actor, so it enters Best use of Apify only.
- **Criteria (Hacker Guide):** the top 5 projects that use Apify "in a meaningful way", judged on the quality of the project "as well as other criteria".
- **Credits:** sign up at https://console.apify.com/sign-up?couponId=APIFY_CAL_HACKS, or enter `APIFY_CAL_HACKS` under Billing > Subscription, for $200 of free credit (pre-event email 2).
- **Workshop:** Sat 11:00 AM to 12:00 PM at Gate 3 (Hive). The Hacker Guide titles it "Apify is your superpower for hackathons."
- **Booth:** yes, all weekend (pre-event email 2).

## Devpost prizes (verbatim)

- **[Apify] 1st Place Best use of Apify** · $2,000 in cash
- **[Apify] 2nd Place Best use of Apify** · $1,000 in cash
- **[Apify] 3rd Place Best use of Apify** · $800 in cash
- **[Apify] 4th Place Best use of Apify** · $400 in cash
- **[Apify] 5th Place Best use of Apify** · $400 in cash
- **[Apify] Best Actor sponsored by Apify** · $400 in cash

## Hacker Guide rows (verbatim, unchanged on Oct 24)

> #### Best use of Apify (Apify)
>
> **Criteria:** Top 5 projects using Apify, we also have a best actor award for building an actor for this event. Project must be using Apify in a meaningful way. We will judge the quality of the project as well as other criteria.
>
> **Prize:** $5,000 total: 1st) $2,000; 2nd) $1,000; 3rd) $800; 4th) $400; 5th) $400
>
> #### Best Actor sponsored by Apify (Apify)
>
> **Criteria:** Same as above
>
> **Prize:** $400

## From Pre-Event Details #2 (Oct 15, verbatim)

> *Apify –* Apify turns websites into structured, real-time data your project can use. Apify Store has tens of thousands of ready-made tools called Actors that scrape, crawl, and automate the web, so you can skip writing a scraper from scratch.
>
> Apify is giving away $5,000 in cash prizes for the best hacks built with Apify. Sign up here ( https://console.apify.com/sign-up?couponId=APIFY_CAL_HACKS ) or enter promo code APIFY_CAL_HACKS in Billing > Subscription, to get $200 in free credits. Stop by the Apify booth or join the workshop (exact TBD) to learn how to pull real-time web data into your project through MCP, the CLI, the API, or other integrations.

## What Cindia v2 does for this track

The brief's line: "The counterfeit watch."

- **Scout:** for a maker, the server runs Apify's Google Search Results Scraper (`apify/google-search-scraper`) through the API's synchronous endpoint, with up to three queries and one results page each.
- **Comparer:** our own embedding model scores each result's title and snippet against the maker's pieces. The score is calibrated, so a real look-alike stands out from the background.
- **Claims:** Claude Haiku checks whether the listing claims to be handmade by the community or Indigenous-made, and quotes the words that make the claim.
- **Reporter:** for a look-alike with an unverified claim, Cindy drafts a report. The owner decides whether to send it. Cindy never accuses anyone and never sends anything herself.
- **Care:** it keeps only the title, the link and the snippet, never opens the found pages, and contacts no one.
- **On screen:** Sell › Counterfeit watch shows each hit next to the maker's piece with its similarity score.
- **In the repo:** upgrade B15 (`docs/plans/B15-watch.md`).

## Docs and APIs we use

Offline copies: the repo's `docs/tech/apify/`. Keys and gotchas: `docs/v2/apis-and-accounts.md`.

- Run an Actor synchronously and get its dataset items: https://docs.apify.com/api/v2/act-run-sync-get-dataset-items-post
- API basics, authentication and rate limits: https://docs.apify.com/api/v2
- API tokens: https://docs.apify.com/platform/integrations/api
- Google Search Results Scraper: https://apify.com/apify/google-search-scraper

## Things to know

- The call is `POST https://api.apify.com/v2/actors/apify~google-search-scraper/run-sync-get-dataset-items`, with the token as `Authorization: Bearer <token>`.
- `queries` is one string with one query per line. Results come back in `organicResults`, and the snippet is the `description` field.
- The scraper costs from $1.80 per 1,000 result pages, so the $200 credit covers far more than the demo needs.
