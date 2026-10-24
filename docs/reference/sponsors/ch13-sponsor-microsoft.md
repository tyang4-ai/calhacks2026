---
type: source
domain: hackathon
hackathon: "Cal Hacks 13.0"
year: 2026
sponsor: "Microsoft"
captured: 2026-10-23
tags: [domain/hackathon, type/source, hackathon/cal-hacks, year/2026]
date-created: 2026-10-21
date-modified: 2026-10-24
---

# Microsoft · Built for the Real World + Customer Impact Award

Everything Microsoft published for Cal Hacks 13.0, first copied Oct 21, 2026 and updated Oct 23 with their recruiting email, Slack and Hive. Re-checked Oct 24: the Devpost prizes and the Hacker Guide row are unchanged. Hub: [[cal-hacks-13]] · Spec: [[cindia-spec]] · v2 brief: the repo's `docs/v2/brief.md`

## At a glance

- **Who's there:** the Forward Deployed Engineering (FDE) team (Microsoft Delta and Frontier Co.), with 12 engineers and 4 Early in Profession recruiters onsite all weekend
- **Challenge:** "Build a production-minded AI agent that solves a meaningful problem in finance, productivity, healthcare, or another high-impact domain."
- **The five capabilities they look for** (Slack, Oct 23):
  1. Customer understanding
  2. Measurable usefulness
  3. Path from prototype to production
  4. Responsible design
  5. End-to-end functionality
- **Events:**
  - Networking social, Fri 7:00 PM at Gate 6 (missed by arriving Saturday)
  - Workshop "System Design for Deployed Agents," Sat 10:00 AM in the Theater. Their posts say 10:00 to 10:45, Hive says 10:00 to 11:00. Coffee and matcha carts will be there.
  - Coffee chats with engineers and recruiters, Sat 11:00 AM to 12:00 PM (Oct 17 email)
- **Roles:** the FDE roles are posted at https://delta.microsoft.com/careers (recruiting email, Oct 22). Slack also names Software Engineer FDE roles and a Data Science FDE PhD internship, and asks hackers to join the Talent Network.
- **Credits:** Azure for Students (named in the Oct 23 Slack post)
- **Prizes:**
  - 1st: a Surface laptop each, a remote presentation at a Delta/Frontier Co. FDE tech talk, and 1:1 mentorship with senior FDEs. Devpost lists $3,800 in cash.
  - 2nd (Customer Impact Award): the tech talk and 1:1 mentorship
- **Sponsor tier:** Golden Bear

## Track criteria (Hacker Guide row, verbatim)

> **Track Challenge**: Build a production-minded AI agent that solves a meaningful problem in finance, productivity, healthcare, or another high-impact domain
> **Judging Criteria**:
> - Customer understanding
> - Measurable usefulness
> - Path from prototype to production
> - responsible design
> - end to end functionality

Customer Impact Award: "Same as above!"

Prizes in the guide:
- Grand Prize: Built for the Real World: A Microsoft Surface laptop for each member of the winning team; present your project remotely at a Microsoft Delta/Frontier Co. FDE team tech talk; 1:1 mentorship with senior FDEs from the Delta/Frontier Co team
- Microsoft Customer Impact Award: Present your project remotely at a Microsoft Delta/Frontier Co. FDE team tech talk; 1:1 mentorship with senior FDEs from the Microsoft Delta team

## Devpost prizes (verbatim)

- **[Microsoft] 1st Place Built for the Real World:** $3,800 in cash. "Grand Prize: A Microsoft Surface laptop for each member of the winning team. Present your project remotely at a Microsoft Delta/Frontier Co. FDE team tech talk. 1:1 mentorship with senior FDEs from Delta/Frontier Co team"
- **[Microsoft] 2nd Place Microsoft Customer Impact Award:** $0 in cash. "2nd place: Present your project remotely at a Microsoft Delta/Frontier Co. FDE team tech talk. 1:1 mentorship with senior FDEs from the Microsoft Delta team"

## What Cindia v2 does for this track

The brief's line: "A production-minded agent system with an Excel close, measurable usefulness, a path to production, responsible design."

Against the five capabilities:

1. **Customer understanding:** each user is named with what they need: buyer, maker, studio owner or co-op lead, community, and a judge at the table. The owner wants to make, not do books.
2. **Measurable usefulness:** the proof panel scores the matcher on planted errors (4 of 4) and the search model's recall at 5 against keyword search, the base model and the hybrid. The impact panel shows days from close to payout and bookkeeping hours saved, with estimates marked as estimates.
3. **Path from prototype to production:** each backend upgrade replaces one scripted event source, and the screens don't change. Without a live service, the server falls back to a local index and the browser to scripted events. Each piece's vector is about 1.5 KB (about 0.4 KB quantized), so a million pieces fit in well under 2 GB.
4. **Responsible design:** a person approves anything that moves money or publishes anything. Each agent gets only the tools its job needs. Simulated panels are badged, and no real community's data trains the model.
5. **End-to-end functionality:** the guided tour plays the whole story, from vibe search and checkout through the money arriving, the catch, approvals and the close to the maker's statement in Chinese and the receipt's "Paid to the maker".

