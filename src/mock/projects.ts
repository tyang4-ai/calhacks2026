// The four projects (one per community), the three works in progress with their milestones, the
// add-on contribution of figure 13 and the milestone approval apr_05. DEMO DATA: every project and
// commission is fictional, and no money is collected. Project text says what the money pays for and
// how much, plainly, with no rescue language (R21). Amounts in the text come from the cents fields.
import type { Payloads } from "../core/events";
import type { Approval, Milestone, Project, Text, WorkInProgress } from "../core/types";
import { studio } from "./people";
import { bps } from "./util";

/** "$2,400" and "2,400美元" for a whole-dollar amount in project text. */
function dollars(cents: number): Text {
  const whole = String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return { en: `$${whole}`, zh: `${whole}美元` };
}

/** The checkout contribution, the same on every project. */
const ADD_ON_CENTS = 500;

function project(
  id: string,
  communityId: string,
  title: Text,
  goalCents: number,
  raisedCents: number,
  summary: (amount: Text) => Text,
  updates: Project["updates"],
): Project {
  return { id, communityId, title, summary: summary(dollars(goalCents)), goalCents, raisedCents, addOnCents: ADD_ON_CENTS, updates };
}

export const projects: Project[] = [
  project(
    "prj_01",
    "com_dine",
    { en: "Looms for two new weavers", zh: "为两位新织工添置织机" },
    240000,
    96500,
    (d) => ({
      en: `Two upright looms and a year of yarn for two new weavers at the co-op, ${d.en} in all.`,
      zh: `为合作社的两位新织工添置两台立式织机和一年用的毛线，共${d.zh}。`,
    }),
    [
      { date: "2026-09-08", text: { en: "The co-op chose the two looms it plans to buy.", zh: "合作社选好了打算购买的两台织机。" } },
      {
        date: "2026-09-24",
        text: { en: "The two new weavers start on the looms once both are paid for.", zh: "两台织机的款项到位后，两位新织工就开始上机。" },
      },
    ],
  ),
  project(
    "prj_02",
    "com_ojibwe",
    { en: "Beads for a beadwork class", zh: "为串珠课添置珠子" },
    150000,
    61000,
    (d) => ({
      en: `Glass beads, needles and cloth for a ten-week beadwork class at the co-op, ${d.en} in all.`,
      zh: `为合作社为期十周的串珠课添置玻璃珠、针和布料，共${d.zh}。`,
    }),
    [{ date: "2026-09-15", text: { en: "Twelve people signed up for the class's first session.", zh: "第一期课程已有十二人报名。" } }],
  ),
  project(
    "prj_03",
    "com_acoma",
    { en: "Work tables and drying shelves", zh: "工作台和晾坯架" },
    180000,
    128000,
    (d) => ({
      en: `Two work tables and drying shelves for the studio's potters, ${d.en} in all.`,
      zh: `为陶艺坊的陶匠添置两张工作台和几组晾坯架，共${d.zh}。`,
    }),
    [
      { date: "2026-09-10", text: { en: "The drying shelves are measured for the back room.", zh: "已为后屋量好晾坯架的尺寸。" } },
      { date: "2026-09-26", text: { en: "The first work table is ordered.", zh: "第一张工作台已下单。" } },
    ],
  ),
  project(
    "prj_04",
    "com_seminole",
    { en: "Two sewing machines", zh: "两台缝纫机" },
    140000,
    45500,
    (d) => ({
      en: `Two new sewing machines for the co-op's sewing room, ${d.en} in all.`,
      zh: `为合作社的缝纫室添置两台新缝纫机，共${d.zh}。`,
    }),
    [{ date: "2026-09-18", text: { en: "The co-op picked a machine that sews heavy cotton.", zh: "合作社选定了一款能缝厚棉布的缝纫机。" } }],
  ),
];

function milestone(milestoneId: string, label: Text, shareBps: number, status: Milestone["status"], date?: string): Milestone {
  return { milestoneId, label, shareBps, status, ...(date ? { date } : {}) };
}

