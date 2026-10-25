// The co-op's name for the Sell header and each maker's own language for the maker page, found in
// src/mock/people.ts with import.meta.glob, so the shell never types in a name or a language that
// belongs in the mock data.
import type { Lang, Person, Studio, Text } from "../core/types";
import { SHELL } from "./strings";

const modules = import.meta.glob<Record<string, unknown>>("../mock/people.ts", { eager: true });

function isStudio(v: unknown): v is Studio {
  return typeof v === "object" && v !== null && (v as Studio).id === "std_dine" && typeof (v as Studio).name === "object";
}

function isPerson(v: unknown): v is Person {
  return typeof v === "object" && v !== null && typeof (v as Person).id === "string" && typeof (v as Person).role === "string";
}

function findStudio(): Studio | undefined {
  for (const mod of Object.values(modules)) {
    for (const v of Object.values(mod)) {
      if (isStudio(v)) return v;
      if (Array.isArray(v)) {
        const hit = v.find(isStudio);
        if (hit) return hit;
      }
      if (typeof v === "object" && v !== null && isStudio((v as Record<string, unknown>).std_dine)) {
        return (v as Record<string, Studio>).std_dine;
      }
    }
  }
  return undefined;
}

function findPerson(id: string): Person | undefined {
  for (const mod of Object.values(modules)) {
    for (const v of Object.values(mod)) {
      if (Array.isArray(v)) {
        const hit = v.find((p): p is Person => isPerson(p) && p.id === id);
        if (hit) return hit;
      } else if (isPerson(v) && v.id === id) return v;
    }
  }
  return undefined;
}

/** The co-op's name in both languages, or the glossary's "Co-op" before the mock data has it. */
export function studioName(): Text {
  return findStudio()?.name ?? SHELL.studio;
}

/** A maker's own interface language from src/mock/people.ts, or undefined when the maker isn't found. */
export function makerLang(makerId: string | undefined): Lang | undefined {
  if (!makerId) return undefined;
  const p = findPerson(makerId);
  return p && p.role === "maker" && (p.lang === "en" || p.lang === "zh") ? p.lang : undefined;
}
