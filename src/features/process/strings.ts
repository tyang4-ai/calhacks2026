// F-process's words, English and Chinese side by side (T0). Glossary words and the on-screen labels
// L18, L28 and L29 are copied word for word from docs/common/glossary.md. Everything else here is a
// short string the bar and the views need that the glossary lacks.
import type { DataTable, ProcessId, ProcessStatus, SwarmStepKind } from "../../core/events";
import type { ApprovalKind, CopyVerdict, Lang, MatchKind, Text } from "../../core/types";

/** Picks the slot's language from a Text. */
export function t(text: Text, lang: Lang): string {
  return text[lang];
}

// ---- The process bar (contracts section 4, the block labels word for word) ----

export const BLOCK_LABELS: Record<ProcessId, Text> = {
  search: { en: "Vibe search", zh: "按感觉搜索" },
  swarm: { en: "Agent swarm", zh: "智能体团队" },
  checkout: { en: "Checkout", zh: "结账" },
  money: { en: "Money", zh: "资金" },
  reconcile: { en: "Reconcile", zh: "对账" },
  approvals: { en: "Approvals", zh: "审批" },
  close: { en: "Close", zh: "月结" },
  proof: { en: "Proof", zh: "验证" },
  watch: { en: "Counterfeit watch", zh: "仿冒监测" },
  model: { en: "Model", zh: "模型" },
  data: { en: "Data", zh: "数据" },
};

/** "Live: N of 11", the bar's one summary line. */
export function liveSummary(n: number, total: number): Text {
  return { en: `Live: ${n} of ${total}`, zh: `实时：${n}/${total}` };
}

/** "N screens watching", from B13's screens count, live mode only. */
export function screensWatching(n: number): Text {
  return { en: `${n} ${n === 1 ? "screen" : "screens"} watching`, zh: `${n} 个屏幕正在观看` };
}

/** The bar's accessible name. Glossary: process. */
export const BAR_LABEL: Text = { en: "How it works", zh: "运行过程" };

/** The model block's count once a model.trained has arrived. */
export const TRAINED_WORD: Text = { en: "trained", zh: "已训练" };

/** A process status as a plain word, for the data view's process rows. The kit draws the block's own. */
export const STATUS_LABELS: Record<ProcessStatus, Text> = {
  idle: { en: "idle", zh: "空闲" },
  working: { en: "working", zh: "运行中" },
  done: { en: "done", zh: "完成" },
  attention: { en: "attention", zh: "需处理" },
};

// ---- The view frame ----

/** One line under each view's title: what the view shows. */
export const SUBTITLES: Record<ProcessId, Text> = {
  search: {
    en: "Every piece placed by meaning. The star is the request, and the lines go to its top results.",
    zh: "每件作品按含义摆放。星号是请求，连线指向排名最前的结果。",
  },
  swarm: { en: "Which agents answered, in order, and what each one did.", zh: "哪些智能体作答、按什么顺序、各自做了什么。" },
  checkout: { en: "The card becomes a token, then an order. The card is always simulated.", zh: "卡号变成令牌，再变成订单。银行卡始终是模拟的。" },
  money: { en: "Every movement of money in this run, as a thread between two parties.", zh: "本次运行中的每一笔资金流动，画成两方之间的一条线。" },
  reconcile: { en: "The month's records, how they matched, and what didn't add up.", zh: "本月的记录、如何核对，以及对不上的地方。" },
  approvals: { en: "What Cindy proposed, what the co-op manager decided, and what followed.", zh: "Cindy 提议了什么、合作社负责人如何决定、之后发生了什么。" },
  close: { en: "The month's books, from the ledger to the maker's receipt.", zh: "本月账目，从账本到匠人的收据。" },
  proof: { en: "The planted test cases and the search model's score.", zh: "预设的测试用例，以及搜索模型的得分。" },
  watch: { en: "Search the sandbox market, compare, check the claim, propose a report.", zh: "搜索沙盒市场、比对、核查声明、提议举报。" },
  model: { en: "Cindia's own embedding model: how it was trained and how it scores.", zh: "Cindia 自己的嵌入模型：如何训练、得分如何。" },
  data: {
    en: "The database, the search index and the model behind every screen.",
    zh: "每个屏幕背后的数据库、搜索索引和模型。",
  },
};

