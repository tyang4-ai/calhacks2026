import type { Lang, Text } from "../core/types";
import { pickText } from "./strings";

export interface AgentStepItem {
  /** The agent's name, such as Clerk. */
  name: Text | string;
  /** done: a lichen knot on a solid thread. active: an indigo knot in a ring. waiting: a hollow knot on a dotted thread. */
  state: "done" | "active" | "waiting";
  /** On this step's root. */
  testId?: string;
}

export interface AgentStepsProps {
  testId?: string;
  /** The run's agents in order, such as Cindy, Intake, Steward, Check, Clerk, Writer. */
  steps: AgentStepItem[];
  lang: Lang;
}

/**
 * Design drop 3's AgentStep strip for the support drawer: one knot per agent on the run's thread,
 * its name under it. The state reads by the knot's shape, the thread's pattern and the name's
 * weight as well as color. It draws what it is given: the support feature passes the run's steps.
 */
export function AgentSteps({ testId, steps, lang }: AgentStepsProps) {
  return (
    <ol className="c-agentsteps" data-testid={testId} lang={lang}>
      {steps.map((s, i) => (
        <li key={i} className={`c-agentstep c-agentstep--${s.state}`} data-testid={s.testId} data-state={s.state} aria-current={s.state === "active" ? "step" : undefined}>
          <span className="c-agentstep__row" aria-hidden="true">
            <span className="c-agentstep__thread" />
            <span className="c-agentstep__knot" />
          </span>
          <span className="c-agentstep__name">{typeof s.name === "string" ? s.name : pickText(s.name, lang)}</span>
        </li>
      ))}
    </ol>
  );
}
