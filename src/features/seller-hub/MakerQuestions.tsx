// The maker's side of "ask the maker" (F-seller-hub T6, C-13), test ID seller-maker-questions.
// - Each question.forwarded for this maker (support.questions, by questionId) shows as
//   seller-maker-question-<questionId>, newest first by its place in the store's log (never by `at`,
//   since a paused player gives every answer the same time): the buyer's words as they asked them,
//   the piece it's about, and why Cindy forwarded it.
// - Under it, an empty reply box (seller-maker-reply-<questionId>, never prefilled) and Send
//   (seller-maker-send-<questionId>), which emits her question.answered with her exact text and a
//   person's ans_user_<n>, counted from the store.
// - Once a question.answered for it is in the store (hers, or the tour's scripted one),
//   seller-maker-answer-<questionId> shows it as sent and the box goes.
// Nothing on this panel writes words for her. The panel declares b14-swarm, the key these events
// carry, so it shows the Simulated badge in scripted mode.
import { useState } from "react";
import { userEvent } from "../../core/events";
import { emit, useCindia } from "../../core/store";
import type { CindiaState } from "../../core/state";
import type { Piece } from "../../core/types";
import { getById } from "../../mock";
import { Badge, Button, Panel } from "../../ui";
import { answerIds as selectAnswerIds, makerQuestionsFor, nextAnswerId, textLang } from "./model";
import { GLOSSARY, MAKER, SEP, t, tf, type Lang } from "./strings";
import styles from "./seller-hub.module.css";

type Question = CindiaState["support"]["questions"][string];

function QuestionCard({ questionId, q, makerId, lang }: { questionId: string; q: Question; makerId: string; lang: Lang }) {
  const [reply, setReply] = useState("");
  const answerIds = useCindia(selectAnswerIds);
  const forwarded = q.forwarded!;
  const piece = getById<Piece>(forwarded.pieceId);
  const pieceTitle = piece ? t(piece.title, lang) : forwarded.pieceId;

  const send = () => {
    if (reply.trim().length === 0) return;
    emit(
      userEvent("question.answered", {
        questionId,
        answerId: nextAnswerId(answerIds),
        makerId,
        text: reply,
        lang: textLang(reply),
      }),
    );
    setReply("");
  };

  return (
    <li className={styles.question} data-testid={`seller-maker-question-${questionId}`} data-piece-id={forwarded.pieceId}>
      <p className={styles.questionMeta}>
        <span className="c-tag">{t(GLOSSARY.askTheMaker, lang)}</span>
        <span>{tf(MAKER.about, lang, { piece: pieceTitle })}</span>
      </p>
      <p className={styles.soft}>{t(MAKER.buyerAsked, lang)}</p>
      <blockquote className={styles.buyerWords} lang={forwarded.lang}>
        {forwarded.text}
      </blockquote>
      <p className={styles.hint}>{t(MAKER.forwarded, lang)}</p>
      {q.answered ? (
        <div className={styles.answer} data-testid={`seller-maker-answer-${questionId}`} data-answer-id={q.answered.answerId}>
          <p className={styles.answerHead}>
            <strong>{t(GLOSSARY.inHerOwnWords, lang)}</strong>
            {SEP}
            <Badge variant="jade">{t(GLOSSARY.sent, lang)}</Badge>
          </p>
          <p className={styles.answerText} lang={q.answered.lang}>
            {q.answered.text}
          </p>
        </div>
      ) : (
        <div className={styles.replyBox}>
          <label className={styles.fieldLabel} htmlFor={`reply-${questionId}`}>
            {t(MAKER.replyLabel, lang)}
          </label>
          <textarea
            id={`reply-${questionId}`}
            className={styles.reply}
            data-testid={`seller-maker-reply-${questionId}`}
            value={reply}
            placeholder={t(MAKER.replyPlaceholder, lang)}
            rows={3}
            onChange={(e) => setReply(e.target.value)}
          />
          <Button testId={`seller-maker-send-${questionId}`} variant="primary" size="small" disabled={reply.trim().length === 0} onClick={send}>
            {t(MAKER.send, lang)}
          </Button>
        </div>
      )}
    </li>
  );
}

export function MakerQuestions({ makerId, lang }: { makerId: string; lang: Lang }) {
  const list = useCindia((s) => makerQuestionsFor(s, makerId));
  return (
    <Panel testId="seller-maker-questions" title={t(MAKER.questions, lang)} sourceKeys={["b14-swarm"]} lang={lang} className={styles.sidePanel}>
      {list.length === 0 ? (
        <p className={styles.empty}>{t(MAKER.noQuestions, lang)}</p>
      ) : (
        <ul className={styles.questionList}>
          {list.map(({ questionId, q }) => (
            <QuestionCard key={questionId} questionId={questionId} q={q} makerId={makerId} lang={lang} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
