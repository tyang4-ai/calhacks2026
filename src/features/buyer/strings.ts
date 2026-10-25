// The buyer flow's short UI strings, English and Chinese side by side (design-system.md, Words on
// screen). The `label` group repeats the glossary's label table word for word, so the screens read
// every domain word from one place. Other short strings live in `ui`.
import type { Text } from "../../core/types";

export type Lang = "en" | "zh";

/** Picks one language from a Text. */
export function tr(text: Text, lang: Lang): string {
  return text[lang];
}

/** Domain labels, copied from the glossary's label table. */
export const label = {
  concierge: { en: "Gift finder", zh: "选购助手" },
  priceSplit: { en: "Where your money goes", zh: "钱去哪儿了" },
  makerShare: { en: "Maker share", zh: "匠人所得" },
  materials: { en: "Materials", zh: "材料费" },
  cindiaFee: { en: "Cindia fee", zh: "平台费" },
  cardFee: { en: "Card fee", zh: "刷卡手续费" },
  token: { en: "Card token", zh: "支付令牌" },
  receipt: { en: "Receipt", zh: "收据" },
  received: { en: "Received", zh: "已收款" },
  paidToMaker: { en: "Paid to the maker", zh: "已付给匠人" },
  simulatedCheckout: { en: "Demo checkout, no real charge", zh: "演示结账，不会扣款" },
  hoursOfWork: { en: "Hours of work", zh: "工时" },
  heritage: { en: "About the craft", zh: "关于这门手艺" },
  maker: { en: "Maker", zh: "匠人" },
  piece: { en: "Piece", zh: "作品" },
  order: { en: "Order", zh: "订单" },
  payoutDate: { en: "Payout date", zh: "发放日期" },
} satisfies Record<string, Text>;

/** Short UI strings the glossary doesn't have. */
export const ui = {
  // Concierge and grid (T1)
  conciergePlaceholder: { en: "Describe the gift you're looking for", zh: "说说您想找什么样的礼物" },
  conciergeInputLabel: { en: "Your request", zh: "您的需求" },
  conciergeHint: { en: "Press Enter to ask", zh: "按回车提问" },
  conciergeWorking: { en: "Cindy is picking three pieces…", zh: "Cindy正在挑选三件作品…" },
  conciergeEmpty: { en: "Tell me who it's for and what they love.", zh: "告诉我礼物送给谁、对方喜欢什么。" },
  curatedHeading: { en: "Three pieces for you", zh: "为您挑选的三件作品" },
  tapToOpen: { en: "Tap a piece to meet its maker", zh: "点击作品，认识它的匠人" },
  whyThisPiece: { en: "Why this piece", zh: "推荐理由" },

  // Story and process (T2)
  madeBy: { en: "Made by", zh: "制作" },
  process: { en: "How it was made", zh: "制作过程" },
  hoursUnit: { en: "h", zh: "小时" },
  hoursCount: { en: "hours", zh: "小时" },
  totalHours: { en: "Total", zh: "合计" },
  story: { en: "The story", zh: "作品故事" },

  // Split and checkout (T3)
  price: { en: "Price", zh: "价格" },
  splitNote: {
    en: "Before you pay, see how much reaches the maker.",
    zh: "付款前，先看看有多少钱到匠人手里。",
  },
  pay: { en: "Pay", zh: "支付" },
  paying: { en: "Securing your card…", zh: "正在保护您的卡号…" },
  cardNumber: { en: "Card", zh: "银行卡" },
  cardEnding: { en: "Visa ending in", zh: "Visa 尾号" },
  tokenNote: {
    en: "Your card number became a token. The number itself is never stored.",
    zh: "您的卡号已转换为令牌，卡号本身不会被保存。",
  },
  simulatedNote: {
    en: "This checkout is simulated. No card is charged.",
    zh: "这是模拟结账，不会扣款。",
  },

  // Receipt (T4)
  amount: { en: "Amount", zh: "金额" },
  date: { en: "Date", zh: "日期" },
  status: { en: "Status", zh: "状态" },
  paidOn: { en: "Paid on", zh: "付款日期" },
  receivedNote: {
    en: "The co-op has your payment. You'll see here when the maker is paid.",
    zh: "合作社已收到您的付款。匠人收到报酬后，这里会显示。",
  },
  paidNote: { en: "The maker got their share.", zh: "匠人已收到应得的报酬。" },
  noReceipt: { en: "Your receipt appears after you pay.", zh: "付款后这里会显示收据。" },

  // Flow (T5)
  back: { en: "Back", zh: "返回" },
} satisfies Record<string, Text>;
