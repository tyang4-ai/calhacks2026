// The shell's own short UI strings, English and Chinese side by side. Domain words come from glossary.md.
import type { SlotId, StudioView } from "../core/featureTypes";
import type { Text } from "../core/types";

/** What each empty slot will hold, in the surface's language. */
export const SLOT_LABELS: Record<SlotId, Text> = {
  "buyer.main": { en: "Gift finder, the piece's story, where your money goes and the receipt", zh: "选购助手、作品故事、钱去哪儿了与收据" },
  "studio.map.main": { en: "Money map: money moving between the buyer, Cindia, the co-op and the makers", zh: "资金流向图：买家、Cindia、合作社与匠人之间的资金" },
  "studio.month.main": { en: "The month's records, matched, with any flag and its evidence", zh: "本月记录核对，以及异常和证据" },
  "studio.month.side": { en: "Try your own statement", zh: "试试您自己的对账单" },
  "studio.close.main": { en: "Close the month and the Excel report", zh: "月结与Excel报表" },
  "studio.close.side": { en: "Impact", zh: "影响" },
  "studio.proof.main": { en: "Proof: the planted-error test and its score", zh: "验证：测试用例与识别结果" },
  "studio.dashboard.main": { en: "Dashboard", zh: "仪表盘" },
  "studio.drawer.ask": { en: "Ask Cindy", zh: "问Cindy" },
  "studio.drawer.audit": { en: "Where this number comes from", zh: "数字来源" },
  "owner.main": { en: "Needs your approval", zh: "待您批准" },
  "maker.main": { en: "This month's income", zh: "本月收入" },
  // v2 slots: placeholders until I2-shell writes the real labels.
  "process.bar": { en: "How it works", zh: "运行过程" },
  "process.view": { en: "How it works", zh: "运行过程" },
  "shop.home.main": { en: "Vibe search", zh: "按感觉搜索" },
  "shop.home.communities": { en: "Communities and projects", zh: "社区与项目" },
  "shop.search.main": { en: "Vibe search results", zh: "按感觉搜索结果" },
  "shop.piece.main": { en: "The piece, its story and where your money goes", zh: "作品、故事与钱去哪儿了" },
  "shop.piece.side": { en: "Ask about this piece", zh: "询问这件作品" },
  "shop.community.main": { en: "Community", zh: "社区" },
  "shop.projects.main": { en: "Community projects and works in progress", zh: "社区项目与定制进行中" },
  "shop.receipt.main": { en: "Receipt", zh: "收据" },
  "shop.drawer.support": { en: "Help", zh: "客服" },
  "store.main": { en: "Storefront", zh: "店铺页面" },
  "studio.overview.main": { en: "Overview", zh: "概览" },
  "studio.listings.main": { en: "New listing", zh: "新作品上架" },
  "studio.storefront.main": { en: "Storefront builder", zh: "店铺搭建" },
  "studio.projects.main": { en: "Community projects and works in progress", zh: "社区项目与定制进行中" },
  "studio.proof.side": { en: "Search model", zh: "搜索模型" },
  "studio.watch.main": { en: "Counterfeit watch", zh: "仿冒监测" },
  "studio.drawer.support": { en: "Help", zh: "客服" },
  "maker.side": { en: "Listings, works in progress and questions from buyers", zh: "作品、定制进行中与买家提问" },
};

export const PLACEHOLDER_NOTE: Text = { en: "Coming soon", zh: "即将上线" };

export const SLOT_FAILED: Text = { en: "This panel failed to load", zh: "此面板加载失败" };

/** The view rail, in the contract's order. */
export const VIEW_LABELS: Record<StudioView, Text> = {
  map: { en: "Money", zh: "资金" },
  month: { en: "Month", zh: "本月" },
  close: { en: "Close", zh: "月结" },
  proof: { en: "Proof", zh: "验证" },
  dashboard: { en: "Dashboard", zh: "仪表盘" },
};

export const SHELL: Record<string, Text> = {
  studio: { en: "Co-op", zh: "合作社" },
  askCindy: { en: "Ask Cindy", zh: "问Cindy" },
  close: { en: "Close", zh: "关闭" },
  cindyIdle: { en: "Waiting for the month's records.", zh: "正在等待本月记录。" },
  views: { en: "Views", zh: "视图" },
};
