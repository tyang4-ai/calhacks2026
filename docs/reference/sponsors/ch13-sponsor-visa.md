---
type: source
domain: hackathon
hackathon: "Cal Hacks 13.0"
year: 2026
sponsor: "Visa"
captured: 2026-10-23
tags: [domain/hackathon, type/source, hackathon/cal-hacks, year/2026]
date-created: 2026-10-21
date-modified: 2026-10-24
---

# Visa · Best Use of Reimagining Shopping

Everything Visa published for Cal Hacks 13.0, first copied Oct 21, 2026 and updated Oct 23 with the Hacker Starter Pack and Hive. Re-checked Oct 24: the Devpost prize and the Hacker Guide row are unchanged. Hub: [[cal-hacks-13]] · Spec: [[cindia-spec]] · v2 brief: the repo's `docs/v2/brief.md`

## At a glance

- **Prize:** $5,000
- **Sponsor tier:** Golden Bear
- **Event:** Fireside Chat: AI and Security in Digital Payments, Sat 12:00 to 1:00 PM at Gate 3 (Hive lists it as "Visa Workshop"). Topics: secure transactions, fraud prevention, user experience, tokenization, real-time risk scoring and ethical AI.
- **Same slot:** Capital One's Smash tournament at Gate 4
- **Recruiting:** internship and new grad roles across software engineering, cybersecurity, product management, data science and other business functions
- **What they want built:** "the most compelling Generative AI-powered shopping experience that enhances commerce through secure, seamless, and personalized payments"
- **No Visa APIs:** the starter pack says Visa won't provide proprietary APIs. Public APIs and datasets are fine.
- **Weights don't match:** the starter pack weights Innovation 25, Technical Execution 20, User Experience 20, Commerce Impact 20, Trust & Responsibility 15. The Hacker Guide weights Innovation 25, User Experience 25, Technical Execution 20, Commerce Impact 15, Trust & Responsibility 15. Wallace said the Hacker Guide wins when sources disagree, so plan around the guide and keep both in mind.
- **Have ready by Sunday morning** (starter pack): what challenge you're solving, who benefits, how AI improves the experience, how it works, why it matters, and where it could go next.

## Judging (Hacker Guide row, verbatim)

> **Innovation (25%) –** How creative does the solution reimagine the shopping experience?
> **User Experience (25%) –** Does the experience feel intuitive, useful, and seamless?
> **Technical Execution (20%) -** How effectively has the team implemented AI and supporting technologies?
> **Commerce Impact (15%) -** Can the solution improve customer engagement, conversion, loyalty, or merchant outcomes?
> **Trust & Responsibility (15%) -** Does the solution address privacy, transparency, security, and responsible use of AI?

## Devpost prize (verbatim)

- [Visa] Best use of Reimagining Shopping sponsored by Visa, $5,000 in cash, 1 winner

## What Cindia v2 does for this track

The brief's line: "Vibe search, surprise me, the price split before paying, the card token, the receipt that shows the maker got paid, trust and privacy."

- **Vibe search:** a buyer types a feeling, like "something soft and hopeful for my mom, she gardens and loves peonies, under $200". The Finder agent turns it into keywords the buyer can see and edit as chips, and our own embedding model finds pieces that match the feeling, not just the words. Every result says why it matched.
- **Surprise me:** one button, three ways, and the screen says which one it used: a random pick among the closest matches to a keyword, pure random, or fair random, which leans toward makers with fewer sales this month.
- **The price split before paying:** "Where your money goes" breaks the price into the maker's share, materials, the Cindia fee (10%) and the card fee (2.9% plus 30 cents). Of the $180 peony fan, $134.48 goes to the maker.
- **The card token:** in the simulated checkout the card number becomes a token, so the number itself is never stored. The checkout view shows what is stored and what never is, and the screen says "Demo checkout, no real charge".
- **The receipt:** it says "Received" after the sale and later updates to "Paid to the maker" when the maker's payout goes out.
- **Trust and privacy:** each piece shows its verification line (who attested, and how). Support answers "is it real?" only from the community's page and the verification record. The counterfeit watch shows the owner look-alike listings, and the owner decides what to report.
- **API:** no Visa API, as the starter pack says. The checkout and the token are simulated and labeled.

---

## Hacker Starter Pack (Google Doc, read Oct 23, 2026)

"Visa: Reimagining Shopping with AI - Hacker Starter Pack": https://docs.google.com/document/d/1Lgtd0f8mHZy_nWabtz751AkSW5Oj-z1XMhzAwddtfOA/edit. Rafaello Sampang (Visa) said on Slack that the track is in the starter pack on the main website. Full text:

