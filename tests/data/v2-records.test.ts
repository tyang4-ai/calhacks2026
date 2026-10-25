// S3-catalog T7: the splits, projects, works in progress, storefronts, the listing, the policy, the
// agent roster, the copy watch and the empty model, against data-model.md and the plan's rules.
import { describe, expect, it } from "vitest";
import type { Approval, CounterfeitCandidate, FollowUp, Piece, Project, Storefront, WorkInProgress } from "../../src/core/types";
import {
  agents,
  allMakers,
  communities,
  contentRules,
  counterfeitCandidates,
  demoContribution,
  demoFundMoves,
  galleryContract,
  gallerySplits,
  getAgent,
  getById,
  listings,
  modelId,
  orders,
  pieces,
  policy,
  projects,
  report,
  scriptedScan,
  splits,
  storefronts,
  studio,
  worksInProgress,
} from "../../src/mock/index";
import { scan, strings, total, wordHits } from "./v2-helpers";

const halfUp = (amount: number, rate: number) => Math.floor((amount * rate + 5000) / 10000);
const piece = (id: string) => getById<Piece>(id) as Piece;
const approval = (id: string) => getById<Approval>(id) as Approval;
const BAD = [...contentRules.bannedObjects, ...contentRules.stereotypeWords, ...contentRules.meaningWords];
const cft = (id: string) => getById<CounterfeitCandidate>(id) as CounterfeitCandidate;
const pc01 = () => piece("pc_01");
const coop = () => communities[0];

// B11's real report, once its first training run writes it. Empty until then.
const REPORT_FILES = import.meta.glob<unknown>("../../server/b11_embed/report.json", { eager: true, import: "default" });

describe("splits", () => {
  it("give every piece a split.shown under the ch_cindia rules, computed here again", () => {
    expect(Object.keys(splits)).toEqual(pieces.map((p) => p.id));
    for (const p of pieces) {
      const card = halfUp(p.priceCents, 290) + 30;
      const fee = halfUp(p.priceCents, 1000);
      const s = splits[p.id];
      expect(s, p.id).toMatchObject({
        pieceId: p.id,
        grossCents: p.priceCents,
        cardFeeCents: card,
        platformFeeCents: fee,
        materialsCents: p.materialsCents,
        makerShareCents: p.priceCents - card - fee - p.materialsCents,
      });
      expect(s.cardFeeCents + s.platformFeeCents + s.materialsCents + s.makerShareCents, p.id).toBe(s.grossCents);
      expect(s.makerShareCents, p.id).toBeGreaterThan(0);
    }
  });

  it("pc_01's equals figure 1 and ord_001, and its comparison is figure 16's", () => {
    expect(splits.pc_01).toEqual({
      pieceId: "pc_01",
      grossCents: 18000,
      cardFeeCents: 552,
      platformFeeCents: 1800,
      materialsCents: 2200,
      makerShareCents: 13448,
      compare: { channelId: "ch_gallery", commissionBps: 4000, makerShareCents: 8600 },
    });
    const ord = orders.find((o) => o.id === "ord_001");
    expect(ord).toMatchObject({ grossCents: 18000, cardFeeCents: 552, platformFeeCents: 1800, materialsCents: 2200, makerShareCents: 13448 });
    expect(gallerySplits.pc_01).toEqual({ channelId: "ch_gallery", commissionBps: 4000, makerShareCents: 8600 });
  });

  it("only the co-op's twelve carry the gallery comparison, by the contract's commission", () => {
    const withCompare = Object.values(splits).filter((s) => s.compare).map((s) => s.pieceId);
    expect(withCompare).toEqual(pieces.filter((p) => p.communityId === "com_dine").map((p) => p.id));
    for (const id of withCompare) {
      const p = piece(id);
      const share = p.priceCents - halfUp(p.priceCents, galleryContract.commissionBps) - p.materialsCents;
      expect(splits[id].compare, id).toEqual({ channelId: "ch_gallery", commissionBps: galleryContract.commissionBps, makerShareCents: share });
      expect(gallerySplits[id], id).toEqual(splits[id].compare);
    }
    expect(Object.keys(gallerySplits)).toEqual(withCompare);
  });
});

