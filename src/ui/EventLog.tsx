import type { Lang, Text } from "../core/types";
import { EVENT_LOG_WORDS, pickText } from "./strings";
import { logRows, logSeconds } from "./views";

export interface EventLogRow {
  id: string;
  /** Player time (ms). */
  at: number;
  type: string;
  source: "scripted" | "live" | "user";
  key?: string;
}

export interface EventLogProps {
  testId?: string;
  /** In arrival order, newest last, as the store's log keeps them. The log never re-sorts. */
  rows: EventLogRow[];
  /** Default 50: the newest rows are kept. */
  maxRows?: number;
  /** Default English. */
  lang?: Lang;
  /** Default "Event log". */
  title?: Text;
}

/**
 * The raw event log: time in seconds on the player clock, type, source and key, newest last. It
 * keeps the given order, because a paused player gives many events the same time.
 */
export function EventLog({ testId, rows, maxRows = 50, lang = "en", title = EVENT_LOG_WORDS.title }: EventLogProps) {
  const shown = logRows(rows, maxRows);
  const sec = pickText(EVENT_LOG_WORDS.seconds, lang);
  return (
    <div className="c-eventlog" data-testid={testId} lang={lang}>
      <p className="c-eventlog__title">{pickText(title, lang)}</p>
      {shown.length === 0 ? (
        <p className="c-eventlog__empty">{pickText(EVENT_LOG_WORDS.empty, lang)}</p>
      ) : (
        <table className="c-eventlog__table">
          <thead>
            <tr>
              <th scope="col">{pickText(EVENT_LOG_WORDS.time, lang)}</th>
              <th scope="col">{pickText(EVENT_LOG_WORDS.type, lang)}</th>
              <th scope="col">{pickText(EVENT_LOG_WORDS.source, lang)}</th>
              <th scope="col">{pickText(EVENT_LOG_WORDS.key, lang)}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} data-event-id={r.id} data-source={r.source}>
                <td className="c-eventlog__time">
                  {logSeconds(r.at)} {sec}
                </td>
                <td>{r.type}</td>
                <td className={`c-eventlog__source c-eventlog__source--${r.source}`}>{r.source}</td>
                <td>{r.key ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
