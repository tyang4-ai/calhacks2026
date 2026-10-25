import type { Lang, Text } from "../core/types";
import { pickText } from "./strings";

export type Side = "shop" | "sell";

export interface SideSwitchProps {
  value: Side;
  /** Called on every press, the selected side's included, so Sell from a maker page still goes to /sell/overview. */
  onChange: (side: Side) => void;
  labels: { shop: Text; sell: Text };
  testIds?: { shop?: string; sell?: string };
  /** On the switch's group. */
  testId?: string;
  lang: Lang;
}

const SIDES: Side[] = ["shop", "sell"];

/** The Shop and Sell switch: two segments, the selected side marked by fill and weight. */
export function SideSwitch({ value, onChange, labels, testIds, testId, lang }: SideSwitchProps) {
  return (
    <div className="c-sideswitch" role="group" data-testid={testId} lang={lang}>
      {SIDES.map((side) => {
        const on = side === value;
        return (
          <button
            key={side}
            type="button"
            className={`c-sideswitch__opt${on ? " c-sideswitch__opt--on" : ""}`}
            data-testid={testIds?.[side]}
            aria-pressed={on}
            onClick={() => onChange(side)}
          >
            {pickText(labels[side], lang)}
          </button>
        );
      })}
    </div>
  );
}
