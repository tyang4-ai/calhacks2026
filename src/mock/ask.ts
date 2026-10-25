// Ask Cindy's three canned answers (ask_01 to ask_03) and the fallback for any other question in
// scripted mode. Every figure is computed from month.ts, never typed in.
import type { ChartSpec } from "../core/events";
import type { Text } from "../core/types";
import { pieces } from "./catalog";
import { galleryContract } from "./channels";
import { galleryDeposit, galleryFlag, galleryStatement, makerPayouts, makerStatements, orders, STATEMENT_COMMISSION_BPS } from "./month";
import { makers } from "./people";
import { shortDate, sum, usd } from "./util";

export interface CannedAnswer {
  questionId: string;
  questions: Text;
  answer: Text;
  refIds: string[];
  chart?: ChartSpec;
}

// ask_01: maker share by piece over September's sold (not refunded) orders, largest first.
const byPiece = pieces
  .map((p) => {
    const os = orders.filter((o) => o.pieceId === p.id && o.status === "paid");
    return { piece: p, orderIds: os.map((o) => o.id), cents: sum(os.map((o) => o.makerShareCents)) };
  })
  .filter((r) => r.cents > 0)
  .toSorted((a, b) => b.cents - a.cents);
const top = byPiece[0];

const mkr01 = makers[0];
const mpo01 = makerPayouts.find((m) => m.makerId === mkr01.id);
const mst01 = makerStatements.find((m) => m.makerId === mkr01.id);
if (!mpo01 || !mst01) throw new Error("mkr_01 has no payout or statement");
const payDay = shortDate(mst01.payoutDate);
const depositDay = shortDate(galleryDeposit.date);

export const cannedAnswers: CannedAnswer[] = [
  {
    questionId: "ask_01",
    questions: { en: "Which piece earned the most this month?", zh: "这个月哪件作品最赚钱?" },
    answer: {
      en: `${top.piece.title.en} earned the most in September: ${usd(top.cents)} in maker share. The chart shows every piece that sold.`,
      zh: `9月最赚钱的是${top.piece.title.zh}，匠人所得${usd(top.cents)}。图中列出了本月售出的每件作品。`,
    },
    refIds: [top.piece.id, ...top.orderIds],
    chart: {
      type: "bar",
      title: { en: "Maker share by piece, September 2026", zh: "2026年9月各作品匠人所得" },
      // The co-op's manager reads English, so the chart's piece labels are the English titles.
      labels: byPiece.map((r) => r.piece.title.en),
      series: [{ name: { en: "Maker share", zh: "匠人所得" }, valuesCents: byPiece.map((r) => r.cents) }],
    },
  },
  {
    questionId: "ask_02",
    questions: { en: "Why did you flag the gallery payment?", zh: "你为什么标记画廊的付款?" },
    answer: {
      en:
        `The contract says the gallery keeps ${galleryContract.commissionBps / 100}%, but its September statement charged ${STATEMENT_COMMISSION_BPS / 100}% on every sale. ` +
        `By the contract the co-op is owed ${usd(galleryFlag.expectedCents)}. The bank shows ${usd(galleryDeposit.amountCents)} on ${depositDay.en}, ` +
        `so the gallery paid ${usd(galleryFlag.deltaCents)} short. I trust the signed contract.`,
      zh:
        `合同约定画廊抽成${galleryContract.commissionBps / 100}%，但9月对账单每笔都按${STATEMENT_COMMISSION_BPS / 100}%收取。` +
        `按合同，合作社应得${usd(galleryFlag.expectedCents)}。银行流水显示${depositDay.zh}到账${usd(galleryDeposit.amountCents)}，` +
        `画廊少付了${usd(galleryFlag.deltaCents)}。我以已签合同为准。`,
    },
    refIds: [galleryContract.id, galleryStatement.id, galleryDeposit.id],
  },
  {
    questionId: "ask_03",
    questions: { en: `How much does ${mkr01.name.en} get this month?`, zh: `${mkr01.name.zh}这个月能拿多少?` },
    answer: {
      en:
        `${mkr01.name.en} earned ${usd(mst01.totalCents)} from ${mst01.lines.length} pieces in September. ` +
        `${usd(mpo01.amountCents)} is paid on ${payDay.en}. ${usd(mpo01.heldCents)} is held until the gallery pays what it owes, ` +
        `because it paid ${STATEMENT_COMMISSION_BPS / 100}% commission instead of ${galleryContract.commissionBps / 100}%.`,
      zh:
        `${mkr01.name.zh}9月售出${mst01.lines.length}件作品，收入${usd(mst01.totalCents)}。` +
        `${payDay.zh}发放${usd(mpo01.amountCents)}，另有${usd(mpo01.heldCents)}暂缓发放，待画廊补齐欠款后发放，` +
        `因为画廊按${STATEMENT_COMMISSION_BPS / 100}%而非${galleryContract.commissionBps / 100}%扣了佣金。`,
    },
    refIds: [mpo01.id, mst01.id, galleryFlag.id],
  },
];

export const fallbackAnswer: Text = {
  en: `In the scripted demo I can answer these three questions: ${cannedAnswers.map((a) => `"${a.questions.en}"`).join(", ")}. Live mode answers anything about the month.`,
  zh: `演示模式下我能回答这三个问题：${cannedAnswers.map((a) => `“${a.questions.zh}”`).join("、")}。实时模式可以回答本月的任何问题。`,
};
