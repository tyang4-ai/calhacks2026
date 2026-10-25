// Readers the process views share: they name a piece, a person or a project from src/mock/ without
// copying them, find a record's newest entry, and format a step's time.
import type { Lang, Person, Piece, Project } from "../../core/types";
import { getById } from "../../mock";
import { t } from "./strings";

/** A piece's title in the slot's language, or its ID when src/mock/ doesn't hold it (pc_55, pc_user_<n>). */
export function pieceTitle(pieceId: string, lang: Lang): string {
  const p = getById<Piece>(pieceId);
  return p && "title" in p && typeof p.title === "object" ? t(p.title, lang) : pieceId;
}

/** A piece's object word in the slot's language ("jar", "skirt"), or "" when src/mock/ doesn't hold it. */
export function pieceObject(pieceId: string, lang: Lang): string {
  const p = getById<Piece>(pieceId);
  return p && "facets" in p ? t(p.facets.object, lang) : "";
}

/** A piece's community ID, or undefined. */
export function pieceCommunity(pieceId: string): string | undefined {
  const p = getById<Piece>(pieceId);
  return p && "communityId" in p ? p.communityId : undefined;
}

/** A person's name in the slot's language, or the ID. */
export function personName(personId: string, lang: Lang): string {
  const p = getById<Person>(personId);
  return p && "name" in p && typeof p.name === "object" ? t(p.name, lang) : personId;
}

/** A project's title in the slot's language, or the ID. */
export function projectTitle(projectId: string, lang: Lang): string {
  const p = getById<Project>(projectId);
  return p && "title" in p && typeof p.title === "object" ? t(p.title, lang) : projectId;
}

/** The entry with the largest `at`, or null. Ties go to the later one in the record's order. */
export function newestOf<T extends { at: number }>(record: Record<string, T>): T | null {
  let best: T | null = null;
  for (const v of Object.values(record)) if (!best || v.at >= best.at) best = v;
  return best;
}

/** Milliseconds as "1300 ms" under two seconds, otherwise "2.4 s". */
export function formatMs(ms: number): string {
  return ms < 2000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}
