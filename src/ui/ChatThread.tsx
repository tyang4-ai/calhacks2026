import type { ReactNode } from "react";
import type { Lang, Text } from "../core/types";
import { ChatBubble, type ChatMessage } from "./ChatBubble";
import { pickText } from "./strings";

export interface ChatThreadProps {
  testId?: string;
  /** In order, oldest first. */
  messages: ChatMessage[];
  lang: Lang;
  /** The input row, under a hairline. */
  footer?: ReactNode;
  /** Shown while there are no messages. */
  emptyText?: Text;
  /** Shown after the last message, such as a working line. */
  after?: ReactNode;
}

/** A conversation: the person's messages on the right, Cindia's on the left, then the input row. */
export function ChatThread({ testId, messages, lang, footer, emptyText, after }: ChatThreadProps) {
  return (
    <div className="c-chat" data-testid={testId} lang={lang}>
      <ol className="c-chat__list">
        {messages.length === 0 && emptyText && <li className="c-chat__empty">{pickText(emptyText, lang)}</li>}
        {messages.map((m) => (
          <li key={m.id} className={`c-chat__item c-chat__item--${m.role}`}>
            <ChatBubble {...m} lang={lang} />
          </li>
        ))}
      </ol>
      {after !== undefined && <div className="c-chat__after">{after}</div>}
      {footer !== undefined && <div className="c-chat__footer">{footer}</div>}
    </div>
  );
}
