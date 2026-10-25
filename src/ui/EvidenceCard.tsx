import type { ReactNode } from "react";

export interface EvidenceCardProps {
  testId?: string;
  /** What kind of record this is: Contract, Statement, Bank record. */
  kind: ReactNode;
  title: ReactNode;
  /** The key figure, highlighted. */
  figure?: ReactNode;
  figureLabel?: ReactNode;
  /** Supporting lines, label and value. */
  rows?: { label: ReactNode; value: ReactNode }[];
  /** flagged: the record that disagrees. trusted: the record Cindy says is right. */
  state?: "neutral" | "flagged" | "trusted";
  footer?: ReactNode;
}

/**
 * One source document, shown side by side with the others for a flag. The key figure sits in a band
 * with a 3 px left rule and a wash: jade when Cindy trusts the record, seal when it disagrees.
 */
export function EvidenceCard({ testId, kind, title, figure, figureLabel, rows, state = "neutral", footer }: EvidenceCardProps) {
  return (
    <article className={`c-evidence${state !== "neutral" ? ` c-evidence--${state}` : ""}`} data-testid={testId}>
      <div className="c-evidence__kind">{kind}</div>
      <div className="c-evidence__title">{title}</div>
      {figure !== undefined && (
        <div className="c-evidence__band">
          {figureLabel && <div className="c-evidence__figure-label">{figureLabel}</div>}
          <div className="c-evidence__figure">{figure}</div>
        </div>
      )}
      {rows && rows.length > 0 && (
        <dl className="c-evidence__rows">
          {rows.map((r, i) => (
            <div key={i} style={{ display: "contents" }}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {footer}
    </article>
  );
}
