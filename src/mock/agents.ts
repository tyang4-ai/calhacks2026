// The agent roster (contracts section 6, api-contract.md "The agent roster"), 21 agents in its
// order. Fifteen run on Claude, only claude-haiku-5-5 and claude-sonnet-5-5, and six are plain code
// with no model, which the swarm view labels "rule-based". job is the roster's text, and never is
// the "Never does" column of docs/v2/brief.md. The brief leaves the Indexer's column empty and
// calls it "Plain code, no model calls", so its never says that.
import type { AgentId, AgentModel, AgentSpec, Text } from "../core/types";

const HAIKU: AgentModel = "claude-haiku-5-5";
const SONNET: AgentModel = "claude-sonnet-5-5";

function claude(agentId: string, name: Text, model: AgentModel, tools: string[], job: Text, never: Text): AgentSpec {
  return { agentId, name, job, kind: "claude", model, tools, never };
}

function code(agentId: string, name: Text, tools: string[], job: Text, never: Text): AgentSpec {
  return { agentId, name, job, kind: "code", tools, never };
}

const MOVE_MONEY: Text = { en: "Move money", zh: "动用资金" };
const SEND_REPORT: Text = { en: "Send a report", zh: "发送举报" };
const PUBLISH: Text = { en: "Publish", zh: "发布" };

