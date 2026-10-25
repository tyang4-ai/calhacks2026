# Cindia video · voiceover script

Gordon reads this over the video. The video conversation films the tour's video mode, `/demo?video=1`, then holds some beats and trims others in the edit. So the times below are the edit's, not video mode's.

The cut runs 2:59 with the optional `d17` scene, or 2:50 without it. Both are under the 3-minute limit that Devpost and Figma's track set.

Each line is sized at about 2.5 words a second and starts when its scene starts. Updated Oct 25, 2026, 4:45 AM PT, from the 4:30 AM persona reviews.

| Time | Scene | Edit | Say |
|---|---|---|---|
| 0:00 | Cold open on `d08-catch` | 5 s. Callouts: "Contract: 40%", "Charged: 50%", "$340 short" | "This gallery shorted a co-op $340. Cindy caught it." |
| 0:05 | `p01-what`, the Cindia card | 10 s | "This is Cindia. Describe the vibe, gift the piece, pay the person. We're a platform for underrepresented makers, starting with Native American makers." |
| 0:15 | `p02-why`, the Why card | 11 s | "Many makers on tribal lands lack the time, broadband and reach to sell online, and fakes sell as Native-made. Their craft, their prices, their say. We do the paperwork." |
| 0:26 | `p03-how`, the How card | 10 s. Cut in quick shots of the swarm view, the model map and the data view | "Under the hood: small Claude agents, our own search model, SpacetimeDB for the records and Elastic to search them. A person approves anything that moves money." |
| 0:36 | `d01-vibe`, vibe search | 14 s | "I'm shopping for my mom: warm, bold, red wool, under two hundred. I get keywords I can edit, and each result says why it matched. Our own model maps every piece by meaning." |
| 0:50 | `d03-piece`, the weaving | 14 s. Hold 2 s on $134.48 against $86.00 | "This weaving took Grace N. 26 hours. Before I pay, I see that $134.48 of my $180 goes to her. Through the gallery, she'd get $86." |
| 1:04 | `d04-support`, Help and the swarm | 12 s, trimmed from 18. Speed through the swarm's steps | "I ask if she wove it herself. Small agents answer only from the co-op's records, one checks every quote, and live, it takes about six seconds." |
| 1:16 | `d05-pay`, Pay | 13 s, trimmed from 16 | "I pay, add five dollars to the co-op's community project, and my card becomes a token, so the number is never stored. The receipt will show when Grace N. is paid." |
| 1:29 | `d15-listing`, a new listing | 13 s. Hold 3 s on the check | "On the maker's side, Lena T. types a few notes and agents draft her listing. We planted a false claim: hand-spun churro wool. Her notes say store-bought yarn, so a check stops it." |
| 1:42 | `d06-money`, the money map | 6 s | "The money lands in the co-op's books. Live, its bank is Capital One's Nessie." |
| 1:48 | `d07-month`, the month | 12 s. Hold 2 s on the matched count | "Cindy replays the whole month and matches all 23 payouts, bundled ones and refunds included. Each match links to the orders it pays for." |
| 2:00 | `d08-catch`, the catch | 13 s. Hold 5 s | "Here's the catch. The bank deposit matches the gallery's statement, so a bank check passes it. Cindy reads the contract: 40%, not 50%. That's $340 missing." |
| 2:13 | `d09-approve`, approvals | 7 s | "Cindy drafts the follow-up and the payouts. Only the manager can approve them." |
| 2:20 | `d10-close`, the close | 8 s. Hold 3 s on Gordon's clip of the .xlsx opening in Excel | "The month closes into a real Excel file, and makers get paid two days after the close." |
| 2:28 | `d11-maker`, Grace N.'s statement | 6 s | "Grace N.'s statement shows $95 held until the gallery pays, and tells her why." |
| 2:34 | `d12-receipt`, the receipt | 8 s. Zoom to "Paid to the maker" and her note | "And my receipt now says paid to the maker, with a note from Grace N." |
| 2:42 | `d17-ask-maker`, optional | 10 s, filmed with `?start=d17-ask-maker` | "And if I ask what the pattern means, Cindy won't guess. It asks Grace N. and shows her answer in her own words." |
| 2:52 | End card | 7 s, or 8 s without `d17` | "Cindia. Describe the vibe. Gift the piece. Pay the person." |

## Notes

- **Recording:** record over the final render in Premiere, one take per scene. The times above are the render's.
- **The Why card's last line** is "Their craft, their prices, their say. We do the paperwork." `src/app/demo/pitch.ts` gets it in the freeze tweaks.
- **`d15` is a planted test,** and the screen labels it that way, so the line says "we planted".
- **The figures** all come from the mock data:
  - the $180 weaving, $134.48 to Grace N. and $86 through the gallery
  - the 23 matched payouts
  - the $340 short payment and the $95 held
  - payouts two days after the September 30 close
- **Live claims:** "about six seconds" is B14's live median for this question, 5.87 s. Nessie is Capital One's sandbox bank, so no real money moves.

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
