// Sell › Projects (studio.projects.main, T5) for the co-op (com_dine), since the Sell site is the
// co-op's: one kit Panel that declares b08-approvals, with Cindy's newest line about this page
// (communities-cindy-note), the co-op's project and its progress, the contributions in this run
// (communities-contributions: each one's ID, amount and order when it came with one), and the
// co-op's works in progress through WipTimeline in Sell mode. Releasing a milestone proposes an
// approval; granting it happens on Sell › Approvals.
import type { SourceKey } from "../../core/events";
import type { SlotProps } from "../../core/featureTypes";
import { useCindia } from "../../core/store";
import { Money, Panel, ProjectCard } from "../../ui";
import styles from "./communities.module.css";
import { contributionsOf, newestActAbout, projectOf, raisedCents, sellCommunity, wipsOf } from "./projectModel";
import { GLOSSARY, t, UI, type Lang } from "./strings";
import { WipTimeline } from "./WipTimeline";

const SOURCE_KEYS: SourceKey[] = ["b08-approvals"];

export function SellProjects({ lang }: SlotProps) {
  const community = sellCommunity();
  const project = community ? projectOf(community) : undefined;
  const wips = community ? wipsOf(community.id) : [];
  return (
    <Panel
      testId="communities-sell"
      sourceKeys={SOURCE_KEYS}
      title={t(UI.sellTitle, lang)}
      lang={lang}
      className="[&>div]:flex [&>div]:flex-col"
      style={{ flex: "1 1 auto", minHeight: 0, boxSizing: "border-box" }}
    >
      <div className={styles.scroll}>
        <CindyNote ids={[...(project ? [project.id] : []), ...wips.flatMap((w) => [w.id, ...w.milestones.map((m) => m.milestoneId)])]} lang={lang} />
        <div className={styles.sellGrid}>
          <div className={styles.section}>
            <h2 className={styles.h2}>{t(GLOSSARY.project, lang)}</h2>
            {project && <SellProject projectId={project.id} lang={lang} />}
          </div>
          <div className={styles.section}>
            <h2 className={styles.h2}>{t(UI.wipsTitle, lang)}</h2>
            {wips.map((w) => (
              <WipTimeline key={w.id} wipId={w.id} mode="sell" lang={lang} />
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** Cindy's newest agent.acted line about this page's project, commissions or milestones. */
function CindyNote({ ids, lang }: { ids: string[]; lang: Lang }) {
  const agent = useCindia((s) => s.agent);
  const act = newestActAbout(ids, { agent });
  return (
    <p className={styles.cindy} data-testid="communities-cindy-note" data-act-id={act?.actId} aria-live="polite">
      <strong>{t(GLOSSARY.cindy, lang)}: </strong>
      {act ? t(act.text, lang) : <span className={styles.soft}>{t(UI.cindyIdle, lang)}</span>}
    </p>
  );
}

/** The co-op's project with its progress, then the contributions this run added to it. */
function SellProject({ projectId, lang }: { projectId: string; lang: Lang }) {
  const projectsState = useCindia((s) => s.projects);
  const community = sellCommunity();
  const project = community ? projectOf(community) : undefined;
  if (!project || project.id !== projectId) return null;
  const list = contributionsOf(project.id, { projects: projectsState });
  return (
    <div className={styles.section}>
      <ProjectCard
        testId={`project-card-${project.id}`}
        progressTestId={`project-progress-${project.id}`}
        title={project.title}
        summary={project.summary}
        raisedCents={raisedCents(project, { projects: projectsState })}
        goalCents={project.goalCents}
        lang={lang}
      />
      <h3 className={styles.h3}>{t(UI.contributions, lang)}</h3>
      <div data-testid="communities-contributions">
        {list.length === 0 ? (
          <p className={styles.soft}>{t(UI.noContributions, lang)}</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t(UI.contribution, lang)}</th>
                <th scope="col" className={styles.num}>
                  {t(UI.amount, lang)}
                </th>
                <th scope="col">{t(GLOSSARY.order, lang)}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.contributionId} data-contribution-id={c.contributionId}>
                  <td>{c.contributionId}</td>
                  <td className={styles.num}>
                    <Money cents={c.amountCents} tone="in" />
                  </td>
                  <td>{c.orderId ?? <span className={styles.soft}>{t(UI.noOrder, lang)}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default SellProjects;
