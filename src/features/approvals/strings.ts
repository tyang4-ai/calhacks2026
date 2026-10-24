// Every string the owner's approvals screens show, English and Chinese side by side.
// Domain labels copy their rows in docs/common/glossary.md word for word. The rest are the feature's
// own short UI strings (design-system.md, "Words on screen").
import type { Text } from "../../core/types";

export type Lang = "en" | "zh";

/** Picks one language from a Text. */
export function t(text: Text, lang: Lang): string {
  return text[lang];
}

// ---------------------------------------------------------------------------------------------
// From the glossary (label table). Keep these word for word.

export const GLOSSARY = {
  cindy: { en: "Cindy", zh: "Cindy" },
  needsApproval: { en: "Needs your approval", zh: "待您批准" },
  approve: { en: "Approve", zh: "批准" },
  decline: { en: "Decline", zh: "不批准" },
  sealed: { en: "Sealed", zh: "已盖章" },
  approved: { en: "Approved", zh: "已批准" },
  declined: { en: "Declined", zh: "未批准" },
  sent: { en: "Sent", zh: "已发送" },
  paid: { en: "Paid", zh: "已发放" },
  overLimit: { en: "Over your $500 limit", zh: "超过500美元限额" },
  followUp: { en: "Follow-up", zh: "跟进邮件" },
  makerPayout: { en: "Maker payout", zh: "匠人结算" },
  held: { en: "Held", zh: "暂缓发放" },
  heldNote: { en: "Held until the gallery pays what it owes", zh: "待画廊补齐欠款后发放" },
  proposedByCindy: { en: "Cindy proposed this. Only you can approve it.", zh: "Cindy提议，只有您能批准" },
  shortPayment: { en: "Short payment", zh: "少付款" },
  gallery: { en: "Gallery", zh: "画廊" },
  payoutDate: { en: "Payout date", zh: "发放日期" },
  maker: { en: "Maker", zh: "匠人" },
} as const satisfies Record<string, Text>;

// ---------------------------------------------------------------------------------------------
// The feature's own short strings.

export const UI = {
  /** The inbox panel's title. */
  inboxTitle: { en: "Approvals", zh: "审批" },
  /** Shown before any approval.requested has arrived. */
  emptyInbox: { en: "Nothing needs your approval yet.", zh: "暂无待批准事项。" },
  /** Card title for kind follow_up. */
  followUpTitle: { en: "Follow-up to the gallery", zh: "致画廊的跟进邮件" },
  /** Card title for kind maker_payouts. */
  payoutsTitle: { en: "This month's maker payouts", zh: "本月匠人结算" },
  /** The card's status while pending reads GLOSSARY.needsApproval. */
  statusLabel: { en: "Status", zh: "状态" },
  amount: { en: "Amount", zh: "金额" },
  total: { en: "Total", zh: "合计" },
  heldTotal: { en: "Held in total", zh: "暂缓发放合计" },
  // The follow-up draft
  draftLabel: { en: "Draft", zh: "草稿" },
  to: { en: "To", zh: "收件人" },
  subject: { en: "Subject", zh: "主题" },
  readDraft: { en: "Read the full draft", zh: "查看完整草稿" },
  showLess: { en: "Show less", zh: "收起" },
  draftInEnglish: { en: "Sent in English, as the gallery reads it.", zh: "将以英文发给画廊。" },
  // The decision bar
  reasonLabel: { en: "Reason", zh: "原因" },
  reasonPlaceholder: { en: "Why are you declining?", zh: "请写下不批准的原因" },
  confirmDecline: { en: "Decline with this reason", zh: "确认不批准" },
  cancel: { en: "Cancel", zh: "取消" },
  decidedOn: { en: "Decided on", zh: "决定日期" },
  // The toast
  toastHint: { en: "Cindy is waiting on you.", zh: "Cindy在等您决定。" },
} as const satisfies Record<string, Text>;

// ---------------------------------------------------------------------------------------------
// Strings with an amount or a count in them. Amounts arrive already formatted by the kit
// (formatCents from src/ui/), so this file never formats money itself.

/** apr_01's summary line: the gallery and the short amount from flg_01. */
export function shortPaymentSummary(amount: string): Text {
  return {
    en: `The gallery paid ${amount} less than the contract says. I drafted a follow-up asking for the difference.`,
    zh: `画廊比合同少付了${amount}。我起草了跟进邮件，请画廊补齐差额。`,
  };
}

/** apr_02's summary line: three payouts and their total. */
export function payoutsSummary(count: number, total: string): Text {
  return {
    en: `${count} maker payouts, ${total} in total.`,
    zh: `${count}笔匠人结算，共${total}。`,
  };
}

/** The toast's count of approvals still waiting. */
export function waitingCount(count: number): Text {
  return {
    en: count === 1 ? "1 item is waiting." : `${count} items are waiting.`,
    zh: `${count}项待处理。`,
  };
}