export const agents: AgentSpec[] = [
  claude(
    "cindy",
    { en: "Cindy", zh: "Cindy" },
    HAIKU,
    ["route"],
    {
      en: "Picks which agents run and in what order, then merges their results. No facts of her own",
      zh: "决定由哪些智能体执行、按什么顺序，再汇总它们的结果。她自己不提供任何事实",
    },
    { en: "Answer from her own knowledge", zh: "凭自己的知识作答" },
  ),
  claude(
    "intake",
    { en: "Intake", zh: "接待" },
    HAIKU,
    [],
    { en: "Reads the request: intent, budget, recipient, language, the IDs it mentions", zh: "读懂请求：意图、预算、送给谁、语言，以及提到的编号" },
    { en: "Search or answer", zh: "搜索或作答" },
  ),
  claude(
    "finder",
    { en: "Finder", zh: "检索" },
    HAIKU,
    ["cindia_search", "elastic_agent"],
    {
      en: "Turns the request into keywords and filters, runs the search, returns candidates and scores. Find questions go to elastic_agent (Elastic Agent Builder), chosen in code",
      zh: "把请求转成关键词和筛选条件，执行搜索，返回候选作品和分数。找货类问题交给elastic_agent（Elastic Agent Builder），由代码选择",
    },
    { en: "Write prose", zh: "撰写正文" },
  ),
  claude(
    "curator",
    { en: "Curator", zh: "精选" },
    SONNET,
    [],
    { en: "Puts the final few in order. Each reason is B12's code-built one", zh: "为最后几件作品排序。每条理由都是B12由代码生成的理由" },
    { en: "Search", zh: "搜索" },
  ),
  claude(
    "steward",
    { en: "Steward", zh: "文化与认证" },
    SONNET,
    ["community_page", "verification_record"],
    {
      en: "Answers authenticity and meaning only from the community's page, the verification record and the piece's own story and heritage line, quoting its source, and says \"I'll ask the maker\" otherwise",
      zh: "只依据社区页面、认证记录以及作品自己的故事和传承说明，回答真伪和含义问题，并注明出处；否则就说“我去问问匠人”",
    },
    { en: "Invent cultural meaning", zh: "编造文化含义" },
  ),
  claude(
    "clerk",
    { en: "Clerk", zh: "订单" },
    HAIKU,
    ["order_lookup", "policy"],
    {
      en: "Order status, shipping, returns. Read-only. Arrival dates come from arrival_window, which the run calls as code, so no model does date arithmetic. On the buyer side it looks up only the orders on screen (L17)",
      zh: "订单状态、配送和退货，只读不改。送达日期来自arrival_window，由流程以代码调用，不让模型计算日期。在买家端只查询屏幕上的订单（L17）",
    },
    { en: "Change anything", zh: "修改任何内容" },
  ),
  claude(
    "writer",
    { en: "Writer", zh: "撰写" },
    SONNET,
    [],
    {
      en: "Writes the reply in the person's language from the facts the others returned, and relays a maker's answer in her own words",
      zh: "根据其他智能体返回的事实，用提问者的语言撰写回复，并原话转达匠人的回答",
    },
    { en: "Add facts", zh: "添加事实" },
  ),
  claude(
    "lister",
    { en: "Lister", zh: "上架" },
    SONNET,
    [],
    {
      en: "Drafts a listing in English and Chinese from the maker's notes, and marks the version the maker didn't write (L27)",
      zh: "根据匠人的笔记起草中英文商品信息，并标出不是匠人亲自写的版本（L27）",
    },
    PUBLISH,
  ),
  claude(
    "describer",
    { en: "Describer", zh: "看图" },
    SONNET,
    ["image"],
    { en: "Describes what's visible in a picture, in plain shape and color words", zh: "用平实的形状和颜色词描述图片里看得见的内容" },
    { en: "Guess meaning", zh: "猜测含义" },
  ),
  claude(
    "tagger",
    { en: "Tagger", zh: "标签" },
    HAIKU,
    ["community_page"],
    { en: "Proposes vibe keywords for the maker to approve", zh: "提议氛围关键词，交给匠人批准" },
    { en: "Edit facts", zh: "修改事实" },
  ),
  claude(
    "checker",
    { en: "Checker", zh: "核查" },
    SONNET,
    ["community_page"],
    {
      en: "Checks a draft against the community's protocols and the maker's facts. content_check() backs it in code (L26)",
      zh: "对照社区的规定和匠人提供的事实核查草稿，并由代码中的content_check()把关（L26）",
    },
    { en: "Approve", zh: "批准" },
  ),
  code(
    "indexer",
    { en: "Indexer", zh: "索引" },
    ["embed", "index_write"],
    { en: "Builds the index entry and its vector, writes it to cindia-drafts", zh: "生成索引条目及其向量，写入cindia-drafts" },
    { en: "Call a model", zh: "调用模型" },
  ),
  code("matcher", { en: "Matcher", zh: "对账" }, ["b01"], { en: "Matches payouts to orders", zh: "把结款与订单对应起来" }, MOVE_MONEY),
  claude("explainer", { en: "Explainer", zh: "解释" }, SONNET, ["b02"], { en: "Explains the catch", zh: "解释查出的问题" }, MOVE_MONEY),
  code("bookkeeper", { en: "Bookkeeper", zh: "记账" }, ["b06", "b10"], { en: "Derives the books and the workbook", zh: "推算账本并生成Excel报表" }, MOVE_MONEY),
  code("scorer", { en: "Scorer", zh: "评分" }, ["b03"], { en: "Scores the planted errors", zh: "为测试用例评分" }, MOVE_MONEY),
  code("scout", { en: "Scout", zh: "巡查" }, ["apify_crawl"], { en: "Crawls the sandbox market through Apify", zh: "通过Apify抓取沙盒市场" }, SEND_REPORT),
  code("comparer", { en: "Comparer", zh: "比对" }, ["embed"], { en: "Scores look-alikes", zh: "为相似商品打分" }, SEND_REPORT),
  claude("claims", { en: "Claims", zh: "声明核查" }, HAIKU, [], { en: "Checks what a found listing claims", zh: "核查找到的商品声称了什么" }, SEND_REPORT),
  claude(
    "reporter",
    { en: "Reporter", zh: "报告" },
    SONNET,
    [],
    { en: "Picks the claim words for the report template, for the owner", zh: "为报告模板挑选声明用词，交给负责人" },
    SEND_REPORT,
  ),
  claude("designer", { en: "Designer", zh: "设计" }, SONNET, ["community_page"], { en: "Drafts a storefront", zh: "起草店铺页面" }, PUBLISH),
];

/** One agent's spec, or undefined for an unknown ID. */
export function getAgent(agentId: AgentId): AgentSpec | undefined {
  return agents.find((a) => a.agentId === agentId);
}