The Excel close: the month's books become a real .xlsx file built with openpyxl (upgrade B06), with the ledger, the reconciliation, profit and loss and each maker's earnings, live formulas and a native chart.

---

## Slack #spons-microsoft (Shiloah Vasquez, Microsoft)

**Fri Oct 23, 3:37 PM (verbatim):**

> Microsoft Challenge: Build a production-minded AI agent that solves a meaningful problem in finance, productivity, healthcare, or another high-impact domain. These are the capabilties we are looking for- 1.Customer Understanding
> 2.Measurable usefulness
> 3.Path from prototype to production
> 4.Responsible design
> 5.End-to-end functionality here is Azure Credits you can sign up for: Azure for Students | Microsoft Azure

**Oct 21, 9:32 AM (summary):** networking social Fri 7:00 to 8:00 PM at Gate 6 with desserts and refreshments, the workshop Sat 10:00 to 10:45 AM at the Theatre with coffee and matcha, the same prizes, and a reminder to join the Talent Network.

**Oct 20, 12:05 PM (summary):** three roles named (two Software Engineer, Forward Deployed Engineer postings and a Data Science, Forward Deployed Engineer PhD internship), the team description, and a pointer to job alerts on the Career Site.

## Email: "Excited to Connect at CalHacks · Explore Microsoft Opportunities" (Oct 22, 2026, 10:47 AM PT)

From shivasquez@email.careers.microsoft.com (Microsoft Recruiting), verbatim minus tracking links:

> Hi Cal Hackers! Microsoft FDE Roles were posted- https://delta.microsoft.com/careers Check them out and apply! Networking Social | Friday, 7pm-8pm at Gate 6 (Sweet Treats) Workshop: System Design for Deployed Agents | Saturday, 10:00–10:45 AM at the Theatre! Coffee and matcha carts will be there. Microsoft Challenge: Build a production-minded AI agent that solves a meaningful problem in finance, productivity, healthcare, or another high-impact domain. Your solution should demonstrate customer understanding, end-to-end functionality, measurable usefulness, responsible design, and a credible path from prototype to production Prizes: Grand Prize: Built for the Real World: Microsoft Surface laptop for each member of the winning team, Present your project remotely at a Microsoft Delta/Frontier Co. FDE team tech talk, 1:1 mentorship with senior FDEs from Delta/Frontier Co team Microsoft Customer Impact Award: Present your project remotely at a Microsoft Delta/Frontier Co. FDE team tech talk, 1:1 mentorship with senior FDEs from the Microsoft Delta/Frontier Co. Team Thank you, Microsoft Recruiting

## Email: "Cal Hacks 13.0 - Meet Microsoft!" (Oct 17, 2026)

From edward@hackberkeley.org

> We're so excited to introduce Microsoft, a Golden Bear sponsor at Cal Hacks 13.0!
>
> Microsoft (https://www.microsoft.com)
>
> **Introducing Microsoft**
>
> Microsoft is here with our Forward Deployed Engineering (FDE) team. FDEs work directly with customers to design, build and deploy real-world AI and agentic systems. They solve hard problems where the technology meets the business.
>
> We'll have 12 engineers and 4 Early in Profession recruiters onsite throughout the weekend. Stop by to learn about internships and new-grad roles, ask about life as an FDE, and grab some customizable swag.
>
> Networking Social | Friday, 7:00–8:00 PM Food and drinks with the Microsoft team.
>
> Workshop: System Design for Deployed Agents | Saturday, 10:00–10:45 AM Get ready for the forward deployed engineer role and for system design interview questions. This interactive session is built around real problems our FDE team has solved. Coffee and matcha carts will be there.
>
> Coffee Chats | Saturday, 11:00 AM–12:00 PM Meet our engineers and recruiters over coffee and matcha.
>
> Prizes:
> Grand Prize: Built for the Real World:
> A Microsoft Surface laptop for each member of the winning team
> Present your project remotely at a Microsoft Delta/Frontier Co. FDE team tech talk
> 1:1 mentorship with senior FDEs from Delta/Frontier Co team
> Microsoft Customer Impact Award:
> Present your project remotely at a Microsoft Delta/Frontier Co. FDE team tech talk
> 1:1 mentorship with senior FDEs from the Microsoft Delta/Frontier Co. team
>
> Don't forget to find them at their booth during the event and come with your craziest ideas!

## From Pre-Event Details #2 (Oct 15)

> *Microsoft –* Microsoft is here with our Forward Deployed Engineering (FDE) team. FDEs work directly with customers to design, build and deploy real-world AI and agentic systems. They solve hard problems where the technology meets the business. We'll have 12 engineers and 4 Early in Profession recruiters onsite throughout the weekend. Stop by to learn about internships and new-grad roles, ask about life as an FDE, and grab some customizable swag.

## Resources

- No starter pack posted. The five capabilities above are the clearest statement of what they judge.
- Azure for Students credits: sign up through the Azure for Students page.
- FDE roles: https://delta.microsoft.com/careers
