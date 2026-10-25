import type { CommunityVerification, Lang, Text } from "../core/types";
import { verificationLines } from "./cards";
import { pickText, VERIFICATION_METHOD_WORDS } from "./strings";

export interface VerificationLineProps {
  testId?: string;
  /** The data model's verification method. */
  method: CommunityVerification["method"];
  /** Who would attest. */
  by: Text;
  note: Text;
  /** From `community.demo` (A2-3). Starts the line with L3 and adds L4 under it. */
  demo?: boolean;
  lang: Lang;
}

/**
 * How a maker would be verified: the method written out (after L3 with `demo`), who would attest,
 * and the note. With `demo` it ends with L4, so no page states a check that never ran.
 */
export function VerificationLine({ testId, method, by, note, demo = false, lang }: VerificationLineProps) {
  const { head, demoNote } = verificationLines(VERIFICATION_METHOD_WORDS[method], demo, lang);
  return (
    <div className={`c-verif${demo ? " c-verif--demo" : ""}`} data-testid={testId} data-method={method} lang={lang}>
      <p className="c-verif__head">
        <VerificationDot />
        <span>{head}</span>
      </p>
      <p className="c-verif__by">{pickText(by, lang)}</p>
      <p className="c-verif__note">{pickText(note, lang)}</p>
      {demoNote && (
        <p className="c-verif__demo" data-role="demo-note">
          {demoNote}
        </p>
      )}
    </div>
  );
}

/** The verification line's mark. The words carry the meaning, the dot only leads the eye. */
export function VerificationDot() {
  return (
    <svg className="c-verif__dot" viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
      <circle cx="5" cy="5" r="4" fill="currentColor" />
    </svg>
  );
}