/** What a view says before its first event (process-empty). */
export const EMPTY: Record<ProcessId, Text> = {
  search: { en: "The map appears after the first search.", zh: "第一次搜索后，这里会出现地图。" },
  swarm: { en: "No agent has run yet. Ask a question to start a run.", zh: "还没有智能体运行。提一个问题即可开始。" },
  checkout: { en: "The flow appears when a buyer checks out.", zh: "买家结账后，这里会出现流程。" },
  money: { en: "No money has moved yet.", zh: "还没有资金流动。" },
  reconcile: { en: "The month hasn't started yet.", zh: "本月还没有开始。" },
  approvals: { en: "Nothing is waiting for the co-op manager yet.", zh: "还没有等待合作社负责人处理的事项。" },
  close: { en: "The month hasn't closed yet.", zh: "本月还没有月结。" },
  proof: { en: "No test has been scored yet.", zh: "还没有测试得分。" },
  watch: { en: "No scan has run yet.", zh: "还没有运行扫描。" },
  model: { en: "Not trained yet", zh: "尚未训练" },
  data: { en: "No events yet.", zh: "暂无事件。" },
};

// ---- Glossary words, word for word ----

export const GLOSSARY = {
  live: { en: "Live", zh: "实时" },
  ruleBased: { en: "Rule-based", zh: "规则程序" },
  agentSwarm: { en: "Agent swarm", zh: "智能体团队" },
  searchModel: { en: "Search model", zh: "搜索模型" },
  flag: { en: "Flag", zh: "异常" },
  approval: { en: "Needs your approval", zh: "待您批准" },
  seal: { en: "Sealed", zh: "已盖章" },
  token: { en: "Card token", zh: "支付令牌" },
  simulated: { en: "Simulated", zh: "模拟" },
  approved: { en: "Approved", zh: "已批准" },
  declined: { en: "Declined", zh: "未批准" },
  sent: { en: "Sent", zh: "已发送" },
  proposedByCindy: { en: "Cindy proposed this. Only you can approve it.", zh: "Cindy提议，只有您能批准" },
  overLimit: { en: "Over your $500 limit", zh: "超过500美元限额" },
  order: { en: "Order", zh: "订单" },
  payout: { en: "Payout", zh: "结款" },
  refund: { en: "Refund", zh: "退款" },
  statement: { en: "Statement", zh: "对账单" },
  bankRecord: { en: "Bank record", zh: "银行流水" },
  match: { en: "Matched", zh: "已核对" },
  bundled: { en: "Bundled payout", zh: "合并结款" },
  refundNetted: { en: "Refund taken out", zh: "退款已抵扣" },
  carriedOver: { en: "Carried to next month", zh: "结转下月" },
  shortPayment: { en: "Short payment", zh: "少付款" },
  trust: { en: "Trust this record", zh: "以此为准" },
  followUp: { en: "Follow-up", zh: "跟进邮件" },
  makerPayout: { en: "Maker payout", zh: "匠人结算" },
  ledger: { en: "Ledger", zh: "账本" },
  close: { en: "Close the month", zh: "月结" },
  workbook: { en: "Excel report", zh: "Excel报表" },
  makerStatement: { en: "This month's income", zh: "本月收入" },
  paidToMaker: { en: "Paid to the maker", zh: "已付给匠人" },
  sales: { en: "Sales", zh: "销售额" },
  fees: { en: "Fees", zh: "费用" },
  makerPay: { en: "Maker pay", zh: "匠人报酬" },
  held: { en: "Held", zh: "暂缓发放" },
  balance: { en: "Balance", zh: "账户余额" },
  makerShare: { en: "Maker share", zh: "匠人所得" },
  materials: { en: "Materials", zh: "材料费" },
  cindiaFee: { en: "Cindia fee", zh: "平台费" },
  cardFee: { en: "Card fee", zh: "刷卡手续费" },
  plantedError: { en: "Test case", zh: "测试用例" },
  index: { en: "Index", zh: "索引" },
  testQueries: { en: "Test queries", zh: "测试查询" },
  textMatch: { en: "Text match", zh: "文本相似度" },
  possibleCopy: { en: "Possible copy", zh: "疑似仿冒" },
  claimOnly: { en: "Claims only", zh: "仅有声明" },
  keyword: { en: "Keyword", zh: "关键词" },
  surpriseMe: { en: "Surprise me", zh: "给我惊喜" },
  fairRandom: { en: "Fair random", zh: "公平随机" },
  milestone: { en: "Milestone", zh: "阶段" },
  project: { en: "Community project", zh: "社区项目" },
  newListing: { en: "New listing", zh: "新作品上架" },
  paid: { en: "Paid", zh: "已发放" },
} satisfies Record<string, Text>;

