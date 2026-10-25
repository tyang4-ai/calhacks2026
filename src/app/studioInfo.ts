// The co-op's name for the console's top bar, found in src/mock/people.ts with import.meta.glob,
// so the shell builds before S2 and never types in a name that belongs in the mock data.
import type { Studio, Text } from "../core/types";
import { SHELL } from "./strings";

const modules = import.meta.glob<Record<string, unknown>>("../mock/people.ts", { eager: true });

function isStudio(v: unknown): v is Studio {
  return typeof v === "object" && v !== null && (v as Studio).id === "std_dine" && typeof (v as Studio).name === "object";
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

/** The co-op's name in both languages, or the glossary's "Co-op" before S2. */
export function studioName(): Text {
  return findStudio()?.name ?? SHELL.studio;
}
