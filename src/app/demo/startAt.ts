// ?start=<beatId> on /demo (ui-contract.md, Modes and starts): seek to that beat's first event and
// play from there. ?start=catch means ?start=d08-catch. An unknown beat ID is ignored, so /demo
// behaves as it does without one. In presenter mode the presenter pauses at the beat's end.
import { player } from "../../core/player";
import { CATCH_BEAT, beatStart } from "../controls/playback";

/** The beat a ?start= value names, or null when the loaded timeline has no such beat. */
export function resolveStartBeat(param: string | null): string | null {
  if (!param) return null;
  const beatId = param === "catch" ? CATCH_BEAT : param;
  return beatStart(beatId) === null ? null : beatId;
}

/** Seeks to a beat's first beat.started and plays. False, doing nothing, when the beat isn't loaded. */
export function startAtBeat(beatId: string): boolean {
  const at = beatStart(beatId);
  if (at === null) return false;
  player.seek(at);
  player.play();
  return true;
}
