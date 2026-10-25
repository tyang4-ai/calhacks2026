// Every string the approvals view shows, English and Chinese side by side.
// Domain labels copy their rows in docs/common/glossary.md word for word, and L20, L24 and L27 copy
// its on-screen label table. The rest are the feature's own short UI strings (design-system.md,
// "Words on screen").
import type { ApprovalKind, Text } from "../../core/types";

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
  buyer: { en: "Buyer", zh: "买家" },
  owner: { en: "Co-op manager", zh: "合作社负责人" },
  counterfeitWatch: { en: "Counterfeit watch", zh: "仿冒监测" },
  textMatch: { en: "Text match", zh: "文本相似度" },
  newListing: { en: "New listing", zh: "新作品上架" },
  storefront: { en: "Storefront", zh: "店铺页面" },
  milestone: { en: "Milestone", zh: "阶段" },
  workInProgress: { en: "Work in progress", zh: "定制进行中" },
  support: { en: "Help", zh: "客服" },
  hoursOfWork: { en: "Hours of work", zh: "工时" },
} as const satisfies Record<string, Text>;

// ---------------------------------------------------------------------------------------------
// On-screen labels from glossary.md's label table (contracts section 12), word for word.

export const LABELS = {
  /** After the fairness line, in the approvals hit card (approvals-hit-unverified). */
  L20: { en: "Not verified by Cindia. That alone doesn't make it fake.", zh: "未经 Cindia 认证。仅凭这一点不能说明它是假货。" },
  /** report_listing's "what happens next" after a grant (approvals-next). */
  L24: { en: "Nothing was sent. In this demo, reports never leave Cindia.", zh: "什么都没有发送。在本演示中，举报永远不会离开 Cindia。" },
  /** Beside the version the maker didn't write, in the approvals listing card (approvals-translated-<lang>). */
  L27: { en: "Translated by the Lister agent. The maker hasn't checked this version.", zh: "由上架智能体翻译。匠人尚未核对此版本。" },
} as const satisfies Record<string, Text>;

/** L19's first sentence, with the payload's similarity to two places: "Text match 0.91." */
export function textMatchLine(similarity: number): Text {
  const n = similarity.toFixed(2);
  return { en: `Text match ${n}.`, zh: `文本相似度 ${n}。` };
}

// ---------------------------------------------------------------------------------------------
// The feature's own short strings.

export const UI = {
  /** The view's panel title. */
  inboxTitle: { en: "Approvals", zh: "审批" },
  /** Under the title. */
  inboxIntro: {
    en: "Cindy proposes. Nothing here happens until you approve it.",
    zh: "Cindy只提议。您批准之前，这里的一切都不会执行。",
  },
  /** Shown before any approval.requested has arrived (approvals-empty). */
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
  /** In the seal's place on a card before its grant. */
  sealPlaceholder: { en: "Your seal", zh: "您的印章" },
  /** The detail column's heading for an approval nothing describes. */
  noDetails: { en: "Details not available", zh: "暂无详情" },
  // The follow-up draft
  draftLabel: { en: "Draft", zh: "草稿" },
  to: { en: "To", zh: "收件人" },
  subject: { en: "Subject", zh: "主题" },
  readDraft: { en: "Read the full draft", zh: "查看完整草稿" },
  showLess: { en: "Show less", zh: "收起" },
  draftInEnglish: { en: "Sent in English, as the gallery reads it.", zh: "将以英文发给画廊。" },
  /** The Reporter's draft about a found listing. */
  reporterDraft: { en: "The Reporter's draft", zh: "举报草稿" },
  reporterDraftNote: { en: "Drafted in English for the sandbox market's trust team.", zh: "以英文起草，收件方是沙盒市场的信任团队。" },
  // The decision bar
  reasonLabel: { en: "Reason", zh: "原因" },
  reasonPlaceholder: { en: "Why are you declining?", zh: "请写下不批准的原因" },
  confirmDecline: { en: "Decline with this reason", zh: "确认不批准" },
  cancel: { en: "Cancel", zh: "取消" },
  decidedOn: { en: "Decided on", zh: "决定日期" },
  /** The owner's own check before approving a report on a live hit (approvals-confirm-<approvalId>). */
  confirmLooked: { en: "I've looked at this listing myself.", zh: "我已亲自查看过这件商品。" },
  // The toast
  toastHint: { en: "Cindy is waiting on you.", zh: "Cindy在等您决定。" },
  // The found listing (report_listing)
  foundListing: { en: "The listing Cindy found", zh: "Cindy发现的商品" },
  address: { en: "Address", zh: "网址" },
  claim: { en: "What it claims", zh: "它的说法" },
  fairness: {
    en: "Possible look-alike. Cindy doesn't accuse anyone. You decide.",
    zh: "可能是仿品。Cindy不指控任何人，由您决定。",
  },
  liveHit: { en: "Found by a live scan", zh: "实时扫描发现" },
  // The drafted listing (listing_publish)
  draftTitle: { en: "Title", zh: "标题" },
  draftSummary: { en: "Summary", zh: "简介" },
  english: { en: "English", zh: "英文" },
  chinese: { en: "Chinese", zh: "中文" },
  words: { en: "Facets and vibe words", zh: "属性与氛围词" },
  checks: { en: "Checks", zh: "核查" },
  checkPassed: { en: "Passed", zh: "通过" },
  checkReview: { en: "Needs review", zh: "需要复核" },
  // The storefront (storefront_publish)
  blocks: { en: "Blocks, in order", zh: "版块（按顺序）" },
  // The milestone (milestone_release)
  commission: { en: "Commission", zh: "定制" },
  milestoneAmount: { en: "This milestone's share", zh: "本阶段款项" },
  milestonePending: { en: "Not paid yet", zh: "尚未发放" },
  // The support action
  latestReply: { en: "Latest reply", zh: "最新回复" },
  escalated: { en: "Why a person is needed", zh: "为什么需要人来处理" },
  // After a decision
  whatNext: { en: "What happens next", zh: "接下来" },
} as const satisfies Record<string, Text>;

