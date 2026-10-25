// Every string the counterfeit watch shows, English and Chinese side by side (F-watch T0).
// - GLOSSARY holds the domain words from docs/common/glossary.md, word for word.
// - L19 to L23 are the on-screen labels from the glossary's label table, word for word. L19 carries
//   its number as {score}, and L19_EXAMPLE_SCORE fills it back to the glossary's own wording.
// - The rest are this feature's own short UI strings (design-system.md, "Words on screen"): plain,
//   calm, never accusing anyone, and never claiming more than the scan checked.
// A found listing's title, URL and snippet are never translated: they show as found.
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

/** Fills {name} holes in both languages. */
export function fill(text: Text, values: Record<string, string | number>): Text {
  return { en: tf(text, "en", values), zh: tf(text, "zh", values) };
}

/** Separates the parts of a short line. */
export const SEP = " · ";

// ---------------------------------------------------------------------------------------------
// From the glossary. Keep these word for word.

export const GLOSSARY = {
  counterfeitWatch: { en: "Counterfeit watch", zh: "仿冒监测" },
  textMatch: { en: "Text match", zh: "文本相似度" },
  possibleCopy: { en: "Possible copy", zh: "疑似仿冒" },
  claimOnly: { en: "Claims only", zh: "仅有声明" },
  sandboxMarket: { en: "Sandbox market", zh: "沙盒市场" },
  maker: { en: "Maker", zh: "匠人" },
  piece: { en: "Piece", zh: "作品" },
  approval: { en: "Needs your approval", zh: "待您批准" },
  proposedByCindy: { en: "Cindy proposed this. Only you can approve it.", zh: "Cindy提议，只有您能批准" },
  approved: { en: "Approved", zh: "已批准" },
  declined: { en: "Declined", zh: "未批准" },
  demoData: { en: "Demo data", zh: "演示数据" },
  live: { en: "Live", zh: "实时" },
} as const satisfies Record<string, Text>;

// ---------------------------------------------------------------------------------------------
// On-screen labels L19 to L23 (glossary.md, On-screen labels). Keep these word for word.

/** L19's number in the glossary's own wording, until the model's first run. */
export const L19_EXAMPLE_SCORE = "0.91";

/** L19's first sentence, the similarity label, with the payload's number to two places as {score}. */
export const L19_LABEL: Text = { en: "Text match {score}.", zh: "文本相似度 {score}。" };

/** L19's last two sentences, the similarity hint. */
export const L19_HINT: Text = {
  en: "How close the listing's title and snippet are to this piece's description. Not a picture match.",
  zh: "表示该商品的标题和摘要与这件作品描述的接近程度。不是图片比对。",
};

/** L19 whole, with {score}: the label, a space in English, then the hint. */
export const L19: Text = {
  en: `${L19_LABEL.en} ${L19_HINT.en}`,
  zh: `${L19_LABEL.zh}${L19_HINT.zh}`,
};

/** L20, after the fairness line. */
export const L20: Text = {
  en: "Not verified by Cindia. That alone doesn't make it fake.",
  zh: "未经 Cindia 认证。仅凭这一点不能说明它是假货。",
};

/** L21, on each live hit. */
export const L21: Text = {
  en: "Found on the sandbox market just now. Not checked by a person.",
  zh: "刚刚在沙盒市场上发现。尚未经人工核查。",
};

/** L22, on a claim-only result, which has no report button. */
export const L22: Text = {
  en: "Claims to be Native-made. We can't check that.",
  zh: "声称是美洲原住民手作。我们无法核实。",
};

/** L23, the dismiss button beside the report button. */
export const L23: Text = {
  en: "Looks fine, dismiss",
  zh: "看起来没问题，忽略",
};

// ---------------------------------------------------------------------------------------------
// This feature's own words.

/** The panel's head. */
export const VIEW = {
  intro: {
    en: "Cindy checks a sandbox market of fictional shops for listings that name the co-op or its makers, or repeat a piece's story.",
    zh: "Cindy 会在由虚构店铺组成的沙盒市场里，查找提到合作社或其匠人、或重复作品故事的商品。",
  },
} as const satisfies Record<string, Text>;

