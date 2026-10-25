// The draft, its checks, the index line and the approve link (F-seller-hub T5), test ID
// seller-listing-draft. It renders the newest listing.drafted for the followed listing, all from the
// event's payload (events.md: listing.drafted carries its text and figures):
// - the title and summary in English and Chinese. The version in the language the notes weren't
//   written in (not the request's lang) carries seller-listing-translated-<lang> with L27,
// - the facets and the vibe words as kit Chips,
// - one row per check (seller-listing-check-<checkId>): passed (jade, a check mark) or needs review
//   (amber, "!", the payload's note), never color alone,
// - seller-listing-indexed once a listing.indexed for the listing is in the store: the model, the
//   index, the passage it embedded and its new dot, and that it moves into the live index only when
//   the owner approves,
// - seller-listing-approve, enabled once an approval.requested names this listing in a
//   listing_publish approval (apr_04 for lst_01, an apr_user_<n> for a person's listing). It opens
//   /sell/approvals?ref=<approvalId>. It reads approved or declined after the decision.
import { navigate, sellRoute } from "../../core/nav";
import { useCindia } from "../../core/store";
import type { Lang as TextLang } from "../../core/types";
import { Button, Chip } from "../../ui";
import { publishApproval } from "./model";
import { GLOSSARY, L27, LISTING, SEP, t, tf, type Lang } from "./strings";
import styles from "./seller-hub.module.css";

const OTHER: Record<TextLang, TextLang> = { en: "zh", zh: "en" };

