// The kit gallery (I2-kit T4): every kit component in each of its states, with sample props, for
// /dev/kit. The shell renders it inside dev-kit-gallery. Every name, amount and sentence here is a
// sample: none comes from src/mock/, and no real nation or person is named. Every sample's root
// carries a kit- test ID, so a check can find each one.
import "./kit.css";
import { useState, type ReactNode } from "react";
import type { ProcessStatus } from "../core/events";
import type { Lang, Text } from "../core/types";
import { AgentGraph, type AgentGraphNode } from "./AgentGraph";
import { Badge, type BadgeVariant } from "./Badge";
import { BlockEditor, type EditorBlock } from "./BlockEditor";
import { Button } from "./Button";
import { chartTheme } from "./chartTheme";
import { ChatBubble } from "./ChatBubble";
import type { ChatMessage } from "./ChatBubble";
import { ChatThread } from "./ChatThread";
import { Chip } from "./Chip";
import { CommunityCard } from "./CommunityCard";
import { ConsoleFrame, CONSOLE_HEIGHT, CONSOLE_WIDTH } from "./ConsoleFrame";
import { Drawer } from "./Drawer";
import { EmbeddingMap, type MapPoint } from "./EmbeddingMap";
import { EventLog, type EventLogRow } from "./EventLog";
import { EvidenceCard } from "./EvidenceCard";
import { Flag } from "./Flag";
import { formatDate } from "./formatDate";
import { LangToggle } from "./LangToggle";
import { LedgerTable } from "./LedgerTable";
import { Link } from "./Link";
import { MakerMark } from "./MakerMark";
import { MilestoneTimeline, type MilestoneItem } from "./MilestoneTimeline";
import { Money } from "./Money";
import { PageFrame, PAGE_HEIGHT, PAGE_WIDTH } from "./PageFrame";
import { Panel } from "./Panel";
import { PieceCard } from "./PieceCard";
import { ProcessBlock } from "./ProcessBlock";
import { ProcessView } from "./ProcessView";
import { ProjectCard } from "./ProjectCard";
import { ScoreBar } from "./ScoreBar";
import { Seal } from "./Seal";
import { SearchBar } from "./SearchBar";
import { ShareBar } from "./ShareBar";
import { SideBySide } from "./SideBySide";
import { SideSwitch, type Side } from "./SideSwitch";
import { StatTile } from "./StatTile";
import { GALLERY_WORDS as W, pickText, SAMPLE_WORD, VERIFICATION_METHOD_WORDS } from "./strings";
import { Tabs } from "./Tabs";
import { Thread } from "./Thread";
import { Toast } from "./Toast";
import { TopNav } from "./TopNav";
import { VerificationLine } from "./VerificationLine";

const s = (en: string, zh: string): Text => ({ en, zh });

/** The sample picture: the site's own mark, so no sample shows a catalog piece. */
const SAMPLE_PICTURE = "/favicon.svg";

const PROCESS_SAMPLES: { status: ProcessStatus; live: boolean; count?: number; label: Text }[] = [
  { status: "done", live: false, count: 1, label: s("Sample search", "示例搜索") },
  { status: "working", live: false, count: 4, label: s("Sample swarm", "示例团队") },
  { status: "idle", live: false, label: s("Sample checkout", "示例结账") },
  { status: "done", live: true, count: 7, label: s("Sample money", "示例资金") },
  { status: "attention", live: false, count: 2, label: s("Sample reconcile", "示例对账") },
  { status: "attention", live: true, count: 1, label: s("Sample approvals", "示例批准") },
  { status: "idle", live: false, label: s("Sample close", "示例月结") },
  { status: "done", live: false, count: 3, label: s("Sample proof", "示例验证") },
  { status: "working", live: true, count: 2, label: s("Sample watch long label", "示例监测长标签") },
  { status: "idle", live: false, label: s("Sample model", "示例模型") },
  { status: "done", live: false, count: 8, label: s("Sample data", "示例数据") },
];

const BADGES: { variant: BadgeVariant; words?: Text }[] = [
  { variant: "neutral", words: s("Sample", "示例") },
  { variant: "jade", words: s("Sample matched", "示例已核对") },
  { variant: "amber", words: s("Sample waiting", "示例等待") },
  { variant: "seal", words: s("Sample flagged", "示例异常") },
  { variant: "simulated" },
  { variant: "live" },
  { variant: "demo" },
  { variant: "rule" },
  { variant: "estimate" },
];

const PIECE = {
  image: SAMPLE_PICTURE,
  imageAlt: s("The sample picture", "示例图片"),
  title: s("Sample woven runner in two colors", "双色示例织带"),
  makerName: s("Sample Maker A.", "示例匠人 A."),
  makerChar: "S",
  communityName: s("Sample River Co-op", "示例河流合作社"),
  priceCents: 12345,
  verification: VERIFICATION_METHOD_WORDS.nation_attestation,
};

