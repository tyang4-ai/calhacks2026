# Meta · Bringing People Closer Together with AI

Written at 8:00 PM PT on Saturday, Oct 24, 2026. Every maker, community and story named here is fictional. Where something is not built yet, this page says **planned** and links its plan.

## What its judges look for

The prize is on the [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com): an invitation to Meta's Round 2 hackathon at its Menlo Park campus, with travel and a place to stay paid, plus a swag bag. It has no cash value, and advancing depends on an eligibility check. No Meta product is required. The criteria are in the hacker guide and copied in [`docs/reference/sponsors/ch13-sponsor-meta.md`](../../docs/reference/sponsors/ch13-sponsor-meta.md). Four things decide it:

- **How it strengthens human connection.** Does it put people in touch with each other, or stand between them?
- **How essential and well integrated the AI is.** Would the project work without it?
- **Originality.**
- **The strength of the working demo.**

## What Cindia does for this track

Cindia is a platform for underrepresented makers, starting with Native American makers. Its AI is built to put a buyer in touch with the maker, and to step aside when the maker should speak. The demo follows the fictional Diné Weaving and Silver Co-op on the Navajo Nation, with its manager Ruth B. and its makers Grace N., Lena T. and Mae K.

- **The maker's voice.** On a paid receipt, the buyer reads a short note from Grace N. The note is demo text written by the Cindia team, and the page says so ("Fictional maker and story, written by the Cindia team."). The receipt first promises to show the buyer when Grace N. is paid, then turns to "Paid to the maker". Planned ([`M-buyer`](../../docs/plans/M-buyer.md)). The receipt itself is built in v1.
- **Ask the maker.** A buyer asks whether a pattern has a meaning. The records don't say, so the Steward agent doesn't guess. It answers "Our records don't say, and I won't guess, so I'll ask Grace N. Her answer will show here in her own words." The question lands on Grace N.'s page, and her answer comes back to the buyer exactly as she wrote it, labeled as her words. An agent never rewrites it. Planned ([`F-support`](../../docs/plans/F-support.md), [`F-seller-hub`](../../docs/plans/F-seller-hub.md), [`B14-swarm`](../../docs/plans/B14-swarm.md)).
- **Meet the maker by name and share.** Every piece page shows who made it, the hours of work and where the money goes: $134.48 of Grace N.'s $180 weaving reaches her. Built in v1, and planned for the Shop pages.
- **Community pages and projects.** Each community has a page, a craft, a project anyone can fund (such as an apprentice stipend) and works in progress, which are commissions paid in stages. The page text is a placeholder written by the Cindia team, and in a real launch the community writes its own. Planned ([`F-communities`](../../docs/plans/F-communities.md)).
- **Storefronts.** Each community gets a storefront at its own link, so it keeps the customer relationship. The builder is a labeled preview. Planned ([`F-storefront`](../../docs/plans/F-storefront.md)).
- **Where the AI is essential.** Search by feeling needs a trained model, because keyword search can't match a feeling. Answers about meaning need an agent that knows when to stop and ask the person who knows.

What the AI does not do: it never speaks for a community, never translates into Native languages, and never explains what a design means. Those words come from the maker.

## Where to look

- `src/features/support/` (the "ask the maker" run): **planned**, see [`docs/plans/F-support.md`](../../docs/plans/F-support.md).
- `src/features/seller-hub/` (the maker's page, where the question lands and her answer is written): **planned**, see [`docs/plans/F-seller-hub.md`](../../docs/plans/F-seller-hub.md).
- [`src/features/buyer/`](../../src/features/buyer/) (the receipt): built in v1. The promise line and Grace N.'s note are planned in [`docs/plans/M-buyer.md`](../../docs/plans/M-buyer.md).
- [`src/features/maker-statement/`](../../src/features/maker-statement/): the maker's own page, with her month's sales, her share and what is held. Built.
- `src/features/communities/` (community pages and projects): **planned**, see [`docs/plans/F-communities.md`](../../docs/plans/F-communities.md).
- `src/features/storefront/` (storefronts): **planned**, see [`docs/plans/F-storefront.md`](../../docs/plans/F-storefront.md).

## How to run that part

- Scripted, no key: `npm ci`, `npm run build`, `npm run preview`, then open http://localhost:4173/maker/mkr_01 for Grace N.'s page, or http://localhost:4173/demo for the 60-second demo. The "ask the maker" run and the Shop pages are planned.
- Live: the buyer's question goes to the swarm with a Claude key. The maker's answer coming back live is not built. The scripted relay plays in both modes. This is on the "Backend if time" list ([`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md)).

## The moment in the tour

Planned (`I2-tour`). Times are from [`docs/v2/fix-plan.md`](../../docs/v2/fix-plan.md) section 1.2.
- `d11-maker`, 166 to 172 s: Grace N.'s page and her statement, with the held line.
- `d12-receipt`, 172 to 180 s: the receipt turns to "Paid to the maker", and her note appears.
- The "ask the maker" run is a chapter 2 beat (`d17-ask-maker`) only if the support and seller hub features ship it. Otherwise Gordon clicks the question during Q&A, and it plays the scripted run.

## What's live and what's simulated

- **Live, with a passed gate:** B10 (the receipt and the maker's statement).
- **Planned:** the maker's note, the promise line, "ask the maker", community pages, projects and storefronts.
- **Simulated by design:** the makers, the notes and every answer in "her own words". They are fictional demo data, and each one is labeled.

The full list is in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md).

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