function CheckMark({ ok }: { ok: boolean }) {
  return ok ? (
    <svg className={styles.checkIcon} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M3 8.5 L6.5 12 L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ) : (
    <svg className={styles.checkIcon} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4 L8 9.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="8" cy="12" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function ListingDraftCard({ listingId, lang }: { listingId: string | null; lang: Lang }) {
  const { request, draft, indexed, approval } = useCindia((s) => ({
    request: listingId ? (s.listings.requests[listingId] ?? null) : null,
    draft: listingId ? (s.listings.drafts[listingId] ?? null) : null,
    indexed: listingId ? (s.listings.indexed[listingId] ?? null) : null,
    approval: publishApproval(s, listingId),
  }));

  const notesLang: TextLang = request?.lang ?? "en";
  const translated = OTHER[notesLang];

  const approveLabel = !approval
    ? t(LISTING.waitingProposal, lang)
    : approval.status === "granted"
      ? t(GLOSSARY.approved, lang)
      : approval.status === "declined"
        ? t(GLOSSARY.declined, lang)
        : t(LISTING.review, lang);

  const facetWords: string[] = draft
    ? [
        draft.facets.object[lang],
        ...draft.facets.materials,
        ...draft.facets.techniques,
        ...draft.facets.motifs,
        ...draft.facets.colors,
        ...(draft.facets.sizeCm ? [tf(LISTING.size, lang, { w: draft.facets.sizeCm.w, h: draft.facets.sizeCm.h })] : []),
        ...(draft.hours !== undefined ? [tf(LISTING.hours, lang, { n: draft.hours })] : []),
      ]
    : [];
  const vibeWords: string[] = draft ? [...draft.vibe.moods, ...draft.vibe.occasions, ...draft.vibe.recipients] : [];

  return (
    <div className={styles.draft} data-testid="seller-listing-draft" data-listing-id={listingId ?? undefined} lang={lang}>
      <h3 className={styles.h3}>
        {t(LISTING.draft, lang)}
        {listingId && <span className={styles.idTag}>{listingId}</span>}
      </h3>
      {!draft ? (
        <p className={styles.empty}>{t(request ? LISTING.draftWaiting : LISTING.draftIdle, lang)}</p>
      ) : (
        <>
          <div className={styles.version} lang={notesLang} data-version={notesLang}>
            <p className={styles.draftTitle}>{draft.title[notesLang]}</p>
            <p className={styles.draftSummary}>{draft.summary[notesLang]}</p>
          </div>
          <div className={styles.versionTranslated} lang={translated} data-version={translated}>
            <p className={styles.draftTitleSmall}>{draft.title[translated]}</p>
            <p className={styles.draftSummarySmall} title={draft.summary[translated]}>
              {draft.summary[translated]}
            </p>
            <p className={styles.l27} data-testid={`seller-listing-translated-${translated}`} lang={lang}>
              <span className={styles.l27Dot} aria-hidden="true" />
              {t(L27, lang)}
            </p>
          </div>
          <div className={styles.chipRows}>
            <div className={styles.chipRow} data-chips="facets">
              <span className={styles.chipLabel}>{t(LISTING.facts, lang)}</span>
              {facetWords.map((w, i) => (
                <Chip key={`${w}-${i}`} label={w} lang={lang} />
              ))}
            </div>
            <div className={styles.chipRow} data-chips="vibe">
              <span className={styles.chipLabel}>{t(LISTING.vibe, lang)}</span>
              {vibeWords.length === 0 ? (
                <span className={styles.soft}>{t(LISTING.noWords, lang)}</span>
              ) : (
                vibeWords.map((w, i) => <Chip key={`${w}-${i}`} label={w} lang={lang} selected />)
              )}
            </div>
          </div>
          <ul className={styles.checks} aria-label={t(LISTING.checks, lang)}>
            {draft.checks.map((c) => (
              <li
                key={c.checkId}
                className={c.ok ? styles.checkOk : styles.checkReview}
                data-testid={`seller-listing-check-${c.checkId}`}
                data-ok={c.ok ? "true" : "false"}
                data-kind={c.kind}
                title={c.ok ? c.note[lang] : undefined}
              >
                <CheckMark ok={c.ok} />
                <span className={styles.checkText}>
                  <strong className={styles.checkKind}>
                    {t(LISTING.checkKinds[c.kind], lang)}
                    {SEP}
                    {t(c.ok ? LISTING.passed : LISTING.needsReview, lang)}
                  </strong>{" "}
                  <span>{c.note[lang]}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {indexed ? (
        <div className={styles.indexed} data-testid="seller-listing-indexed" data-index={indexed.index} data-model-id={indexed.modelId}>
          <span className={styles.indexDot} aria-hidden="true" />
          <div className={styles.indexBody}>
            <p>
              {tf(indexed.index === "cindia-pieces" ? LISTING.indexedLive : LISTING.indexedDraft, lang, {
                model: indexed.modelId,
                index: indexed.index,
                piece: indexed.pieceId,
              })}
              {indexed.point && (
                <span className={styles.soft}>
                  {" "}
                  {tf(LISTING.dot, lang, { x: indexed.point.x, y: indexed.point.y })}
                  {indexed.approx ? `${SEP}${t(LISTING.approximate, lang)}` : ""}
                </span>
              )}
            </p>
            <p className={styles.passage} title={indexed.embedText}>
              <span className={styles.passageLabel}>{t(LISTING.passage, lang)}: </span>
              <span lang="en">{indexed.embedText}</span>
            </p>
          </div>
        </div>
      ) : draft ? (
        <p className={styles.soft}>{t(LISTING.indexWaiting, lang)}</p>
      ) : null}
      {request && (
        <div className={styles.approveRow}>
          <Button
            testId="seller-listing-approve"
            variant={approval?.status === "pending" ? "primary" : "quiet"}
            size="small"
            disabled={!approval}
            data-approval-id={approval?.approvalId}
            data-status={approval?.status ?? "waiting"}
            onClick={() => {
              if (approval) navigate(sellRoute("approvals", { ref: approval.approvalId }));
            }}
          >
            {approveLabel}
          </Button>
          <p className={styles.approveNote}>
            {approval?.status === "pending" ? t(GLOSSARY.proposedByCindy, lang) : t(LISTING.onlyOwner, lang)}
          </p>
        </div>
      )}
    </div>
  );
}
