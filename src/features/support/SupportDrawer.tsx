// F-support T5: the support drawer (support-drawer) for both sides, inside one kit Panel that
// declares b14-swarm and b13-live, so it shows the Simulated badge while either is scripted.
// Top to bottom: L11 (support-records-note), New conversation (support-new, in the panel's head),
// the thread and the step strip, the side's suggestions (support-suggest-<n>), then the composer.
// The Shop side passes what's on screen as context (the piece, the order, or a store page's
// community) and the Sell side the maker on a maker page. The newest message stays in view.
// No effect here watches the timeline: the drawer opens only from the URL, Help or a person asking.
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SlotProps } from "../../core/featureTypes";
import { useCindia } from "../../core/store";
import { Button, Panel } from "../../ui";
import { askSupport } from "./ask";
import { Composer } from "./Composer";
import { contextIdsFor } from "./records";
import { StepStrip } from "./StepStrip";
import { L11, STRINGS, t } from "./strings";
import { Suggestions } from "./Suggestions";
import styles from "./support.module.css";
import { Thread } from "./Thread";
import { currentThreadId, isThreadBusy, latestRun, threadItems, type Side } from "./threadModel";

const SOURCE_KEYS = ["b14-swarm", "b13-live"] as const;

/** The side a drawer serves: SlotProps.side, or the surface's when the shell left it out. */
function sideOf({ side, surface }: SlotProps): Side {
  if (side) return side;
  return surface === "buyer" || surface === "store" ? "buyer" : "seller";
}

export function SupportDrawer(props: SlotProps) {
  const { lang, pieceId, orderId, slug, makerId } = props;
  const side = sideOf(props);
  const contextIds = useMemo(() => contextIdsFor(side, { pieceId, orderId, slug, makerId }), [side, pieceId, orderId, slug, makerId]);

  const support = useCindia((s) => s.support);
  const swarm = useCindia((s) => s.swarm);
  const log = useCindia((s) => s.log);

  // "New conversation" leaves the side's threads behind until the next question starts thr_user_<n+1>.
  const [hidden, setHidden] = useState<readonly string[]>([]);
  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const current = useMemo(() => currentThreadId(support, side, hiddenSet), [support, side, hiddenSet]);
  const itemCount = useMemo(() => threadItems({ support, log }, current).length, [support, log, current]);
  const run = useMemo(() => latestRun(swarm, current), [swarm, current]);
  const busy = useMemo(() => isThreadBusy({ support, swarm, log }, current), [support, swarm, log, current]);

  const startNew = () => setHidden(support.threadIds.filter((id) => support.threads[id]?.side === side));
  const ask = (text: string) => {
    askSupport({ text, side, lang, contextIds, currentThreadId: current });
  };

  // Keep the newest message (and the strip under it) in view: put the end marker at the bottom of
  // the scroll box. offsetTop ignores the demo stage's scale, so this holds on /demo too.
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // What the box shows: a new message, step or ending changes it, and each change scrolls once.
  const shown = `${current ?? ""}|${itemCount}|${run?.run.stepIds.length ?? 0}|${run?.run.done ? 1 : 0}|${lang}`;
  useLayoutEffect(() => {
    const box = scrollRef.current;
    const end = endRef.current;
    if (!box || !end || box.dataset.shown === shown) return;
    box.dataset.shown = shown;
    box.scrollTop = Math.max(0, end.offsetTop - box.clientHeight);
  }, [shown]);

  return (
    <Panel
      testId="support-drawer"
      sourceKeys={[...SOURCE_KEYS]}
      lang={lang}
      actions={
        <Button testId="support-new" variant="quiet" size="small" onClick={startNew} disabled={current === null} aria-disabled={current === null}>
          {t(STRINGS.newConversation, lang)}
        </Button>
      }
      className={styles.drawer}
    >
      <p data-testid="support-records-note" style={{ flex: "0 0 auto", margin: "0 0 var(--c-space-12)", fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>
        {t(L11, lang)}
      </p>
      <div ref={scrollRef} className={styles.scroll}>
        <div className={styles.stack}>
          <Thread threadId={current} lang={lang} emptyText={side === "buyer" ? STRINGS.emptyBuyer : STRINGS.emptySeller} />
          <StepStrip threadId={current} lang={lang} />
          <div ref={endRef} aria-hidden="true" style={{ height: 0 }} />
          <Suggestions side={side} lang={lang} testIdPrefix="support-suggest" onAsk={ask} disabled={busy} />
        </div>
      </div>
      <div className={styles.composer}>
        <Composer side={side} lang={lang} contextIds={contextIds} currentThreadId={current} busy={busy} />
      </div>
    </Panel>
  );
}