describe("projects and works in progress", () => {
  it("one project per community, in community order, saying plainly what the money pays for", () => {
    expect(projects.map((p) => [p.id, p.communityId])).toEqual(communities.map((c) => [c.projectIds[0], c.id]));
    const titles = ["Looms for two new weavers", "Beads for a beadwork class", "Work tables and drying shelves", "Two sewing machines"];
    expect(projects.map((p) => p.title.en)).toEqual(titles);
    expect(projects.map((p) => p.goalCents)).toEqual([240000, 150000, 180000, 140000]);
    for (const p of projects) {
      expect(p.raisedCents > 0 && p.raisedCents < p.goalCents, p.id).toBe(true);
      expect(p.addOnCents, p.id).toBe(500);
      expect(p.updates.length >= 1 && p.updates.length <= 2, p.id).toBe(true);
      for (const u of p.updates) expect(u.date, p.id).toMatch(/^2026-09-\d\d$/);
      const dollars = `$${(p.goalCents / 100).toLocaleString("en-US")}`;
      expect(p.summary.en, p.id).toContain(dollars);
      expect(p.summary.zh, p.id).toContain(`${(p.goalCents / 100).toLocaleString("en-US")}美元`);
      // R21: no rescue language.
      expect(wordHits(JSON.stringify(p), ["save", "rescue", "dying", "help them", "poverty", "struggling"]), p.id).toEqual([]);
      expect(getById<Project>(p.id), p.id).toBe(p);
    }
  });

  it("three works in progress whose shares sum to 10000 and whose amounts add up to the price", () => {
    expect(worksInProgress.map((w) => [w.id, w.communityId])).toEqual([
      ["wip_01", "com_dine"],
      ["wip_02", "com_ojibwe"],
      ["wip_03", "com_seminole"],
    ]);
    const mls = worksInProgress.flatMap((w) => w.milestones.map((m) => m.milestoneId));
    expect(mls).toEqual(Array.from({ length: mls.length }, (_, i) => `mls_${String(i + 1).padStart(2, "0")}`));
    for (const w of worksInProgress) {
      expect(w.milestones, w.id).toHaveLength(3);
      expect(total(w.milestones.map((m) => m.shareBps)), w.id).toBe(10000);
      expect(total(w.milestones.map((m) => halfUp(w.priceCents, m.shareBps))), w.id).toBe(w.priceCents);
      expect(allMakers.find((m) => m.id === w.makerId)?.communityId, w.id).toBe(w.communityId);
      expect(getById(w.buyerId), w.id).toMatchObject({ role: "buyer" });
      expect(getById<WorkInProgress>(w.id), w.id).toBe(w);
      for (const m of w.milestones) {
        expect(getById(m.milestoneId), m.milestoneId).toMatchObject({ milestoneId: m.milestoneId, shareBps: m.shareBps });
        if (m.status === "paid") expect(m.date, m.milestoneId).toMatch(/^2026-09-\d\d$/);
      }
    }
    const wip01 = worksInProgress[0];
    expect(["mkr_01", "mkr_02", "mkr_03"]).toContain(wip01.makerId);
    expect(wip01.milestones.map((m) => [m.milestoneId, m.status])).toEqual([
      ["mls_01", "paid"],
      ["mls_02", "pending"],
      ["mls_03", "pending"],
    ]);
  });

  it("apr_05 releases wip_01's second milestone: its share of the price, overLimit by v1's rule", () => {
    const wip01 = worksInProgress[0];
    const amount = halfUp(wip01.priceCents, wip01.milestones[1].shareBps);
    expect(approval("apr_05")).toEqual({
      id: "apr_05",
      kind: "milestone_release",
      subjectIds: ["wip_01", "mls_02"],
      proposedBy: "cindy",
      amountCents: amount,
      overLimit: amount > studio.payoutLimitCents,
      decisionDate: "2026-10-01",
      status: "pending",
    });
  });

  it("the add-on contribution and its two money moves match figure 13", () => {
    expect(demoContribution).toEqual({ contributionId: "ctb_01", projectId: "prj_01", amountCents: 500, buyerId: "buy_01", orderId: "ord_001" });
    expect(demoFundMoves).toEqual([
      { moveId: "mv_0101", kind: "project_fund", from: { kind: "buyer", id: "buy_01" }, to: { kind: "cindia" }, amountCents: 500, refId: "ctb_01", date: "2026-09-01" },
      { moveId: "mv_0102", kind: "project_fund", from: { kind: "cindia" }, to: { kind: "community_fund", id: "prj_01" }, amountCents: 500, refId: "ctb_01", date: "2026-09-01" },
    ]);
    expect(projects[0].addOnCents).toBe(demoContribution.amountCents);
  });
});

