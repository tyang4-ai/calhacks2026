# Cindia video · voiceover script

Gordon reads this over the video. Every line uses the words on screen in its scene: the card lines word for word, and the product's own labels and headlines. A viewer who hears one sentence while reading another drops both.

The times are the edit's, for the video conversation's current cut of 2:56, with these changes:
- the cold open goes to 6 s
- the Why card goes to 12 s
- d03 goes to 15 s, d04 to 15, d05 to 14, d15 to 12 and d07 to 11
- the catch holds to 14 s
- d11 goes to 7 s

The optional `d17` scene is out, because it would take the cut past 3:00. Each line is sized at about 2.6 words a second, Gordon's pace in the first take. Updated Oct 25, 2026, 5:40 AM PT.

| Time | Scene | On screen | Say |
|---|---|---|---|
| 0:00 | Cold open on `d08-catch`, 6 s | The flag's headline, and the callouts "Contract: 40%", "Charged: 50%", "$340 short" | "The gallery paid $340 less than the contract says. Cindy caught it." |
| 0:06 | `p01-what`, 10 s | The Cindia card | "Cindia. Describe the vibe. Gift the piece. Pay the person. A platform for underrepresented makers, starting with Native American makers." |
| 0:16 | `p02-why`, 12 s | The Why card | "Selling online takes time, broadband and marketing reach that many makers on tribal lands don't have. Fakes sell as Native-made. Their craft, their prices, their say. We do the paperwork." |
| 0:28 | `p03-how`, 10 s | The How card, with quick shots of the swarm view, the model map and the data view | "A swarm of small Claude agents, each with one job. SpacetimeDB holds every record, and Elastic searches them. A person approves anything that moves money." |
| 0:38 | `d01-vibe`, 14 s | The typed request, its keyword chips and the model map | "I type what I want: a warm, bold gift for my mom. She loves red wool. Under $200. The words become keywords I can edit, and every piece is placed by meaning." |
| 0:52 | `d03-piece`, 15 s | "26 hours of work", "Where your money goes", the maker share and the gallery line | "Grace N. put 26 hours of work into this weaving. Before I pay, I see where my money goes: the maker share is $134.48 of $180. Through the gallery, she'd get $86." |
| 1:07 | `d04-support`, 15 s | The question, the Writer's answer and "Quote found word for word" | "I ask: did the maker weave this herself? The agents answer from the co-op's record: the co-op attests that Grace N. wove this herself, and Cindia hasn't checked it independently. Every quote is found word for word." |
| 1:22 | `d05-pay`, 14 s | "Looms for two new weavers", the card token and "We'll show you when Grace N. is paid" | "I add $5 to Looms for two new weavers. My card number becomes a token, and the number itself is never stored. The receipt will show me when Grace N. is paid." |
| 1:36 | `d15-listing`, 12 s | "A maker's notes become a listing", and the planted test | "A maker's notes become a listing. Cindy's agents draft it, check it and index it. Planted test: the draft says hand-spun churro wool, but Lena T.'s notes say store-bought yarn." |
| 1:48 | `d06-money`, 6 s | The money map, with "Kept $156.48" and "Kept $18.00" | "On the money map, the co-op keeps $156.48, and Cindia keeps $18." |
| 1:54 | `d07-month`, 11 s | "Records as they arrive", the three match labels and "23 of 23 payouts matched" | "Cindy replays the month's records as they arrive: a bundled payout, a refund taken out, a payout carried to next month. 23 of 23 payouts matched." |
| 2:05 | `d08-catch`, 14 s | The contract, statement and bank cards, and Cindy's explanation | "Here's the catch. The bank shows $1,700, matching the statement, not the contract. The contract says 40%, not 50%. Cindy trusts the contract, so the gallery owes $340." |
| 2:19 | `d09-approve`, 7 s | "Cindy proposes. Nothing here happens until you approve it.", and the seal | "Cindy proposes. Nothing happens until the co-op manager approves it with her seal." |
| 2:26 | `d10-close`, 7 s | "Excel report" and "Every total is a live formula" | "The month closes into a real Excel report, where every total is a live formula." |
| 2:33 | `d11-maker`, 7 s | "Your payout has been sent", and "$95.00 held until the gallery pays what it owes" | "Grace N.'s payout is sent, with $95 held until the gallery pays what it owes." |
| 2:40 | `d12-receipt`, 8 s | "Paid to the maker", and her note | "My receipt now says: Paid to the maker. And a note from Grace N.: Thank you for choosing my weaving." |
| 2:48 | End card, 8 s | Cindia, the tagline and cindia.design | "Cindia. Describe the vibe. Gift the piece. Pay the person. cindia.design." |

