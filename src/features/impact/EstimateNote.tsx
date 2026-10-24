// F-impact T2: the glossary's estimate label on each impact number, and the one-line note under
// them, both shown only while the impact.updated payload's estimate is true.
import { Badge } from "../../ui";
import { GLOSSARY, UI, t, type Lang } from "./strings";

export interface EstimateProps {
  /** The impact.updated payload's estimate field; false (or no payload yet) renders nothing. */
  estimate: boolean;
  lang: Lang;
}

/** The glossary's estimate label, shown on each number while estimate is true. */
export function EstimateLabel({ estimate, lang }: EstimateProps) {
  if (!estimate) return null;
  return (
    <span className="c-impact__estimate" style={{ display: "inline-block", marginLeft: 8, verticalAlign: "middle" }}>
      <Badge variant="neutral" title={t(UI.estimateNote, lang)}>
        <span lang={lang}>{t(GLOSSARY.estimate, lang)}</span>
      </Badge>
    </span>
  );
}

/** The one-line note under the numbers, test ID impact-estimate-note, while estimate is true. */
export function EstimateNote({ estimate, lang }: EstimateProps) {
  if (!estimate) return null;
  return (
    <p
      data-testid="impact-estimate-note"
      lang={lang}
      style={{ margin: "16px 0 0", fontSize: 14, lineHeight: "20px", color: "var(--c-color-ink-soft)" }}
    >
      {t(UI.estimateNote, lang)}
    </p>
  );
}