// Works in progress are paid in stages: Cindia holds a commission's money until the owner approves
// each milestone, then pays the maker that milestone's share of the price. Each commission's shares
// add up to 10000, and each price divides evenly by its shares, so the amounts add up to the price.
// wip_01 starts with mls_01 paid and mls_02 and mls_03 pending (B1-12, D1-15), so Sell › Projects
// can release mls_02.
export const worksInProgress: WorkInProgress[] = [
  {
    id: "wip_01",
    communityId: "com_dine",
    makerId: "mkr_01",
    buyerId: "buy_04",
    title: { en: "Commissioned grey and red wool rug", zh: "定制灰红羊毛地毯" },
    priceCents: 120000,
    milestones: [
      milestone("mls_01", { en: "Design and yarn ready", zh: "图样与毛线备齐" }, 3000, "paid", "2026-09-12"),
      milestone("mls_02", { en: "Half the rug woven", zh: "地毯织完一半" }, 4000, "pending"),
      milestone("mls_03", { en: "Rug finished and shipped", zh: "地毯完成并寄出" }, 3000, "pending"),
    ],
  },
  {
    id: "wip_02",
    communityId: "com_ojibwe",
    makerId: "mkr_05",
    buyerId: "buy_09",
    title: { en: "Commissioned floral beaded pouch", zh: "定制花卉串珠小包" },
    priceCents: 36000,
    milestones: [
      milestone("mls_04", { en: "Design drawn", zh: "图样画好" }, 2500, "paid", "2026-09-09"),
      milestone("mls_05", { en: "Beading done", zh: "缝珠完成" }, 5000, "pending"),
      milestone("mls_06", { en: "Pouch finished and shipped", zh: "小包完成并寄出" }, 2500, "pending"),
    ],
  },
  {
    id: "wip_03",
    communityId: "com_seminole",
    makerId: "mkr_16",
    buyerId: "buy_14",
    title: { en: "Commissioned patchwork jacket", zh: "定制拼布夹克" },
    priceCents: 52000,
    milestones: [
      milestone("mls_07", { en: "Strips cut and bands sewn", zh: "布条裁好并缝成长条" }, 3000, "paid", "2026-09-16"),
      milestone("mls_08", { en: "Rows pieced", zh: "各排拼接完成" }, 4000, "pending"),
      milestone("mls_09", { en: "Jacket finished and shipped", zh: "夹克完成并寄出" }, 3000, "pending"),
    ],
  },
];

/** Figure 13: with ord_001 the buyer adds 500 to prj_01 as ctb_01. */
export const demoContribution: Payloads["project.funded"] = {
  contributionId: "ctb_01",
  projectId: "prj_01",
  amountCents: ADD_ON_CENTS,
  buyerId: "buy_01",
  orderId: "ord_001",
};

/** Cindia passes the full contribution on with no fee: buyer to Cindia, then Cindia to the project's fund. */
export const demoFundMoves: Payloads["money.moved"][] = [
  {
    moveId: "mv_0101",
    kind: "project_fund",
    from: { kind: "buyer", id: demoContribution.buyerId },
    to: { kind: "cindia" },
    amountCents: demoContribution.amountCents,
    refId: demoContribution.contributionId,
    date: "2026-09-01",
  },
  {
    moveId: "mv_0102",
    kind: "project_fund",
    from: { kind: "cindia" },
    to: { kind: "community_fund", id: demoContribution.projectId },
    amountCents: demoContribution.amountCents,
    refId: demoContribution.contributionId,
    date: "2026-09-01",
  },
];

const wip01 = worksInProgress[0];
const mls02 = wip01.milestones[1];

/**
 * Cindy's proposal to release wip_01's second milestone: that milestone's share of the price,
 * over the limit by v1's rule when the single payout is above the co-op's payout limit.
 */
export const apr_05: Approval = {
  id: "apr_05",
  kind: "milestone_release",
  subjectIds: [wip01.id, mls02.milestoneId],
  proposedBy: "cindy",
  amountCents: bps(wip01.priceCents, mls02.shareBps),
  overLimit: bps(wip01.priceCents, mls02.shareBps) > studio.payoutLimitCents,
  decisionDate: "2026-10-01",
  status: "pending",
};
