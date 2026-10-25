// A work in progress and its milestones (T4), with the kit MilestoneTimeline: the commission's
// title, maker and price, then each milestone (wip-milestone-<milestoneId>) with its label, share
// and amount, and its status: pending, reached, waiting for approval, or paid with its date.
// - Shop mode is read-only.
// - Sell mode shows a release button (wip-release-<milestoneId>) on one milestone only: the first
//   pending one when every milestone before it is paid. Pressing it emits a person's
//   wip.milestone_reached on the fixed demo date. Cindy answers with a proposal (apr_05 for
//   wip_01's second milestone), and only the owner's approval on Sell › Approvals pays it.
// Statuses and amounts come from projectModel.ts, which merges the mock with the store.
import { userEvent } from "../../core/events";
import { emit, useCindia } from "../../core/store";
import type { Community, Person } from "../../core/types";
import { getById } from "../../mock";
import { Button, Link, MakerMark, MilestoneTimeline, Money } from "../../ui";
import { projectsRoute } from "../../core/nav";
import styles from "./communities.module.css";
import { DEMO_DECISION_DATE, findWip, releasableMilestone, wipMilestones, type MilestoneView } from "./projectModel";
import { GLOSSARY, SEP, t, tf, UI, type Lang } from "./strings";

export interface WipTimelineProps {
  wipId: string;
  mode: "shop" | "sell";
  lang: Lang;
  /** The work in progress's own page (/shop/projects/wip_…): the root carries communities-wip-page. */
  asPage?: boolean;
  /** On a list: the title links to the work in progress's own page. */
  linkTitle?: boolean;
}

export function WipTimeline({ wipId, mode, lang, asPage = false, linkTitle = false }: WipTimelineProps) {
  const wipState = useCindia((s) => s.wip);
  const approvals = useCindia((s) => s.approvals);
  const wip = findWip(wipId);
  if (!wip) return null;
  const milestones = wipMilestones(wip, { wip: wipState, approvals });
  const releasable = mode === "sell" ? releasableMilestone(milestones) : null;
  const byId = new Map(milestones.map((m) => [m.milestoneId, m]));
  const maker = getById<Person>(wip.makerId);
  const community = getById<Community>(wip.communityId);
  const makerName = maker ? t(maker.name, lang) : "";

  const release = (m: MilestoneView) => {
    emit(userEvent("wip.milestone_reached", { wipId: wip.id, milestoneId: m.milestoneId, date: DEMO_DECISION_DATE }));
  };

  const title = t(wip.title, lang);
  return (
    <article className={styles.wip} data-testid={asPage ? "communities-wip-page" : undefined} data-wip-id={wip.id} lang={lang}>
      <div className={styles.section}>
        <span className="c-tag" style={{ alignSelf: "flex-start" }}>
          {t(GLOSSARY.wip, lang)}
        </span>
        <h3 className={styles.h3}>{linkTitle ? <Link to={projectsRoute(wip.id)}>{title}</Link> : title}</h3>
        <p className={styles.wipMeta}>
          <span className={styles.person}>
            {maker && <MakerMark char={maker.surnameChar} size={28} label={makerName} />}
            <span>
              {tf(UI.commissionBy, lang, { name: makerName })}
              {community ? `${SEP}${t(community.name, lang)}` : ""}
            </span>
          </span>
          <span>
            {t(UI.price, lang)} <Money cents={wip.priceCents} />
          </span>
        </p>
        {asPage && <p className={styles.note}>{t(UI.paidInStages, lang)}</p>}
      </div>
      <MilestoneTimeline
        testIdPrefix="wip-milestone-"
        milestones={milestones.map((m) => ({
          milestoneId: m.milestoneId,
          label: m.label,
          shareBps: m.shareBps,
          amountCents: m.amountCents,
          status: m.status,
          ...(m.date ? { date: m.date } : {}),
        }))}
        lang={lang}
        renderNote={(id) => {
          const m = byId.get(id);
          return m ? <ReleaseNote milestone={m} mode={mode} lang={lang} /> : null;
        }}
        renderAction={(id) => {
          const m = byId.get(id);
          if (!m || id !== releasable) return null;
          return (
            <Button testId={`wip-release-${id}`} variant="quiet" size="small" onClick={() => release(m)}>
              {t(UI.release, lang)}
            </Button>
          );
        }}
      />
    </article>
  );
}

/** Whether the milestone's release waits for the owner, was approved or declined. Nothing once it's paid. */
function ReleaseNote({ milestone, mode, lang }: { milestone: MilestoneView; mode: "shop" | "sell"; lang: Lang }) {
  if (milestone.status === "paid") return null;
  switch (milestone.release) {
    case "pending":
      return (
        <span className={styles.pending} data-release="pending">
          {t(mode === "sell" ? GLOSSARY.approval : UI.waiting, lang)}
        </span>
      );
    case "granted":
      return <span data-release="granted">{t(GLOSSARY.approved, lang)}</span>;
    case "declined":
      return <span data-release="declined">{t(GLOSSARY.declined, lang)}</span>;
    default:
      return null;
  }
}

export default WipTimeline;