// ---- On-screen labels, word for word from glossary.md ----

/** L18, in the swarm view (process-swarm-shared), live mode. */
export const L18: Text = {
  en: "Live steps are shared with every open screen in this demo.",
  zh: "本演示中，实时步骤会同步给所有打开的屏幕。",
};

/** L28, under the model card's score table (process-model-test-note). */
export const L28: Text = {
  en: "50 test queries over the same 54 fictional pieces, written separately by our data agent and never used for training. A small test, not a benchmark.",
  zh: "50 条测试查询，覆盖同样的 54 件虚构作品，由我们的数据智能体另行编写，从未用于训练。这是一个小测试，不是基准评测。",
};

/** L29, in the money view (process-money-sandbox). */
export const L29: Text = {
  en: "Live means a real service answered in this run. Nessie is a sandbox bank, so no real money moved.",
  zh: "“实时”表示本次运行中由真实服务作答。Nessie 是沙盒银行，没有真实资金流动。",
};

// ---- Search (T2) ----

export const SEARCH = {
  notTrained: { en: "Not trained yet. The map appears once the search model is trained.", zh: "尚未训练。搜索模型训练好后，这里会出现地图。" },
  scoresTitle: { en: "Top results, their scores and matched keywords", zh: "排名最前的结果、得分和匹配的关键词" },
  scoresWaiting: { en: "The results appear after the first search.", zh: "第一次搜索后，这里会出现结果。" },
  engine: { en: "Engine", zh: "引擎" },
  model: { en: "Model", zh: "模型" },
  notTrainedShort: { en: "Not trained yet", zh: "尚未训练" },
  mapNote: { en: "Ringed marks are the top results. The star is the request.", zh: "带圈的标记是排名最前的结果，星号是请求。" },
  surpriseTitle: { en: "Surprise me: each candidate's chance", zh: "给我惊喜：每个候选的概率" },
  drawn: { en: "Drawn", zh: "抽中" },
  seed: { en: "seed", zh: "种子" },
} satisfies Record<string, Text>;

export const ENGINE_LABELS: Record<"elastic_hybrid" | "local_hybrid" | "keyword_scripted", Text> = {
  elastic_hybrid: { en: "Elastic hybrid search", zh: "Elastic 混合搜索" },
  local_hybrid: { en: "Local hybrid search", zh: "本地混合搜索" },
  keyword_scripted: { en: "Keyword search, scripted", zh: "关键词搜索（脚本）" },
};

export const SURPRISE_METHOD_LABELS: Record<"keyword_random" | "pure_random" | "fair_random", Text> = {
  keyword_random: { en: "Keyword random", zh: "关键词随机" },
  pure_random: { en: "Pure random", zh: "完全随机" },
  fair_random: { en: "Fair random", zh: "公平随机" },
};

// ---- Swarm (T3) ----

export const SWARM = {
  steps: { en: "Steps", zh: "步骤" },
  run: { en: "Run", zh: "运行" },
  pickRun: { en: "Choose a run", zh: "选择一次运行" },
  noRun: { en: "No run yet", zh: "暂无运行" },
  running: { en: "running", zh: "进行中" },
  finished: { en: "finished", zh: "已完成" },
  graphNote: { en: "Lit: the latest step. The numbers are the steps each agent took.", zh: "高亮：最新一步。数字是每个智能体执行的步骤。" },
  noModel: { en: "no model", zh: "无模型" },
  stepsWord: { en: "steps", zh: "步" },
} satisfies Record<string, Text>;

/** The Elastic Agent Builder tool, named in the step row and drawn as a tool node beside the Finder (C-3). */
export const ELASTIC_AGENT_TOOL: Text = { en: "Elastic Agent Builder", zh: "Elastic Agent Builder" };

