// Every string the search screens show, English and Chinese side by side (T0).
// Domain words copy their rows in docs/common/glossary.md word for word, and L28 copies its row in
// the on-screen label table. The rest are the feature's own short UI strings (design-system.md,
// "Words on screen"). Amounts are formatted only by the kit (Money, formatCents), never here, and
// no number in a sentence is typed: each comes from the event that carries it.
import type { SearchEngine, SearchSystem, SurpriseMethod } from "../../core/events";
import type { Lang, ProvenanceSource, Text } from "../../core/types";

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

/** A recall or MRR figure as the screens show it: two places, as the kit's ScoreBar shows it. */
export function figure(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "";
}

// ---------------------------------------------------------------------------------------------
// From the glossary (domain words). Keep these word for word.

export const GLOSSARY = {
  vibeSearch: { en: "Vibe search", zh: "按感觉搜索" },
  keyword: { en: "Keyword", zh: "关键词" },
  whyItMatched: { en: "Why it matched", zh: "匹配原因" },
  surpriseMe: { en: "Surprise me", zh: "给我惊喜" },
  fairRandom: { en: "Fair random", zh: "公平随机" },
  searchModel: { en: "Search model", zh: "搜索模型" },
  live: { en: "Live", zh: "实时" },
  ruleBased: { en: "Rule-based", zh: "规则程序" },
  demoData: { en: "Demo data", zh: "演示数据" },
  community: { en: "Community", zh: "社区" },
  nativeAmerican: { en: "Native American", zh: "美洲原住民" },
  testQueries: { en: "Test queries", zh: "测试查询" },
  index: { en: "Index", zh: "索引" },
  piece: { en: "Piece", zh: "作品" },
} as const satisfies Record<string, Text>;

// ---------------------------------------------------------------------------------------------
// On-screen labels (glossary.md, L28). Word for word, both languages.

/** L28, word for word, as the glossary writes it with 50 queries and 54 pieces. */
export const L28: Text = {
  en: "50 test queries over the same 54 fictional pieces, written separately by our data agent and never used for training. A small test, not a benchmark.",
  zh: "50 条测试查询，覆盖同样的 54 件虚构作品，由我们的数据智能体另行编写，从未用于训练。这是一个小测试，不是基准评测。",
};

/** L28 with its two counts as holes, so the query count comes from the payload and the piece count from `pieces`. */
const L28_TEMPLATE: Text = {
  en: "{queries} test queries over the same {pieces} fictional pieces, written separately by our data agent and never used for training. A small test, not a benchmark.",
  zh: "{queries} 条测试查询，覆盖同样的 {pieces} 件虚构作品，由我们的数据智能体另行编写，从未用于训练。这是一个小测试，不是基准评测。",
};

/** L28 for a given query count and piece count. With 50 and 54 it equals L28 exactly. */
export function l28(lang: Lang, queries: number, pieces: number): string {
  return tf(L28_TEMPLATE, lang, { queries, pieces });
}

// ---------------------------------------------------------------------------------------------
// The home hero (T1).

export const HERO = {
  title: { en: "Describe a feeling", zh: "描述一种感觉" },
  sub: {
    en: "Tell us who it's for and what they love. The search finds pieces that share the feeling.",
    zh: "告诉我们礼物送给谁、对方喜欢什么。搜索会找出带有同样感觉的作品。",
  },
  placeholder: { en: "Describe a feeling, a person or a moment", zh: "描述一种感觉、一个人或一个时刻" },
  examplesLabel: { en: "Try one", zh: "试试这些" },
  /** Beside the chips: code picked them, no model did (C-9). The kit's Rule-based badge carries the word itself. */
  chipsNote: { en: "Keywords Cindia heard", zh: "Cindia 听到的关键词" },
  /** search-working: the latest query has no answer yet. */
  working: { en: "Cindy is searching", zh: "Cindy 正在搜索" },
} as const satisfies Record<string, Text>;

/**
 * The four example vibes (search-example-1 to search-example-4). `text` is what fills the box, in
 * English in both languages, because the catalog's keyword words are English (data-model.md,
 * Reasons). `label` is what the button shows, in the page's language.
 */
export const EXAMPLES: readonly { text: string; label: Text }[] = [
  {
    text: "something calm and earthy for a housewarming",
    label: { en: "something calm and earthy for a housewarming", zh: "乔迁之喜，想要安静、质朴的感觉" },
  },
  {
    text: "a bright, cheerful birthday gift for a sister",
    label: { en: "a bright, cheerful birthday gift for a sister", zh: "送姐妹的生日礼物，明亮又欢快" },
  },
  {
    text: "a quiet blue and white clay jar for myself",
    label: { en: "a quiet blue and white clay jar for myself", zh: "给自己的一只安静的蓝白陶罐" },
  },
  {
    text: "elegant silver and turquoise earrings for my mom",
    label: { en: "elegant silver and turquoise earrings for my mom", zh: "送妈妈的优雅绿松石银耳环" },
  },
];

