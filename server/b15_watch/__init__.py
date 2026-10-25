"""B15 · the copy watch (docs/plans/B15-watch.md, api-contract.md B15).

A person's Scan now crawls Cindia's own sandbox market (`PUBLIC_SITE_URL/market/`) through Apify's
Cheerio Scraper, compares each listing with the Diné co-op's pieces using Cindia's own model, checks
what each listing claims, and drafts a calm report for the owner to approve. It never searches the
real web, never contacts anyone and never sends anything by itself.

- `thresholds.py`: every number in one place, and the measured similarity threshold.
- `coop.py`: the co-op's makers, pieces and stories from the server's own mock.json.
- `scout.py`: the one Apify call (the only outbound host besides the Anthropic API).
- `compare.py`: the normalized text match `(c - b) / (1 - b)` with B11's model.
- `evidence.py`: the hit rule (names the co-op or a maker, repeats a story, claims a Cindia check).
- `claims.py`: what each listing claims (`claude-haiku-5-5` through B14's `llm.parse`, or by rule).
- `reporter.py`: the report draft, a template filled by code (`claude-sonnet-5-5` picks the quote).
- `steps.py`: IDs, step summaries, the event envelope and the B13 bridge mirror.
- `scan.py`: one scan from crawl to events.
- `calibrate.py`: measures the threshold into `threshold.json` with the real model.

Every listing, seller and story it handles in tests is fictional.
"""

from __future__ import annotations

KEY = "b15-watch"
