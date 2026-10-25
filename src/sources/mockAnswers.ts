// The mock exports the request responder and the keyword helpers read, found with import.meta.glob
// so the build passes while src/mock/ is still being filled: v1's curatedSet, cannedAnswers,
// fallbackAnswer and scenarioReplies, and v2's catalog, index, demo search, runs, watch, model,
// splits, works in progress, and allApprovals and allFollowUps (the records getById() finds).
// Every name is read from src/mock/index.ts, which re-exports each file.
import type { MockAnswers } from "./requests";

const modules = import.meta.glob<Record<string, unknown>>(["../mock/index.ts"], { eager: true });

export function mockAnswers(): MockAnswers {
  const m = modules["../mock/index.ts"] ?? {};
  const pick = <K extends keyof MockAnswers>(name: K): MockAnswers[K] => m[name] as MockAnswers[K];
  return {
    curatedSet: pick("curatedSet"),
    cannedAnswers: pick("cannedAnswers"),
    fallbackAnswer: pick("fallbackAnswer"),
    scenarioReplies: pick("scenarioReplies"),
    pieces: pick("pieces"),
    searchIndex: pick("searchIndex"),
    keywordAliases: pick("keywordAliases"),
    demoSearch: pick("demoSearch"),
    swarmRuns: pick("swarmRuns"),
    fallbackSupportRun: pick("fallbackSupportRun"),
    fallbackListingRun: pick("fallbackListingRun"),
    makerQuestions: pick("makerQuestions"),
    counterfeitCandidates: pick("counterfeitCandidates"),
    scriptedScan: pick("scriptedScan"),
    report: pick("report"),
    modelId: pick("modelId"),
    splits: pick("splits"),
    worksInProgress: pick("worksInProgress"),
    allApprovals: pick("allApprovals"),
    allFollowUps: pick("allFollowUps"),
  };
}