> **Visa x CAL Hacks 13.0 Hacker Starter Pack**
>
> Welcome to the **Visa Challenge Track at CAL Hacks 13.0!**
>
> This starter pack is designed to help you understand the challenge, identify opportunities for innovation, and accelerate development throughout the weekend.
>
> **Reimagine Shopping -** *Use Generative AI to craft smarter and more effortless commerce experiences.*
>
> Shopping is evolving from searching and browsing to conversing and collaborating with AI. Consumers increasingly expect intelligent experiences that help them discover products, compare options, personalize recommendations, manage budgets, and complete purchases seamlessly.
>
> Your challenge is to design and build a commerce experience powered by Generative AI that makes shopping more intuitive, personalized, and frictionless while enabling secure and trusted customer experiences.
>
> **Challenge Areas**
>
> Your solution can focus on any part of the shopping journey.
>
> **1. Discovery.** How can AI help customers find exactly what they're looking for? Example ideas: conversational product search, voice-enabled shopping assistants, personalized product discovery, social shopping recommendations, AI-powered gift finders.
>
> **2. Decision-Making.** How can AI help consumers make more informed purchasing decisions? Example ideas: product comparison copilots, AI buying guides, sustainability recommendation engines, budget-conscious shopping assistants, smart review summarization.
>
> **3. Personalization.** How can every shopper receive a uniquely tailored experience? Example ideas: personalized storefronts, dynamic recommendations, shopping companions, customized bundles, lifestyle-based product suggestions.
>
> **4. Checkout.** How can AI reduce friction during checkout? Example ideas: smart cart optimization, subscription management assistants, checkout copilots, automated savings recommendations, purchase planning tools.
>
> **5. Payments.** How can shopping experiences become more secure and intelligent? Example ideas: spending assistants, budget planning copilots, financial wellness tools, fraud awareness experiences, smart payment preference recommendations.
>
> **6. Loyalty & Rewards.** How can rewards programs become more engaging? Example ideas: personalized rewards optimization, gamified shopping experiences, AI loyalty advisors, reward redemption assistants, merchant engagement platforms.
>
> **7. Post-Purchase Experience.** How can AI improve the customer experience after a purchase? Example ideas: order tracking assistants, customer support copilots, return management tools, loyalty engagement experiences, automated product assistance.
>
> **Important Challenge Guidance**
>
> **AI Should Be Meaningful.** Adding a chatbot alone is not enough. The best projects will demonstrate how AI fundamentally improves the shopping experience or solves a meaningful customer or merchant challenge. Ask yourself: Why does this need AI? What becomes possible because of AI? How is the customer experience meaningfully better?
>
> **Consider Trust & Responsibility.** Visa operates in one of the world's most trusted payment ecosystems. Strong projects should consider: privacy, transparency, security, responsible AI design, data protection, user consent.
>
> **Suggested Technology Stack**
>
> - Front-end: React, Next.js, TypeScript, TailwindCSS, Flutter, Angular
> - AI and machine learning: Azure OpenAI, OpenAI APIs, Anthropic Claude, LangChain, Semantic Kernel, Retrieval-Augmented Generation (RAG), Vector Search
> - Backend: Node.js, Python, FastAPI, Express, Azure Functions, Serverless Architectures
> - Data and storage: PostgreSQL, Azure SQL, Cosmos DB, MongoDB, Vector Databases
>
> **Optional External APIs.** Visa will **not** be providing proprietary Visa APIs for this challenge. Teams are welcome to leverage publicly available APIs, datasets, and platforms such as: product catalog APIs, public retail datasets, e-commerce APIs, geolocation APIs, open financial education datasets, price comparison APIs, sustainability datasets, open-source commerce tools.
>
> **Judging Criteria**
>
> | Criteria | Weight |
> |---|---|
> | Innovation | 25% |
> | Technical Execution | 20% |
> | User Experience | 20% |
> | Commerce Impact | 20% |
> | Trust & Responsibility | 15% |
>
> **Innovation (25%):** Is this a novel idea? Does it solve a meaningful problem? Is the solution differentiated?
>
> **Technical Execution (20%):** Does the application work? Is the AI implementation meaningful? Is the architecture thoughtfully designed?
>
> **User Experience (20%):** Is the experience intuitive? Is the application easy to use? Would consumers actually adopt it?
>
> **Commerce Impact (20%):** Does the solution create measurable value? Does it improve customer experiences? Does it help merchants achieve better outcomes?
>
> **Trust & Responsibility (15%):** Is customer data protected? Are recommendations explainable? Does the solution address responsible AI concerns?
>
> By Sunday morning, make sure you can clearly demonstrate: What challenge are you solving? Who benefits from your solution? How does AI improve the experience? How does the solution work? Why does this matter? Where could this go next?

(The example idea lists are copied as one line per area. The wording is the pack's.)

---

## Email: "Cal Hacks 13.0 - Meet Visa!" (Oct 21, 2026, 8:49 PM PT)

From edward@hackberkeley.org

> We're so excited to introduce Visa, a Golden Bear sponsor at Cal Hacks 13.0!
>
> Visa (https://www.visa.com)
>
> **Introducing Visa**
>
> Visa is a global leader in digital payments, connecting consumers, merchants, financial institutions, and governments through a secure and innovative payments network.
>
> Students can explore internship and new graduate opportunities across software engineering, cybersecurity, product management, data science, and other business functions while helping shape the future of commerce. During the hackathon, Visa will offer mentorship and networking opportunities, and teams that build the most compelling Generative AI-powered shopping experience that enhances commerce through secure, seamless, and personalized payments will compete for a $5,000 Visa-sponsored prize.
>
> **Fireside Chat: AI and Security in Digital Payments | Saturday, 12:00–1:00 PM** We'll explore how artificial intelligence is shaping the future of secure transactions, fraud prevention, and user experience. Discover the latest trends in tokenization, real-time risk scoring, and ethical AI practices that keep payment networks safe and seamless. This session is perfect for anyone curious about the intersection of cutting-edge technology and financial security. Don't miss this opportunity to learn more about Visa's role in driving innovation and building trust in the global payment ecosystem.
>
> Prizes:
> 🏆 Best use of Reimagining Shopping sponsored by Visa:
> 🏆 $5,000
>
> Don't forget to find them at their booth during the event and come with your craziest ideas!

## From Pre-Event Details #2 (Oct 15)

> *Visa –* Visa is a global leader in digital payments, connecting consumers, merchants, financial institutions, and governments through a secure and innovative payments network. Students can explore internship and new graduate opportunities across software engineering, cybersecurity, product management, data science, and other business functions while helping shape the future of commerce. During the hackathon, Visa will offer mentorship and networking opportunities, and teams that build the most compelling Generative AI-powered shopping experience that enhances commerce through secure, seamless, and personalized payments will compete for a $5,000 Visa-sponsored prize.
