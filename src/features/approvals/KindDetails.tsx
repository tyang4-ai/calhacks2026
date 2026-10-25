// The selected approval in full, for the detail column (approvals-detail): its header, the decision's
// outcome once decided, then what the kind needs the owner to see and the line saying Cindy proposed it.
// - follow_up: v1's draft (FollowUpDraft). maker_payouts: v1's payout lines (PayoutLines).
// - report_listing (approvals-hit): the found listing from its counterfeit.flagged, the Reporter's
//   draft, the fairness line and L20.
// - listing_publish (approvals-listing): the draft in the maker's own language (English only, so no
//   translated version), the facet and vibe words and the checks, from listing.drafted.
// - storefront_publish: the drafted blocks in order. milestone_release (approvals-milestone): the
//   commission, the maker, the buyer, the milestone and its share, paid on wip.milestone_paid.
// - support_action: the thread's latest reply and why a person is needed.
// Before a kind's event has arrived, it says what it's waiting for.
import type { ReactNode } from "react";
import { useCindia } from "../../core/store";
import type { ApprovalKind, ListingDraft, Person, Text, WorkInProgress } from "../../core/types";
import { getById } from "../../mock";
import { Badge, Chip, MakerMark, Money, formatDate } from "../../ui";
import { findFollowUp, recordFromState, summarizeApproval, supportFor } from "./approvalSummary";
import { DecisionOutcome } from "./DecisionBar";
import { FollowUpDraft } from "./FollowUpDraft";
import { PayoutLines } from "./PayoutLines";
import { isLiveHit } from "./selection";
import { BLOCK_KIND, CHECK_KIND, GLOSSARY, KIND_WAITING, LABELS, UI, t, textMatchLine, type Lang } from "./strings";

const soft = { color: "var(--c-color-ink-soft)", fontSize: "var(--c-text-14)" } as const;
const sectionStyle = { display: "flex", flexDirection: "column", gap: "var(--c-space-8)", fontSize: "var(--c-text-16)", lineHeight: 1.45 } as const;
const blockStyle = {
  border: "1px solid var(--c-color-line)",
  borderRadius: "var(--c-radius-control)",
  padding: "var(--c-space-12)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--c-space-4)",
} as const;
const P = { margin: 0 } as const;

function Waiting({ kind, lang }: { kind: ApprovalKind; lang: Lang }) {
  return <p style={{ ...P, ...soft }}>{t(KIND_WAITING[kind], lang)}</p>;
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p style={P}>
      <span style={{ ...soft, marginRight: "var(--c-space-8)" }}>{label}</span>
      {children}
    </p>
  );
}

function FollowUpDetails({ approvalId, lang }: { approvalId: string; lang: Lang }) {
  const drafted = useCindia((s) => Boolean(findFollowUp(s, approvalId)));
  return drafted ? <FollowUpDraft approvalId={approvalId} lang={lang} /> : <Waiting kind="follow_up" lang={lang} />;
}

function HitDetails({ approvalId, cftId, live, lang }: { approvalId: string; cftId: string; live: boolean; lang: Lang }) {
  const hit = useCindia((s) => s.watch.hits[cftId] ?? null);
  if (!hit) return <Waiting kind="report_listing" lang={lang} />;
  return (
    <section data-testid="approvals-hit" style={sectionStyle}>
      <div style={{ ...blockStyle }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--c-space-8)" }}>
          <span style={{ ...soft, fontWeight: 600 }}>{t(UI.foundListing, lang)}</span>
          {live && <Badge variant="live" title={t(UI.liveHit, lang)} />}
        </div>
        <p lang="en" style={{ ...P, fontWeight: 600 }}>
          {hit.title}
        </p>
        {/* The address as plain text, never a link. */}
        <Labeled label={t(UI.address, lang)}>
          <span lang="en" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "var(--c-text-14)", overflowWrap: "anywhere" }}>
            {hit.url}
          </span>
        </Labeled>
        <p lang="en" style={{ ...P, ...soft, fontStyle: "italic" }}>
          {hit.snippet}
        </p>
        <p style={{ ...P, fontWeight: 600 }}>{t(textMatchLine(hit.similarity), lang)}</p>
        <Labeled label={t(UI.claim, lang)}>{t(hit.claim, lang)}</Labeled>
      </div>
      <FollowUpDraft approvalId={approvalId} lang={lang} heading={UI.reporterDraft} note={UI.reporterDraftNote} />
      <p style={P}>{t(UI.fairness, lang)}</p>
      <p data-testid="approvals-hit-unverified" style={{ ...P, fontWeight: 600 }}>
        {t(LABELS.L20, lang)}
      </p>
    </section>
  );
}

