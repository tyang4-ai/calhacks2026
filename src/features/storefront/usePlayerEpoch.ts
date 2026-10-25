// The player's epoch, which changes on every seek, reset and load. A seek or a reset drops the
// store's person-made records (a publish included), so the builder starts its working copy over
// when the epoch changes, and the Designer's waiting line ends.
import { useSyncExternalStore } from "react";
import { player } from "../../core/player";

const getEpoch = () => player.epoch();

export function usePlayerEpoch(): number {
  return useSyncExternalStore(player.subscribe, getEpoch, getEpoch);
}