const VERIFY = {
  method: "nation_attestation" as const,
  by: s("The sample nation, in a real launch", "正式上线后，由示例部族认证"),
  note: s("A sample note on who would check, and that Cindia keeps only a yes or no.", "示例说明：由谁核实，以及 Cindia 只保留是或否。"),
};

const MILESTONES: MilestoneItem[] = [
  { milestoneId: "kit_m1", label: s("Sample: the design is agreed", "示例：确定设计"), shareBps: 2500, amountCents: 3086, status: "paid", date: "2031-03-04" },
  { milestoneId: "kit_m2", label: s("Sample: half the work is done", "示例：完成一半"), shareBps: 4000, amountCents: 4938, status: "reached" },
  { milestoneId: "kit_m3", label: s("Sample: the piece is finished", "示例：作品完成"), shareBps: 3500, amountCents: 4321, status: "pending" },
];

const GRAPH_NODES: AgentGraphNode[] = [
  { id: "kit_lead", label: s("Sample lead", "示例领队"), kind: "claude" },
  { id: "kit_a", label: s("Sample reader", "示例读取"), kind: "claude" },
  { id: "kit_b", label: s("Sample finder", "示例查找"), kind: "claude" },
  { id: "kit_c", label: s("Sample check", "示例检查"), kind: "code" },
  { id: "kit_d", label: s("Sample clerk", "示例文员"), kind: "claude" },
  { id: "kit_e", label: s("Sample counter", "示例计数"), kind: "code" },
  { id: "kit_f", label: s("Sample writer", "示例撰写"), kind: "claude" },
  { id: "kit_tool", label: s("Sample tool", "示例工具"), kind: "tool" },
];
const GRAPH_EDGES = [...GRAPH_NODES.slice(1, 7).map((n) => ({ from: "kit_lead", to: n.id })), { from: "kit_b", to: "kit_tool" }];
const GRAPH_STEPS = ["kit_lead", "kit_a", "kit_lead", "kit_b", "kit_tool", "kit_b", "kit_lead", "kit_c", "kit_lead", "kit_f"].map((agentId, i) => ({
  stepId: `kit_s${i + 1}`,
  agentId,
  at: (i + 1) * 1000,
}));

/** 48 sample points in four groups, from a seeded generator, so the map is the same every load. */
function samplePoints(): MapPoint[] {
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const centers = [
    [0.2, 0.7],
    [0.7, 0.8],
    [0.3, 0.2],
    [0.8, 0.3],
  ];
  return Array.from({ length: 48 }, (_, i) => {
    const g = i % 4;
    return {
      id: `kit_p${i + 1}`,
      x: centers[g][0] + (rand() - 0.5) * 0.3,
      y: centers[g][1] + (rand() - 0.5) * 0.3,
      group: `kit_g${g + 1}`,
      label: s(`Sample piece ${i + 1}`, `示例作品 ${i + 1}`),
    };
  });
}
const MAP_POINTS = samplePoints();
const MAP_GROUPS = [1, 2, 3, 4].map((n) => ({ id: `kit_g${n}`, label: s(`Sample community ${n}`, `示例社区 ${n}`) }));
const MAP_LINKS = ["kit_p1", "kit_p5", "kit_p9", "kit_p2", "kit_p13"];

const LOG_ROWS: EventLogRow[] = [
  { id: "kit_e1", at: 1200, type: "search.queried", source: "scripted", key: "b12-search" },
  { id: "kit_e2", at: 1800, type: "search.answered", source: "scripted", key: "b12-search" },
  { id: "kit_e3", at: 2600, type: "swarm.step", source: "live", key: "b14-swarm" },
  { id: "kit_e4", at: 2600, type: "swarm.step", source: "live", key: "b14-swarm" },
  { id: "kit_e5", at: 4100, type: "approval.granted", source: "user" },
];

const CHAT: ChatMessage[] = [
  { id: "kit_c1", role: "person", text: s("Sample question: is this wool?", "示例问题：这是羊毛的吗？"), testId: "kit-chat-msg-1" },
  { id: "kit_c2", role: "agent", agentName: s("Sample lookup", "示例查询"), agentKind: "code", text: s("Sample: the record says wool.", "示例：记录显示是羊毛。"), testId: "kit-chat-msg-2" },
  {
    id: "kit_c3",
    role: "agent",
    agentName: s("Sample writer", "示例撰写"),
    agentKind: "claude",
    text: s("Sample answer: yes, the record lists wool.", "示例回答：是的，记录写的是羊毛。"),
    testId: "kit-chat-msg-3",
    nameTestId: "kit-chat-agent",
  },
  { id: "kit_c4", role: "note", text: s("Sample note: the answer used two records.", "示例说明：回答用了两条记录。"), testId: "kit-chat-msg-4" },
];

