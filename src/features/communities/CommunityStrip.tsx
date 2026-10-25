// The communities strip on Shop home (shop.home.communities, T1): four kit CommunityCards in
// community order, each with its name, people and place, craft, kind as a word, the Demo data
// badge and a link to its community project. A card opens its community's page. The panel declares
// no source keys (the strip renders mock data only), so it shows no Simulated badge.
import type { SlotProps } from "../../core/featureTypes";
import { communityRoute, navigate, projectsRoute } from "../../core/nav";
import { communities } from "../../mock";
import { Badge, CommunityCard, Link, Panel } from "../../ui";
import styles from "./communities.module.css";
import { GLOSSARY, t, UI } from "./strings";

export function CommunityStrip({ lang }: SlotProps) {
  return (
    <Panel
      testId="communities-strip"
      sourceKeys={[]}
      title={t(UI.stripTitle, lang)}
      actions={<Link to={projectsRoute()}>{t(UI.allProjects, lang)}</Link>}
      lang={lang}
      className={`${styles.strip} [&>div]:flex [&>div]:flex-col`}
    >
      <div className={styles.stripBody}>
        <div className={styles.stripGrid}>
          {communities.map((c) => (
            <CommunityCard
              key={c.id}
              testId={`community-card-${c.id}`}
              name={c.name}
              people={c.people}
              place={c.place}
              craft={c.craft}
              kind={c.kind}
              lang={lang}
              onClick={() => navigate(communityRoute(c.id))}
              footer={
                <span className={styles.cardFoot}>
                  {c.demo && <Badge variant="demo" />}
                  {c.projectIds[0] && <Link to={projectsRoute(c.projectIds[0])}>{t(GLOSSARY.project, lang)}</Link>}
                </span>
              }
            />
          ))}
        </div>
      </div>
    </Panel>
  );
}

export default CommunityStrip;
