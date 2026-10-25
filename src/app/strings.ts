// The shell's own short UI strings, English and Chinese side by side. Domain words come from
// glossary.md, and the on-screen labels L1 and L2 are copied from its label table word for word.
import type { DrawerKind, ProcessId } from "../core/events";
import type { SellView, SlotId } from "../core/featureTypes";
import type { Text } from "../core/types";

/** L1: the site-wide demo notice, in the top bar of every page (glossary.md, L1). */
export const L1: Text = {
  en: "Demo. Every maker, community and story here is fictional. Nothing is for sale.",
  zh: "演示版。这里的每位匠人、每个社区和每个故事都是虚构的。所有物品均不出售。",
};

/** L2: the Sell header's notice, beside the co-op's name (glossary.md, L2). */
export const L2: Text = {
  en: "Demo: the Sell side is open so you can look around. In a real launch, only the co-op sees or approves anything here.",
  zh: "演示：卖家后台对所有人开放，方便您浏览。正式上线后，只有合作社能查看或批准这里的内容。",
};

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
  "process.bar": { en: "How it works: one block per process, with its status", zh: "运行过程：每个流程一格，显示其状态" },
  "process.view": { en: "This process, step by step, with its event log", zh: "这个流程的每一步，以及它的事件记录" },
  "shop.home.main": { en: "Vibe search: describe a feeling and find a piece", zh: "按感觉搜索：描述一种感觉，找到一件作品" },
  "shop.home.communities": { en: "Communities and their projects", zh: "社区与社区项目" },
  "shop.search.main": { en: "Vibe search results", zh: "按感觉搜索结果" },
  "shop.piece.main": { en: "The piece, its story and where your money goes", zh: "作品、故事与钱去哪儿了" },
  "shop.piece.side": { en: "Ask about this piece", zh: "询问这件作品" },
  "shop.community.main": { en: "Community", zh: "社区" },
  "shop.projects.main": { en: "Community projects and works in progress", zh: "社区项目与定制进行中" },
  "shop.receipt.main": { en: "Receipt", zh: "收据" },
  "shop.drawer.support": { en: "Help: questions answered by Cindy's agents", zh: "客服：由 Cindy 的智能体回答问题" },
  "store.main": { en: "Storefront", zh: "店铺页面" },
  "studio.overview.main": { en: "Overview: the co-op's sales, approvals and questions at a glance", zh: "概览：合作社的销售、审批和提问一览" },
  "studio.listings.main": { en: "New listing: the maker's notes become a listing", zh: "新作品上架：匠人的笔记变成商品页" },
  "studio.storefront.main": { en: "Storefront builder", zh: "店铺搭建" },
  "studio.projects.main": { en: "Community projects and works in progress", zh: "社区项目与定制进行中" },
  "studio.proof.side": { en: "Search model: its score on the test queries", zh: "搜索模型：测试查询上的得分" },
  "studio.watch.main": { en: "Counterfeit watch", zh: "仿冒监测" },
  "studio.drawer.support": { en: "Help: questions answered by Cindy's agents", zh: "客服：由 Cindy 的智能体回答问题" },
  "maker.side": { en: "Listings, works in progress and questions from buyers", zh: "作品、定制进行中与买家提问" },
};

export const PLACEHOLDER_NOTE: Text = { en: "Coming soon", zh: "即将上线" };

export const SLOT_FAILED: Text = { en: "This panel failed to load", zh: "此面板加载失败" };

/** The Sell site's left nav, in route order (ui-contract.md, Routes). */
export const SELL_VIEW_LABELS: Record<SellView, Text> = {
  overview: { en: "Overview", zh: "概览" },
  listings: { en: "Listings", zh: "作品上架" },
  storefront: { en: "Storefront", zh: "店铺" },
  projects: { en: "Projects", zh: "项目" },
  map: { en: "Money", zh: "资金" },
  month: { en: "Month", zh: "本月" },
  close: { en: "Close", zh: "月结" },
  proof: { en: "Proof", zh: "验证" },
  dashboard: { en: "Dashboard", zh: "仪表盘" },
  approvals: { en: "Approvals", zh: "审批" },
  watch: { en: "Counterfeit watch", zh: "仿冒监测" },
};

/** Each drawer's title, from the glossary and the Slots table. */
export const DRAWER_TITLES: Record<DrawerKind, Text> = {
  support: { en: "Help", zh: "客服" },
  ask: { en: "Ask Cindy", zh: "问Cindy" },
  audit: { en: "Where this number comes from", zh: "数字来源" },
};

/** The process names, from ui-contract.md (The process bar and views), for the overlay's label. */
export const PROCESS_LABELS: Record<ProcessId, Text> = {
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

export const SHELL = {
  /** The glossary's word for the studio, before the mock data names it. */
  studio: { en: "Co-op", zh: "合作社" },
  shop: { en: "Shop", zh: "购物" },
  sell: { en: "Sell", zh: "卖家" },
  help: { en: "Help", zh: "客服" },
  askCindy: { en: "Ask Cindy", zh: "问Cindy" },
  close: { en: "Close", zh: "关闭" },
  cindyIdle: { en: "Waiting for the month's records.", zh: "正在等待本月记录。" },
  views: { en: "Sell views", zh: "卖家后台视图" },
  sides: { en: "Shop or sell", zh: "购物或卖家" },
  processView: { en: "How it works", zh: "运行过程" },
  kitComing: { en: "The kit gallery is coming: I2-kit adds src/ui/gallery.tsx.", zh: "组件库展示即将上线：I2-kit 会添加 src/ui/gallery.tsx。" },
} satisfies Record<string, Text>;
