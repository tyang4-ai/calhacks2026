import type { LangSetting } from "../core/state";

export interface LangToggleProps {
  testId?: string;
  /** The store's setting, or a surface's resolved language. */
  value: LangSetting;
  /** What "auto" resolves to on this surface, to highlight the right side. */
  resolved?: "en" | "zh";
  onToggle: () => void;
}

/** 中文 and English switch. Each press moves to the next setting: auto, en, zh. */
export function LangToggle({ testId, value, resolved, onToggle }: LangToggleProps) {
  const shown = value === "auto" ? resolved : value;
  return (
    <button
      type="button"
      className="c-langtoggle"
      data-testid={testId}
      data-lang={value}
      onClick={onToggle}
      aria-label={`Language: ${value === "auto" ? "auto" : value === "en" ? "English" : "中文"}`}
    >
      <span className={`c-langtoggle__opt${shown === "zh" ? " c-langtoggle__opt--on" : ""}`} lang="zh">
        中文
      </span>
      <span className={`c-langtoggle__opt${shown === "en" ? " c-langtoggle__opt--on" : ""}`} lang="en">
        English
      </span>
    </button>
  );
}
