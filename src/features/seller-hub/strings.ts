// Every string the seller hub shows, English and Chinese side by side (F-seller-hub T0).
// - GLOSSARY holds the domain words from docs/common/glossary.md, word for word.
// - L27 is the on-screen label from the glossary's label table (contracts section 12), word for word.
// - L26 and the planted-test note arrive inside the draft's checks (the payload) and are shown as
//   written, so they are not here.
// - The rest are this feature's own short UI strings (design-system.md, "Words on screen"): plain,
//   first person where Cindy speaks, never claiming certainty she doesn't have.
import type { Text } from "../../core/types";

export type Lang = "en" | "zh";

/** Picks one language from a Text. */
export function t(text: Text, lang: Lang): string {
  return text[lang];
}

/** Fills {name} style holes in one language of a Text. */
export function tf(text: Text, lang: Lang, values: Record<string, string | number>): string {
  return text[lang].replace(/\{(\w+)\}/g, (_, k: string) => (k in values ? String(values[k]) : `{${k}}`));
}

/** Separates the parts of a short line. */
export const SEP = " · ";

// ---------------------------------------------------------------------------------------------
// From the glossary. Keep these word for word.

export const GLOSSARY = {
  sales: { en: "Sales", zh: "销售额" },
  approval: { en: "Needs your approval", zh: "待您批准" },
  flag: { en: "Flag", zh: "异常" },
  counterfeitWatch: { en: "Counterfeit watch", zh: "仿冒监测" },
  possibleCopy: { en: "Possible copy", zh: "疑似仿冒" },
  newListing: { en: "New listing", zh: "新作品上架" },
  keyword: { en: "Keyword", zh: "关键词" },
  ruleBased: { en: "Rule-based", zh: "规则程序" },
  agentSwarm: { en: "Agent swarm", zh: "智能体团队" },
  workInProgress: { en: "Work in progress", zh: "定制进行中" },
  milestone: { en: "Milestone", zh: "阶段" },
  demoData: { en: "Demo data", zh: "演示数据" },
  proposedByCindy: { en: "Cindy proposed this. Only you can approve it.", zh: "Cindy提议，只有您能批准" },
  approved: { en: "Approved", zh: "已批准" },
  declined: { en: "Declined", zh: "未批准" },
  maker: { en: "Maker", zh: "匠人" },
  piece: { en: "Piece", zh: "作品" },
  month: { en: "Month", zh: "本月" },
  askTheMaker: { en: "Ask the maker", zh: "问匠人" },
  inHerOwnWords: { en: "In her own words", zh: "匠人原话" },
  sent: { en: "Sent", zh: "已发送" },
  index: { en: "Index", zh: "索引" },
  searchModel: { en: "Search model", zh: "搜索模型" },
} as const satisfies Record<string, Text>;

/** L27, beside the draft's version in the language the notes weren't written in. */
export const L27: Text = {
  en: "Translated by the Lister agent. The maker hasn't checked this version.",
  zh: "由上架智能体翻译。匠人尚未核对此版本。",
};

// ---------------------------------------------------------------------------------------------
// The overview (T2).

export type TileId = "sales" | "waiting" | "approvals" | "flags" | "hits";

