// Community projects: contributions by contributionId, and what this run added to each project.
import type { ProjectsState } from "../state";
import { areaReducer, copy, put, same, stamped } from "./util";

/** addedCents is always the sum of each project's contributions, never a running increment. */
function sums(contributions: ProjectsState["contributions"]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of Object.values(contributions)) out[c.projectId] = (out[c.projectId] ?? 0) + c.amountCents;
  return out;
}

export const projectsReducer = areaReducer<ProjectsState>({
  "project.funded": (s, e) => {
    const id = e.payload.contributionId;
    const contributions = put(s.contributions, id, stamped(s.contributions[id], copy(e.payload), e.at));
    if (contributions === s.contributions) return s;
    return same(s, { contributions, addedCents: sums(contributions) });
  },
});
