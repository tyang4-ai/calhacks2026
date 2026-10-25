# Meta · Bringing People Closer Together with AI

Refreshed at the freeze, 5:00 AM PT on Sunday, Oct 25, 2026, from [`docs/harness/status.md`](../../docs/harness/status.md). Every maker, community and story named here is fictional.

**Met or not:** met on the tour. The maker's note on the receipt and the "ask the maker" beat (`d17-ask-maker`) are green and play in the tour. The maker's answer is scripted. Live, the swarm forwards a buyer's question to the maker, and her reply coming back live is not built. Say that plainly.

## What its judges look for

The prize is on the [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com): an invitation to Meta's Round 2 hackathon at its Menlo Park campus, with travel and a place to stay paid, plus a swag bag. It has no cash value, and advancing depends on an eligibility check. No Meta product is required. The criteria are in the hacker guide and copied in [`docs/reference/sponsors/ch13-sponsor-meta.md`](../../docs/reference/sponsors/ch13-sponsor-meta.md). Four things decide it:

- **How it strengthens human connection.** Does it put people in touch with each other, or stand between them?
- **How essential and well integrated the AI is.** Would the project work without it?
- **Originality.**
- **The strength of the working demo.**

## What Cindia does for this track

Cindia is a platform for underrepresented makers, starting with Native American makers. Its AI is built to put a buyer in touch with the maker, and to step aside when the maker should speak. The demo follows the fictional Diné Weaving and Silver Co-op on the Navajo Nation, with its manager Ruth B. and its makers Grace N., Lena T. and Mae K.

- **The maker's voice.** On a paid receipt, the buyer reads a short note from Grace N. The note is demo text written by the Cindia team, and the page says so ("Fictional maker and story, written by the Cindia team."). The receipt first promises to show the buyer when Grace N. is paid, then turns to "Paid to the maker". Green ([`M-buyer`](../../docs/plans/M-buyer.md), beats `d05-pay` and `d12-receipt`).
- **Ask the maker.** A buyer asks whether a pattern has a meaning. The records don't say, so the Steward agent doesn't guess. It answers "Our records don't say, and I won't guess, so I'll ask Grace N. Her answer will show here in her own words." The question lands on Grace N.'s page, and her answer comes back to the buyer exactly as she wrote it, labeled as her words. An agent never rewrites it. Green in the tour (`d17-ask-maker`, [`F-support`](../../docs/plans/F-support.md), [`F-seller-hub`](../../docs/plans/F-seller-hub.md)), where Grace N.'s answer is scripted and plays in both modes. In live mode the swarm does forward a question the records can't answer (`test_a_meaning_question_goes_to_the_maker` and `test_an_authenticity_question_the_records_cant_answer_goes_to_the_maker_too` in [`test_b14_swarm.py`](../../tests/server/test_b14_swarm.py)). B14 has no route for the maker's reply coming back live, so that loop is not built.
- **Meet the maker by name and share.** Every piece page shows who made it, the hours of work and where the money goes: $134.48 of Grace N.'s $180 weaving reaches her. Green.
- **Community pages and projects.** Each community has a page, a craft, a project anyone can fund (such as an apprentice stipend) and works in progress, which are commissions paid in stages. The page text is a placeholder written by the Cindia team, and in a real launch the community writes its own. Green ([`F-communities`](../../docs/plans/F-communities.md)).
- **Storefronts.** Each community gets a storefront at its own link, so it keeps the customer relationship. The builder is a labeled preview. Green ([`F-storefront`](../../docs/plans/F-storefront.md)).
- **Where the AI is essential.** Search by feeling needs a trained model, because keyword search can't match a feeling. On our 50 held-out test queries, our model matches keyword search on recall at 5 (0.789 against 0.784, within noise) and the hybrid of the two reaches 0.825. Answers about meaning need an agent that knows when to stop and ask the person who knows.

What the AI does not do: it never speaks for a community, never translates into Native languages, and never explains what a design means. Those words come from the maker.

## Where to look

- [`src/features/support/`](../../src/features/support/) (the "ask the maker" run in the buyer's thread): green, see [`docs/plans/F-support.md`](../../docs/plans/F-support.md).
- [`src/features/seller-hub/`](../../src/features/seller-hub/) (the maker's page, where the question lands and her answer is written): green, see [`docs/plans/F-seller-hub.md`](../../docs/plans/F-seller-hub.md).
- [`src/features/buyer/`](../../src/features/buyer/) (the receipt with the promise line and Grace N.'s note): green, see [`docs/plans/M-buyer.md`](../../docs/plans/M-buyer.md).
- [`src/features/maker-statement/`](../../src/features/maker-statement/): the maker's own page, with her month's sales, her share and what is held. Green.
- [`src/features/communities/`](../../src/features/communities/) (community pages and projects): green, see [`docs/plans/F-communities.md`](../../docs/plans/F-communities.md).
- [`src/features/storefront/`](../../src/features/storefront/) (storefronts): green, see [`docs/plans/F-storefront.md`](../../docs/plans/F-storefront.md).
- [`server/b14_swarm/agents/steward.py`](../../server/b14_swarm/agents/steward.py): the agent that says "I'll ask the maker".

## How to run that part

- Scripted, no key: `npm ci`, `npm run build`, `npm run preview`, then open http://localhost:4173/demo?mode=present&start=d17-ask-maker for the ask-the-maker run, or http://localhost:4173/maker/mkr_01 for Grace N.'s page. The public site plays the same tour at https://cindia.design/demo.
- Live: the buyer's question goes to the swarm with a Claude key (B14, G5 7 of 7 on the tour). The maker's answer coming back live is not built, and the scripted relay plays in both modes. This is on the "Backend if time" list ([`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md)).

## The moment in the tour

Beat IDs and times are from [`docs/common/demo-script.md`](../../docs/common/demo-script.md). The tour is always scripted.
- `d11-maker`, 166 to 172 s: Grace N.'s page and her statement, with the held line.
- `d12-receipt`, 172 to 180 s: the receipt turns to "Paid to the maker", and her note appears.
- `d17-ask-maker`, 205 to 220 s (chapter 2): the buyer asks what the pattern means, the Steward asks Grace N. and her scripted answer comes back in her own words.

## What's live and what's simulated

- **Live, with a passed gate:** B10 (the receipt and the maker's statement), and B14 (the swarm that forwards the question, G5 7 of 7 on the tour).
- **Simulated by design:** the makers, the notes and every answer in "her own words". They are fictional demo data, and each one is labeled. Grace N.'s answer in the tour is scripted.
- **Not built:** the maker's reply coming back live.

The full list is in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md).

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