// ---------------------------------------------------------------------------------------------
// The results page (T2, T3).

export const RESULTS = {
  /** "6 pieces for your words", with {n} from the answer. */
  countMany: { en: "{n} pieces for your words", zh: "符合您描述的 {n} 件作品" },
  countOne: { en: "1 piece for your words", zh: "符合您描述的 1 件作品" },
  sorted: { en: "sorted by how well they match", zh: "按匹配程度排序" },
  /** An answer with no results. Surprise me sits beside the grid. */
  none: {
    en: "No pieces match these keywords. Remove one, or let Surprise me pick a piece.",
    zh: "没有作品符合这些关键词。可以删掉一个关键词，或者让“给我惊喜”帮您挑一件。",
  },
  /** search-no-close, when the answer's closeMatches is false. */
  noClose: { en: "No close matches", zh: "没有很接近的结果" },
  /** Beside each result's ScoreBar (search-closeness-<pieceId>). */
  closeness: { en: "closeness", zh: "接近度" },
  /** search-provenance-note, one line under the grid (A1-17, A2-18). */
  provenanceNote: {
    en: "Each keyword shows who writes that part of a listing in a real launch. In this demo, the Cindia team wrote every part.",
    zh: "每个关键词都标出正式上线后由谁撰写作品信息的这一部分。在本演示中，每一部分都由 Cindia 团队撰写。",
  },
  /** search-working on the results page. */
  working: { en: "Cindy is searching", zh: "Cindy 正在搜索" },
} as const satisfies Record<string, Text>;

/** search-source-<pieceId>-<n>: the part of the listing a matched keyword came from, by its group's provenance. */
export const SOURCE_MARKERS: Record<ProvenanceSource, Text> = {
  maker: { en: "from the maker's notes", zh: "来自匠人的笔记" },
  community: { en: "from the community", zh: "来自社区" },
  "agent:tagger": { en: "suggested by the Tagger", zh: "由标签智能体建议" },
  "agent:describer": { en: "from the picture notes", zh: "来自看图说明" },
};

/** search-engine: the engine that answered, in plain words, as one sentence ending in a period, so a model line after it reads as its own sentence. keyword_scripted is never called our model. */
export const ENGINES: Record<SearchEngine, Text> = {
  keyword_scripted: {
    en: "Answered by a rule-based keyword match, in your browser.",
    zh: "由规则程序的关键词匹配在您的浏览器中作答。",
  },
  local_hybrid: {
    en: "Answered by Cindia's search model with keyword search, on our server.",
    zh: "由 Cindia 的搜索模型结合关键词搜索在我们的服务器上作答。",
  },
  elastic_hybrid: {
    en: "Answered by Cindia's search model with keyword search, in Elastic.",
    zh: "由 Cindia 的搜索模型结合关键词搜索在 Elastic 中作答。",
  },
};

/** After the engine's sentence when the answer carries a modelId: its own short sentence. */
export const ENGINE_MODEL: Text = { en: "Model {modelId}.", zh: "模型 {modelId}。" };

/**
 * search-model-line, inside search-engine, from the store's proof.search_scored only (A1-2, A1-4).
 * Holes: {modelId}, {k}, {queries}, {custom}, {keyword}. Recall figures go through figure().
 */
export const MODEL_LINE = {
  /** The custom row's recall is above the keyword row's. */
  better: {
    en: "Cindia's own model, {modelId}. Recall at {k} on {queries} held-out test queries: {custom} against {keyword} for keyword search.",
    zh: "Cindia 自己的模型 {modelId}。在 {queries} 条留出测试查询上，前 {k} 召回率为 {custom}，关键词搜索为 {keyword}。",
  },
  /** The custom row's recall is below the keyword row's: said plainly. */
  worse: {
    en: "On {queries} held-out test queries, keyword search scored higher than our model {modelId}: recall at {k} of {keyword} against {custom}.",
    zh: "在 {queries} 条留出测试查询上，关键词搜索的得分高于我们的模型 {modelId}：前 {k} 召回率 {keyword}，我们的模型为 {custom}。",
  },
  /** The two rows are equal. */
  same: {
    en: "On {queries} held-out test queries, keyword search and our model {modelId} scored the same: recall at {k} of {keyword}.",
    zh: "在 {queries} 条留出测试查询上，关键词搜索和我们的模型 {modelId} 得分相同：前 {k} 召回率 {keyword}。",
  },
} as const satisfies Record<string, Text>;

export const REFINE = {
  title: { en: "Your request", zh: "您的需求" },
  keywords: { en: "Keywords", zh: "关键词" },
  addKeyword: { en: "Add a keyword", zh: "添加关键词" },
  filters: { en: "Filters", zh: "筛选" },
  maxPrice: { en: "Max price", zh: "最高价格" },
  anyPrice: { en: "Any price", zh: "不限价格" },
  /** "Up to $100.00", the amount from the kit's formatter. */
  upTo: { en: "Up to {price}", zh: "{price} 以内" },
  communities: { en: "Communities", zh: "社区" },
  allCommunities: { en: "All communities", zh: "所有社区" },
} as const satisfies Record<string, Text>;

