// IDs for answers to a person (data-model.md, the ID scheme).
// - A scripted answer's IDs are <prefix>_user_<n>. Numbers are reserved per prefix the moment an
//   answer is planned, so two pending answers never share one, and start over at 1 when the
//   player's epoch changes (a reset or seek drops the store's person-made records).
// - A live answer's IDs are <prefix>_user_<pageTag()>_<n>. The browser reserves the numbers with
//   liveIdStart() and sends the first as idStart. They never start over within a page, so rows an
//   earlier epoch wrote to the database never collide with new ones.
import { player } from "../core/player";

const TAG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const TAG_LENGTH = 6;

let tag: string | null = null;

/**
 * This page's tag: 6 lowercase letters and digits, made on the first call from
 * crypto.getRandomValues and the same for the page's whole life. Only live adapters call it, so
 * scripted mode never uses a random value.
 */
export function pageTag(): string {
  if (tag === null) {
    const bytes = new Uint8Array(TAG_LENGTH);
    crypto.getRandomValues(bytes);
    tag = Array.from(bytes, (b) => TAG_ALPHABET[b % TAG_ALPHABET.length]).join("");
  }
  return tag;
}

let scriptedEpoch: number | null = null;
const scripted = new Map<string, number>();
const live = new Map<string, number>();

/**
 * The next ID for a scripted answer to a person, `<prefix>_user_<n>`, from 1 in each player epoch.
 * `epoch` defaults to the app player's; a responder with its own player passes that one's.
 */
export function answerId(prefix: string, epoch: number = player.epoch()): string {
  if (epoch !== scriptedEpoch) {
    scripted.clear();
    scriptedEpoch = epoch;
  }
  const n = (scripted.get(prefix) ?? 0) + 1;
  scripted.set(prefix, n);
  return `${prefix}_user_${n}`;
}

/**
 * Reserves `count` numbers (at least one) for a live run and returns the first. The run's IDs are
 * `<prefix>_user_<pageTag()>_<n>` from that number on.
 */
export function liveIdStart(prefix: string, count: number): number {
  const first = (live.get(prefix) ?? 0) + 1;
  const reserved = Math.max(1, Math.floor(Number.isFinite(count) ? count : 1));
  live.set(prefix, first + reserved - 1);
  return first;
}
