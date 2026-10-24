// The scripted source: plays a timeline through the player into emit(). The player's dispatch is
// the registry's, so in live mode keyed events can be replaced by their adapter.
import { player } from "../core/player";
import { loadTimeline } from "./timelines";

/** Loads a timeline into the player (a no-op when it is already loaded). Doesn't start playback. */
export function loadScripted(id = "demo"): void {
  player.load(loadTimeline(id));
}

/** Loads a timeline and plays it. */
export function playScripted(id = "demo"): void {
  loadScripted(id);
  player.play();
}
