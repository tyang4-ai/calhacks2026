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
  const screens = view.screens;
  const presence = screens !== null;

  // The band leaves 48 px between its 8 px paddings, enough for the blocks and the summary over the
  // badge (41 px). In live mode the presence line adds 15 px, so the bar reaches 4 px into each
  // padding (56 px, still inside the 64 px band). The blocks stay centered, so nothing else moves.
  return (
    <nav
      data-testid="process-bar"
      aria-label={t(BAR_LABEL, lang)}
      lang={lang}
      className={`flex min-w-0 items-center gap-[6px] ${presence ? "-my-1 self-stretch" : "h-full"}`}
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
      {/* Up to three lines (summary, badge, presence) inside the band, so 15 px lines and no gaps. It sits
          4 px after the last block (x 1276 at 1440 wide, design drop 3), so 2 px less than the blocks' gap. */}
      <div className="ml-[-2px] flex shrink-0 flex-col items-start justify-center [&>*]:leading-[15px]" style={{ fontSize: "var(--c-text-14)", lineHeight: "15px", maxHeight: 60 }}>
        <span data-testid="process-live-summary" className="whitespace-nowrap font-semibold">
          {t(liveSummary(view.liveCount, PROCESS_IDS.length), lang)}
        </span>
        {view.anyScripted && <Badge variant="simulated" testId="simulated-badge" tone="beam" />}
        {presence && (
          <span data-testid="process-presence" className="whitespace-nowrap" style={{ color: "var(--c-color-beam-live)" }}>
            {t(screensWatching(screens), lang)}
          </span>
        )}
      </div>
    </nav>
  );
}

export default ProcessBar;
