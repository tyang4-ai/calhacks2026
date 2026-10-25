// askSupport(), which every way of asking goes through: the composer, the suggestions and the piece
// page's side panel. It emits a person's support.asked with userEvent(); the sources registry answers.
import { userEvent } from "../../core/events";
import { emit, getState } from "../../core/store";
import type { Lang } from "./strings";
import { threadForAsk, type Side } from "./threadModel";

export interface AskRequest {
  text: string;
  side: Side;
  lang: Lang;
  /** Only what's on screen: the piece or the order, a store page's community, or a maker page's maker. */
  contextIds: string[];
  /** The current thread for the side, or null to start the next thr_user_. */
  currentThreadId: string | null;
}

/**
 * Emits a person's support.asked and returns its thread, or null for empty text. Follow-ups reuse
 * the current thread when it's the person's own (thr_user_<n>). Otherwise, and after "New
 * conversation", the question starts the next thr_user_.
 */
export function askSupport({ text, side, lang, contextIds, currentThreadId }: AskRequest): string | null {
  const words = text.trim();
  if (!words) return null;
  const threadId = threadForAsk(getState().support, currentThreadId);
  emit(userEvent("support.asked", { threadId, side, text: words, lang, contextIds: [...contextIds] }));
  return threadId;
}
