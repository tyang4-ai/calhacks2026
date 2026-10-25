// The community page (shop.community.main, T2) for SlotProps.communityId. Left: the name, people,
// place and craft with the kind label and the Demo data badge, the about text in a dashed
// placeholder box with L8 (never set as a quote or as the community's own words), what this demo
// keeps out under L9, the lead and makers, and the community's pieces. Right: how makers would be
// verified (the kit's VerificationLine with demo, so L3 and L4 show), the community's project and
// the other communities. It declares no source keys, so it shows no Simulated badge.
import type { SlotProps } from "../../core/featureTypes";
import { communityRoute, navigate, pieceRoute, projectsRoute, shopRoute, storeRoute } from "../../core/nav";
import { useCindia } from "../../core/store";
import type { Community, Person, Piece } from "../../core/types";
import { communities, getById, pieces, storefronts } from "../../mock";
import {
  Badge,
  COMMUNITY_KIND_WORDS,
  Link,
  MakerMark,
  Panel,
  PieceCard,
  ProjectCard,
  VERIFICATION_METHOD_WORDS,
  VerificationLine,
} from "../../ui";
import styles from "./communities.module.css";
import { findCommunity, projectOf, raisedCents } from "./projectModel";
import { GLOSSARY, L8, L9_NOTE, L9_TITLE, SEP, t, tf, UI, type Lang } from "./strings";

export function CommunityPage({ communityId, lang }: SlotProps) {
  const community = findCommunity(communityId);
  if (!community) return <NotFound lang={lang} />;
  return (
    <div className={styles.page} data-testid="community-page" data-community-id={community.id} lang={lang}>
      <div className={styles.main}>
        <Header community={community} lang={lang} />
        <About community={community} lang={lang} />
        <Protocols community={community} lang={lang} />
        <People community={community} lang={lang} />
        <Pieces community={community} lang={lang} />
      </div>
      <aside className={styles.side}>
        <Panel sourceKeys={[]} title={t(GLOSSARY.verification, lang)} lang={lang}>
          <VerificationLine
            testId="community-verification"
            method={community.verification.method}
            by={community.verification.by}
            note={community.verification.note}
            demo={community.demo}
            lang={lang}
          />
        </Panel>
        <CommunityProject community={community} lang={lang} />
        <Others community={community} lang={lang} />
      </aside>
    </div>
  );
}

interface Part {
  community: Community;
  lang: Lang;
}

function Header({ community, lang }: Part) {
  return (
    <header className={styles.section}>
      <div className={styles.row}>
        <h1 className={styles.h1}>{t(community.name, lang)}</h1>
        {community.demo && <Badge variant="demo" />}
        <span className="c-tag" data-role="kind">
          {t(COMMUNITY_KIND_WORDS[community.kind], lang)}
        </span>
      </div>
      <p className={styles.subline}>
        {t(community.people, lang)}
        {SEP}
        {t(community.place, lang)}
        {SEP}
        {t(community.craft, lang)}
      </p>
    </header>
  );
}

/** The about text, in a placeholder box: the Cindia team wrote it, so it never reads as the community's own words. */
function About({ community, lang }: Part) {
  return (
    <section className={styles.aboutBox} aria-label={t(UI.about, lang)}>
      <p className={styles.aboutText}>{t(community.about, lang)}</p>
      <p className={styles.note} data-testid="communities-about-note">
        {t(L8, lang)}
      </p>
    </section>
  );
}