export const STEP_KIND_LABELS: Record<SwarmStepKind, Text> = {
  route: { en: "route", zh: "分派" },
  call: { en: "call", zh: "调用" },
  tool: { en: "tool", zh: "工具" },
  result: { en: "result", zh: "结果" },
  check: { en: "check", zh: "核查" },
  handoff: { en: "handoff", zh: "转交" },
  reply: { en: "reply", zh: "回复" },
};

// ---- Checkout and money (T4) ----

export const CHECKOUT = {
  card: { en: "Card", zh: "银行卡" },
  cardSimulated: { en: "Simulated card", zh: "模拟银行卡" },
  orderWord: { en: "Order", zh: "订单" },
  waiting: { en: "waiting", zh: "等待中" },
  split: { en: "Where the money goes", zh: "钱去哪儿了" },
  addOn: { en: "Added to a community project", zh: "加入社区项目" },
  stored: { en: "What Cindia keeps", zh: "Cindia 保存的内容" },
  never: { en: "What Cindia never keeps", zh: "Cindia 从不保存的内容" },
} satisfies Record<string, Text>;

/** process-checkout-stored, in order. */
export const STORED_ITEMS: Text[] = [
  { en: "The card token", zh: "支付令牌" },
  { en: "The card brand", zh: "卡组织品牌" },
  { en: "The last four digits", zh: "卡号后四位" },
  { en: "The order", zh: "订单" },
];

/** process-checkout-never, in order. */
export const NEVER_ITEMS: Text[] = [
  { en: "The card number", zh: "完整卡号" },
  { en: "The security code", zh: "安全码" },
];

export const MONEY = {
  moves: { en: "Moves", zh: "资金流动" },
  noBalance: { en: "No balance synced yet.", zh: "还没有同步余额。" },
  asOf: { en: "as of", zh: "截至" },
} satisfies Record<string, Text>;

export const PARTY_LABELS: Record<
  "buyer" | "cindia" | "card_network" | "studio" | "maker" | "gallery" | "processor" | "supplier" | "community_fund",
  Text
> = {
  buyer: { en: "Buyer", zh: "买家" },
  cindia: { en: "Cindia", zh: "Cindia" },
  card_network: { en: "Card network", zh: "卡组织" },
  studio: { en: "Co-op", zh: "合作社" },
  maker: { en: "Maker", zh: "匠人" },
  gallery: { en: "Gallery", zh: "画廊" },
  processor: { en: "Card processor", zh: "收单机构" },
  supplier: { en: "Supplier", zh: "供应商" },
  community_fund: { en: "Community fund", zh: "社区基金" },
};

export const MOVE_KIND_LABELS: Record<
  "sale" | "fee" | "settlement" | "payout_in" | "materials" | "maker_pay" | "refund" | "project_fund" | "milestone",
  Text
> = {
  sale: { en: "sale", zh: "销售" },
  fee: { en: "fee", zh: "费用" },
  settlement: { en: "settlement", zh: "结算" },
  payout_in: { en: "payout in", zh: "结款到账" },
  materials: { en: "materials", zh: "材料费" },
  maker_pay: { en: "maker pay", zh: "匠人报酬" },
  refund: { en: "refund", zh: "退款" },
  project_fund: { en: "project fund", zh: "项目资金" },
  milestone: { en: "milestone", zh: "阶段款" },
};

// ---- Reconcile, approvals and close (T5) ----

export const BOOKS = {
  records: { en: "Records arrived", zh: "已到达的记录" },
  matches: { en: "Matches", zh: "核对结果" },
  expected: { en: "Expected", zh: "应付" },
  paidAmount: { en: "Paid", zh: "实付" },
  short: { en: "Short", zh: "少付" },
  noTrustYet: { en: "Cindy is still checking which record to trust.", zh: "Cindy 仍在核查以哪条记录为准。" },
  status: { en: "Status", zh: "状态" },
  followed: { en: "What followed", zh: "后续" },
  nothingYet: { en: "Nothing yet", zh: "暂无" },
  entries: { en: "entries", zh: "条" },
  sheets: { en: "sheets", zh: "张表" },
  statements: { en: "statements", zh: "份" },
  waiting: { en: "waiting", zh: "等待中" },
  milestonePaid: { en: "Milestone paid", zh: "阶段款已发放" },
} satisfies Record<string, Text>;