/** The kind's short tag at the top of a card and the detail, from the glossary. */
export const KIND_TAG: Record<ApprovalKind, Text> = {
  follow_up: GLOSSARY.followUp,
  maker_payouts: GLOSSARY.makerPayout,
  report_listing: GLOSSARY.counterfeitWatch,
  listing_publish: GLOSSARY.newListing,
  storefront_publish: GLOSSARY.storefront,
  milestone_release: GLOSSARY.milestone,
  support_action: GLOSSARY.support,
};

/** Each kind's title on its card and in the detail. v1's two keep their v1 titles. */
export const KIND_TITLE: Record<ApprovalKind, Text> = {
  follow_up: UI.followUpTitle,
  maker_payouts: UI.payoutsTitle,
  report_listing: { en: "Report a possible copy", zh: "举报可能的仿品" },
  listing_publish: { en: "Publish a new listing", zh: "发布新作品" },
  storefront_publish: { en: "Publish a storefront", zh: "发布店铺页面" },
  milestone_release: { en: "Release a milestone payment", zh: "发放阶段款项" },
  support_action: { en: "Act on a support request", zh: "处理客服请求" },
};

/** What happens after the owner approves, one line per kind (approvals-next). */
export const KIND_NEXT: Record<ApprovalKind, Text> = {
  follow_up: {
    en: "The follow-up goes to the gallery in English. It reads Sent once it's out.",
    zh: "跟进邮件将以英文发给画廊，发出后显示已发送。",
  },
  maker_payouts: {
    en: "The payouts go to the makers. The held part waits until the gallery pays what it owes.",
    zh: "款项将发给匠人。暂缓发放的部分要等画廊补齐欠款后再发。",
  },
  report_listing: LABELS.L24,
  listing_publish: {
    en: "The listing is cleared for the shop. In live mode it joins the search index. In scripted mode nothing more happens.",
    zh: "这件作品可以上架了。实时模式下，它会加入搜索索引；脚本模式下不会再有其他操作。",
  },
  storefront_publish: {
    en: "The storefront is cleared to go up at its own link. Nothing on it is for sale.",
    zh: "店铺页面可以在它自己的链接上发布了。上面的物品都不出售。",
  },
  milestone_release: {
    en: "Cindia pays the maker this milestone's share. It reads Paid once it's out. No real money moves in this demo.",
    zh: "Cindia会把这一阶段的款项付给匠人，发出后显示已发放。本演示中没有真实资金流动。",
  },
  support_action: {
    en: "A person at the co-op takes this over. Nothing moves until they act.",
    zh: "合作社会有人接手处理。在他们处理之前，不会有任何操作。",
  },
};

/** What the detail says before the event it needs has arrived. */
export const KIND_WAITING: Record<ApprovalKind, Text> = {
  follow_up: { en: "Waiting for Cindy's draft.", zh: "正在等待Cindy的草稿。" },
  maker_payouts: { en: "Waiting for the payouts.", zh: "正在等待结算明细。" },
  report_listing: { en: "Waiting for the watch to report the listing it found.", zh: "正在等待监测结果。" },
  listing_publish: { en: "Waiting for the Lister's draft.", zh: "正在等待上架智能体的草稿。" },
  storefront_publish: { en: "Waiting for the Designer's draft.", zh: "正在等待设计智能体的草稿。" },
  milestone_release: { en: "Waiting for the commission's details.", zh: "正在等待定制详情。" },
  support_action: { en: "Waiting for the support conversation.", zh: "正在等待客服对话。" },
};