export const OVERVIEW = {
  title: { en: "This month at a glance", zh: "本月一览" },
  intro: {
    en: "September so far, from the records that have arrived. Each tile opens its view.",
    zh: "九月至今的情况，来自已经到达的记录。点开每一格可进入对应页面。",
  },
  tiles: {
    sales: { en: "Sales so far this month", zh: "本月至今销售额" },
    waiting: { en: "Money waiting", zh: "待收款项" },
    approvals: GLOSSARY.approval,
    flags: { en: "Open flags", zh: "未解决的异常" },
    hits: { en: "Possible copies found", zh: "发现的疑似仿冒" },
  } satisfies Record<TileId, Text>,
  salesDetail: { en: "{orders} orders arrived, less refunds ({refunds})", zh: "已到达 {orders} 笔订单，扣除退款（{refunds} 笔）" },
  salesEmpty: { en: "No orders have arrived yet", zh: "还没有订单到达" },
  waitingDetail: { en: "Owed to the co-op and not arrived yet", zh: "应付给合作社、尚未到账" },
  waitingNone: { en: "Nothing owed is missing", zh: "没有缺少的应收款项" },
  approvalsDetail: { en: "Cindy proposes, only you approve", zh: "Cindy提议，只有您能批准" },
  approvalsNone: { en: "Nothing is waiting for you", zh: "没有等待您处理的事项" },
  flagsDetail: { en: "Records that don't add up", zh: "对不上的记录" },
  flagsNone: { en: "No flags so far", zh: "目前没有异常" },
  hitsDetail: GLOSSARY.counterfeitWatch,
  open: {
    sales: { en: "Open the month", zh: "打开本月" },
    waiting: { en: "See the catch", zh: "查看少付款" },
    approvals: { en: "Open approvals", zh: "打开审批" },
    flags: { en: "Open the month", zh: "打开本月" },
    hits: { en: "Open the counterfeit watch", zh: "打开仿冒监测" },
  } satisfies Record<TileId, Text>,
  pendingTitle: { en: "Waiting for you", zh: "等待您处理" },
  pendingNone: { en: "No approvals are waiting.", zh: "没有等待批准的事项。" },
  review: { en: "Review", zh: "查看" },
  latestTitle: { en: "Cindy's latest", zh: "Cindy的最新动态" },
  latestNone: { en: "Cindy hasn't done anything yet this month.", zh: "本月Cindy还没有做任何事。" },
  seconds: { en: "{s} s", zh: "{s} 秒" },
  kinds: {
    follow_up: { en: "Follow-up", zh: "跟进邮件" },
    maker_payouts: { en: "Maker payout", zh: "匠人结算" },
    listing_publish: { en: "New listing", zh: "新作品上架" },
    storefront_publish: { en: "Storefront", zh: "店铺页面" },
    report_listing: { en: "Possible copy", zh: "疑似仿冒" },
    milestone_release: { en: "Milestone", zh: "阶段" },
    support_action: { en: "Help", zh: "客服" },
  } satisfies Record<string, Text>,
} as const;

// ---------------------------------------------------------------------------------------------
// The listing screen (T3, T4, T5).