export const RECORD_TYPE_LABELS: Record<"order" | "payout" | "refund" | "statement" | "bank_txn", Text> = {
  order: GLOSSARY.order,
  payout: GLOSSARY.payout,
  refund: GLOSSARY.refund,
  statement: GLOSSARY.statement,
  bank_txn: GLOSSARY.bankRecord,
};

export const MATCH_KIND_LABELS: Record<MatchKind, Text> = {
  one_to_one: GLOSSARY.match,
  bundled: GLOSSARY.bundled,
  refund_netted: GLOSSARY.refundNetted,
  carried_over: GLOSSARY.carriedOver,
};

/** What Cindy proposed, by approval kind. */
export const APPROVAL_KIND_LABELS: Record<ApprovalKind, Text> = {
  follow_up: { en: "Send the follow-up", zh: "发送跟进邮件" },
  maker_payouts: { en: "Pay the makers", zh: "向匠人结算" },
  listing_publish: { en: "Publish a new listing", zh: "发布新作品" },
  storefront_publish: { en: "Publish the storefront", zh: "发布店铺页面" },
  report_listing: { en: "Report a listing", zh: "举报一件商品" },
  milestone_release: { en: "Release a milestone payment", zh: "发放阶段款" },
  support_action: { en: "Act on a support request", zh: "处理客服请求" },
};

export const APPROVAL_STATUS_LABELS: Record<"pending" | "granted" | "declined", Text> = {
  pending: GLOSSARY.approval,
  granted: GLOSSARY.approved,
  declined: GLOSSARY.declined,
};

// ---- Proof, watch and model (T6) ----

export const PROOF = {
  caught: { en: "Caught", zh: "已识别" },
  missed: { en: "Missed", zh: "未识别" },
  searchTitle: { en: "The search model's score", zh: "搜索模型得分" },
  system: { en: "System", zh: "系统" },
  recall: { en: "Recall@5", zh: "召回率@5" },
  mrr: { en: "MRR@10", zh: "MRR@10" },
  notTrained: { en: "Not trained yet", zh: "尚未训练" },
  errorsTitle: { en: "Planted test cases", zh: "预设测试用例" },
} satisfies Record<string, Text>;

export function caughtOf(caught: number, total: number): Text {
  return { en: `Caught ${caught} of ${total}`, zh: `识别${caught}/${total}` };
}

export const PLANTED_KIND_LABELS: Record<"short_payment" | "bundled" | "refund_netted" | "carried_over", Text> = {
  short_payment: GLOSSARY.shortPayment,
  bundled: GLOSSARY.bundled,
  refund_netted: GLOSSARY.refundNetted,
  carried_over: GLOSSARY.carriedOver,
};

export const SYSTEM_LABELS: Record<"keyword" | "base" | "custom" | "hybrid", Text> = {
  keyword: { en: "Keyword", zh: "关键词" },
  base: { en: "Base model", zh: "基础模型" },
  custom: { en: "Our model", zh: "我们的模型" },
  hybrid: { en: "Hybrid", zh: "混合" },
};

export const WATCH = {
  search: { en: "Search", zh: "搜索" },
  compare: { en: "Compare", zh: "比对" },
  checkClaim: { en: "Check the claim", zh: "核查声明" },
  propose: { en: "Propose a report", zh: "提议举报" },
  queries: { en: "queries", zh: "条查询" },
  results: { en: "results checked", zh: "条结果已核查" },
  resultsTitle: { en: "Every result the scan checked", zh: "本次扫描核查过的每条结果" },
  noHit: { en: "No possible copy found.", zh: "没有发现疑似仿冒。" },
  noResults: { en: "The results appear after the scan.", zh: "扫描后，这里会出现结果。" },
  notScored: { en: "not scored", zh: "未评分" },
  waiting: { en: "waiting", zh: "等待中" },
} satisfies Record<string, Text>;

export const ENGINE_WATCH_LABELS: Record<"apify" | "scripted", Text> = {
  apify: { en: "Apify crawl", zh: "Apify 抓取" },
  scripted: { en: "Scripted scan", zh: "脚本扫描" },
};

