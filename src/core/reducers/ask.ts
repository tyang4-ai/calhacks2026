import type { AskState } from "../state";
import { addId, areaReducer, put, same } from "./util";

export const askReducer = areaReducer<AskState>({
  "ask.asked": (s, e) => {
    const prev = s.questions[e.payload.questionId];
    const questions = put(s.questions, e.payload.questionId, { ...e.payload, at: prev ? prev.at : e.at });
    const questionIds = addId(s.questionIds, e.payload.questionId);
    return same(s, { ...s, questions, questionIds, latestQuestionId: e.payload.questionId });
  },
  "ask.answered": (s, e) => {
    const p = e.payload;
    const prev = s.answers[p.questionId];
    const answers = put(s.answers, p.questionId, {
      questionId: p.questionId,
      answer: { ...p.answer },
      chart: p.chart,
      refIds: [...p.refIds],
      at: prev ? prev.at : e.at,
    });
    return same(s, { ...s, answers, latestAnswerId: p.questionId });
  },
});