describe("the new approvals", () => {
  it("apr_03 reports cft_01, apr_04 publishes lst_01 and apr_05 releases a milestone, all pending and Cindy's", () => {
    expect(["apr_03", "apr_04", "apr_05"].map((id) => [approval(id).kind, approval(id).subjectIds])).toEqual([
      ["report_listing", ["cft_01"]],
      ["listing_publish", ["lst_01"]],
      ["milestone_release", ["wip_01", "mls_02"]],
    ]);
    for (const id of ["apr_03", "apr_04", "apr_05"]) {
      expect(approval(id), id).toMatchObject({ id, proposedBy: "cindy", decisionDate: "2026-10-01", status: "pending" });
      for (const s of approval(id).subjectIds) expect(getById(s), `${id} ${s}`).toBeDefined();
    }
    expect(approval("apr_03").amountCents).toBeUndefined();
    expect(approval("apr_04").amountCents).toBeUndefined();
  });
});

describe("storefronts", () => {
  const SLUGS = ["dine-weavers", "ojibwe-beadwork", "acoma-pottery", "seminole-patchwork"];
  const ACCENTS = ["jade", "seal", "amber", "ink"];

  it("four published storefronts with the contracts' IDs and slugs, one per community", () => {
    expect(storefronts.map((s) => [s.id, s.communityId, s.slug])).toEqual(communities.map((c, i) => [c.storefrontId, c.id, SLUGS[i]]));
    for (const s of storefronts) {
      expect(s.status, s.id).toBe("published");
      expect(ACCENTS, s.id).toContain(s.theme.accent);
      expect(["story_first", "grid_first"], s.id).toContain(s.theme.layout);
      expect(s.blocks.length >= 4 && s.blocks.length <= 6, s.id).toBe(true);
      expect(getById<Storefront>(s.id), s.id).toBe(s);
    }
  });

  it("number blocks from blk_01 and give every block its props as strings or string lists", () => {
    const ids = storefronts.flatMap((s) => s.blocks.map((b) => b.blockId));
    expect(ids).toEqual(Array.from({ length: ids.length }, (_, i) => `blk_${String(i + 1).padStart(2, "0")}`));
    const PROPS: Record<string, string[]> = {
      hero: ["tagline"],
      story: ["title", "body"],
      pieces: ["pieceIds"],
      process: ["title", "body"],
      projects: ["projectIds"],
      visit: ["address", "hours"],
    };
    for (const s of storefronts) {
      for (const b of s.blocks) {
        expect(Object.keys(b.props).toSorted(), b.blockId).toEqual(PROPS[b.kind].toSorted());
        for (const v of Object.values(b.props)) expect(typeof v === "string" || (Array.isArray(v) && v.every((x) => typeof x === "string")), b.blockId).toBe(true);
      }
    }
  });

  it("refer only to their own community's pieces and project, and show its about and its region", () => {
    for (const s of storefronts) {
      const c = communities.find((x) => x.id === s.communityId);
      if (!c) throw new Error(s.id);
      const props = (kind: string) => s.blocks.find((b) => b.kind === kind)?.props ?? {};
      const ids = props("pieces").pieceIds as string[];
      expect(ids.length, s.id).toBeGreaterThan(0);
      for (const id of ids) expect(piece(id)?.communityId, `${s.id} ${id}`).toBe(s.communityId);
      expect(props("projects").projectIds, s.id).toEqual(c.projectIds);
      for (const id of props("projects").projectIds as string[]) expect(getById(id), id).toBeDefined();
      expect(props("story").body, s.id).toBe(c.about.en);
      expect(props("visit"), s.id).toEqual({ address: c.place.en, hours: "Visits by arrangement" });
    }
  });

  it("hold no street number, phone number or email, and no slogan word, in any block", () => {
    for (const s of storefronts) {
      const visit = JSON.stringify(s.blocks.find((b) => b.kind === "visit")?.props);
      expect(visit, s.id).not.toMatch(/\d{2,}/);
      expect(visit, s.id).not.toMatch(/@/);
      const tagline = s.blocks.find((b) => b.kind === "hero")?.props.tagline as string;
      expect(wordHits(tagline, [...BAD, "ancestors", "ancestral", "heritage", "soul", "authenticity"]), s.id).toEqual([]);
      const { pieceIds: _p, ...rest } = s.blocks.find((b) => b.kind === "pieces")?.props ?? {};
      expect(Object.keys(rest), s.id).toEqual([]);
      expect(scan(s.blocks, s.id, BAD), s.id).toEqual([]);
    }
  });
});