export const VERDICT_LABELS: Record<CopyVerdict, Text> = {
  possible_copy: GLOSSARY.possibleCopy,
  claim_only: GLOSSARY.claimOnly,
  neither: { en: "Neither", zh: "两者都不是" },
};

export const MODEL = {
  baseModel: { en: "Base model", zh: "基础模型" },
  pairs: { en: "Training pairs", zh: "训练样本对" },
  epochs: { en: "Epochs", zh: "训练轮数" },
  dims: { en: "Dimensions", zh: "维度" },
  card: { en: "Model card", zh: "模型卡片" },
  willShow: {
    en: "Once trained, this card shows the base model, the training pairs, the epochs, the dimensions and the score on the test queries.",
    zh: "训练完成后，这张卡片会显示基础模型、训练样本对、训练轮数、维度，以及在测试查询上的得分。",
  },
  trained: { en: "Trained", zh: "已训练" },
} satisfies Record<string, Text>;

// ---- Data (T7) ----

/** The eight tables' names, shown beside their database names. */
export const TABLE_LABELS: Record<DataTable, Text> = {
  catalog: { en: "Catalog", zh: "作品目录" },
  listings: { en: "Listings", zh: "上架" },
  orders: { en: "Orders", zh: "订单" },
  approvals: { en: "Approvals", zh: "审批" },
  runs: { en: "Swarm runs", zh: "智能体运行" },
  steps: { en: "Swarm steps", zh: "智能体步骤" },
  processes: { en: "Process status", zh: "流程状态" },
  screens: { en: "Screens", zh: "屏幕" },
};

export const DATA = {
  database: { en: "SpacetimeDB · cindia", zh: "SpacetimeDB · cindia" },
  databaseNote: { en: "8 tables, private, on this machine", zh: "8 张表，私有，位于本机" },
  scriptedNote: {
    en: "Scripted: counted from the mock data and this screen's events, never typed.",
    zh: "脚本模式：由模拟数据和本屏事件计算得出，从不手写。",
  },
  elastic: { en: "Search index", zh: "搜索索引" },
  piecesNote: { en: "Every catalog piece, plus each approved listing.", zh: "每件目录作品，加上每个已批准的上架作品。" },
  draftsNote: { en: "Drafts the Indexer embedded, waiting for the co-op manager's approval.", zh: "索引程序嵌入的草稿，等待合作社负责人批准。" },
  docs: { en: "docs", zh: "条" },
  newest: { en: "Newest", zh: "最新" },
  embedded: { en: "embedded with", zh: "嵌入模型" },
  thisScreen: { en: "this screen", zh: "本屏幕" },
  none: { en: "none yet", zh: "暂无" },
  notTrained: { en: "Not trained yet", zh: "尚未训练" },
  trained: { en: "trained", zh: "已训练" },
  dims: { en: "dimensions", zh: "维" },
  tableCol: { en: "Table", zh: "表" },
  rowsCol: { en: "Rows", zh: "行数" },
  newestCol: { en: "Newest rows", zh: "最新的行" },
  modelNote: {
    en: "Cindia's own embedding model. It turns every catalog piece and each new listing into a vector for search.",
    zh: "Cindia 自己的嵌入模型，把每件目录作品和每个新上架的作品变成用于搜索的向量。",
  },
} satisfies Record<string, Text>;

/** A listing's state in the listings table. */
export const LISTING_STATE_LABELS: Record<"requested" | "drafted" | "indexed" | "approved", Text> = {
  requested: { en: "requested", zh: "已提交" },
  drafted: { en: "drafted", zh: "已起草" },
  indexed: { en: "indexed", zh: "已索引" },
  approved: { en: "approved", zh: "已批准" },
};

/** An approval's status as a short word in the approvals table. */
export const APPROVAL_STATUS_WORDS: Record<"pending" | "granted" | "declined", Text> = {
  pending: { en: "pending", zh: "待批准" },
  granted: { en: "approved", zh: "已批准" },
  declined: { en: "declined", zh: "未批准" },
};

// ---- The event log ----

export const LOG_TITLE: Text = { en: "Event log, newest last", zh: "事件日志，最新在后" };
