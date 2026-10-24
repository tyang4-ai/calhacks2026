---
type: project
domain: hackathon
hackathon: "Cal Hacks 13.0"
year: 2026
project_name: "Cindia"
status: draft
tags: [domain/hackathon, type/project, hackathon/cal-hacks, year/2026]
date-created: 2026-10-21
date-modified: 2026-10-22
---

# Cindia · pitch materials

Spec: [[cindia-spec]] · Hub: [[cal-hacks-13]]

## Name

- **Cindia: Craft Inheritance Network, Direct from Independent Artisans.** This is the marketplace.
- **Cindy** is the agent inside it ("Ask Cindy").
- **Tagline:** "Craft inheritance, now direct to you." Its initials spell CINDY.

## The three problems

- **Time:** makers spend their days marketing, selling and chasing payments instead of making.
- **Legacy:** a craft that eats your time and doesn't pay well doesn't get passed down.
- **Trust:** buyers can't tell real from fake, and middlemen take a big cut.

Time turns into legacy: if the craft eats your days and doesn't pay, your kids pick another job. Trust is where the money leaks out. Cutting out the middleman fixes trust and sends that money back to the maker, which works on the other two.

## 30-second elevator pitch

> A remedy passed down from my great-grandfather saved my life when I was eight, and that's why I do AI-for-medicine research, with traditional Chinese medicine as the long game. Heritage crafts are the same kind of family knowledge, and China is losing them. Makers spend their days selling instead of making, so young people won't take over, and buyers can't tell real from fake. Cindia lets buyers shop straight from the makers while an AI agent handles the makers' money. The maker keeps most of every sale.

## Judging pitch opening (about 40 seconds, then the demo)

> A remedy passed down from my great-grandfather saved my life when I was eight, and that's why I do AI-for-medicine research, with traditional Chinese medicine as the long game. Heritage crafts carry the same kind of family knowledge, and three things are killing them. Time: makers spend their days selling instead of making. Legacy: young people won't inherit a craft that doesn't pay. Trust: buyers can't tell real from fake, and middlemen take the margin. I grew up in Shanghai, where Gu embroidery comes from. Cindia connects a studio there straight to a buyer here, and an AI agent runs the studio's money. Here's one purchase, followed all the way to the makers, in sixty seconds.

For a Hyphenate judge, start the demo at the catch, then rewind to the buyer. The full demo script is in [[cindia-spec]], section 3.

### Closing line, matched to the judge

- **Microsoft:** "The owner gets the month's books in Excel without building a spreadsheet, and the number I track is hours of bookkeeping saved."
- **Anthropic:** "Claude reads every contract and statement, explains each match in Chinese or English, and never moves money without the owner's OK."
- **Visa:** "Before paying, the buyer sees who made the piece, how long it took, and how much of the price reaches the maker."
- **Capital One:** "Every sale, payout and maker payment runs through Nessie, so the books reconcile against a bank, not a spreadsheet."
- **Hyphenate:** "It fills two roles: the bookkeeper who matches payouts to orders, and the person who chases a partner who pays short. Here's what's real, what's simulated, and the planted-error score."

## Video and QR code

- Devpost accepts a pre-recorded or live demonstration, and Hyphenate wants a demo video that opens with your moment. Devpost's judging criteria also ask for "a clear, meaningful video demo on devpost for sponsors evaluating asynchronously," so the video goes on the Devpost page too. The live demo is still required at judging, and you have to stay at your table for the whole window. Use the video for judges who are waiting.
- Tables are assigned after the 9:00 AM deadline and shared by 2 to 3 teams, so keep the setup small: a QR card, plus your phone looping the video so no one has to scan.
- Host the video on YouTube (unlisted) for the QR, and keep a local copy in case the Wi-Fi drops.

**Shot list (60 to 90 seconds)**
1. Cold open, 5 seconds: "The gallery paid $340 less than the contract says," with the contract, the statement and the bank record side by side. Then rewind.
2. The buyer, about 15 seconds: asks for a gift, reads the maker's story, sees the price split, pays, and the card becomes a token.
3. Follow the money, 5 seconds: the $180 lands in the studio's Nessie account.
4. The makers, about 30 seconds: the month fast-forwards and payouts get matched, the catch appears in context, the owner approves on the phone, the month closes into Excel and the dashboard, and a maker gets a statement in Chinese.
5. Back to the buyer, 10 seconds: the receipt updates to show the maker got paid, and how much.
6. Last frame: what's real, what's simulated, the planted-error score, and a QR code for the repo.