/** Storefront block kinds, for the drafted blocks list. */
export const BLOCK_KIND: Record<string, Text> = {
  hero: { en: "Opening line", zh: "开篇" },
  story: { en: "Story", zh: "故事" },
  pieces: { en: "Pieces", zh: "作品" },
  process: { en: "How it's made", zh: "制作过程" },
  projects: { en: "Projects", zh: "项目" },
  visit: { en: "Visit", zh: "参观" },
};

/** Listing check kinds. */
export const CHECK_KIND: Record<string, Text> = {
  protocol: { en: "Protocol", zh: "规范" },
  facts: { en: "Facts", zh: "事实" },
  price: { en: "Price", zh: "价格" },
};

// ---------------------------------------------------------------------------------------------
// Strings with an amount, a name or a count in them. Amounts arrive already formatted by the kit
// (formatCents from src/ui/), so this file never formats money itself.

/** apr_01's summary line: the gallery and the short amount from flg_01. */
export function shortPaymentSummary(amount: string, gallery?: Text): Text {
  if (!gallery) {
    return {
      en: `The gallery paid ${amount} less than the contract says. I drafted a follow-up asking for the difference.`,
      zh: `画廊比合同少付了${amount}。我起草了跟进邮件，请画廊补齐差额。`,
    };
  }
  return {
    en: `To ${gallery.en}: they paid ${amount} less than the contract says. I drafted a follow-up asking for the difference.`,
    zh: `致${gallery.zh}：对方比合同少付了${amount}。我起草了跟进邮件，请画廊补齐差额。`,
  };
}

/** apr_02's summary line: three payouts and their total. */
export function payoutsSummary(count: number, total: string): Text {
  return {
    en: `${count} maker payouts, ${total} in total.`,
    zh: `${count}笔匠人结算，共${total}。`,
  };
}

/** The held amount on a maker payouts card: "$340.00 held". */
export function heldLine(amount: string): Text {
  return { en: `${amount} held`, zh: `暂缓发放 ${amount}` };
}

/** report_listing's summary: the found listing's title and its text match. */
export function reportSummary(title: string, similarity: number): Text {
  const n = similarity.toFixed(2);
  return { en: `Found "${title}". Text match ${n}.`, zh: `发现“${title}”。文本相似度 ${n}。` };
}

/** listing_publish's summary: the draft's title. */
export function listingSummary(title: Text): Text {
  return { en: `New listing: ${title.en}`, zh: `新作品上架：${title.zh}` };
}

/** storefront_publish's summary: the storefront's community. */
export function storefrontSummary(community: Text): Text {
  return { en: `The ${community.en} storefront, at its own link.`, zh: `${community.zh}的店铺页面，有自己的链接。` };
}

/** milestone_release's summary: the commission's title and the milestone's label. */
export function milestoneSummary(commission: Text, label: Text): Text {
  return { en: `${commission.en}: ${label.en}.`, zh: `${commission.zh}：${label.zh}。` };
}

/** support_action's summary: the thread's latest reply, shortened. */
export function supportSummary(reply: Text): Text {
  return { en: `Latest reply: ${shorten(reply.en, 90)}`, zh: `最新回复：${shorten(reply.zh, 45)}` };
}

/** Cuts a text to at most `max` characters at a word break, with an ellipsis. */
export function shorten(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:，。；：]+$/, "")}…`;
}

/** The decided line on a card: "Approved · Oct 1" or "Declined". */
export function decidedLine(status: Text, date?: string): Text {
  return date ? { en: `${status.en} · ${date}`, zh: `${status.zh} · ${date}` } : status;
}

/** Under the large seal: who sealed it and when. Names come from the data, the date from the kit. */
export function sealedByLine(name: Text, role: Text, date: { en: string; zh: string }): Text {
  return {
    en: `Sealed by ${name.en}, ${role.en.toLowerCase()}, on ${date.en}.`,
    zh: `${role.zh} ${name.zh} 于${date.zh}盖章。`,
  };
}

/** The toast's count of approvals still waiting. */
export function waitingCount(count: number): Text {
  return {
    en: count === 1 ? "1 item is waiting." : `${count} items are waiting.`,
    zh: `${count}项待处理。`,
  };
}
