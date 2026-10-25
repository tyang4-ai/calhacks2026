// The person's own requests on the search screens (lead, T0): their IDs, seeds and the one way to
// emit them. Every component that asks for a search or a draw goes through here, so qry_user_ and
// srp_user_ numbers and the seed rule are the same everywhere. Nothing reads the wall clock.
import { userEvent, type SearchFilters, type SurpriseMethod } from "../../core/events";
import type { CindiaState } from "../../core/state";
import { emit, getState } from "../../core/store";
import type { Lang } from "../../core/types";

const QUERY_PREFIX = "qry_user_";
const SURPRISE_PREFIX = "srp_user_";

/** The highest n among IDs `<prefix><n>` in a list, or 0. */
function highest(ids: string[], prefix: string): number {
  let max = 0;
  for (const id of ids) {
    if (!id.startsWith(prefix)) continue;
    const n = Number(id.slice(prefix.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return max;
}

/** The next `qry_user_<n>`, counting the person's queries already in the store. */
export function nextQueryId(state: CindiaState = getState()): string {
  return `${QUERY_PREFIX}${highest(Object.keys(state.search.queries), QUERY_PREFIX) + 1}`;
}

/** The next `srp_user_<n>`, counting the person's surprises already in the store. */
export function nextSurpriseId(state: CindiaState = getState()): string {
  return `${SURPRISE_PREFIX}${highest(Object.keys(state.surprise.asks), SURPRISE_PREFIX) + 1}`;
}

/** A person's seed: 1 plus the number of surprise.asked events already in the store (events.md). */
export function nextSeed(state: CindiaState = getState()): number {
  return Object.keys(state.surprise.asks).length + 1;
}

/** Drops empty filter fields, so an empty community list or no price cap sends no filter at all. */
export function cleanFilters(filters: SearchFilters | undefined): SearchFilters | undefined {
  if (!filters) return undefined;
  const out: SearchFilters = {};
  if (typeof filters.maxPriceCents === "number" && filters.maxPriceCents > 0) out.maxPriceCents = filters.maxPriceCents;
  if (filters.communityIds && filters.communityIds.length > 0) out.communityIds = [...filters.communityIds];
  return Object.keys(out).length > 0 ? out : undefined;
}

export interface QueryRequest {
  text: string;
  keywords: string[];
  lang: Lang;
  filters?: SearchFilters;
}

/** Emits a person's search.queried with the next qry_user_ ID and returns that ID. */
export function emitQuery({ text, keywords, lang, filters }: QueryRequest): string {
  const queryId = nextQueryId();
  const clean = cleanFilters(filters);
  emit(userEvent("search.queried", { queryId, text, keywords: [...keywords], lang, ...(clean ? { filters: clean } : {}) }));
  return queryId;
}

export interface SurpriseRequest {
  method: SurpriseMethod;
  /** Sent only with keyword_random, and only when the person typed one. */
  keyword?: string;
}

/** Emits a person's surprise.asked with the next srp_user_ ID and seed, and returns the ID. */
export function emitSurprise({ method, keyword }: SurpriseRequest): string {
  const state = getState();
  const surpriseId = nextSurpriseId(state);
  const seed = nextSeed(state);
  const word = method === "keyword_random" ? keyword?.trim() : undefined;
  emit(userEvent("surprise.asked", { surpriseId, method, seed, ...(word ? { keyword: word } : {}) }));
  return surpriseId;
}

/** The latest query and its answer (or null), as the store holds them. */
export function latestSearch(state: CindiaState) {
  const id = state.search.latestQueryId;
  const query = id ? (state.search.queries[id] ?? null) : null;
  const answer = id ? (state.search.answers[id] ?? null) : null;
  return { queryId: id, query, answer };
}

/** The latest surprise ask and its draw (or null). */
export function latestSurprise(state: CindiaState) {
  const id = state.surprise.latestSurpriseId;
  const ask = id ? (state.surprise.asks[id] ?? null) : null;
  const draw = id ? (state.surprise.draws[id] ?? null) : null;
  return { surpriseId: id, ask, draw };
}
