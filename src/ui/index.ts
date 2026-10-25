// The UI kit. Features use these components and the tokens only.
import "./kit.css";

export { Panel, type PanelProps } from "./Panel";
export { Button, type ButtonProps } from "./Button";
export { Money, type MoneyProps } from "./Money";
export { Thread, type ThreadProps, type Point } from "./Thread";
export { Seal, type SealProps } from "./Seal";
export { MakerMark, type MakerMarkProps } from "./MakerMark";
export { Badge, SimulatedBadge, type BadgeProps, type BadgeVariant, type LabeledBadgeVariant } from "./Badge";
export { Flag, type FlagProps } from "./Flag";
export { EvidenceCard, type EvidenceCardProps } from "./EvidenceCard";
export { ShareBar, type ShareBarProps, type SharePart } from "./ShareBar";
export { LedgerTable, type LedgerTableProps, type LedgerColumn, type LedgerRow } from "./LedgerTable";
export { Toast, type ToastProps } from "./Toast";
// PhoneFrame is retired from the index (I2-kit T4). Its file stays while the shell imports it directly.
export { ConsoleFrame, CONSOLE_WIDTH, CONSOLE_HEIGHT, type ConsoleFrameProps } from "./ConsoleFrame";
export { LangToggle, type LangToggleProps } from "./LangToggle";
export { PageFrame, PAGE_WIDTH, PAGE_HEIGHT, type PageFrameProps } from "./PageFrame";
export { TopNav, type TopNavProps } from "./TopNav";
export { SideSwitch, type SideSwitchProps, type Side } from "./SideSwitch";
export { ProcessBlock, type ProcessBlockProps } from "./ProcessBlock";
export { Drawer, type DrawerProps } from "./Drawer";
export { Tabs, type TabsProps, type TabItem } from "./Tabs";
export { Link, type LinkProps } from "./Link";
export { DRAWER_WIDTH, PULSE_MS, isPlainClick, pulseLevel } from "./frames";
// Search and cards (I2-kit T2)
export { SearchBar, type SearchBarProps } from "./SearchBar";
export { Chip, type ChipProps } from "./Chip";
export { PieceCard, type PieceCardProps } from "./PieceCard";
export { VerificationLine, type VerificationLineProps } from "./VerificationLine";
export { CommunityCard, type CommunityCardProps } from "./CommunityCard";
export { ProjectCard, type ProjectCardProps } from "./ProjectCard";
export { MilestoneTimeline, type MilestoneTimelineProps, type MilestoneItem } from "./MilestoneTimeline";
export { ScoreBar, type ScoreBarProps } from "./ScoreBar";
export { StatTile, type StatTileProps } from "./StatTile";
export { chipTestIds, progressPercent, progressShare } from "./cards";
// Agents and data views (I2-kit T3)
export { ChatThread, type ChatThreadProps } from "./ChatThread";
export { ChatBubble, type ChatBubbleProps, type ChatMessage } from "./ChatBubble";
export { AgentGraph, type AgentGraphProps, type AgentGraphNode } from "./AgentGraph";
export { EmbeddingMap, type EmbeddingMapProps, type MapPoint } from "./EmbeddingMap";
export { EventLog, type EventLogProps, type EventLogRow } from "./EventLog";
export { ProcessView, type ProcessViewProps } from "./ProcessView";
export { SideBySide, type SideBySideProps } from "./SideBySide";
export { BlockEditor, type BlockEditorProps, type EditorBlock } from "./BlockEditor";
export { HANDOFF_MS, type GraphEdgeIn, type GraphStepIn } from "./views";
// Design drop 3 (I3-redesign T4): the line icons and the woven Tag
export { Icon, type IconProps } from "./Icon";
export { ICON_NAMES, type IconName } from "./icons/shapes";
export { Tag, type TagProps, type TagVariant } from "./Tag";
export { AgentSteps, type AgentStepsProps, type AgentStepItem } from "./AgentSteps";
export { PROCESS_BLOCK_WIDTH, PROCESS_BLOCK_WIDE, processBlockWidth } from "./frames";
// The kit's words, in both languages
export {
  pickText,
  STATUS_WORDS,
  LIVE_WORD,
  CLOSE_WORD,
  L3,
  L4,
  VERIFICATION_METHOD_WORDS,
  COMMUNITY_KIND_WORDS,
  ILLUSTRATION_WORD,
  SAMPLE_WORD,
  RULE_BASED_WORD,
  BADGE_WORDS,
} from "./strings";
export { chartTheme, seriesColor } from "./chartTheme";
export { formatCents, formatBps } from "./formatCents";
export { formatDate, formatMonth, formatMonthDay } from "./formatDate";
export {
  usePlayerTime,
  useReducedMotion,
  prefersReducedMotion,
  progress,
  stitchProgress,
  sealPose,
  uiProgress,
  easeOut,
  clamp01,
  STITCH_MS,
  SEAL_MS,
  UI_MS,
} from "./motion";
