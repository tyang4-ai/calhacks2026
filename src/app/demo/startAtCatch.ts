// Start at the catch, for Hyphenate's judges: the demo-start-at-catch control and the c key do what
// ?start=catch does, which is ?start=d08-catch (ui-contract.md, Modes and starts). v1's rewind card
// is gone: the tour plays on from the catch, and presenter mode pauses at the beat's end.
import { CATCH_BEAT } from "../controls/playback";
import { startAtBeat } from "./startAt";

/** Seeks to d08-catch's first beat.started and plays. False, doing nothing, while no timeline with it is loaded. */
export function startAtCatch(): boolean {
  return startAtBeat(CATCH_BEAT);
}