## Reading it

- **Names:** "Cindy" (SIN-dee) is the agent, in the cold open and the seller lines. "Cindia" (sin-DEE-uh) is the platform, on the first card and the end card.
- **Numbers:** say $180 as "a hundred eighty", $134.48 as "a hundred thirty-four forty-eight", $1,700 as "seventeen hundred" and $340 as "three hundred forty". The first take's $180 transcribed as $108.
- **Words to land:** "wove", not "wrote", "churro" (CHUR-oh), and "their say".
- **The catch:** pause one beat after "Here's the catch."
- **Recording:** read it as one take, with a breath between lines. Then run the transcription prompt again, so the video conversation can time each scene to the new .srt.
- **The figures** all come from the mock data and show on screen in their scenes.
- **The Why card's last line** is "Their craft, their prices, their say. We do the paperwork." `src/app/demo/pitch.ts` gets it in the freeze tweaks.

## At the judging table

Three minutes to pitch, then two minutes of questions (`docs/reference/ch13-devpost.md`).

- **Pace it by hand.** Play `/demo?mode=present`. Presenter mode pauses at the end of every beat, and the spine's beats already fill 180 s, so press the right arrow as soon as each card's line is said.
- **Skip `d15` in the three minutes.** At the end of `d05`, press the right arrow twice. Show it in the questions to a Spacetime or culture judge with `?start=d15-listing`.
- **At `d08`,** say the bank-check line and let it sit.
- **Keep `?start=d17-ask-maker` ready** for anyone who asks about culture or AI.
- **Live mode** needs the laptop setup: run `node scripts/laptop-setup.mjs`, then open `/api/health`. After the tour, go Live for the sponsor judges: the "Checked against Nessie" threads, two screens watching one database, and a judge's own question in Help.

| Question | Answer |
|---|---|
| "0.79 against 0.78, why train a model?" | "Fine-tuning lifted the base model from 0.72, and with keywords it scores 0.82 against 0.78 on 50 held-out queries. A small test, not a benchmark." |
| "Who asked you to build this?" | "Nobody yet. That's why every maker here is fictional. We haven't worked with these communities, and a real launch starts with them." |
| "Who markets her culture?" | "Agents only draft. Nothing publishes until a person approves it, and a check strikes any claim her notes don't back up." |
| Hyphenate: "Which seats would you hire it for?" | "Bookkeeper, collections and support. Cindy only proposes. The manager's seal releases every payout, and the matcher caught 4 of 4 planted errors." |
| Visa: "Where does my card number go?" | "It becomes a token before the order exists. Cindia keeps only the token, the brand, the last four digits and the order." |
| Capital One: "Is that really from Nessie?" | "Live, yes. The bank sync reads the $1,700 deposit back from Nessie, and the flag carries its Nessie ID." |
| Elastic: "What does Agent Builder add?" | "Every find question goes to our cindia-finder agent, and code keeps only real piece IDs from its answer." |
| SpacetimeDB: "Is it the core or a mirror?" | "Eight private tables hold the records, the agent steps and the screens. Approval decisions still sit in server memory, and moving them is next." |
| Apify: "Why not crawl the real web?" | "Accusing a real Native seller would be the worst harm we could do, so the watch crawls only our sandbox market." |
| Microsoft: "What would a pilot need?" | "A real bank behind the bank sync, and sign-in. The statement reader already takes a co-op's own file." |
| Meta: "Does the AI stand between buyer and maker?" | "No. It forwards the question and shows her words unedited." |
| Figma: "What did Figma do for you?" | "Every color and text style is bound to a variable, so one paste of 113 tokens restyled the whole shell and kit in drop 3." |
