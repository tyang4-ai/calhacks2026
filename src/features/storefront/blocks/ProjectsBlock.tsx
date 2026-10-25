// The projects block (T2): a kit ProjectCard for each of the block's projectIds, raised against goal.
// Raised is the mock's raisedCents plus the store's addedCents for the project, which the core sums
// over distinct contributions, so a repeated project.funded counts once. Each card is a kit Link to
// its project page, and its cell carries data-project-id for the feature's own specs.
import { projectsRoute } from "../../../core/nav";
import { useCindia } from "../../../core/store";
import type { Project } from "../../../core/types";
import { getById } from "../../../mock";
import { Link, ProjectCard } from "../../../ui";
import { BLOCK_NAMES, t } from "../strings";
import styles from "../storefront.module.css";
import { listProp } from "../workingCopy";
import { BlockHeading, type BlockProps, Placeholder } from "./parts";

export function ProjectsBlock({ block, lang, accent }: BlockProps) {
  const list = listProp(block, "projectIds")
    .map((id) => getById<Project>(id))
    .filter((p): p is Project => Boolean(p && p.id.startsWith("prj_") && typeof p.goalCents === "number"));
  const ids = list.map((p) => p.id).join(",");
  const added = useCindia((s) => Object.fromEntries(ids.split(",").map((id) => [id, s.projects.addedCents[id] ?? 0])) as Record<string, number>);
  return (
    <>
      <BlockHeading text={t(BLOCK_NAMES.projects, lang)} accent={accent} lang={lang} />
      {list.length === 0 ? (
        <Placeholder lang={lang} />
      ) : (
        <div className={styles.projectGrid}>
          {list.map((project) => (
            <div key={project.id} className={styles.cardCell} data-project-id={project.id}>
              <Link to={projectsRoute(project.id)} variant="block" ariaLabel={t(project.title, lang)} className={styles.cardLink}>
                <ProjectCard
                  title={project.title}
                  summary={project.summary}
                  raisedCents={project.raisedCents + (added[project.id] ?? 0)}
                  goalCents={project.goalCents}
                  lang={lang}
                />
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