## Devpost submission draft

**Tagline:** Heritage crafts straight from the people who make them, with an AI agent that runs the makers' money.

### Inspiration

When I was eight, I had a 107-degree fever that five hours of IV drips couldn't bring down. My father tried a remedy passed down from my great-grandfather, who treated more than 200,000 patients in his life, and the fever was gone in a few hours. That's why I do AI-for-medicine research, with traditional Chinese medicine as the long game.

Medicine isn't the only family knowledge China is losing. Its 非遗 (intangible cultural heritage) crafts are going too, and I think it comes down to three problems:
- **Time:** makers spend their days marketing, selling and chasing payments instead of making.
- **Legacy:** a craft that eats your time and doesn't pay doesn't get passed down. Young people pick other jobs.
- **Trust:** buyers abroad can't tell real from fake, and middlemen take a big share of every sale.

I grew up in Shanghai, home of Gu embroidery (顾绣), a Ming-dynasty craft on China's national intangible heritage list. I've always been a bridge builder between Chinese tradition and the Western world, and Cindia is that bridge for makers: a workshop in Shanghai, a buyer in San Francisco, and nothing in between but software.

### What it does

Cindia is a marketplace for heritage crafts. The demo follows one Gu embroidery studio with three makers that sells on Cindia, through a gallery in San Francisco, and on its own site.
- Buyers shop with an AI assistant that finds a piece, tells its story (who made it, how many hours it took) and shows how much of the price reaches the maker before checkout. After the maker is paid, the buyer's receipt shows how much reached them. (Visa)
- Sales, gallery payouts and maker pay all move through the studio's bank account, built on Capital One's Nessie API. (Capital One)
- An agent matches every payout to its orders. When the records disagree, like a gallery paying $340 less than its consignment contract says, it lays the contract, the statement and the bank record side by side, drafts a follow-up and waits for the owner's approval. (Hyphenate)
- Every week and every month it closes the books and produces an Excel report and dashboard, and each maker gets a statement in Chinese. (Microsoft)
- The owner asks questions in Chinese or English and gets answers as charts. Claude does the reading, matching and explaining, and never moves money on its own. (Anthropic)

**Who it's for:** heritage craft makers who want to sell to buyers abroad without a middleman, starting with one Gu embroidery studio.

**The roles it fills:** the bookkeeper who matches every payout to its orders, and the person who chases a partner who pays short.

### What's real and what's simulated

Fill this in Saturday night. Everything starts hardcoded, so list each backend upgrade from the spec (B1 to B10) that got finished as real, and everything else as simulated.
- Real:
- Simulated:
- Proof: [N] planted errors with an answer key, and Cindia caught [N] of [N].

### How I built it, challenges, accomplishments, what I learned

Write these Saturday night, from what actually happened.

### What's next for Cindia

- More crafts and more studios
- Real payouts to makers' bank accounts, including across borders
- Checking makers against China's official lists of recognized heritage practitioners, so "authentic" can be verified
- A Power BI version of the monthly dashboard

## Notes

- "The maker keeps most of every sale," not "all": card fees and running the marketplace cost money, and the Visa and Hyphenate judges will ask. The price breakdown on every listing shows the exact split.
- The research line is "AI-for-medicine research, with TCM as the long game." Current research is AI for glioblastoma and TCM is the long-term goal. If there's an active TCM project, swap it in.
- Every pitch follows one Gu embroidery studio, because Anthropic judges a specific community.
- The demo is told from the buyer's side, but the product is for the makers. Keep the buyer part under 15 seconds.
- Gu embroidery facts: originated in Shanghai in the early 1600s (Ming dynasty), associated with the Gu Mingshi family, and listed as national intangible cultural heritage of China. Source: https://www.cccbrussels.be/coming-soon/cs-exhibitions/gus-embroidery-from-the-ming-dynasty.html
