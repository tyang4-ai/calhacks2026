import type { ReactNode } from "react";
import type { Lang, Text } from "../core/types";
import { Badge } from "./Badge";
import { pickText, YOU_WORD } from "./strings";

export interface ChatMessage {
  id: string;
  /** person: the one asking, on the right. agent: Cindia's side, on the left. note: a quiet line. */
  role: "person" | "agent" | "note";
  /** An agent's name, or a maker's on Cindia's side. */
  agentName?: Text;
  /** A `code` agent shows the Rule-based badge beside its name. No kind, no agent badge. */
  agentKind?: "claude" | "code";
  text: Text;
  /** Player time (ms), kept on the bubble as data-at. */
  at?: number;
  /** On the bubble, such as support-msg-<n> or support-reply. */
  testId?: string;
  /** On the agent's name, such as support-agent. */
  nameTestId?: string;
  /** Over a person's bubble. Default "You". */
  personName?: Text;
  /** Beside the name, such as the Demo data badge. */
  badge?: ReactNode;
  /** Under the words, such as reference links or a tool and its time. */
  detail?: ReactNode;
}

export interface ChatBubbleProps extends Omit<ChatMessage, "id"> {
  id?: string;
  lang: Lang;
}

/** One message. An agent bubble names its agent, with "Rule-based" for a `code` agent. */
export function ChatBubble({ id, role, agentName, agentKind, text, at, testId, nameTestId, personName, badge, detail, lang }: ChatBubbleProps) {
  const words = pickText(text, lang);
  if (role === "note") {
    return (
      <div className="c-bubble c-bubble--note" data-testid={testId} data-role="note" data-message-id={id} data-at={at} lang={lang}>
        <p className="c-bubble__text">{words}</p>
        {detail !== undefined && <div className="c-bubble__detail">{detail}</div>}
      </div>
    );
  }
  const isAgent = role === "agent";
  const name = isAgent ? (agentName ? pickText(agentName, lang) : "") : pickText(personName ?? YOU_WORD, lang);
  return (
    <div
      className={`c-bubble c-bubble--${role}`}
      data-testid={testId}
      data-role={role}
      data-agent-kind={isAgent ? agentKind : undefined}
      data-message-id={id}
      data-at={at}
      lang={lang}
    >
      {(name || badge !== undefined || (isAgent && agentKind === "code")) && (
        <p className="c-bubble__head">
          {name && (
            <span className="c-bubble__name" data-testid={nameTestId}>
              {name}
            </span>
          )}
          {isAgent && agentKind === "code" && <Badge variant="rule" />}
          {badge}
        </p>
      )}
      <p className="c-bubble__text">{words}</p>
      {detail !== undefined && <div className="c-bubble__detail">{detail}</div>}
    </div>
  );
}
