// The mock exports the request responder reads, found with import.meta.glob so the build passes
// before S2 writes src/mock/: curatedSet, cannedAnswers, fallbackAnswer and scenarioReplies.
import type { MockAnswers } from "./requests";

const modules = import.meta.glob<Record<string, unknown>>(["../mock/catalog.ts", "../mock/ask.ts", "../mock/scenario.ts"], {
  eager: true,
});

export function mockAnswers(): MockAnswers {
  const catalog = modules["../mock/catalog.ts"] ?? {};
  const ask = modules["../mock/ask.ts"] ?? {};
  const scenario = modules["../mock/scenario.ts"] ?? {};
  return {
    curatedSet: catalog.curatedSet as MockAnswers["curatedSet"],
    cannedAnswers: ask.cannedAnswers as MockAnswers["cannedAnswers"],
    fallbackAnswer: ask.fallbackAnswer as MockAnswers["fallbackAnswer"],
    scenarioReplies: scenario.scenarioReplies as MockAnswers["scenarioReplies"],
  };
}
