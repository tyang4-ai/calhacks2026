// The projects route (shop.projects.main, T6), reading SlotProps.projectId, all inside one kit
// Panel that declares b08-approvals:
// - without an ID: every project's ProjectCard (each opens its page) and every work in progress
//   with its milestones (communities-list),
// - with a prj_ ID: the project's community, FundProject (summary, progress, picker, L7, the fund
//   button) and its dated updates,
// - with a wip_ ID: WipTimeline in Shop mode.
import type { SourceKey } from "../../core/events";
import type { SlotProps } from "../../core/featureTypes";
import { communityRoute, projectsRoute } from "../../core/nav";
import { useCindia } from "../../core/store";
import type { Project } from "../../core/types";
import { projects, worksInProgress } from "../../mock";
import { formatDate, Link, Panel, ProjectCard } from "../../ui";
import styles from "./communities.module.css";
import { FundProject } from "./FundProject";
import { findCommunity, findProject, findWip, raisedCents } from "./projectModel";
import { t, tf, UI, type Lang } from "./strings";
import { WipTimeline } from "./WipTimeline";

const SOURCE_KEYS: SourceKey[] = ["b08-approvals"];

export function ProjectsView({ projectId, lang }: SlotProps) {
  return (
    <Panel
      sourceKeys={SOURCE_KEYS}
      title={t(UI.projectsTitle, lang)}
      lang={lang}
      className="[&>div]:flex [&>div]:flex-col"
      style={{ flex: "1 1 auto", minHeight: 0, boxSizing: "border-box" }}
    >
      <div className={styles.scroll}>
        <Body projectId={projectId} lang={lang} />
      </div>
    </Panel>
  );
}

function Body({ projectId, lang }: { projectId?: string; lang: Lang }) {
  if (!projectId) return <List lang={lang} />;
  const project = findProject(projectId);
  if (project) return <ProjectPage project={project} lang={lang} />;
  const wip = findWip(projectId);
  if (wip) {
    return (
      <div className={styles.section}>
        <BackLink lang={lang} />
        <WipTimeline wipId={wip.id} mode="shop" lang={lang} asPage />
      </div>
    );
  }
  return (
    <div className={styles.empty}>
      <p className={styles.soft}>{t(UI.projectNotFound, lang)}</p>
      <BackLink lang={lang} />
    </div>
  );
}

function BackLink({ lang }: { lang: Lang }) {
  return <Link to={projectsRoute()}>{t(UI.backToProjects, lang)}</Link>;
}

/** Every project, three across, each opening its page; then every work in progress with its milestones. */
function List({ lang }: { lang: Lang }) {
  const projectsState = useCindia((s) => s.projects);
  return (
    <div className={styles.scroll} data-testid="communities-list" style={{ overflow: "visible" }}>
      <section className={styles.section}>
        <div className={styles.grid2} style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {projects.map((p) => (
            <Link key={p.id} to={projectsRoute(p.id)} variant="block" ariaLabel={t(p.title, lang)}>
              <ProjectCard
                testId={`project-card-${p.id}`}
                progressTestId={`project-progress-${p.id}`}
                title={p.title}
                summary={p.summary}
                raisedCents={raisedCents(p, { projects: projectsState })}
                goalCents={p.goalCents}
                lang={lang}
                action={<CommunityName project={p} lang={lang} />}
              />
            </Link>
          ))}
        </div>
      </section>
      <section className={styles.section}>
        <h2 className={styles.h2}>{t(UI.wipsTitle, lang)}</h2>
        <div className={styles.grid2} style={{ gridTemplateColumns: `repeat(${Math.min(worksInProgress.length, 3)}, minmax(0, 1fr))` }}>
          {worksInProgress.map((w) => (
            <WipTimeline key={w.id} wipId={w.id} mode="shop" lang={lang} linkTitle />
          ))}
        </div>
      </section>
    </div>
  );
}

function CommunityName({ project, lang }: { project: Project; lang: Lang }) {
  const community = findCommunity(project.communityId);
  return community ? <span className={styles.note}>{tf(UI.fromCommunity, lang, { name: t(community.name, lang) })}</span> : null;
}

/** A project: its community, the funding block, then its dated updates. */
function ProjectPage({ project, lang }: { project: Project; lang: Lang }) {
  const community = findCommunity(project.communityId);
  return (
    <div className={styles.section} style={{ gap: "var(--c-space-24)" }}>
      <div className={styles.rowBetween}>
        <BackLink lang={lang} />
        {community && <Link to={communityRoute(community.id)}>{tf(UI.fromCommunity, lang, { name: t(community.name, lang) })}</Link>}
      </div>
      <div className={styles.grid2} style={{ gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", alignItems: "start" }}>
        <FundProject project={project} lang={lang} />
        <section className={styles.section}>
          <h2 className={styles.h3}>{t(UI.updates, lang)}</h2>
          <ul className={styles.updates}>
            {project.updates.map((u, i) => (
              <li key={i} className={styles.update}>
                <span className={styles.note}>{formatDate(u.date, lang)}</span>
                <span>{t(u.text, lang)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default ProjectsView;
