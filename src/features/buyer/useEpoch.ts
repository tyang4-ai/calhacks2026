// The player's epoch, which changes on every seek, reset or load, when the store drops what people
// did. Local state kept with useEpochState() resets with it, so a seek always lands on the same
// screen: a switch the buyer turned on, or a request they sent, is gone with the store's records.
import { useCallback, useState, useSyncExternalStore } from "react";
import { player } from "../../core/player";

/** The player's current epoch, re-rendering when it changes. */
export function useEpoch(): number {
  return useSyncExternalStore(player.subscribe, player.epoch, player.epoch);
}

/** Like useState, but the value goes back to `initial` whenever the player's epoch changes. */
export function useEpochState<T>(initial: T): [T, (value: T) => void] {
  const epoch = useEpoch();
  const [held, setHeld] = useState<{ epoch: number; value: T }>({ epoch, value: initial });
  const value = held.epoch === epoch ? held.value : initial;
  const set = useCallback((next: T) => setHeld({ epoch: player.epoch(), value: next }), []);
  return [value, set];
}
