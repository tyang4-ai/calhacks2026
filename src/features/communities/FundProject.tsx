// The project page's funding block (T3): the kit ProjectCard with its progress (raised against
// goal, through Money), the amount picker (the project's addOnCents picked first), L7 beside the
// fund button before any click, and the button, which emits a person's project.funded with the
// next ctb_user_ number, the picked amount and buyer buy_01, applied directly with no answer. The
// progress rises from the store (the mock's raisedCents plus the store's addedCents), and a short
// thank-you line repeats that the demo moves no real money.
import { useState } from "react";
import { userEvent } from "../../core/events";
import { emit, getState, useCindia } from "../../core/store";
import type { Project } from "../../core/types";
import { Button, Money, ProjectCard } from "../../ui";
import styles from "./communities.module.css";
import { DEMO_BUYER_ID, fundAmounts, nextContributionId, raisedCents } from "./projectModel";
import { around, L7, t, UI, type Lang } from "./strings";

export interface FundProjectProps {
  project: Project;
  lang: Lang;
}

export function FundProject({ project, lang }: FundProjectProps) {
  const projectsState = useCindia((s) => s.projects);
  const amounts = fundAmounts(project);
  const [picked, setPicked] = useState<number>(project.addOnCents);
  // The person's last contribution here. The thanks show only while the store holds it, so a seek
  // or a reset that drops the person's records takes the thanks away too.
  const [mine, setMine] = useState<string | null>(null);
  const thanked = mine ? projectsState.contributions[mine] : undefined;

  const fund = () => {
    const contributionId = nextContributionId(getState());
    emit(userEvent("project.funded", { contributionId, projectId: project.id, amountCents: picked, buyerId: DEMO_BUYER_ID }));
    setMine(contributionId);
  };

  const [before, after] = around(t(UI.thanks, lang), "amount");
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
        action={
          <div className={styles.section}>
            <fieldset className={styles.amounts} aria-label={t(UI.pickAmount, lang)}>
              {amounts.map((cents) => (
                <button
                  key={cents}
                  type="button"
                  data-testid={`communities-amount-${cents}`}
                  aria-pressed={picked === cents}
                  className={picked === cents ? styles.amountOn : styles.amount}
                  onClick={() => setPicked(cents)}
                >
                  <Money cents={cents} />
                </button>
              ))}
            </fieldset>
            <div className={styles.fundRow}>
              <Button testId={`project-fund-${project.id}`} onClick={fund}>
                {t(UI.fund, lang)}
              </Button>
              <p className={styles.note} data-testid={`communities-fund-note-${project.id}`}>
                {t(L7, lang)}
              </p>
            </div>
          </div>
        }
      />
      {thanked && (
        <p className={styles.thanks} data-testid="communities-thanks" role="status">
          {before}
          <Money cents={thanked.amountCents} tone="in" />
          {after}
        </p>
      )}
    </div>
  );
}

export default FundProject;
