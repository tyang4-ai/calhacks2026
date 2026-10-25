// The kit's own words, in both languages. Components take every other word from their props.
// I2-kit T1 started this file with the frame words, T2 added L3, L4 and the card words, T3 the
// agent and data view words, and T4 the badge words. L3 and L4 are copied word for word from the
// glossary's on-screen labels.
import type { ProcessStatus } from "../core/events";
import type { Community, CommunityVerification, Lang, MilestoneStatus, Text } from "../core/types";

/** Picks the given language from a Text. */
export function pickText(text: Text, lang: Lang): string {
  return text[lang];
}

/** A process block's status word, shown beside its icon so color never carries the status alone. */
export const STATUS_WORDS: Record<ProcessStatus, Text> = {
  idle: { en: "Idle", zh: "空闲" },
  working: { en: "Working", zh: "运行中" },
  done: { en: "Done", zh: "完成" },
  attention: { en: "Attention", zh: "需处理" },
};

/** The Live mark's word (glossary: live). */
export const LIVE_WORD: Text = { en: "Live", zh: "实时" };

/** The label of a close button, such as the drawer's. */
export const CLOSE_WORD: Text = { en: "Close", zh: "关闭" };

// ---- I2-kit T2: search, cards and verification ----

/** L3 (glossary, on-screen labels): the start of the verification line from a `demo` community. */
export const L3: Text = { en: "Demo verification", zh: "演示认证" };

/** L4 (glossary, on-screen labels): the line under a demo verification. */
export const L4: Text = {
  en: "Demo: this shows how verification would work. No real check was done.",
  zh: "演示：这里展示认证将如何进行。并未做过真实核查。",
};

/** How a maker would be verified, by the data model's method. The Chinese is design drop 3's proposal. */
export const VERIFICATION_METHOD_WORDS: Record<CommunityVerification["method"], Text> = {
  nation_attestation: { en: "Nation attestation", zh: "部族认证" },
};

/** A community's kind, as its glossary word, so a card never shows it as a color alone. */
export const COMMUNITY_KIND_WORDS: Record<Community["kind"], Text> = {
  native_american: { en: "Native American", zh: "美洲原住民" },
};

/** The tag over every piece picture: the pictures are drawings, not photos. */
export const ILLUSTRATION_WORD: Text = { en: "Illustration", zh: "插图" };

/** The tag on any placeholder content. */
export const SAMPLE_WORD: Text = { en: "Sample", zh: "示例" };

/** Separates the parts of a short line, as in "Demo verification · Nation attestation". */
export const DOT_SEPARATOR = " · ";

/** The search bar's own words. */
export const SEARCH_WORDS = {
  submit: { en: "Search", zh: "搜索" },
  /** Glossary: keyword. */
  keywords: { en: "Keywords", zh: "关键词" },
  addKeyword: { en: "Add a keyword", zh: "添加关键词" },
  remove: { en: "Remove", zh: "移除" },
} satisfies Record<string, Text>;

/** "$1,240.00 raised of $5,000.00": the words around the two amounts, in order. */
export const RAISED_OF: Record<Lang, [before: string, between: string, after: string]> = {
  en: ["", " raised of ", ""],
  zh: ["已筹 ", "，目标 ", ""],
};

// ---- I2-kit T3: agents and data views ----

/** Glossary: rule-based. Shown beside a `code` agent's name. */
export const RULE_BASED_WORD: Text = { en: "Rule-based", zh: "规则程序" };

/** Beside a tool node in the agent graph, such as Elastic Agent Builder. */
export const TOOL_WORD: Text = { en: "Tool", zh: "工具" };

/** Over the person's own chat bubbles. */
export const YOU_WORD: Text = { en: "You", zh: "您" };

/** The embedding map's words: the query star, and its label while its position is approximate. */
export const MAP_WORDS = {
  query: { en: "Your request", zh: "您的请求" },
  approximate: { en: "approximate", zh: "近似" },
} satisfies Record<string, Text>;

