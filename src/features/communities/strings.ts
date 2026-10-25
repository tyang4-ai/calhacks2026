// Every string the communities screens show, English and Chinese side by side (T0).
// - GLOSSARY copies its rows in docs/common/glossary.md (domain words) word for word.
// - L7, L8 and L9 copy the on-screen label table word for word. L4 is the kit's (VerificationLine
//   prints it with `demo`), so it isn't repeated here.
// - Gordon checks the Chinese of L8 and L9 himself (A2, glossary on-screen labels): marked below.
// - UI holds the feature's own short strings (design-system.md, "Words on screen").
// Amounts are formatted only by the kit (Money), never here: a `{amount}` hole marks where the
// screen puts a Money component. No number in a sentence is typed in.
import type { Lang, Text } from "../../core/types";

export type { Lang };

/** Picks one language from a Text. */
export function t(text: Text, lang: Lang): string {
  return text[lang];
}

/** Fills `{name}` holes in a string. A hole with no value stays as it is. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (hole, name: string) => (name in values ? String(values[name]) : hole));
}

/** Picks a language, then fills the holes. */
export function tf(text: Text, lang: Lang, values: Record<string, string | number>): string {
  return fill(text[lang], values);
}

/** Separates the parts of a short line, as the kit's cards do. */
export const SEP = " · ";

/** Splits a string at one `{hole}`, so a screen can put a component (such as Money) in its place. */
export function around(text: string, hole: string): [before: string, after: string] {
  const mark = `{${hole}}`;
  const i = text.indexOf(mark);
  return i < 0 ? [text, ""] : [text.slice(0, i), text.slice(i + mark.length)];
}

// ---------------------------------------------------------------------------------------------
// From the glossary (domain words). Keep these word for word.

export const GLOSSARY = {
  community: { en: "Community", zh: "社区" },
  /** The communities' kind label (`kind: "native_american"`). */
  nativeAmerican: { en: "Native American", zh: "美洲原住民" },
  demoData: { en: "Demo data", zh: "演示数据" },
  verification: { en: "How makers would be verified", zh: "匠人认证方式" },
  project: { en: "Community project", zh: "社区项目" },
  wip: { en: "Work in progress", zh: "定制进行中" },
  milestone: { en: "Milestone", zh: "阶段" },
  storefront: { en: "Storefront", zh: "店铺页面" },
  approval: { en: "Needs your approval", zh: "待您批准" },
  approved: { en: "Approved", zh: "已批准" },
  declined: { en: "Declined", zh: "未批准" },
  paid: { en: "Paid", zh: "已发放" },
  maker: { en: "Maker", zh: "匠人" },
  /** A community's lead (`role: "owner"`). */
  owner: { en: "Co-op manager", zh: "合作社负责人" },
  piece: { en: "Piece", zh: "作品" },
  order: { en: "Order", zh: "订单" },
  communityFund: { en: "Community fund", zh: "社区基金" },
  cindy: { en: "Cindy", zh: "Cindy" },
  /** The glossary's `protocols` row. On screen the title is L9's first sentence (L9_TITLE). */
  protocols: { en: "Kept out of this demo", zh: "本演示未收录" },
} as const satisfies Record<string, Text>;

// ---------------------------------------------------------------------------------------------
// On-screen labels (glossary.md, L7 to L9). Word for word, both languages.

/** L7: beside every project-fund-<projectId>, before the click. */
export const L7: Text = {
  en: "Demo project. No money is collected.",
  zh: "演示项目。不会收取任何款项。",
};

/** L8: under the about box (communities-about-note). Gordon checks this Chinese himself (A2). */
export const L8: Text = {
  en: "Placeholder written by the Cindia team. In a real launch, the community writes this page.",
  zh: "由 Cindia 团队撰写的占位内容。正式上线后，由社区自己撰写此页面。",
};

/** L9, whole. Gordon checks this Chinese himself (A2). */
export const L9: Text = {
  en: "Kept out of this demo. In a real launch, the community sets these rules. For this demo, the Cindia team left these out.",
  zh: "本演示未收录。正式上线后，由社区制定这些规则。本演示中，这些内容由 Cindia 团队排除在外。",
};

