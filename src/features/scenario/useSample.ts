// F-scenario T2: "Use the sample statement". Emits scenario.loaded with the held-back sample's file
// name and scn_ record IDs, built with userEvent() so it has source "user" and no key. The sources
// registry answers it; this file never emits the answer's events.
import { useCallback } from "react";
import { emit, userEvent } from "../../core";
import { sampleFileName, sampleRecordIds, scenarioId } from "../../mock";

/** Returns a callback that requests the sample statement. */
export function useSample(): () => void {
  return useCallback(() => {
    emit(userEvent("scenario.loaded", { scenarioId, fileName: sampleFileName, recordIds: [...sampleRecordIds] }));
  }, []);
}
