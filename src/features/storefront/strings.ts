// Every string the storefront screens show, English and Chinese side by side (T0).
// - GLOSSARY copies its rows in docs/common/glossary.md (domain words) word for word.
// - L8 and L13 copy the on-screen label table word for word. Gordon checks L8's Chinese himself.
// - UI holds the feature's own short strings (design-system.md, "Words on screen"): block names,
//   editor buttons, the preview note, the footer's preview line, the draft note and the publish
//   states.
// Block text props are English strings from the data (data-model.md, Storefront blocks), so they
// never pass through here and stay as written in Chinese.
// Amounts are formatted only by the kit (Money), never here.
import type { Lang, StorefrontBlock, Text } from "../../core/types";

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

/** Separates the parts of a short line, as the kit's cards do. */
export const SEP = " · ";

// ---------------------------------------------------------------------------------------------
// From the glossary (domain words). Keep these word for word.

export const GLOSSARY = {
  storefront: { en: "Storefront", zh: "店铺页面" },
  storefrontBuilder: { en: "Storefront builder", zh: "店铺搭建" },
  communityProject: { en: "Community project", zh: "社区项目" },
  demoData: { en: "Demo data", zh: "演示数据" },
  ruleBased: { en: "Rule-based", zh: "规则程序" },
  piece: { en: "Piece", zh: "作品" },
  hoursOfWork: { en: "Hours of work", zh: "工时" },
} satisfies Record<string, Text>;

// ---------------------------------------------------------------------------------------------
// On-screen labels from the glossary, word for word.

/** L8, in the story block (store-story-note). Gordon checks the Chinese himself. */
export const L8: Text = {
  en: "Placeholder written by the Cindia team. In a real launch, the community writes this page.",
  zh: "由 Cindia 团队撰写的占位内容。正式上线后，由社区自己撰写此页面。",
};

/** L13, in store-footer after the preview line. */
export const L13: Text = {
  en: "Fictional storefront, made for a demo.",
  zh: "虚构的店铺，为演示而制作。",
};

// ---------------------------------------------------------------------------------------------
// The feature's own strings.

/** The block kinds' names, as the builder lists them. */
export const BLOCK_NAMES: Record<StorefrontBlock["kind"], Text> = {
  hero: { en: "Hero", zh: "首屏" },
  story: { en: "Story", zh: "介绍" },
  pieces: { en: "Pieces", zh: "作品" },
  process: { en: "How it's made", zh: "制作过程" },
  projects: { en: "Community projects", zh: "社区项目" },
  visit: { en: "Visit", zh: "到访" },
};

/** The labels of the editable text props (data-model.md, Storefront blocks). */
export const PROP_LABELS: Record<string, Text> = {
  tagline: { en: "Tagline", zh: "标语" },
  title: { en: "Heading", zh: "标题" },
  address: { en: "Where (region only)", zh: "地点（仅限地区）" },
  hours: { en: "Visits", zh: "到访安排" },
};

/** The kit color tokens the accent picker offers, by token name (`--c-color-<name>`). */
export const ACCENT_NAMES: Record<string, Text> = {
  seal: { en: "Seal red", zh: "朱红" },
  jade: { en: "Jade", zh: "玉绿" },
  amber: { en: "Amber", zh: "琥珀" },
  ink: { en: "Ink", zh: "墨色" },
};

export const LAYOUT_NAMES = {
  story_first: { en: "Story first", zh: "介绍在前" },
  grid_first: { en: "Pieces first", zh: "作品在前" },
} satisfies Record<"story_first" | "grid_first", Text>;

export const UI = {
  // The builder
  previewNote: {
    en: "Preview: a simple block editor for this demo. Edits reach the page only when you publish, and a reset clears them.",
    zh: "预览：这是为本演示做的简单版块编辑器。只有发布后，修改才会出现在页面上；重置会清除这些修改。",
  },
  preview: { en: "Preview", zh: "预览" },
  theme: { en: "Theme", zh: "主题" },
  accent: { en: "Accent", zh: "强调色" },
  accentNote: {
    en: "In this demo the accent shows in the preview only. Publishing sends the blocks.",
    zh: "本演示中，强调色只在预览里显示。发布时只发送版块。",
  },
  layout: { en: "Layout", zh: "布局" },
  blocks: { en: "Blocks", zh: "版块" },
  piecesCount: { en: "{n} pieces", zh: "{n} 件作品" },
  piecesOne: { en: "1 piece", zh: "1 件作品" },
  projectsCount: { en: "{n} projects", zh: "{n} 个项目" },
  projectsOne: { en: "1 project", zh: "1 个项目" },
  fromRecords: {
    en: "Listed from the co-op's records. Not editable here.",
    zh: "取自合作社的记录，此处不能编辑。",
  },
  storyNote: {
    en: "The page shows the community's about text here. No agent writes it.",
    zh: "页面在这里显示社区的介绍文字，不由任何智能体撰写。",
  },
  processNote: {
    en: "The steps come from the pieces' own records.",
    zh: "步骤取自作品自己的记录。",
  },
  emptyProp: { en: "Nothing here yet.", zh: "这里还没有内容。" },
  // The Designer
  designer: { en: "Draft with Designer", zh: "请设计起草" },
  designerIdle: {
    en: "Ask the Designer for a first draft. You decide whether to use it.",
    zh: "请设计先起草一版，由您决定是否采用。",
  },
  designerWorking: { en: "The Designer is drafting.", zh: "设计正在起草。" },
  draftReady: {
    en: "The draft is ready. Nothing changes unless you use it.",
    zh: "草稿已就绪。除非您采用，否则什么都不会改变。",
  },
  draftInUse: {
    en: "The draft is in your working copy. Publish to put it on the page.",
    zh: "草稿已放入您的工作稿。发布后才会出现在页面上。",
  },
  applyDraft: { en: "Use this draft", zh: "采用这版草稿" },
  steps: { en: "Designer's steps", zh: "设计的步骤" },
  tool: { en: "Tool: {name}", zh: "工具：{name}" },
  ms: { en: "{ms} ms", zh: "{ms} 毫秒" },
  // Publishing
  publish: { en: "Publish", zh: "发布" },
  statusPublished: {
    en: "Published (preview). The page shows this version.",
    zh: "已发布（预览）。页面显示的就是这一版。",
  },
  statusDraft: {
    en: "Draft. Your changes aren't on the page yet.",
    zh: "草稿。您的修改尚未出现在页面上。",
  },
  viewPage: { en: "View the page", zh: "查看页面" },
  // The public page
  footerLine: {
    en: "Made with Cindia's storefront builder (preview)",
    zh: "由 Cindia 店铺搭建工具制作（预览版）",
  },
  draftNote: { en: "Draft. Not published yet.", zh: "草稿，尚未发布。" },
  missingTitle: { en: "There's no storefront at this link.", zh: "这个链接没有对应的店铺。" },
  backToShop: { en: "Back to the shop", zh: "返回商店" },
  visitHeading: { en: "Visit", zh: "到访" },
  hours: { en: "{h} h", zh: "{h} 小时" },
  stepsFor: { en: "The steps for {title}", zh: "{title}的制作步骤" },
  piecesHeading: { en: "Pieces", zh: "作品" },
} satisfies Record<string, Text>;
