# Cindia demo video · brief for a separate Claude conversation

Gordon Yang wrote this brief with the Cindia planning session on Oct 25, 2026, just after midnight PT. Paste it into a new conversation, or attach it there, and follow it. It's everything you need. Gordon is busy finishing the build tonight, so only ask him at the two checkpoints below. Make every other call yourself and say what you chose.

**Work in this one conversation and spawn no subagents.** The build runs on the same Claude plan, and it must not run out of usage before its 6:00 AM freeze.

## 1. Who and what

- **Gordon Yang** is competing solo at Cal Hacks 13.0. His project, **Cindia**, is a platform for underrepresented makers, starting with Native American makers. Selling online takes time, broadband and marketing reach that many makers on tribal lands don't have, so Cindia does the selling, the marketing and the books for them. Buyers find a piece by describing a feeling. A swarm of small Claude agents answers customers and runs the makers' money, and a person approves anything that moves money.
- **Every maker, community and story in it is fictional demo data.** The named community is the Diné Weaving and Silver Co-op. Its maker Grace N. wove the $180 weaving the demo follows.
- **Clock, Pacific time:** the build freezes Sunday Oct 25 at 6:00 AM. Devpost closes at 9:00 AM. Judging runs from 10:30 AM.
- **Limits:** the video stays under 3 minutes, which is Figma's limit. The Hyphenate judges want it to open on "the moment", the catch.

## 2. What you're making

- **The look of an After Effects product promo.** It shows the real product pages, with a cursor the camera follows, smooth zooms and pans, 2.5D tilts, motion blur, highlights on the element that matters, kinetic type callouts and clean transitions.
- **The product footage is the core.** The animation frames it, guides the eye and explains it. Never replace a real screen with a drawn imitation of it.
- **Visuals only.** Gordon adds the voiceover, music and anything else in Premiere Pro.

## 3. The cut, about 2:40

The cut follows the tour's video mode (`/demo?video=1`). If Gordon gives you a voiceover with an .srt, time each scene to his timestamps instead of these lengths.

| Part | Seconds | Beat | What's on screen |
|---|---|---|---|
| Cold open | 5 | `d08-catch` | The flag on the co-op's month: "The gallery paid $340 less than the contract says." |
| Pitch | 10 | `p01-what` | Card: Cindia (text in section 7) |
| | 10 | `p02-why` | Card: Why |
| | 10 | `p03-how` | Card: How it works |
| Buyer minute | 14 | `d01-vibe` | Vibe search: "a warm, bold gift for my mom. she loves red wool. under $200", keyword chips, results |
| | 12 | `d03-piece` | The weaving, its story, the verification line, the price split ($134.48 of $180 to Grace N.) and the gallery comparison |
| | 18 | `d04-support` | Help drawer: the agent swarm answers, a check step fires, the swarm view opens |
| | 16 | `d05-pay` | Pay, the $5 project add-on, the card becomes a token, the receipt promises to show when Grace N. is paid |
| Seller minute | 10 | `d15-listing` | A maker's notes become a listing, a check strikes an unsupported claim, the model indexes it, the data view |
| | 6 | `d06-money` | The money map: threads from buyer to co-op to makers |
| | 10 | `d07-month` | Cindy plays the month and matches every payout, the reconcile view |
| | 8 | `d08-catch` | The catch: contract, statement and bank record side by side, $340 short |
| | 7 | `d09-approve` | Cindy's proposals wait, and the manager's seal lands |
| | 5 | `d10-close` | The month closes into an Excel file |
| | 6 | `d11-maker` | Grace N.'s statement: $95 held until the gallery pays, and why |
| | 8 | `d12-receipt` | The buyer's receipt turns to "Paid to the maker", with Grace N.'s note |
| End card | 5 | | The seats line, "Caught 4 of 4 planted errors", the search model's scores, L29 and L30 |

Gordon's voiceover script, timed to video mode, is `docs/v2/voiceover.md`. If he gives you a recording with an .srt, his timestamps win.