/** L9's first sentence: the protocols' title (community-protocols). */
export const L9_TITLE: Text = { en: "Kept out of this demo.", zh: "本演示未收录。" };

/** The rest of L9: the line under the title (communities-protocols-note). */
export const L9_NOTE: Text = {
  en: "In a real launch, the community sets these rules. For this demo, the Cindia team left these out.",
  zh: "正式上线后，由社区制定这些规则。本演示中，这些内容由 Cindia 团队排除在外。",
};

// ---------------------------------------------------------------------------------------------
// The feature's own short strings.

export const UI = {
  // The strip on Shop home (T1)
  stripTitle: { en: "Communities on Cindia", zh: "Cindia 上的社区" },
  allProjects: { en: "See every community project", zh: "查看全部社区项目" },

  // The community page (T2)
  about: { en: "About", zh: "简介" },
  makers: { en: "Makers", zh: "匠人" },
  pieceCount: { en: "{n} pieces", zh: "{n} 件作品" },
  pieceCountOne: { en: "1 piece", zh: "1 件作品" },
  piecesFrom: { en: "Pieces", zh: "作品" },
  seeStorefront: { en: "See the storefront", zh: "查看店铺页面" },
  otherCommunities: { en: "Other communities on Cindia", zh: "Cindia 上的其他社区" },
  openProject: { en: "See the project", zh: "查看项目" },
  notFound: { en: "We couldn't find this community.", zh: "找不到这个社区。" },
  backToShop: { en: "Back to Shop", zh: "返回商店" },
  nativeName: { en: "Name given by the community", zh: "社区提供的名字" },

  // Projects and funding (T3)
  projectsTitle: { en: "Community projects", zh: "社区项目" },
  wipsTitle: { en: "Works in progress", zh: "定制进行中" },
  pickAmount: { en: "Pick an amount", zh: "选择金额" },
  fund: { en: "Fund this project", zh: "资助这个项目" },
  thanks: {
    en: "Thank you. {amount} is added to this project's progress. This is a demo, so no real money moved.",
    zh: "谢谢。{amount} 已计入这个项目的进度。这是演示，没有真实资金流动。",
  },
  updates: { en: "Updates", zh: "最新进展" },
  backToProjects: { en: "All projects and works in progress", zh: "全部项目与定制" },
  projectNotFound: { en: "We couldn't find this project.", zh: "找不到这个项目。" },
  fromCommunity: { en: "From {name}", zh: "来自{name}" },

  // A work in progress (T4)
  commissionBy: { en: "Made by {name}", zh: "制作：{name}" },
  price: { en: "Price", zh: "价格" },
  paidInStages: {
    en: "Paid in stages. Cindia holds the price and pays the maker each milestone's share once the co-op approves it.",
    zh: "分阶段付款。Cindia 先代管价款，合作社批准每个阶段后，再把该阶段的份额付给匠人。",
  },
  waiting: { en: "Waiting for the co-op's approval", zh: "等待合作社批准" },
  release: { en: "Request release", zh: "申请发放" },
  openWip: { en: "See this work in progress", zh: "查看这件定制" },

  // Sell › Projects (T5)
  sellTitle: { en: "Community projects and works in progress", zh: "社区项目与定制进行中" },
  contributions: { en: "Contributions in this run", zh: "本次演示中的捐助" },
  noContributions: { en: "No contributions in this run yet.", zh: "本次演示中还没有捐助。" },
  contribution: { en: "Contribution", zh: "捐助" },
  amount: { en: "Amount", zh: "金额" },
  noOrder: { en: "On its own", zh: "单独捐助" },
  cindyIdle: {
    en: "When a milestone is done, I propose releasing its share. Only you can approve it.",
    zh: "阶段完成后，我会提议发放该阶段的款项。只有您能批准。",
  },
} as const satisfies Record<string, Text>;
