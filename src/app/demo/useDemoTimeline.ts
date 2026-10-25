// The beat runner: loads the demo timeline into the player once when /demo mounts (a no-op when
// it's already loaded, which installSources does at startup) and follows the beat and camera that
// beat.started puts in the store. Before the first beat, and after a reset, the camera is pitch,
// which shows the first pitch card.
import { useEffect } from "react";
import type { CameraId } from "../../core/featureTypes";
import { useCindia } from "../../core/store";
import { loadScripted } from "../../sources/scripted";

export const DEMO_TIMELINE_ID = "demo";

export function useDemoTimeline(): { beatId: string | null; camera: CameraId } {
  useEffect(() => {
    loadScripted(DEMO_TIMELINE_ID);
  }, []);
  const beatId = useCindia((s) => s.demo.beatId);
  const camera = useCindia((s) => s.demo.camera);
  return { beatId, camera: camera ?? "pitch" };
}