## 4. The product, and how to film it

- **The repo:** github.com/tyang4-ai/calhacks2026. Attach it for reading only.
- **It belongs to another Claude session, which is building it right now.** Don't act as that build:
  - Ignore its `CLAUDE.md`, runbook, status board, hooks and skills.
  - Never commit, push or open a pull request there.
  - Never open `.env`, and never print or echo any key.
- **Running it:** clone it into a scratch folder of your own, then run `npm ci`, `npm run build` and `npx vite preview --port 4173 --strictPort`. Scripted mode makes no requests beyond localhost.
- **Desktop only.** The design size is 1440 by 900.
- **The tour is at `/demo`, and it's being built tonight.**
  - Until it lands, `/demo` plays v1's older 60-second demo. Check the I2-tour row and the newest log lines in `docs/harness/status.md`. The tour should land around 3:30 to 4:00 AM.
  - Build the pipeline, the review page and the pitch scenes first. Film the product after the tour lands.
  - `git pull` again after the 6:00 AM freeze and refilm anything that changed.
- **Capture by seeking, not by screen recording.**
  - Every build exposes `window.__cindia.player`, with `pause()`, `seek(ms)` and `getTimeline()`.
  - `seekToEvent()` in `tests/smoke/lib.ts` shows how the tests find a beat's events and seek to them.
  - Beat times are in `docs/plans/I2-tour.md`'s beat table, and in `docs/common/demo-script.md` once the tour lands.
  - Take stills at 1440 by 900 with a device scale factor of 2, so 2880 by 1800, which leaves room for camera moves.
  - Take short real-time clips only where the product has its own motion: the money threads, the seal landing, the receipt turning.
- **Keep it truthful:**
  - The site-wide notice ("Demo. Every maker, community and story here is fictional. Nothing is for sale.") is visible in the first product shot.
  - The end card keeps L30.
  - The tour is always scripted, so no callout says "live" over it.
  - Every number is the product's own: $180, $134.48 to Grace N., $340 short, $95 held, caught 4 of 4.

## 5. Look

- **Cindia's own design system:**
  - The colors are in `src/ui/tokens.css`: paper `#f6f1e7`, ink `#1c1a17`, seal red `#b23a2e`, jade `#2f6b4f`, amber `#8a5a0b`.
  - The type is Source Sans 3 and Source Code Pro.
  - Motion can borrow from the product itself: the running-stitch threads of the money map and the seal stamp.
- **Never use any of these:**
  - feathers, dreamcatchers, tipis, headdresses, arrows, thunderbirds or "tribal" patterns
  - sacred or ceremonial imagery of any kind
  - images of Native people, generated or stock
  - Only the product's own screens, its own illustrations and type.
- **On-screen words:**
  - plain words, sentence case
  - no em dashes and no semicolons
  - none of: tapestry, realm, foster, esteemed, thrilled, unwavering, "bridge the gap", "at the intersection of"
  - Cindia is a platform, never an app

## 6. Tools

Gordon asked for proven, widely used skills, not home-made code. Read each skill's SKILL.md before you build with it, and check its version and license yourself.

- **Primary: Remotion with its official agent skills.** Install them with `npx skills add remotion-dev/skills`.
  - Use Remotion Studio for your own previews, `@remotion/player` for the review page, and `npx remotion render` for the final.
  - Remotion is free for individuals, and companies may need a paid license. Gordon is an individual.
- **Shot recipes: Vincentwei1021/video-shotcraft.** It's Apache-2.0 and built on Remotion. It has recipe cards for camera, typography and transitions, plus a 2.5D page camera, and it builds a film from the product's own pages.
- **Cursor and camera reference: AbubakrChan/product-launch-motion.** It's MIT-licensed and shows:
  - a cursor that drives every change
  - spring camera pushes
  - press-scale and ripple clicks
  - motion blur from blended subframes

  Borrow its techniques, but keep one renderer.
