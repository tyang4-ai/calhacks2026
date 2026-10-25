// Every string the support screens show, English and Chinese side by side (F-support T0).
// Labels from docs/common/glossary.md are copied word for word: the domain words in GLOSSARY, and
// L11 and L12 from the label table. L14, L15 and L16 arrive inside the replies (src/mock/swarm.ts and
// B14) and are shown as written, so they are not here. The rest are this feature's own short UI
// strings (design-system.md, "Words on screen"): plain, first person where Cindy speaks, never
// claiming certainty she doesn't have.
import type { Text } from "../../core/types";

export type Lang = "en" | "zh";

/** Picks one language from a Text. */
export function t(text: Text, lang: Lang): string {
  return text[lang];
}

/** Ends a sentence on a name without doubling the period of a name like "Grace N.". */
export function endSentence(s: string): string {
  return /[.!?。！？]$/.test(s) ? s : `${s}.`;
}

// ---------------------------------------------------------------------------------------------
// From the glossary. Keep these word for word.

export const GLOSSARY = {
  help: { en: "Help", zh: "客服" },
  agentSwarm: { en: "Agent swarm", zh: "智能体团队" },
  ruleBased: { en: "Rule-based", zh: "规则程序" },
  needsYourApproval: { en: "Needs your approval", zh: "待您批准" },
  demoData: { en: "Demo data", zh: "演示数据" },
  askTheMaker: { en: "Ask the maker", zh: "问匠人" },
  inHerOwnWords: { en: "In her own words", zh: "匠人原话" },
  howItWorks: { en: "How it works", zh: "运行过程" },
  approved: { en: "Approved", zh: "已批准" },
  declined: { en: "Declined", zh: "未批准" },
  piece: { en: "Piece", zh: "作品" },
  order: { en: "Order", zh: "订单" },
  maker: { en: "Maker", zh: "匠人" },
  community: { en: "Community", zh: "社区" },
  makerPayout: { en: "Maker payout", zh: "匠人结算" },
  makerStatement: { en: "This month's income", zh: "本月收入" },
  flag: { en: "Flag", zh: "异常" },
} as const satisfies Record<string, Text>;

/** L11, the top of support-drawer on both sides. */
export const L11: Text = {
  en: "AI agents answer here, using only Cindia's records. A person approves anything that moves money.",
  zh: "这里由 AI 智能体回答，只使用 Cindia 的记录。任何涉及资金的操作都需由人批准。",
};

/** L12, under support-input in live mode only. */
export const L12: Text = {
  en: "Live: your question goes to Claude (Anthropic) to answer. Please don't type personal details.",
  zh: "实时模式：您的问题将发送给 Claude（Anthropic）来回答。请不要输入个人信息。",
};

// ---------------------------------------------------------------------------------------------
// This feature's own strings.

export const STRINGS = {
  // The drawer
  newConversation: { en: "New conversation", zh: "新对话" },
  emptyBuyer: {
    en: "Ask about a piece, an order or shipping. The agents answer from Cindia's records.",
    zh: "可以询问作品、订单或配送。智能体会根据 Cindia 的记录回答。",
  },
  emptySeller: {
    en: "Ask about your payouts or your listings. The agents answer from Cindia's records.",
    zh: "可以询问您的结款或上架作品。智能体会根据 Cindia 的记录回答。",
  },
  suggestionsHeading: { en: "Try asking", zh: "可以这样问" },

  // The composer
  inputLabel: { en: "Your question", zh: "您的问题" },
  inputPlaceholder: { en: "Ask a question", zh: "输入问题" },
  send: { en: "Send", zh: "发送" },
  waitForAnswer: { en: "Wait for this answer before asking again.", zh: "请等这个回答完成后再提问。" },

  // The thread
  refsLabel: { en: "Records", zh: "相关记录" },
  cindiaSide: { en: "Cindia", zh: "Cindia" },
  handoffTitle: { en: "A person is taking over", zh: "由真人接手" },
  handoffPending: {
    en: "I've asked the co-op's manager to decide. Their answer will show here.",
    zh: "我已请合作社负责人来决定。他们的答复会显示在这里。",
  },
  handoffGranted: { en: "The co-op's manager approved this.", zh: "合作社负责人已批准。" },
  handoffDeclined: { en: "The co-op's manager declined this.", zh: "合作社负责人未批准。" },

  // The step strip
  working: { en: "The agents are working on it.", zh: "智能体正在处理。" },
  now: { en: "Now", zh: "当前" },
  check: { en: "Check", zh: "核查" },
  showSteps: { en: "Show the steps", zh: "显示步骤" },
  hideSteps: { en: "Hide the steps", zh: "隐藏步骤" },

  // The piece page's side panel
  askAboutPiece: { en: "Ask about this piece", zh: "询问这件作品" },
  askAboutPieceIntro: {
    en: "Questions go to Cindy's agents, who answer from the co-op's records.",
    zh: "问题会交给 Cindy 的智能体，它们根据合作社的记录回答。",
  },
  openHelp: { en: "Open help", zh: "打开客服" },
  latestReply: { en: "Latest reply", zh: "最新回复" },
} as const satisfies Record<string, Text>;

/** "Sent to Grace N. Her answer will show here.", with the maker's name. */
export function forwardedLine(makerName: Text): Text {
  return {
    en: `${endSentence(`Sent to ${makerName.en}`)} Her answer will show here.`,
    zh: `已转给 ${makerName.zh}。她的回答会显示在这里。`,
  };
}

/** "Answered by Writer after 10 steps.", once the run is done. */
export function answeredAfter(agentName: Text, steps: number): Text {
  return {
    en: `Answered by ${agentName.en} after ${steps} ${steps === 1 ? "step" : "steps"}.`,
    zh: `由${agentName.zh}回答，共 ${steps} 步。`,
  };
}

/** The line when a person handed over without a reply: "Handed to a person after 4 steps." */
export function handedOverAfter(steps: number): Text {
  return {
    en: `Handed to a person after ${steps} ${steps === 1 ? "step" : "steps"}.`,
    zh: `共 ${steps} 步后转交真人处理。`,
  };
}

/** A step kind's short word, beside its icon. */
export const STEP_KIND_WORDS: Record<"route" | "call" | "tool" | "result" | "check" | "handoff" | "reply", Text> = {
  route: { en: "Route", zh: "分派" },
  call: { en: "Call", zh: "调用" },
  tool: { en: "Tool", zh: "工具" },
  result: { en: "Result", zh: "结果" },
  check: { en: "Check", zh: "核查" },
  handoff: { en: "Handoff", zh: "转交" },
  reply: { en: "Reply", zh: "回复" },
};