describe("the listing and the policy", () => {
  it("lst_01 holds Lena T.'s notes in plain English, with no price", () => {
    expect(listings).toEqual([
      {
        id: "lst_01",
        makerId: "mkr_02",
        notes:
          "New small weaving, about 30 by 40 cm. Store-bought wool yarn in red, grey and white, with a zigzag band across the middle. About 20 hours on the loom. Good for someone who likes warm colors.",
        lang: "en",
      },
    ]);
    expect(listings[0].notes).not.toMatch(/\$/);
    expect(getById("lst_01")).toBe(listings[0]);
  });

  it("five policy topics, pol_01 to pol_05, pol_01 with the transit days in its data and its text", () => {
    expect(policy.map((t) => [t.id, t.title.en])).toEqual([
      ["pol_01", "Shipping"],
      ["pol_02", "Returns"],
      ["pol_03", "Care"],
      ["pol_04", "Verification"],
      ["pol_05", "Commissions"],
    ]);
    expect(policy[0].data).toEqual({ transitDaysMin: 6, transitDaysMax: 10 });
    expect(policy[0].body.en).toContain("6 to 10 days");
    expect(policy[3].body.en).toContain("No real check was done for this demo.");
    for (const t of policy) {
      expect(getById(t.id), t.id).toBe(t);
      expect(t.body.en.length > 0 && t.body.zh.length > 0, t.id).toBe(true);
    }
    expect(scan(policy, "policy", BAD)).toEqual([]);
  });
});