- **Fallback renderer: HeyGen's HyperFrames.** Use it if Remotion fights this workspace. It's Apache-2.0 and renders HTML compositions to MP4 in headless Chrome with FFmpeg. Install its skills with `npx skills add heygen-com/hyperframes`.
- **This workspace:**
  - Chromium and Playwright are already installed. Don't run `playwright install`.
  - If a renderer's own Chrome download is blocked, point it at that Chromium (Remotion's `browserExecutable`).
  - ffmpeg is installed.
  - Most hosts other than npm, PyPI and GitHub are blocked.

## 7. Pitch card text (approved by Gordon)

`src/app/demo/pitch.ts` holds the same text once the tour lands. If the two ever differ, the file wins.

**The tagline is "Made by hand. Paid in full."** It opens the pitch and the end card repeats it, so give it the strongest typographic moment in the video.

**Cindia**
- Made by hand. Paid in full.
- A platform for underrepresented makers, starting with Native American makers.
- Yes, it's like Etsy. But we do the selling, the marketing and the books for them.
- Buyers find a piece by describing a feeling, and watch the maker get paid.

**Why**
- Selling online takes time, broadband and marketing reach that many makers on tribal lands don't have.
- On a marketplace, a co-op gets one payout and splits it by hand.
- Fakes sell as Native-made. In August, one eBay seller admitted to selling more than $92,000 of them.
- If we don't help them, who will?

**How it works**
- A swarm of small Claude agents, each with one job, on Haiku and Sonnet.
- Our own embedding model, fine-tuned on queries Claude wrote, embeds every listing.
- SpacetimeDB holds every record, and Elastic searches them.
- A person approves anything that moves money.

## 8. Review first, render after

This is Gordon's workflow, and the order matters.

1. **Storyboard (checkpoint 1).** Write a shot list with these columns: time, beat, what's on screen, camera move, cursor path, effect, and on-screen text. Send it to Gordon as a short table and get his OK.
2. **The review page.** Build it so Gordon can open it in his browser:
   - It plays the whole cut at preview quality, with play, pause, scrubbing, frame step and timecode.
   - "Add comment" puts a numbered marker on the timeline at the current frame. It can also drop a pin on the frame itself, where he clicks. Either way, a comment box opens.
   - Markers show on the scrubber. Clicking a comment in the list jumps to its moment. Each comment can be marked resolved.
   - Save the comments where you can read them back without Gordon copying anything. Publish the page as an Artifact with a shared database: load the `artifact-capabilities` skill first, and read his comments with the ArtifactData tool. As a fallback, add an "Export comments" button that copies JSON.
   - For playback, use a preview render uploaded to the artifact's asset store (15 MB per file, so split by section if needed), or the Remotion Player with the composition bundled in.
3. **Rounds (checkpoint 2).** Revise from his comments, mark each one done, and republish. Repeat until he says it's approved.
4. **Final render, only after he approves.**

## 9. Final delivery for Premiere

- **Format:** 1920 by 1080 at 60 fps. Go to 3840 by 2160 only if render time allows.
- **Files:** one file per scene, named in order (`01-cold-open`, `02-pitch-what` and so on). Use H.264 at a high bitrate, or ProRes 422 HQ where the size can still be delivered.
- **Overlays:** if it helps him, a separate overlay track with alpha (ProRes 4444) for the cursor and callouts.
- **Cut list:** a CSV with file, start, end, beat and notes, so he can lay the files on the timeline in order.
- **Audio:** no music or voice baked in. A copy with scratch audio, for reference only, is fine.
- **Sending:** send the files with SendUserFile, split to stay under the size limit.

## 10. Timeline

| By (PT) | What |
|---|---|
| 3:30 AM | Pipeline, storyboard OK, pitch scenes, review page up |
| 4:30 AM | The tour has landed. Product footage filmed, first review cut published |
| 7:30 AM | Approved, final render delivered |
| 8:30 AM | Gordon finishes in Premiere and uploads for the 9:00 AM Devpost close |

If the clock runs short, deliver the best approved cut. A plainer video on time beats a perfect one late.