const START_BLOCKS: EditorBlock[] = [
  { blockId: "kit_b1", kind: "hero", title: s("Sample header", "示例页头"), summary: s("A sample title and line.", "示例标题和一句话。") },
  { blockId: "kit_b2", kind: "story", title: s("Sample story", "示例故事"), summary: s("Two sample sentences.", "两句示例。") },
  { blockId: "kit_b3", kind: "pieces", title: s("Sample pieces", "示例作品"), summary: s("Three sample pieces.", "三件示例作品。") },
];

const LEDGER_COLUMNS = [
  { key: "date", label: s("Date", "日期") },
  { key: "what", label: s("Record", "记录") },
  { key: "amount", label: s("Amount", "金额"), numeric: true },
];

/** One component's block, named by its code name. */
function Section({ name, lang, children }: { name: string; lang: Lang; children: ReactNode }) {
  return (
    <section className="c-gallery__section" data-component={name} lang={lang}>
      <h2 className="c-gallery__name">{name}</h2>
      <div className="c-gallery__row">{children}</div>
    </section>
  );
}

/** One state of a component, captioned with its state and the Sample tag. */
function Item({ state, lang, width, children }: { state: Text; lang: Lang; width?: number; children: ReactNode }) {
  return (
    <figure className="c-gallery__item" style={width ? { width } : undefined}>
      <figcaption className="c-gallery__caption">
        {pickText(state, lang)} <span className="c-tag c-tag--sample">{pickText(SAMPLE_WORD, lang)}</span>
      </figcaption>
      <div className="c-gallery__stage">{children}</div>
    </figure>
  );
}