/** The scan bar: the maker picker, the queries, Scan now, the status and the engine. */
export const SCAN = {
  makerLabel: GLOSSARY.maker,
  queriesNext: { en: "Scan now will search for", zh: "立即扫描将搜索" },
  queriesSent: { en: "This scan searched for", zh: "本次扫描搜索了" },
  noQueries: { en: "This maker has no pieces to look for yet.", zh: "这位匠人还没有可供查找的作品。" },
  scanNow: { en: "Scan now", zh: "立即扫描" },
  scanning: { en: "Scanning…", zh: "正在扫描…" },
  statusIdle: { en: "No scan yet. Scan now checks the sandbox market only.", zh: "尚未扫描。立即扫描只检查沙盒市场。" },
  statusChecking: { en: "Checking listings on the sandbox market", zh: "正在检查沙盒市场上的商品" },
  checkedOne: { en: "1 result checked", zh: "已检查 1 条结果" },
  checkedMany: { en: "{n} results checked", zh: "已检查 {n} 条结果" },
  foundNone: { en: "no possible copies found", zh: "未发现疑似仿冒" },
  foundOne: { en: "1 possible copy found", zh: "发现 1 件疑似仿冒" },
  foundMany: { en: "{n} possible copies found", zh: "发现 {n} 件疑似仿冒" },
  engineLabel: { en: "How it checked", zh: "检查方式" },
} as const satisfies Record<string, Text>;

/** watch.scanned's engine, in words. */
export const ENGINE: Record<"apify" | "scripted", Text> = {
  apify: { en: "Apify crawl of the sandbox market", zh: "Apify 爬取沙盒市场" },
  scripted: { en: "Scripted sample", zh: "脚本样例" },
};

/** The hit card. */
export const HIT = {
  claimLabel: { en: "What the listing claims", zh: "该商品的说法" },
  foundLabel: { en: "The listing Cindy found", zh: "Cindy 找到的商品" },
  urlLabel: { en: "Address, as text", zh: "网址（仅文字）" },
  pieceLabel: { en: "The co-op's own piece", zh: "合作社自己的作品" },
  pieceMissing: { en: "This piece isn't in the catalog.", zh: "目录里没有这件作品。" },
  fairness: {
    en: "Possible look-alike. Cindy doesn't accuse anyone. You decide.",
    zh: "疑似相似商品。Cindy 不指控任何人，由您决定。",
  },
} as const satisfies Record<string, Text>;

/** The report and dismiss buttons under each hit, and the folded line. */
export const ACTIONS = {
  review: { en: "Review Cindy's report", zh: "查看 Cindy 起草的举报" },
  waiting: { en: "Waiting for Cindy's draft", zh: "正在等待 Cindy 的草稿" },
  reportApproved: { en: "Report approved", zh: "举报已批准" },
  reportDeclined: { en: "Report declined", zh: "举报未批准" },
  dismiss: L23,
  dismissed: { en: "Dismissed: {title}", zh: "已忽略：{title}" },
  undo: { en: "Undo", zh: "撤销" },
  dismissNote: { en: "Only on this screen. Nothing was sent, and Cindy's report stays as it is.", zh: "只在此屏幕上生效。没有发送任何内容，Cindy 的举报保持原样。" },
} as const satisfies Record<string, Text>;

/** The results: the hits' heading and the empty line. */
export const RESULTS = {
  empty: { en: "No possible copies found in this scan", zh: "本次扫描未发现疑似仿冒" },
  waitingHits: { en: "Cindy is putting the possible copies side by side.", zh: "Cindy 正在把疑似仿冒的商品并排列出。" },
} as const satisfies Record<string, Text>;

/** Every checked result, under the hits. */
export const CHECKED = {
  title: { en: "Every result this scan checked ({n})", zh: "本次扫描检查的全部结果（{n}）" },
  countOnly: { en: "This scan checked {n} results. It sent no list of them.", zh: "本次扫描检查了 {n} 条结果，但没有附上清单。" },
  notScored: { en: "Text match: not scored", zh: "文本相似度：未评分" },
  possibleCopy: { en: "Possible look-alike, see above", zh: "疑似相似商品，见上方" },
  claimOnly: L22,
  neither: { en: "No sign it copies the co-op's work", zh: "没有迹象表明它照搬了合作社的作品" },
} as const satisfies Record<string, Text>;

/** "1 result checked" or "4 results checked". */
export function checkedWords(n: number): Text {
  return n === 1 ? SCAN.checkedOne : fill(SCAN.checkedMany, { n });
}

/** "no possible copies found", "1 possible copy found" or "2 possible copies found". */
export function foundWords(n: number): Text {
  if (n === 0) return SCAN.foundNone;
  return n === 1 ? SCAN.foundOne : fill(SCAN.foundMany, { n });
}
