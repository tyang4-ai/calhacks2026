// The view host (T8) for the process.view slot: nothing without a processId. With one, the matching
// view inside the kit's ProcessView (process-view): the block's label as the title, the Live or
// Simulated badge for that process's keys, the close button (process-view-close, which calls
// setProcess(null)), and at the bottom the kit EventLog (process-log) with the store's log filtered to
// that process's event types, newest last. Esc and a click on the scrim close the view through the
// shell's overlay, so the host adds no key handler of its own.
import { useCallback, type ComponentType } from "react";
import type { ProcessId } from "../../core/events";
import type { SlotProps } from "../../core/featureTypes";
import { setProcess } from "../../core/nav";
import type { CindiaState } from "../../core/state";
import { useCindia } from "../../core/store";
import type { Lang } from "../../core/types";
import { EventLog, ProcessView } from "../../ui";
import { ApprovalsProcess } from "./ApprovalsProcess";
import { CheckoutProcess } from "./CheckoutProcess";
import { CloseProcess } from "./CloseProcess";
import { DataProcess } from "./DataProcess";
import { ModelProcess } from "./ModelProcess";
import { MoneyProcess } from "./MoneyProcess";
import { allLive, isProcessId, logFor, PROCESSES } from "./processes";
import { ProofProcess } from "./ProofProcess";
import { ReconcileProcess } from "./ReconcileProcess";
import { SearchProcess } from "./SearchProcess";
import { LOG_TITLE, SUBTITLES } from "./strings";
import { SwarmProcess } from "./SwarmProcess";
import { WatchProcess } from "./WatchProcess";

/** What every view takes: the slot's language. Views read the store themselves. */
export interface ProcessViewBodyProps {
  lang: Lang;
}

const VIEWS: Record<ProcessId, ComponentType<ProcessViewBodyProps>> = {
  search: SearchProcess,
  swarm: SwarmProcess,
  checkout: CheckoutProcess,
  money: MoneyProcess,
  reconcile: ReconcileProcess,
  approvals: ApprovalsProcess,
  close: CloseProcess,
  proof: ProofProcess,
  watch: WatchProcess,
  model: ModelProcess,
  data: DataProcess,
};

/** The newest log rows the view lists. */
const LOG_ROWS = 50;

function HostedView({ id, lang }: { id: ProcessId; lang: Lang }) {
  const def = PROCESSES[id];
  const live = useCindia(useCallback((s: CindiaState) => allLive(s, def.keys), [def]));
  const rows = useCindia(useCallback((s: CindiaState) => logFor(s, id), [id]));
  const View = VIEWS[id];
  return (
    <ProcessView
      testId="process-view"
      title={def.label}
      subtitle={SUBTITLES[id]}
      live={live}
      lang={lang}
      onClose={() => setProcess(null)}
      closeTestId="process-view-close"
      log={<EventLog testId="process-log" rows={rows} maxRows={LOG_ROWS} lang={lang} title={LOG_TITLE} />}
    >
      <View lang={lang} />
    </ProcessView>
  );
}

export function ProcessViewHost({ lang, processId }: SlotProps) {
  if (!isProcessId(processId)) return null;
  return <HostedView key={processId} id={processId} lang={lang} />;
}

export default ProcessViewHost;
