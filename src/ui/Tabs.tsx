import type { KeyboardEvent } from "react";
import type { Lang, Text } from "../core/types";
import { pickText } from "./strings";

export interface TabItem<Id extends string = string> {
  id: Id;
  label: Text;
}

export interface TabsProps<Id extends string = string> {
  testId?: string;
  tabs: TabItem<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  lang: Lang;
  /** When given, tab n carries `<tabTestIdPrefix><id>`. */
  tabTestIdPrefix?: string;
  /**
   * underline (default): a row of tabs. segmented: drop 3's ModePicker, equal 36 px segments with
   * the selected one in indigo wash, border and weight (search-surprise-mode).
   */
  variant?: "underline" | "segmented";
}

/** A row of tabs. The selected tab is marked by its underline and its weight, not by color alone. */
export function Tabs<Id extends string = string>({ testId, tabs, value, onChange, lang, tabTestIdPrefix, variant = "underline" }: TabsProps<Id>) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const at = tabs.findIndex((t) => t.id === value);
    if (at < 0 || tabs.length === 0) return;
    const n = (at + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    e.preventDefault();
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[n]?.focus();
    onChange(tabs[n].id);
  }
  return (
    <div className={`c-tabs${variant === "segmented" ? " c-tabs--segmented" : ""}`} role="tablist" data-testid={testId} lang={lang} onKeyDown={onKeyDown}>
      {tabs.map((tab) => {
        const on = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className={`c-tabs__tab${on ? " c-tabs__tab--on" : ""}`}
            data-testid={tabTestIdPrefix ? `${tabTestIdPrefix}${tab.id}` : undefined}
            onClick={() => onChange(tab.id)}
          >
            {pickText(tab.label, lang)}
          </button>
        );
      })}
    </div>
  );
}
