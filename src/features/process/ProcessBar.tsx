// The process bar (T1), in the shell's 64 px band on every page: eleven kit ProcessBlocks in the
// contract's order, then the one summary line "Live: N of 11", one Simulated badge while any source
// key is scripted, and in live mode the screens watching (C-4). Blocks show no Simulated badge of
// their own (A1-15). Clicking a block opens its view through setProcess(); the open one is pressed.
import { useCallback } from "react";
import { PROCESS_IDS } from "../../core/events";
import type { SlotProps } from "../../core/featureTypes";
import { setProcess } from "../../core/nav";
import type { CindiaState } from "../../core/state";
import { useCindia } from "../../core/store";
import { Badge, ProcessBlock } from "../../ui";
import { barView, PROCESSES, usePlaying } from "./processes";
import { BAR_LABEL, liveSummary, screensWatching, t } from "./strings";

export function ProcessBar({ lang, processId }: SlotProps) {
  const playing = usePlaying();
  const select = useCallback((s: CindiaState) => barView(s, playing, lang), [playing, lang]);
  const view = useCindia(select);

  return (
    <nav
      data-testid="process-bar"
      aria-label={t(BAR_LABEL, lang)}
      lang={lang}
      className="flex h-full min-w-0 items-center gap-1 [&>button]:min-w-[108px]"
    >
      {view.blocks.map((b) => (
        <ProcessBlock
          key={b.id}
          testId={`process-block-${b.id}`}
          statusTestId={`process-block-status-${b.id}`}
          countTestId={`process-block-count-${b.id}`}
          liveTestId={`process-block-live-${b.id}`}
          label={PROCESSES[b.id].label}
          lang={lang}
          status={b.status}
          count={b.count}
          live={b.live}
          selected={processId === b.id}
          onClick={() => setProcess(b.id)}
        />
      ))}
      {/* Up to three lines (summary, badge, presence) inside the 60 px blocks' height, so 15 px lines and no gaps. */}
      <div className="flex shrink-0 flex-col items-start justify-center pl-1 [&>*]:leading-[15px]" style={{ fontSize: "var(--c-text-14)", lineHeight: "15px", maxHeight: 60 }}>
        <span data-testid="process-live-summary" className="whitespace-nowrap font-semibold">
          {t(liveSummary(view.liveCount, PROCESS_IDS.length), lang)}
        </span>
        {view.anyScripted && <Badge variant="simulated" testId="simulated-badge" />}
        {view.screens !== null && (
          <span data-testid="process-presence" className="whitespace-nowrap" style={{ color: "var(--c-color-jade)" }}>
            {t(screensWatching(view.screens), lang)}
          </span>
        )}
      </div>
    </nav>
  );
}

export default ProcessBar;