/** The raw event log's words. */
export const EVENT_LOG_WORDS = {
  title: { en: "Event log", zh: "事件日志" },
  empty: { en: "No events yet", zh: "暂无事件" },
  time: { en: "Time", zh: "时间" },
  type: { en: "Type", zh: "类型" },
  source: { en: "Source", zh: "来源" },
  key: { en: "Key", zh: "键" },
  /** After the seconds on the player clock. */
  seconds: { en: "s", zh: "秒" },
} satisfies Record<string, Text>;

/** The block editor's controls. */
export const BLOCK_WORDS = {
  up: { en: "Move up", zh: "上移" },
  down: { en: "Move down", zh: "下移" },
  edit: { en: "Edit", zh: "编辑" },
} satisfies Record<string, Text>;

// ---- I2-kit T4: badges ----

/** The Badge variants with fixed labels, from the glossary. Each shows both languages. */
export const BADGE_WORDS = {
  simulated: { en: "Simulated", zh: "模拟" },
  live: { en: "Live", zh: "实时" },
  demo: { en: "Demo data", zh: "演示数据" },
  rule: { en: "Rule-based", zh: "规则程序" },
  estimate: { en: "Estimate", zh: "估算" },
} satisfies Record<string, Text>;

/** The tooltips on those badges. */
export const BADGE_TITLES = {
  simulated: { en: "Scripted events, not live data", zh: "脚本事件，并非实时数据" },
  live: { en: "A real service answered in this run", zh: "本次运行中由真实服务作答" },
  demo: { en: "Fictional people and stories", zh: "虚构的人物和故事" },
  rule: { en: "Plain code, not a model", zh: "普通程序，不是模型" },
  estimate: { en: "A number Cindia doesn't measure yet", zh: "Cindia 尚未实际测量的数字" },
} satisfies Record<keyof typeof BADGE_WORDS, Text>;

/** The kit gallery's own words (/dev/kit). Everything it shows inside a component is a sample prop. */
export const GALLERY_WORDS = {
  title: { en: "Cindia UI kit", zh: "Cindia 界面组件" },
  intro: {
    en: "Every kit component in its states. All content here is sample content, not demo data.",
    zh: "每个组件及其各种状态。这里的内容都是示例，不是演示数据。",
  },
  language: { en: "Language", zh: "语言" },
  english: { en: "English", zh: "English" },
  chinese: { en: "中文", zh: "中文" },
  empty: { en: "Empty", zh: "空" },
  loading: { en: "Loading", zh: "加载中" },
  live: { en: "Live", zh: "实时" },
  simulated: { en: "Simulated", zh: "模拟" },
  error: { en: "Error", zh: "出错" },
  demo: { en: "Demo", zh: "演示" },
  notDemo: { en: "Not demo", zh: "非演示" },
  default: { en: "Default", zh: "默认" },
  selected: { en: "Selected", zh: "已选中" },
  removable: { en: "Removable", zh: "可移除" },
  clickable: { en: "Clickable", zh: "可点击" },
  disabled: { en: "Disabled", zh: "不可用" },
  compact: { en: "Compact", zh: "紧凑" },
  attention: { en: "Attention", zh: "需处理" },
  asLink: { en: "Inside a Link", zh: "放在链接里" },
  open: { en: "Open", zh: "打开" },
  openDrawer: { en: "Open the drawer", zh: "打开抽屉" },
  playerAt: { en: "Steps reached", zh: "已到达的步骤" },
  scaled: { en: "Scaled to fit", zh: "缩放显示" },
  states: { en: "States", zh: "状态" },
  tones: { en: "Tones", zh: "色调" },
  sizes: { en: "Sizes", zh: "尺寸" },
} satisfies Record<string, Text>;

/** A milestone's status word, shown beside its knot so color never carries it alone. */
export const MILESTONE_STATUS_WORDS: Record<MilestoneStatus, Text> = {
  pending: { en: "Pending", zh: "待完成" },
  reached: { en: "Reached", zh: "已达成" },
  /** Glossary: paid. */
  paid: { en: "Paid", zh: "已发放" },
};
