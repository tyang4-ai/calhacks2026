// The UI kit. Features use these components and the tokens only.
import "./kit.css";

export { Panel, type PanelProps } from "./Panel";
export { Button, type ButtonProps } from "./Button";
export { Money, type MoneyProps } from "./Money";
export { Thread, type ThreadProps, type Point } from "./Thread";
export { Seal, type SealProps } from "./Seal";
export { MakerMark, type MakerMarkProps } from "./MakerMark";
export { Badge, SimulatedBadge, type BadgeProps, type BadgeVariant } from "./Badge";
export { Flag, type FlagProps } from "./Flag";
export { EvidenceCard, type EvidenceCardProps } from "./EvidenceCard";
export { ShareBar, type ShareBarProps, type SharePart } from "./ShareBar";
export { LedgerTable, type LedgerTableProps, type LedgerColumn, type LedgerRow } from "./LedgerTable";
export { Toast, type ToastProps } from "./Toast";
export { PhoneFrame, PHONE_WIDTH, PHONE_HEIGHT, type PhoneFrameProps } from "./PhoneFrame";
export { ConsoleFrame, CONSOLE_WIDTH, CONSOLE_HEIGHT, type ConsoleFrameProps } from "./ConsoleFrame";
export { LangToggle, type LangToggleProps } from "./LangToggle";
export { chartTheme, seriesColor } from "./chartTheme";
export { formatCents, formatBps } from "./formatCents";
export { formatDate, formatMonth } from "./formatDate";
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