describe("the agent roster", () => {
  // contracts section 6: [agentId, kind, model, tools], in order.
  const H = "claude-haiku-5-5";
  const S = "claude-sonnet-5-5";
  const ROSTER: [string, "claude" | "code", string | undefined, string[]][] = [
    ["cindy", "claude", H, ["route"]],
    ["intake", "claude", H, []],
    ["finder", "claude", H, ["cindia_search", "elastic_agent"]],
    ["curator", "claude", S, []],
    ["steward", "claude", S, ["community_page", "verification_record"]],
    ["clerk", "claude", H, ["order_lookup", "policy"]],
    ["writer", "claude", S, []],
    ["lister", "claude", S, []],
    ["describer", "claude", S, ["image"]],
    ["tagger", "claude", H, ["community_page"]],
    ["checker", "claude", S, ["community_page"]],
    ["indexer", "code", undefined, ["embed", "index_write"]],
    ["matcher", "code", undefined, ["b01"]],
    ["explainer", "claude", S, ["b02"]],
    ["bookkeeper", "code", undefined, ["b06", "b10"]],
    ["scorer", "code", undefined, ["b03"]],
    ["scout", "code", undefined, ["apify_crawl"]],
    ["comparer", "code", undefined, ["embed"]],
    ["claims", "claude", H, []],
    ["reporter", "claude", S, []],
    ["designer", "claude", S, ["community_page"]],
  ];

  it("holds the 21 agents of section 6, with their kinds, models and tools", () => {
    expect(agents.map((a) => [a.agentId, a.kind, a.model, a.tools])).toEqual(ROSTER);
    expect(agents.filter((a) => a.kind === "claude")).toHaveLength(15);
    expect(agents.filter((a) => a.kind === "code")).toHaveLength(6);
    for (const a of agents) {
      if (a.kind === "code") expect(a.model, a.agentId).toBeUndefined();
      else expect([H, S], a.agentId).toContain(a.model);
      for (const t of [a.name, a.job, a.never]) expect(t.en.length > 0 && t.zh.length > 0, a.agentId).toBe(true);
      expect(getAgent(a.agentId), a.agentId).toBe(a);
    }
    expect(getAgent("nobody")).toBeUndefined();
    expect(["intake", "finder", "steward"].map((id) => getAgent(id)?.name)).toEqual([
      { en: "Intake", zh: "接待" },
      { en: "Finder", zh: "检索" },
      { en: "Steward", zh: "文化与认证" },
    ]);
    expect(getAgent("steward")?.never.en).toBe("Invent cultural meaning");
    expect(getAgent("designer")?.never.en).toBe("Publish");
    expect(JSON.stringify(agents)).not.toMatch(/opus|fable/i);
  });
});