/** Cindia's demo exclusions, titled with L9's first sentence and never phrased as the community's own rule. */
function Protocols({ community, lang }: Part) {
  return (
    <section className={styles.section} data-testid="community-protocols">
      <h2 className={styles.h2}>{t(L9_TITLE, lang)}</h2>
      <p className={styles.soft} data-testid="communities-protocols-note">
        {t(L9_NOTE, lang)}
      </p>
      <ul className={styles.tags}>
        {community.protocols.map((p, i) => (
          <li key={i} className={styles.tag} data-protocol={i}>
            {t(p, lang)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function pieceCount(makerId: string): number {
  return pieces.filter((p) => p.makerId === makerId).length;
}

function PersonRow({ person, lang, testId, role }: { person: Person; lang: Lang; testId?: string; role?: string }) {
  const name = t(person.name, lang);
  const count = pieceCount(person.id);
  return (
    <li className={styles.person} data-testid={testId} data-person-id={person.id}>
      <MakerMark char={person.surnameChar} size={32} label={name} />
      <span className={styles.personName}>{name}</span>
      {/* A name in the community's own language shows only when the community gave one. */}
      {person.nativeName && <span title={t(UI.nativeName, lang)}>{person.nativeName}</span>}
      {role ? <span className={styles.note}>{role}</span> : <span className={styles.note}>{count === 1 ? t(UI.pieceCountOne, lang) : tf(UI.pieceCount, lang, { n: count })}</span>}
    </li>
  );
}

/** The lead, then each maker with their MakerMark and name. */
function People({ community, lang }: Part) {
  const lead = getById<Person>(community.leadId);
  const makers = community.makerIds.map((id) => getById<Person>(id)).filter((p): p is Person => Boolean(p));
  return (
    <section className={styles.section}>
      <h2 className={styles.h2}>{t(UI.makers, lang)}</h2>
      <ul className={styles.people} data-testid="communities-makers">
        {makers.map((m) => (
          <PersonRow key={m.id} person={m} lang={lang} testId={`communities-maker-${m.id}`} />
        ))}
      </ul>
      {lead && (
        <ul className={styles.people}>
          <PersonRow person={lead} lang={lang} role={t(GLOSSARY.owner, lang)} />
        </ul>
      )}
    </section>
  );
}

/** The community's pieces, three across, each opening its piece page. */
function Pieces({ community, lang }: Part) {
  const own: Piece[] = pieces.filter((p) => p.communityId === community.id);
  const store = storefronts.find((s) => s.id === community.storefrontId);
  return (
    <section className={styles.section}>
      <div className={styles.rowBetween}>
        <h2 className={styles.h2}>
          {t(UI.piecesFrom, lang)} <span className={styles.note}>{tf(UI.pieceCount, lang, { n: own.length })}</span>
        </h2>
        {store && (
          <Link to={storeRoute(store.slug)} testId="communities-storefront-link">
            {t(UI.seeStorefront, lang)}
          </Link>
        )}
      </div>
      <div className={styles.grid3} data-testid="communities-pieces">
        {own.map((piece) => {
          const maker = getById<Person>(piece.makerId);
          return (
            <div key={piece.id} className={styles.gridCell} data-piece-id={piece.id}>
              <PieceCard
                image={piece.image}
                imageAlt={piece.imageAlt}
                title={piece.title}
                makerName={maker?.name ?? { en: "", zh: "" }}
                makerChar={maker?.surnameChar ?? ""}
                communityName={community.name}
                priceCents={piece.priceCents}
                verification={VERIFICATION_METHOD_WORDS[community.verification.method]}
                demo={community.demo}
                lang={lang}
                onClick={() => navigate(pieceRoute(piece.id))}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** The community's project as a ProjectCard that opens its project page. Raised comes from the store. */
function CommunityProject({ community, lang }: Part) {
  const projectsState = useCindia((s) => s.projects);
  const project = projectOf(community);
  if (!project) return null;
  return (
    <Link to={projectsRoute(project.id)} variant="block" ariaLabel={`${t(UI.openProject, lang)}: ${t(project.title, lang)}`}>
      <ProjectCard
        testId={`project-card-${project.id}`}
        progressTestId={`project-progress-${project.id}`}
        title={project.title}
        summary={project.summary}
        raisedCents={raisedCents(project, { projects: projectsState })}
        goalCents={project.goalCents}
        lang={lang}
        action={<span className="c-link c-link--text">{t(UI.openProject, lang)}</span>}
      />
    </Link>
  );
}

/** The other communities on Cindia, each a link to its page. */
function Others({ community, lang }: Part) {
  const others = communities.filter((c) => c.id !== community.id);
  return (
    <section className={styles.section}>
      <h2 className={styles.h3}>{t(UI.otherCommunities, lang)}</h2>
      <ul className={styles.others}>
        {others.map((c) => (
          <li key={c.id}>
            <Link to={communityRoute(c.id)} variant="block">
              <span className={styles.otherName}>{t(c.name, lang)}</span>
              <span className={styles.note}>
                {t(c.place, lang)}
                {SEP}
                {t(c.craft, lang)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NotFound({ lang }: { lang: Lang }) {
  return (
    <div className={styles.empty} lang={lang}>
      <p className={styles.soft}>{t(UI.notFound, lang)}</p>
      <Link to={shopRoute()}>{t(UI.backToShop, lang)}</Link>
    </div>
  );
}

export default CommunityPage;