// ---------------------------------------------------------------------------------------------
// Surprise me (T4).

export const SURPRISE = {
  title: { en: "Surprise me", zh: "给我惊喜" },
  intro: { en: "Draw one piece at random, in one of three ways.", zh: "随机抽取一件作品，有三种方式。" },
  button: { en: "Surprise me", zh: "给我惊喜" },
  keywordPlaceholder: { en: "Type one keyword", zh: "输入一个关键词" },
  /** Names the method on the drawn card: "Drawn by fair random". */
  drawnBy: { en: "Drawn by {method}", zh: "抽取方式：{method}" },
  working: { en: "Cindy is drawing a piece", zh: "Cindy 正在抽取" },
} as const satisfies Record<string, Text>;

/** The mode picker's three choices (search-surprise-mode). Fair random is the glossary's word. */
export const SURPRISE_METHODS: Record<SurpriseMethod, Text> = {
  keyword_random: { en: "Keyword", zh: "关键词" },
  pure_random: { en: "Pure random", zh: "纯随机" },
  fair_random: { en: "Fair random", zh: "公平随机" },
};

/** The method in a sentence, lowercase in English: "Drawn by fair random". */
export const SURPRISE_METHOD_NAMES: Record<SurpriseMethod, Text> = {
  keyword_random: { en: "keyword random", zh: "关键词随机" },
  pure_random: { en: "pure random", zh: "纯随机" },
  fair_random: { en: "fair random", zh: "公平随机" },
};

/** search-surprise-rule: the rule for the method, in one plain line (A1-16, A2-17). */
export const SURPRISE_RULES: Record<SurpriseMethod, Text> = {
  fair_random: {
    en: "Bestseller lists send buyers to the same makers. Fair random leans the other way: makers with fewer sales this month get a bigger chance.",
    zh: "畅销榜总把买家引向同一批匠人。公平随机反其道而行：本月销量较少的匠人被抽中的机会更大。",
  },
  keyword_random: {
    en: "Every piece that matches the keyword has the same chance.",
    zh: "每件匹配该关键词的作品被抽中的机会相同。",
  },
  pure_random: {
    en: "Every piece on Cindia has the same chance.",
    zh: "Cindia 上的每件作品被抽中的机会相同。",
  },
};

// ---------------------------------------------------------------------------------------------
// The featured grid (T5).

export const FEATURED = {
  title: { en: "Featured pieces", zh: "精选作品" },
} as const satisfies Record<string, Text>;

// ---------------------------------------------------------------------------------------------
// The search proof panel on Sell › Proof (T6).

export const PROOF = {
  /** The panel's title is the glossary's "Search model". */
  title: { en: "Search model", zh: "搜索模型" },
  intro: {
    en: "How our search model finds pieces, against keyword search and the untuned base model.",
    zh: "我们的搜索模型找作品的效果，对比关键词搜索和未经微调的基础模型。",
  },
  system: { en: "System", zh: "系统" },
  /** Column head, {k} from the payload. */
  recallAt: { en: "Recall at {k}", zh: "前 {k} 召回率" },
  mrr: { en: "MRR at 10", zh: "前 10 名 MRR" },
  best: { en: "Best", zh: "最佳" },
  /** Under the table's title: {modelId} and {queries} from the payload. */
  scoredOn: { en: "Model {modelId}, scored on {queries} test queries.", zh: "模型 {modelId}，在 {queries} 条测试查询上评分。" },
  /** With model.trained: {baseModel}, {pairs} and {epochs} from that payload. */
  trained: {
    en: "Fine-tuned from {baseModel} on {pairs} training pairs, {epochs} epochs.",
    zh: "基于 {baseModel} 微调，使用 {pairs} 组训练样本，训练 {epochs} 轮。",
  },
  /** search-proof-empty. */
  empty: { en: "Not trained yet", zh: "尚未训练" },
  /** The line under search-proof-empty. No number: nothing has been scored. */
  emptyNote: {
    en: "After the model's first training run, this panel shows how it scores against keyword search and the untuned base model on held-out test queries.",
    zh: "模型完成第一次训练后，这里会显示它在留出测试查询上与关键词搜索、未经微调的基础模型相比的得分。",
  },
} as const satisfies Record<string, Text>;

/** The four systems' names in the proof table (search-proof-row-<system>). */
export const SYSTEMS: Record<SearchSystem, Text> = {
  keyword: { en: "Keyword search", zh: "关键词搜索" },
  base: { en: "Base model, untuned", zh: "基础模型（未微调）" },
  custom: { en: "Cindia's model", zh: "Cindia 的模型" },
  hybrid: { en: "Cindia's model with keywords", zh: "Cindia 模型加关键词" },
};
