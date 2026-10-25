// How the piece's community would verify its makers (M-buyer T2): the kit VerificationLine from the
// community's `verification`, with `demo` from the community, so the line starts with L3 and shows
// L4 under it. The note is the community's own data (A2 R6). The test ID sits on the line itself,
// so its text starts with L3; the heading names it from the glossary.
import type { Community } from "../../core/types";
import { getById } from "../../mock";
import { VerificationLine } from "../../ui/VerificationLine";
import { page, tr, type Lang } from "./strings";

export interface PieceVerificationProps {
  lang: Lang;
  communityId: string;
}

export function PieceVerification({ lang, communityId }: PieceVerificationProps) {
  const community = getById<Community>(communityId);
  if (!community) return null;
  const { method, by, note } = community.verification;
  return (
    <section aria-label={tr(page.verification, lang)} className="flex flex-col gap-1">
      <h3 className="m-0 text-sm font-semibold text-ink">{tr(page.verification, lang)}</h3>
      <VerificationLine testId="buyer-verification" method={method} by={by} note={note} demo={community.demo} lang={lang} />
    </section>
  );
}