describe("the copy watch", () => {

  it("lists the sandbox market's four listings, each URL a /market/ page or on an allowed host", () => {
    expect(counterfeitCandidates.map((c) => [c.id, c.url, c.verdict])).toEqual([
      ["cft_01", "/market/listing-01.html", "possible_copy"],
      ["cft_02", "/market/listing-02.html", "claim_only"],
      ["cft_03", "/market/listing-03.html", "neither"],
      ["cft_04", "/market/listing-04.html", "neither"],
    ]);
    for (const c of counterfeitCandidates) {
      const host = c.url.startsWith("/market/") ? "market" : new URL(c.url).hostname;
      expect(host === "market" || contentRules.allowedHosts.includes(host), c.id).toBe(true);
      expect(c.similarity >= 0 && c.similarity <= 1, c.id).toBe(true);
      expect(Number.isInteger(c.similarity * 100), c.id).toBe(true);
      expect(typeof c.seller === "string" && (c.seller ?? "").length > 0, c.id).toBe(true);
      expect(Number.isInteger(c.priceCents) && (c.priceCents ?? 0) > 0, c.id).toBe(true);
      expect(piece(c.pieceId).communityId, c.id).toBe("com_dine");
      expect(getById<CounterfeitCandidate>(c.id), c.id).toBe(c);
    }
    expect(cft("cft_04").similarity).toBeLessThan(0.5);
  });

  it("cft_01 names the co-op and Grace N. and repeats an eight-word run of pc_01's story", () => {
    const c = cft("cft_01");
    expect(c.title).toBe("Grace N. wool weaving, Diné Weaving and Silver Co-op, grey red black");
    expect(c.claim.en).toBe("Says it's woven by Grace N. of the Diné Weaving and Silver Co-op. She didn't list it there.");
    expect(c.pieceId).toBe("pc_01");
    expect(c.similarity).toBe(0.91);
    const story = pc01().story.en.split(/\s+/);
    const runs = story.slice(0, story.length - 7).map((_, i) => story.slice(i, i + 8).join(" "));
    expect(runs.some((r) => c.snippet.includes(r))).toBe(true);
    expect(c.snippet.startsWith(pc01().story.en.slice(0, pc01().story.en.indexOf(". ") + 1))).toBe(true);
  });

  it("cft_02 claims to be Native American made and names no maker and no community", () => {
    const c = cft("cft_02");
    expect(c.title).toBe("Authentic Native American made wool rug, grey and red");
    expect(c.claim).toMatchObject({ en: "Claims to be Native American made. Names no maker." });
    const text = `${c.title} ${c.snippet}`;
    for (const m of allMakers) expect(text, m.id).not.toContain(m.name.en);
    for (const k of communities) expect(text, k.id).not.toContain(k.name.en);
    expect(wordHits(text, ["co-op", "studio", "Grace", "Diné"])).toEqual([]);
  });

  it("cft_03 says plainly it's factory made, and cft_04 is an unrelated blanket", () => {
    expect(cft("cft_03").snippet).toMatch(/factory made, not Native made/i);
    expect(cft("cft_03").similarity).toBe(0.8);
    expect(cft("cft_04").title.toLowerCase()).toContain("blanket");
    expect(cft("cft_04").similarity).toBe(0.3);
  });

  it("scriptedScan's queries are F-watch's three strings, rebuilt from the records", () => {
    const grace = allMakers.find((m) => m.id === "mkr_01");
    const first = pieces.find((p) => p.makerId === "mkr_01") as Piece;
    expect(first.id).toBe("pc_01");
    expect(scriptedScan).toEqual({
      scanId: "wsc_01",
      makerId: "mkr_01",
      queries: [coop().name.en, `${grace?.name.en} ${first.facets.object.en}`, first.story.en.split(/\s+/).slice(0, 8).join(" ")],
      cftIds: ["cft_01"],
      followUpId: "fup_02",
      approvalId: "apr_03",
    });
    expect(scriptedScan.queries).toEqual(["Diné Weaving and Silver Co-op", "Grace N. wall weaving", "A small wool weaving in grey, red and"]);
  });

  it("fup_02 is a calm draft to the market's trust team, with no accusing word and no law", () => {
    const f = getById<FollowUp>("fup_02") as FollowUp;
    expect(f).toMatchObject({ id: "fup_02", approvalId: "apr_03" });
    expect(f.to.en).toMatch(/trust team/i);
    const all = strings(f, "fup_02").map(([, s]) => s).join("\n");
    expect(wordHits(all, contentRules.accusingWords)).toEqual([]);
    expect(wordHits(all, ["copied", "copies", "copying", "law", "Act", "statute", "legal"])).toEqual([]);
    expect(wordHits(all, ["法律", "法规", "法案", "条例", "《"])).toEqual([]);
    expect(f.body.en).toContain("/market/listing-01.html");
    expect(f.body.en).toContain("Grace N.");
    expect(scan(f, "fup_02", BAD)).toEqual([]);
  });

  it("no watch text of Cindia's holds a banned, stereotype or meaning word (the listings' own words aside)", () => {
    const ours = counterfeitCandidates.map(({ title: _t, snippet: _s, claim: _c, ...rest }) => rest);
    expect(scan(ours, "watch", BAD)).toEqual([]);
  });
});

describe("the model", () => {
  it("keeps report null until T9 copies in B11's real report", () => {
    expect(modelId).toBe("cindia-embed-v1");
    const files = Object.values(REPORT_FILES);
    if (report !== null) {
      expect(files).toHaveLength(1);
      expect(JSON.parse(JSON.stringify(report))).toEqual(files[0]);
    } else {
      expect(report).toBeNull();
    }
  });
});

describe("content", () => {
  it("no project, storefront, listing, policy or roster text holds a banned, stereotype or meaning word", () => {
    expect(scan({ projects, worksInProgress, storefronts, listings, policy, agents }, "records", BAD)).toEqual([]);
  });
});
