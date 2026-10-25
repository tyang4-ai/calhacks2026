# Visa · Best use of Reimagining Shopping

Written at 8:00 PM PT on Saturday, Oct 24, 2026. Every maker, community and story named here is fictional. Where something is not built yet, this page says **planned** and links its plan.

## What its judges look for

The prize is on the [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com) ($5,000, one winner). The criteria are in the hacker guide and in Visa's [Hacker Starter Pack](https://docs.google.com/document/d/1Lgtd0f8mHZy_nWabtz751AkSW5Oj-z1XMhzAwddtfOA/edit), copied in [`docs/reference/sponsors/ch13-sponsor-visa.md`](../../docs/reference/sponsors/ch13-sponsor-visa.md). The two sources weigh the criteria differently, and the hacker guide wins when they disagree.

| Criterion | Hacker guide weight | What it asks, in short |
|---|---|---|
| Innovation | 25% | How creatively does it reimagine shopping? |
| User experience | 25% | Is it intuitive, useful and seamless? |
| Technical execution | 20% | How well are AI and the supporting technology built? |
| Commerce impact | 15% | Does it improve engagement, conversion, loyalty or merchant outcomes? |
| Trust and responsibility | 15% | Privacy, transparency, security and responsible use of AI |

The starter pack also says "Adding a chatbot alone is not enough." AI has to change the shopping experience. Visa provides no APIs of its own, and by Sunday morning a team should be able to answer six questions. The six headings below are those questions.

## What challenge does it solve?

Selling online takes time, broadband and marketing reach that many makers on tribal lands don't have. Buyers can't tell a real piece from a fake, and they can't see how much of the price reaches the maker. In August 2026 a San Francisco seller admitted selling over $92,000 of jewelry imported from Asia as Native-made ([Indian Arts and Crafts Board](https://www.doi.gov/iacb/san-francisco-woman-convicted-selling-counterfeit-native-american-jewelry)).

Cindia is a platform for underrepresented makers, starting with Native American makers. It does the selling, the marketing and the books for them. The demo follows the fictional Diné Weaving and Silver Co-op on the Navajo Nation, with its manager Ruth B. and its makers Grace N., Lena T. and Mae K.

## Who benefits?

- **Buyers** find a piece by describing a feeling, see who made it, and see where their money goes before they pay.
- **Makers** like Grace N. get paid on time with a statement they can read, and keep the customer relationship through a storefront at their own link.
- **The co-op's manager** stops doing the books and approves anything that moves money.
- **Merchant outcomes, in numbers:** of a $180 weaving, $134.48 goes to the maker (`docs/common/data-model.md`, figure 1). The same piece through the gallery would pay her $86.00 (figure 16).

## How does AI improve the experience?

- **Discovery.** A buyer types "a warm, bold gift for my mom. she loves red wool. under $200". The Finder agent turns it into keywords the buyer can see and edit as chips, and our own embedding model finds pieces that match the feeling and not only the words. Every result says why it matched. Planned ([`B11-embed`](../../docs/plans/B11-embed.md), [`B12-search`](../../docs/plans/B12-search.md), [`F-search`](../../docs/plans/F-search.md)).
- **Surprise me.** One button, three ways, and the screen says which one it used. Fair random leans toward makers who sold less this month, so discovery doesn't only go to bestsellers. The weights are on the page. Planned.
- **Post-purchase help.** A drawer answered by a swarm of small Claude agents. It says which agent is answering and which guard checked the answer, and when the records can't answer a question about meaning, it asks the maker and shows her answer in her own words. Planned ([`B14-swarm`](../../docs/plans/B14-swarm.md), [`F-support`](../../docs/plans/F-support.md)).
- Nothing here is a chatbot on its own. Search will run on a model we trained, and the agents answer from records and quote their sources.

## How does it work?