/** Shows a fixed-size frame at a smaller scale. */
function Scaled({ width, height, scale, children }: { width: number; height: number; scale: number; children: ReactNode }) {
  return (
    <div className="c-gallery__scaled" style={{ width: Math.round(width * scale), height: Math.round(height * scale) }}>
      <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}

export interface KitGalleryProps {
  /** The language it opens in. Default English. A switch at the top changes it. */
  lang?: Lang;
}

/** Every kit component in each of its states, with sample props labeled Sample. */
export function KitGallery({ lang: startLang = "en" }: KitGalleryProps) {
  const [lang, setLang] = useState<Lang>(startLang);
  const [side, setSide] = useState<Side>("shop");
  const [tab, setTab] = useState("one");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [query, setQuery] = useState("a sample feeling");
  const [chips, setChips] = useState(["sample wool", "under $43.21", "sample gift"]);
  const [chipOn, setChipOn] = useState(false);
  const [blocks, setBlocks] = useState(START_BLOCKS);
  const [blockOn, setBlockOn] = useState<string | undefined>("kit_b2");
  const [reachedSteps, setReachedSteps] = useState("6");
  const [pickedSelected, setPickedSelected] = useState<number>(4);

  const L = lang;
  // Between steps: after the latest handoff has drawn (600 ms), before the next step lands.
  const graphNow = Number(reachedSteps) === 0 ? 0 : GRAPH_STEPS[Number(reachedSteps) - 1].at + 700;

  function moveBlock(blockId: string, direction: "up" | "down") {
    setBlocks((list) => {
      const i = list.findIndex((b) => b.blockId === blockId);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <div className="c-gallery" data-testid="kit-gallery" lang={L}>
      <header className="c-gallery__head">
        <div>
          <h1 className="c-gallery__title">{pickText(W.title, L)}</h1>
          <p className="c-gallery__intro">{pickText(W.intro, L)}</p>
        </div>
        <Tabs
          testId="kit-gallery-lang"
          tabs={[
            { id: "en", label: W.english },
            { id: "zh", label: W.chinese },
          ]}
          value={L}
          onChange={(id) => setLang(id as Lang)}
          lang={L}
        />
      </header>

      {/* ---- Frames ---- */}
      <Section name="PageFrame, TopNav, SideSwitch, ProcessBlock" lang={L}>
        <Item state={W.scaled} lang={L}>
          <Scaled width={PAGE_WIDTH} height={PAGE_HEIGHT} scale={0.5}>
            <PageFrame testId="kit-page" lang={L}>
              <TopNav
                testId="kit-topnav"
                lang={L}
                left={
                  <>
                    <strong style={{ fontSize: "var(--c-text-21)" }}>Cindia</strong>
                    <SideSwitch value={side} onChange={setSide} labels={{ shop: s("Shop", "选购"), sell: s("Sell", "售卖") }} testId="kit-sideswitch" testIds={{ shop: "kit-side-shop", sell: "kit-side-sell" }} lang={L} />
                  </>
                }
                right={<Badge variant="simulated" testId="kit-topnav-badge" />}
              />
              <div className="c-gallery__band" data-testid="kit-process-band">
                {PROCESS_SAMPLES.map((p, i) => (
                  <ProcessBlock
                    key={i}
                    testId={`kit-pblock-${i + 1}`}
                    label={p.label}
                    lang={L}
                    status={p.status}
                    count={p.count}
                    live={p.live}
                    statusTestId={`kit-pblock-status-${i + 1}`}
                    countTestId={`kit-pblock-count-${i + 1}`}
                    liveTestId={`kit-pblock-live-${i + 1}`}
                    selected={i === pickedSelected}
                    onClick={() => setPickedSelected(i)}
                  />
                ))}
              </div>
              <div style={{ padding: "var(--c-space-24)", fontSize: "var(--c-text-18)" }}>{pickText(s("Sample page body.", "示例页面内容。"), L)}</div>
            </PageFrame>
          </Scaled>
        </Item>
      </Section>

      <Section name="Drawer" lang={L}>
        <Item state={W.open} lang={L} width={640}>
          <div className="c-gallery__box" style={{ height: 320 }}>
            <div style={{ padding: "var(--c-space-16)" }}>
              <Button testId="kit-drawer-open" variant="quiet" onClick={() => setDrawerOpen(true)} disabled={drawerOpen}>
                {pickText(W.openDrawer, L)}
              </Button>
            </div>
            <Drawer testId="kit-drawer" closeTestId="kit-drawer-close" open={drawerOpen} onClose={() => setDrawerOpen(false)} title={s("Sample drawer", "示例抽屉")} lang={L} width={360}>
              <p>{pickText(s("Sample drawer content. Esc or Close closes it.", "示例抽屉内容。按 Esc 或关闭即可关上。"), L)}</p>
            </Drawer>
          </div>
        </Item>
      </Section>

      <Section name="Tabs, Link" lang={L}>
        <Item state={W.default} lang={L}>
          <Tabs
            testId="kit-tabs"
            tabTestIdPrefix="kit-tab-"
            tabs={[
              { id: "one", label: s("Sample one", "示例一") },
              { id: "two", label: s("Sample two", "示例二") },
              { id: "three", label: s("Sample three", "示例三") },
            ]}
            value={tab}
            onChange={setTab}
            lang={L}
          />
        </Item>
        <Item state={W.default} lang={L}>
          <Link to="/dev/kit" testId="kit-link">
            {pickText(s("A sample link to this page", "指向本页的示例链接"), L)}
          </Link>
        </Item>
      </Section>

      {/* ---- Search and cards ---- */}
      <Section name="SearchBar" lang={L}>
        <Item state={W.removable} lang={L} width={720}>
          <SearchBar
            testId="kit-search"
            testIds={{ input: "kit-search-input", submit: "kit-search-submit", chipPrefix: "kit-search-chip-", add: "kit-search-add" }}
            value={query}
            onChange={setQuery}
            chips={chips}
            onChipsChange={setChips}
            onSubmit={() => {}}
            placeholder={s("Describe a sample feeling", "描述一种示例感觉")}
            lang={L}
          />
        </Item>
        <Item state={W.default} lang={L} width={720}>
          <SearchBar
            testId="kit-search-preview"
            testIds={{ input: "kit-search-preview-input", submit: "kit-search-preview-submit", chipPrefix: "kit-search-preview-chip-" }}
            value=""
            onChange={() => {}}
            chips={["sample wool", "sample gift"]}
            onSubmit={() => {}}
            placeholder={s("Describe a sample feeling", "描述一种示例感觉")}
            lang={L}
            chipsAside={<Badge variant="rule" testId="kit-search-preview-rule" />}
          />
        </Item>
        <Item state={W.loading} lang={L} width={720}>
          <SearchBar
            testId="kit-search-busy"
            testIds={{ input: "kit-search-busy-input", submit: "kit-search-busy-submit", chipPrefix: "kit-search-busy-chip-" }}
            value="a sample feeling"
            onChange={() => {}}
            chips={[]}
            onSubmit={() => {}}
            placeholder={s("Describe a sample feeling", "描述一种示例感觉")}
            lang={L}
            disabled
          />
        </Item>
      </Section>

      <Section name="Chip" lang={L}>
        <Item state={W.default} lang={L}>
          <Chip testId="kit-chip" label={s("Sample facet", "示例标签")} lang={L} />
        </Item>
        <Item state={W.selected} lang={L}>
          <Chip testId="kit-chip-selected" label={s("Sample facet", "示例标签")} lang={L} selected={chipOn} onClick={() => setChipOn((v) => !v)} />
        </Item>
        <Item state={W.removable} lang={L}>
          <Chip testId="kit-chip-removable" label="sample wool" lang={L} onRemove={() => {}} removeTestId="kit-chip-removable-remove" />
        </Item>
      </Section>

      <Section name="PieceCard" lang={L}>
        <Item state={W.demo} lang={L} width={318}>
          <PieceCard testId="kit-piece-demo" {...PIECE} demo lang={L} sample verificationTestId="kit-piece-demo-verification" />
        </Item>
        <Item state={W.notDemo} lang={L} width={318}>
          <PieceCard testId="kit-piece-plain" {...PIECE} lang={L} sample onClick={() => {}} />
        </Item>
        <Item state={W.compact} lang={L} width={318}>
          <PieceCard
            testId="kit-piece-compact"
            {...PIECE}
            demo
            compact
            sample
            lang={L}
            onClick={() => {}}
            footer={
              <span style={{ display: "flex", gap: "var(--c-space-4)", flexWrap: "wrap" }}>
                <Chip testId="kit-piece-compact-reason" label="sample wool" lang={L} />
              </span>
            }
          />
        </Item>
      </Section>

      <Section name="VerificationLine" lang={L}>
        <Item state={W.demo} lang={L} width={432}>
          <VerificationLine testId="kit-verification-demo" {...VERIFY} demo lang={L} />
        </Item>
        <Item state={W.notDemo} lang={L} width={432}>
          <VerificationLine testId="kit-verification-plain" {...VERIFY} lang={L} />
        </Item>
      </Section>

      <Section name="CommunityCard" lang={L}>
        <Item state={W.default} lang={L} width={318}>
          <CommunityCard
            testId="kit-community"
            name={s("Sample River Co-op", "示例河流合作社")}
            people={s("Sample nation", "示例部族")}
            place={s("Sample valley", "示例山谷")}
            craft={s("Sample weaving and sample beadwork", "示例编织和示例串珠")}
            kind="native_american"
            image={SAMPLE_PICTURE}
            imageAlt={s("The sample picture", "示例图片")}
            lang={L}
            footer={
              <span style={{ display: "flex", gap: "var(--c-space-8)", alignItems: "center" }}>
                <Badge variant="demo" testId="kit-community-demo" />
                <Link to="/dev/kit" testId="kit-community-link">
                  {pickText(s("Sample link", "示例链接"), L)}
                </Link>
              </span>
            }
          />
        </Item>
        <Item state={W.clickable} lang={L} width={318}>
          <CommunityCard
            testId="kit-community-plain"
            name={s("Sample Hill Studio", "示例山丘工作室")}
            people={s("Sample nation", "示例部族")}
            place={s("Sample mesa", "示例台地")}
            craft={s("Sample pottery", "示例陶艺")}
            kind="native_american"
            lang={L}
            onClick={() => {}}
          />
        </Item>
      </Section>

      <Section name="ProjectCard" lang={L}>
        <Item state={W.default} lang={L} width={432}>
          <ProjectCard
            testId="kit-project"
            progressTestId="kit-project-progress"
            title={s("Sample project: two new looms", "示例项目：两台新织布机")}
            summary={s("A sample summary of what the money is for.", "示例简介：这笔钱的用途。")}
            raisedCents={43210}
            goalCents={172840}
            lang={L}
            action={
              <span style={{ display: "flex", gap: "var(--c-space-12)", alignItems: "center", flexWrap: "wrap" }}>
                <Button testId="kit-project-fund" variant="primary">
                  {pickText(s("Sample fund", "示例资助"), L)}
                </Button>
                <span style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>{pickText(s("Sample note beside the button.", "按钮旁的示例说明。"), L)}</span>
              </span>
            }
          />
        </Item>
        <Item state={W.empty} lang={L} width={432}>
          <ProjectCard testId="kit-project-empty" progressTestId="kit-project-empty-progress" title={s("Sample project", "示例项目")} summary={s("Nothing raised yet.", "尚未筹到款项。")} raisedCents={0} goalCents={98765} lang={L} />
        </Item>
      </Section>

      <Section name="MilestoneTimeline" lang={L}>
        <Item state={W.states} lang={L} width={640}>
          <MilestoneTimeline
            testId="kit-milestones"
            testIdPrefix="kit-milestone-"
            milestones={MILESTONES}
            lang={L}
            renderAction={(id) =>
              id === "kit_m3" ? (
                <Button testId="kit-milestone-release" variant="quiet" size="small">
                  {pickText(s("Sample release", "示例发放"), L)}
                </Button>
              ) : null
            }
            renderNote={(id) => (id === "kit_m2" ? pickText(s("Sample: needs your approval", "示例：待您批准"), L) : null)}
          />
        </Item>
      </Section>

      <Section name="ScoreBar" lang={L}>
        {(["neutral", "jade", "amber", "seal"] as const).map((tone, i) => (
          <Item key={tone} state={W.tones} lang={L}>
            <ScoreBar testId={`kit-score-${tone}`} value={[0.73, 0.91, 0.42, 0.18][i]} tone={tone} label={i === 0 ? pickText(s("sample", "示例"), L) : undefined} />
          </Item>
        ))}
      </Section>

      <Section name="StatTile" lang={L}>
        <Item state={W.default} lang={L} width={260}>
          <StatTile testId="kit-stat" title={s("Sample figure", "示例数字")} lang={L} value={<span data-role="value"><Money cents={98765} /></span>} detail={pickText(s("A sample line under it.", "下方的示例说明。"), L)} />
        </Item>
        <Item state={W.attention} lang={L} width={260}>
          <StatTile testId="kit-stat-attention" title={s("Sample flags", "示例异常")} lang={L} value={2} attention detail={pickText(s("Sample: two need a look.", "示例：两项需要查看。"), L)} />
        </Item>
        <Item state={W.asLink} lang={L} width={260}>
          <Link to="/dev/kit" testId="kit-stat-link" variant="block">
            <StatTile testId="kit-stat-linked" title={s("Sample view", "示例视图")} lang={L} value="7" />
          </Link>
        </Item>
      </Section>

      {/* ---- Agents and data views ---- */}
      <Section name="ChatThread, ChatBubble" lang={L}>
        <Item state={W.default} lang={L} width={440}>
          <ChatThread
            testId="kit-chat"
            messages={CHAT}
            lang={L}
            footer={
              <div style={{ display: "flex", gap: "var(--c-space-8)" }}>
                <input className="c-searchbar__add" style={{ flex: 1, width: "auto" }} aria-label={pickText(s("Sample input", "示例输入"), L)} placeholder={pickText(s("Sample input", "示例输入"), L)} />
                <Button testId="kit-chat-send" size="small">
                  {pickText(s("Sample send", "示例发送"), L)}
                </Button>
              </div>
            }
          />
        </Item>
        <Item state={W.loading} lang={L} width={440}>
          <ChatThread testId="kit-chat-working" messages={[{ ...CHAT[0], id: "kit_w1", testId: "kit-chat-working-msg-1" }]} lang={L} after={pickText(s("Sample: the team is working.", "示例：团队正在处理。"), L)} />
        </Item>
        <Item state={W.empty} lang={L} width={440}>
          <ChatThread testId="kit-chat-empty" messages={[]} lang={L} emptyText={s("Sample: no messages yet.", "示例：暂无消息。")} />
        </Item>
        <Item state={W.demo} lang={L} width={440}>
          <ChatBubble testId="kit-bubble-demo" role="agent" agentName={s("Sample Maker A.", "示例匠人 A.")} text={s("Sample words in her own voice.", "Sample words in her own voice.")} badge={<Badge variant="demo" testId="kit-bubble-demo-badge" />} lang={L} />
        </Item>
      </Section>

      <Section name="AgentGraph" lang={L}>
        <Item state={W.playerAt} lang={L} width={560}>
          <Tabs
            testId="kit-graph-steps"
            tabs={["0", "2", "4", "6", "8", "10"].map((n) => ({ id: n, label: s(n, n) }))}
            value={reachedSteps}
            onChange={setReachedSteps}
            lang={L}
          />
          <AgentGraph testId="kit-graph" nodes={GRAPH_NODES} edges={GRAPH_EDGES} steps={GRAPH_STEPS} stepTestIdPrefix="kit-graph-step-" now={graphNow} lang={L} />
        </Item>
      </Section>

      <Section name="EmbeddingMap" lang={L}>
        <Item state={W.simulated} lang={L}>
          <EmbeddingMap testId="kit-map" points={MAP_POINTS} query={{ x: 0.42, y: 0.55, approx: true }} highlightIds={MAP_LINKS} linkIds={MAP_LINKS} width={520} height={340} groups={MAP_GROUPS} lang={L} />
        </Item>
        <Item state={W.live} lang={L}>
          <EmbeddingMap testId="kit-map-live" points={MAP_POINTS} query={{ x: 0.72, y: 0.3 }} highlightIds={["kit_p4", "kit_p8"]} linkIds={["kit_p4", "kit_p8"]} width={360} height={240} lang={L} />
        </Item>
        <Item state={W.empty} lang={L}>
          <EmbeddingMap testId="kit-map-empty" points={[]} width={360} height={240} lang={L} />
        </Item>
      </Section>

      <Section name="ProcessView, EventLog" lang={L}>
        <Item state={W.simulated} lang={L} width={640}>
          <div style={{ height: 360 }}>
            <ProcessView
              testId="kit-pview"
              title={s("Sample process", "示例流程")}
              subtitle={s("What this sample view shows, in one line.", "用一句话说明这个示例视图。")}
              live={false}
              lang={L}
              onClose={() => {}}
              closeTestId="kit-pview-close"
              log={<EventLog testId="kit-log" rows={LOG_ROWS} lang={L} />}
            >
              <p>{pickText(s("Sample body.", "示例内容。"), L)}</p>
            </ProcessView>
          </div>
        </Item>
        <Item state={W.live} lang={L} width={480}>
          <div style={{ height: 240 }}>
            <ProcessView testId="kit-pview-live" title={s("Sample process", "示例流程")} live lang={L} log={<EventLog testId="kit-log-live" rows={LOG_ROWS.slice(2, 4)} lang={L} />}>
              <ScoreBar testId="kit-pview-live-score" value={0.64} tone="jade" />
            </ProcessView>
          </div>
        </Item>
        <Item state={W.error} lang={L} width={480}>
          <div style={{ height: 240 }}>
            <ProcessView testId="kit-pview-error" title={s("Sample process", "示例流程")} live={false} lang={L} log={<EventLog testId="kit-log-empty" rows={[]} lang={L} />}>
              <Flag testId="kit-pview-error-flag" reason={pickText(s("Sample: this view couldn't load. Try again.", "示例：此视图无法加载，请重试。"), L)} />
            </ProcessView>
          </div>
        </Item>
      </Section>

      <Section name="SideBySide" lang={L}>
        <Item state={W.default} lang={L} width={900}>
          <SideBySide
            testId="kit-sbs"
            similarityTestId="kit-sbs-similarity"
            similarity={0.42}
            similarityLabel={s("Sample match 0.42.", "示例相似度 0.42。")}
            similarityHint={s("A sample hint in small type.", "小字示例提示。")}
            lang={L}
            left={
              <div className="c-gallery__box" style={{ padding: "var(--c-space-16)" }}>
                <p style={{ fontWeight: 600 }}>{pickText(s("Sample found listing", "示例发现的商品"), L)}</p>
                <p style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>example.org/sample</p>
              </div>
            }
            right={<PieceCard testId="kit-sbs-piece" {...PIECE} compact sample lang={L} />}
          />
        </Item>
      </Section>

      <Section name="BlockEditor" lang={L}>
        <Item state={W.selected} lang={L} width={640}>
          <BlockEditor
            testId="kit-blocks"
            testIdPrefix="kit-block-"
            blocks={blocks}
            selectedId={blockOn}
            onSelect={setBlockOn}
            onMove={moveBlock}
            onEdit={setBlockOn}
            lang={L}
            renderDetail={(id) => (id === blockOn ? pickText(s("Sample fields for the selected block.", "所选区块的示例字段。"), L) : null)}
          />
        </Item>
      </Section>

      {/* ---- v1 kit ---- */}
      <Section name="Badge" lang={L}>
        {BADGES.map((b) => (
          <Item key={b.variant} state={s(b.variant, b.variant)} lang={L}>
            <Badge variant={b.variant} testId={`kit-badge-${b.variant}`}>
              {b.words ? pickText(b.words, L) : undefined}
            </Badge>
          </Item>
        ))}
      </Section>

      <Section name="Button" lang={L}>
        {(["primary", "quiet", "seal"] as const).map((v) => (
          <Item key={v} state={s(v, v)} lang={L}>
            <Button testId={`kit-button-${v}`} variant={v}>
              {pickText(s("Sample action", "示例操作"), L)}
            </Button>
          </Item>
        ))}
        <Item state={W.disabled} lang={L}>
          <Button testId="kit-button-disabled" disabled>
            {pickText(s("Sample action", "示例操作"), L)}
          </Button>
        </Item>
      </Section>

      <Section name="Money, MakerMark, Seal" lang={L}>
        <Item state={W.tones} lang={L}>
          <span style={{ display: "flex", gap: "var(--c-space-16)", fontSize: "var(--c-text-18)" }}>
            <Money testId="kit-money" cents={12345} />
            <Money testId="kit-money-in" cents={4321} tone="in" />
            <Money testId="kit-money-pending" cents={2468} tone="pending" />
            <Money testId="kit-money-out" cents={-1357} tone="out" />
          </span>
        </Item>
        <Item state={W.sizes} lang={L}>
          <span style={{ display: "flex", gap: "var(--c-space-12)", alignItems: "center" }}>
            <MakerMark testId="kit-makermark-small" char="S" size={20} />
            <MakerMark testId="kit-makermark" char="S" size={28} label={pickText(s("Sample Maker A.", "示例匠人 A."), L)} />
            <MakerMark testId="kit-makermark-large" char="S" size={48} />
          </span>
        </Item>
        <Item state={W.sizes} lang={L}>
          <span style={{ display: "flex", gap: "var(--c-space-16)", alignItems: "center" }}>
            <Seal testId="kit-seal" char="印" date="2031-03-04" lang={L} size={64} />
            {/* The approvals compact seal's size: "Oct 1" fits at 14 px, "10月1日" doesn't, so the Chinese seal shows its character alone. */}
            <Seal testId="kit-seal-small" char="印" date="2031-10-01" lang={L} size={48} />
          </span>
        </Item>
      </Section>

      <Section name="Panel, Flag, EvidenceCard" lang={L}>
        <Item state={W.simulated} lang={L} width={432}>
          <Panel testId="kit-panel" title={pickText(s("Sample panel", "示例面板"), L)} sourceKeys={["b01-match"]} lang={L}>
            <p>{pickText(s("A panel fed by scripted events shows the Simulated badge.", "由脚本事件驱动的面板显示模拟标记。"), L)}</p>
          </Panel>
        </Item>
        <Item state={W.error} lang={L} width={432}>
          <Flag testId="kit-flag" reason={pickText(s("Sample: two records disagree.", "示例：两条记录不一致。"), L)}>
            {pickText(s("A sample line of evidence.", "一行示例证据。"), L)}
          </Flag>
        </Item>
        {(["neutral", "flagged", "trusted"] as const).map((state) => (
          <Item key={state} state={s(state, state)} lang={L} width={260}>
            <EvidenceCard
              testId={`kit-evidence-${state}`}
              state={state}
              kind={pickText(s("Sample record", "示例记录"), L)}
              title={pickText(s("Sample title", "示例标题"), L)}
              figure={<Money cents={state === "flagged" ? 3086 : 4321} />}
              figureLabel={pickText(s("Sample figure", "示例数字"), L)}
              rows={[{ label: pickText(s("Sample row", "示例行"), L), value: <Money cents={1357} /> }]}
            />
          </Item>
        ))}
      </Section>

      <Section name="ShareBar, LedgerTable, Thread" lang={L}>
        <Item state={W.default} lang={L} width={384}>
          <ShareBar
            testId="kit-sharebar"
            parts={[
              { kind: "maker", label: pickText(s("Sample maker share", "示例匠人所得"), L), cents: 8642 },
              { kind: "materials", label: pickText(s("Sample materials", "示例材料"), L), cents: 2468 },
              { kind: "platform", label: pickText(s("Sample fee", "示例费用"), L), cents: 1234 },
              { kind: "card", label: pickText(s("Sample card fee", "示例刷卡费"), L), cents: 1111 },
            ]}
          />
        </Item>
        <Item state={W.states} lang={L} width={480}>
          <LedgerTable
            testId="kit-ledger"
            columns={LEDGER_COLUMNS.map((c) => ({ ...c, label: pickText(c.label, L) }))}
            rows={(["matched", "flagged", "pending", "selected"] as const).map((state, i) => ({
              id: `kit_r${i + 1}`,
              state,
              testId: `kit-ledger-row-${state}`,
              cells: { date: formatDate(`2031-03-0${i + 1}`, L), what: pickText(s(`Sample ${state}`, `示例 ${state}`), L), amount: <Money cents={[4321, -1357, 2468, 1111][i]} /> },
            }))}
          />
        </Item>
        <Item state={W.default} lang={L} width={360}>
          <svg width="340" height="120" viewBox="0 0 340 120" data-testid="kit-thread-svg">
            <Thread testId="kit-thread" from={{ x: 20, y: 90 }} to={{ x: 320, y: 90 }} startAt={0} now={60000} amountCents={4321} tone="in" />
          </svg>
        </Item>
      </Section>

      <Section name="Toast, LangToggle, ConsoleFrame, chartTheme" lang={L}>
        <Item state={W.default} lang={L} width={432}>
          <div className="c-gallery__box" style={{ height: 120 }}>
            <Toast testId="kit-toast" tone="jade" action={<Button size="small" variant="quiet" testId="kit-toast-action">{pickText(s("Sample", "示例"), L)}</Button>}>
              {pickText(s("A sample notice.", "一条示例通知。"), L)}
            </Toast>
          </div>
        </Item>
        <Item state={W.default} lang={L}>
          <LangToggle testId="kit-langtoggle" value={L} onToggle={() => setLang(L === "en" ? "zh" : "en")} />
        </Item>
        <Item state={W.scaled} lang={L}>
          <Scaled width={CONSOLE_WIDTH} height={CONSOLE_HEIGHT} scale={0.2}>
            <ConsoleFrame testId="kit-console" lang={L}>
              <div style={{ padding: "var(--c-space-48)", fontSize: "var(--c-text-48)" }}>{pickText(s("Sample console", "示例控制台"), L)}</div>
            </ConsoleFrame>
          </Scaled>
        </Item>
        <Item state={W.tones} lang={L}>
          <span style={{ display: "flex", gap: "var(--c-space-8)" }} data-testid="kit-chart-series">
            {chartTheme.colors.series.map((color, i) => (
              <span key={color} title={`series ${i + 1}`} style={{ width: 32, height: 32, background: color, borderRadius: "var(--c-radius-panel)", border: "1px solid var(--c-color-line)" }} />
            ))}
          </span>
        </Item>
      </Section>
    </div>
  );
}