export const LISTING = {
  title: GLOSSARY.newListing,
  intro: {
    en: "A maker's notes become a listing. Cindy's agents draft it, check it and index it. Only you can publish it.",
    zh: "匠人的笔记变成一件商品。Cindy的智能体起草、核查并索引它。只有您能发布。",
  },
  // The composer
  maker: GLOSSARY.maker,
  notes: { en: "The maker's notes", zh: "匠人的笔记" },
  notesHint: {
    en: "{name} wrote these in their own words. The Checker compares the draft with them.",
    zh: "{name}用自己的话写下这些笔记。核查智能体会拿草稿与之比对。",
  },
  ask: { en: "Draft with Cindy", zh: "让Cindy起草" },
  running: { en: "Cindy's agents are drafting…", zh: "Cindy的智能体正在起草…" },
  sampleNote: {
    en: "Scripted mode drafts only the demo notes. Other notes get a sample draft, labeled as one.",
    zh: "演示模式只为演示笔记起草。其他笔记会得到一份示例草稿，并标为示例。",
  },
  // The steps
  steps: GLOSSARY.agentSwarm,
  stepsIdle: { en: "The agents' steps show here once Cindy starts a draft.", zh: "Cindy开始起草后，智能体的步骤会显示在这里。" },
  starting: { en: "Cindy is starting the team.", zh: "Cindy正在召集团队。" },
  stepKinds: {
    route: { en: "route", zh: "分派" },
    call: { en: "call", zh: "调用" },
    tool: { en: "tool", zh: "工具" },
    result: { en: "result", zh: "结果" },
    check: { en: "check", zh: "核查" },
    handoff: { en: "handoff", zh: "交接" },
    reply: { en: "reply", zh: "回复" },
  } satisfies Record<string, Text>,
  tool: { en: "Tool {name}", zh: "工具 {name}" },
  ms: { en: "{ms} ms", zh: "{ms} 毫秒" },
  // The draft
  draft: { en: "Draft", zh: "草稿" },
  draftIdle: { en: "The draft shows here when the Lister finishes.", zh: "上架智能体完成后，草稿会显示在这里。" },
  draftWaiting: { en: "The Lister is writing the draft.", zh: "上架智能体正在撰写草稿。" },
  english: { en: "English", zh: "英文" },
  chinese: { en: "Chinese", zh: "中文" },
  makerWrote: { en: "The maker's language", zh: "匠人使用的语言" },
  facts: { en: "Facts", zh: "事实" },
  vibe: { en: "Vibe words", zh: "氛围词" },
  facetGroups: {
    object: { en: "Object", zh: "物品" },
    materials: { en: "Materials", zh: "材料" },
    techniques: { en: "Techniques", zh: "技法" },
    motifs: { en: "Motifs", zh: "纹样" },
    colors: { en: "Colors", zh: "颜色" },
    moods: { en: "Moods", zh: "情绪" },
    occasions: { en: "Occasions", zh: "场合" },
    recipients: { en: "Who it's for", zh: "送给谁" },
  } satisfies Record<string, Text>,
  hours: { en: "{n} hours", zh: "{n} 小时" },
  size: { en: "{w} × {h} cm", zh: "{w} × {h} 厘米" },
  noWords: { en: "None proposed", zh: "暂无" },
  checks: { en: "Checks", zh: "核查" },
  checkKinds: {
    protocol: { en: "Protocol", zh: "规定" },
    facts: { en: "Facts", zh: "事实" },
    price: { en: "Price", zh: "价格" },
  } satisfies Record<string, Text>,
  passed: { en: "Passed", zh: "通过" },
  needsReview: { en: "Needs review", zh: "需要复核" },
  // The index line
  indexedDraft: {
    en: "Indexed as a draft: {model}, Cindia's own search model, put it in {index} as {piece}. It moves to the live index, cindia-pieces, only when you approve.",
    zh: "已作为草稿编入索引：Cindia自己的搜索模型 {model} 把它放入 {index}，编号 {piece}。您批准后才进入正式索引 cindia-pieces。",
  },
  indexedLive: {
    en: "Published to search: {model} embedded it into {index}, the live index, as {piece}.",
    zh: "已发布到搜索：{model} 把它嵌入正式索引 {index}，编号 {piece}。",
  },
  passage: { en: "The passage it embedded", zh: "嵌入的段落" },
  dot: { en: "New dot on the search map at ({x}, {y})", zh: "搜索地图上的新点：({x}, {y})" },
  approximate: { en: "approximate", zh: "近似" },
  indexWaiting: { en: "The Indexer embeds the draft once it's written.", zh: "草稿写好后，索引智能体会把它嵌入索引。" },
  // The approve link
  review: { en: "Review Cindy's proposal", zh: "查看Cindy的提议" },
  waitingProposal: { en: "Waiting for Cindy's proposal", zh: "正在等待Cindy的提议" },
  onlyOwner: { en: "Only you can approve publishing.", zh: "只有您能批准发布。" },
  approvedNote: { en: "You approved publishing this listing.", zh: "您已批准发布这件商品。" },
  declinedNote: { en: "You declined publishing this listing.", zh: "您没有批准发布这件商品。" },
} as const;

// ---------------------------------------------------------------------------------------------
// The maker page's side panel (T6).

export const MAKER = {
  pieces: { en: "Pieces", zh: "Pieces" },
  count: { en: "{n} in all", zh: "共 {n} 件" },
  oneOfAKind: { en: "One of a kind", zh: "独一无二" },
  series: { en: "Can be made again", zh: "可以再做" },
  noPieces: { en: "No pieces listed yet.", zh: "还没有上架的作品。" },
  wip: GLOSSARY.workInProgress,
  noWip: { en: "No work in progress.", zh: "暂无定制进行中的作品。" },
  questions: { en: "Questions from buyers", zh: "买家的提问" },
  noQuestions: { en: "No questions from buyers yet.", zh: "还没有买家提问。" },
  buyerAsked: { en: "A buyer asked", zh: "一位买家问" },
  about: { en: "About {piece}", zh: "关于{piece}" },
  forwarded: {
    en: "Cindy forwarded this because the records don't answer it. Your answer goes back to the buyer in your own words.",
    zh: "Cindy转给您，是因为记录里没有答案。您的回答会以您的原话转给买家。",
  },
  replyLabel: { en: "Your answer", zh: "您的回答" },
  replyPlaceholder: { en: "Write your answer in your own words", zh: "用您自己的话写下回答" },
  send: { en: "Send", zh: "发送" },
} as const;