1. A buyer searches and opens a piece. Planned.
2. The piece page shows the maker's story, the hours of work and a verification line that says it is demo verification. "Where your money goes" shows the split: the maker's share, materials, the Cindia fee (10%) and the card fee (2.9% plus 30 cents). Built (v1), with the gallery comparison planned.
3. At checkout the card number becomes a token, so the number itself is never stored. Built (v1). The checkout view in the process bar will list what is stored and what never is (planned, [`F-process`](../../docs/plans/F-process.md)).
4. The receipt says "Received", then turns to "Paid to the maker" when the maker's payout goes out. Built (v1, live through B10). The promise line and Grace N.'s note are planned.

## Why does it matter?

- **Commerce impact.** The split is shown before anyone pays. Fair random gives makers with fewer sales a bigger chance. The receipt closes the loop by showing that the maker was paid.
- **Trust.**
  - The card becomes a token. The checkout says "Demo checkout, no real charge".
  - The project contribution at checkout starts off, and the buyer turns it on. It reads "Demo project. No money is collected." Planned.
  - Each piece shows who made it and under whose authority. In a real launch that is the maker's own nation, under the Indian Arts and Crafts Act, and Cindia would keep only a yes or no. Here it is labeled demo verification, and "No real check was done." Planned.
  - AI answers say "AI agents answer here, using only Cindia's records. A person approves anything that moves money." Planned.
  - Every simulated panel carries the Simulated badge. Built in v1. The top bar of every page will also say the makers and stories are fictional and nothing is for sale (planned, [`I2-shell`](../../docs/plans/I2-shell.md)).

## Where could it go next?

- Co-design with Native-led arts organizations, using the marks and processes communities already run instead of a mark Cindia issues.
- A real storefront builder, so each seller builds their own page.
- A hosted live API so anyone can try the search and the help online.
- Other underrepresented makers, each community only with its own organizations.

## Where to look

- `src/features/search/` and `server/b12_search/`: vibe search and Surprise me. **Planned**, see [`F-search`](../../docs/plans/F-search.md) and [`B12-search`](../../docs/plans/B12-search.md).
- [`src/features/buyer/`](../../src/features/buyer/): the price split, the checkout token and the receipt. Built in v1. [`M-buyer`](../../docs/plans/M-buyer.md) moves it onto the Shop pages and adds the gallery comparison (planned).
- [`server/routers/b10_derived.py`](../../server/routers/b10_derived.py): computes the split and the receipt. Live, G5 13 of 13.
- `src/features/support/`: the help drawer. **Planned**, see [`F-support`](../../docs/plans/F-support.md).

## How to run that part

- Scripted, no key: `npm ci`, `npm run build`, `npm run preview`, then open http://localhost:4173/demo. Today that plays v1's 60-second demo, which includes the split, the token and the receipt. The Shop pages (`/shop`) are planned.
- Live splits and receipts, no key: `npm run server`, then switch on Live in the demo controls.
- Search and help, live: planned. They need the trained model, Elastic and a Claude key (see the [README](../../README.md#run-it)).

## The moment in the tour

Planned (`I2-tour`). Times are from [`docs/v2/fix-plan.md`](../../docs/v2/fix-plan.md) section 1.2.
- `d01-vibe`, 60 to 74 s: the buyer types the feeling and gets six pieces, each with its reason.
- `d03-piece`, 74 to 86 s: the piece and where the money goes, with the gallery comparison.
- `d05-pay`, 104 to 120 s: the card becomes a token, the project add-on is on, and the receipt says "Received".
- `d12-receipt`, 172 to 180 s: the receipt turns to "Paid to the maker" with Grace N.'s note.
- `d02-surprise`, 180 to 186 s (chapter 2): the fair random draw.

## What's live and what's simulated

- **Live, with a passed gate:** B10 (splits and receipts).
- **Built, live check pending tonight:** B04 (the sale posting to a Nessie account) and B09 (v1's gift finder, which the tour no longer uses).
- **Planned:** vibe search, Surprise me, the help drawer, the gallery comparison and the project add-on.
- **Simulated by design:** the checkout. No real card is charged, and no Visa API is used.

The full list is in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md).

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