function ListingDetails({ listingId, lang }: { listingId: string; lang: Lang }) {
  const draft = useCindia((s) => s.listings.drafts[listingId] ?? null);
  const requestLang = useCindia((s) => s.listings.requests[listingId]?.lang);
  if (!draft) return <Waiting kind="listing_publish" lang={lang} />;
  // The site is English only (decisions.md, Oct 24 11:35 PM): the card shows the draft in the
  // language the maker wrote her notes in, the request's (lst_01's own record in the mock as a
  // fallback), and never the Lister's translation of it.
  const record = getById<ListingDraft>(listingId);
  const own: Lang = requestLang ?? (record && "notes" in record ? record.lang : undefined) ?? "en";
  const words: (string | Text)[] = [
    draft.facets.object,
    ...draft.facets.materials,
    ...draft.facets.techniques,
    ...draft.facets.motifs,
    ...draft.facets.colors,
    ...draft.vibe.moods,
    ...draft.vibe.occasions,
    ...draft.vibe.recipients,
  ];
  return (
    <section data-testid="approvals-listing" style={sectionStyle}>
      <div lang={own} style={blockStyle}>
        <span lang={lang} style={{ ...soft, fontWeight: 600 }}>
          {t(UI.draftTitle, lang)}
        </span>
        <strong>{draft.title[own]}</strong>
        <p style={{ ...P, fontSize: "var(--c-text-14)" }}>{draft.summary[own]}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-4)" }}>
        <span style={{ ...soft, fontWeight: 600 }}>{t(UI.words, lang)}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--c-space-4)" }}>
          {words.map((w, i) => (
            <Chip key={i} label={w} lang={lang} />
          ))}
        </div>
        {draft.hours !== undefined && (
          <span style={soft}>
            {t(GLOSSARY.hoursOfWork, lang)}: {draft.hours}
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-4)" }}>
        <span style={{ ...soft, fontWeight: 600 }}>{t(UI.checks, lang)}</span>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}>
          {draft.checks.map((c) => (
            <li key={c.checkId} data-check={c.checkId} style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: "var(--c-text-14)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "var(--c-space-8)" }}>
                <strong>{t(CHECK_KIND[c.kind] ?? { en: c.kind, zh: c.kind }, lang)}</strong>
                <Badge variant={c.ok ? "jade" : "amber"}>{c.ok ? `✓ ${t(UI.checkPassed, lang)}` : `! ${t(UI.checkReview, lang)}`}</Badge>
              </span>
              <span style={{ color: "var(--c-color-ink-soft)" }}>{t(c.note, lang)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** A storefront block's props in words: its strings as written, and the records a list names by title. */
function blockWords(props: Record<string, string | string[]>, lang: Lang): string[] {
  const out: string[] = [];
  for (const value of Object.values(props)) {
    if (typeof value === "string") out.push(value);
    else {
      const titles = value.map((id) => {
        const rec = getById(id) as { title?: Text; name?: Text } | undefined;
        const name = rec?.title ?? rec?.name;
        return name ? t(name, lang) : id;
      });
      out.push(titles.join(", "));
    }
  }
  return out;
}

function StorefrontDetails({ storefrontId, lang }: { storefrontId: string; lang: Lang }) {
  const blocks = useCindia((s) => s.storefront.drafts[storefrontId]?.blocks ?? null);
  if (!blocks) return <Waiting kind="storefront_publish" lang={lang} />;
  return (
    <section style={sectionStyle}>
      <span style={{ ...soft, fontWeight: 600 }}>{t(UI.blocks, lang)}</span>
      <ol style={{ margin: 0, paddingLeft: "var(--c-space-24)", display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}>
        {blocks.map((b) => (
          <li key={b.blockId} style={{ fontSize: "var(--c-text-14)" }}>
            <strong>{t(BLOCK_KIND[b.kind] ?? { en: b.kind, zh: b.kind }, lang)}</strong>
            {blockWords(b.props, lang).map((w, i) => (
              <span key={i} lang="en" style={{ display: "block", color: "var(--c-color-ink-soft)" }}>
                {w}
              </span>
            ))}
          </li>
        ))}
      </ol>
    </section>
  );
}

function MilestoneDetails({ subjectIds, amountCents, lang }: { subjectIds: string[]; amountCents?: number; lang: Lang }) {
  const wip = getById<WorkInProgress>(subjectIds.find((id) => id.startsWith("wip_")) ?? "");
  const mls = wip?.milestones.find((m) => subjectIds.includes(m.milestoneId));
  const state = useCindia((s) => (mls ? (s.wip.milestones[mls.milestoneId] ?? null) : null));
  if (!wip || !mls) return <Waiting kind="milestone_release" lang={lang} />;
  const maker = getById<Person>(wip.makerId);
  const buyer = getById<Person>(wip.buyerId);
  const paid = state?.status === "paid" || mls.status === "paid";
  const paidDate = state?.status === "paid" ? state.date : mls.date;
  return (
    <section data-testid="approvals-milestone" style={sectionStyle}>
      <Labeled label={t(UI.commission, lang)}>
        <strong>{t(wip.title, lang)}</strong>
      </Labeled>
      {maker && (
        <p style={{ ...P, display: "flex", alignItems: "center", gap: "var(--c-space-8)" }}>
          <span style={soft}>{t(GLOSSARY.maker, lang)}</span>
          <MakerMark char={maker.surnameChar} label={t(maker.name, lang)} size={28} />
          {t(maker.name, lang)}
        </p>
      )}
      {buyer && <Labeled label={t(GLOSSARY.buyer, lang)}>{t(buyer.name, lang)}</Labeled>}
      <div style={blockStyle}>
        <Labeled label={t(GLOSSARY.milestone, lang)}>
          <strong>{t(mls.label, lang)}</strong>
        </Labeled>
        {amountCents !== undefined && (
          <Labeled label={t(UI.milestoneAmount, lang)}>
            <Money cents={amountCents} style={{ fontWeight: 600 }} />
          </Labeled>
        )}
        <span style={{ display: "flex", alignItems: "center", gap: "var(--c-space-8)", fontSize: "var(--c-text-14)" }}>
          {paid ? (
            <>
              <Badge variant="jade">{t(GLOSSARY.paid, lang)}</Badge>
              {paidDate && <span style={soft}>{formatDate(paidDate, lang)}</span>}
            </>
          ) : (
            <Badge variant="neutral">{t(UI.milestonePending, lang)}</Badge>
          )}
        </span>
      </div>
    </section>
  );
}

function SupportDetails({ approvalId, subjectIds, amountCents, lang }: { approvalId: string; subjectIds: string[]; amountCents?: number; lang: Lang }) {
  const view = useCindia((s) => supportFor(s, approvalId, subjectIds) ?? null);
  if (!view) return <Waiting kind="support_action" lang={lang} />;
  return (
    <section style={sectionStyle}>
      {view.latestReply && (
        <div style={blockStyle}>
          <span style={{ ...soft, fontWeight: 600 }}>{t(UI.latestReply, lang)}</span>
          <p style={P}>{t(view.latestReply, lang)}</p>
        </div>
      )}
      {view.reason && (
        <div style={blockStyle}>
          <span style={{ ...soft, fontWeight: 600 }}>{t(UI.escalated, lang)}</span>
          <p style={P}>{t(view.reason, lang)}</p>
        </div>
      )}
      {amountCents !== undefined && (
        <Labeled label={t(UI.amount, lang)}>
          <Money cents={amountCents} style={{ fontWeight: 600 }} />
        </Labeled>
      )}
    </section>
  );
}

export interface KindDetailsProps {
  approvalId: string;
  lang: Lang;
  /** Hits whose counterfeit.flagged came from a live scan. */
  liveHits: string[];
}

/** What the selected approval's kind needs the owner to see. */
export function KindDetails({ approvalId, lang, liveHits }: KindDetailsProps) {
  const record = useCindia((s) => recordFromState(s, approvalId) ?? null);
  if (!record) return <p style={{ ...P, ...soft }}>{t(UI.noDetails, lang)}</p>;
  const first = record.subjectIds[0] ?? "";
  switch (record.kind) {
    case "follow_up":
      return <FollowUpDetails approvalId={approvalId} lang={lang} />;
    case "maker_payouts":
      return <PayoutLines approvalId={approvalId} lang={lang} />;
    case "report_listing":
      return <HitDetails approvalId={approvalId} cftId={first} live={isLiveHit(first, liveHits)} lang={lang} />;
    case "listing_publish":
      return <ListingDetails listingId={first} lang={lang} />;
    case "storefront_publish":
      return <StorefrontDetails storefrontId={first} lang={lang} />;
    case "milestone_release":
      return <MilestoneDetails subjectIds={record.subjectIds} amountCents={record.amountCents} lang={lang} />;
    case "support_action":
      return <SupportDetails approvalId={approvalId} subjectIds={record.subjectIds} amountCents={record.amountCents} lang={lang} />;
  }
}

export type ApprovalDetailProps = KindDetailsProps;

/** The detail column's content: the header, the kind's details, Cindy's line and the outcome. */
export function ApprovalDetail({ approvalId, lang, liveHits }: ApprovalDetailProps) {
  const summary = useCindia((s) => summarizeApproval(approvalId, s) ?? null);
  const headingFont = lang === "zh" ? "var(--c-font-heading-zh)" : "var(--c-font-heading-en)";
  return (
    <article lang={lang} style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-16)", color: "var(--c-color-ink)" }}>
      <header style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-4)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--c-space-8)" }}>
          <span style={{ ...soft, fontWeight: 600 }}>{summary ? t(summary.tag, lang) : ""}</span>
          <span style={{ ...soft, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{approvalId}</span>
        </div>
        <h3 style={{ margin: 0, fontFamily: headingFont, fontSize: "var(--c-text-21)", fontWeight: 600, lineHeight: 1.25 }}>
          {summary ? t(summary.title, lang) : t(UI.noDetails, lang)}
        </h3>
        {summary && (summary.amountCents !== undefined || summary.overLimit) && (
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "var(--c-space-8)" }}>
            {summary.amountCents !== undefined && <Money cents={summary.amountCents} style={{ fontSize: "var(--c-text-24)", fontWeight: 700 }} />}
            {summary.overLimit && <Badge variant="seal">{t(GLOSSARY.overLimit, lang)}</Badge>}
          </div>
        )}
        {summary && (
          <p style={{ margin: 0, fontSize: "var(--c-text-14)", lineHeight: 1.45 }}>
            {t(summary.summary, lang)}
            {summary.extra && <span style={{ color: "var(--c-color-ink-soft)" }}> {t(summary.extra, lang)}</span>}
          </p>
        )}
      </header>
      <DecisionOutcome approvalId={approvalId} kind={summary?.kind} lang={lang} />
      <KindDetails approvalId={approvalId} lang={lang} liveHits={liveHits} />
      <p style={{ ...P, ...soft }}>{t(GLOSSARY.proposedByCindy, lang)}</p>
    </article>
  );
}
