// The owner's initials on the kit Seal (design drop 3, "The seal shows the owner's initials"): the
// first letter of the given name plus the family initial, so Ruth B. seals as "RB". Derived from the
// person record in src/mock/people.ts, never stored. A name with one word seals with its family
// initial alone, as before.
import type { Person } from "../../core/types";

export function sealInitials(person: Pick<Person, "name" | "surnameChar"> | undefined): string {
  if (!person) return "";
  const family = person.surnameChar ?? "";
  const words = person.name.en.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return family;
  const given = (Array.from(words[0] ?? "")[0] ?? "").toUpperCase();
  return given + family;
}
