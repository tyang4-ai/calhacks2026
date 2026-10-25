// strings.ts copies its glossary words, L18, L28 and L29 and the block labels word for word: checked
// here against docs/common/glossary.md and the process table in docs/common/ui-contract.md.
import { describe, expect, it } from "vitest";
import glossaryMd from "../../../docs/common/glossary.md?raw";
import uiContractMd from "../../../docs/common/ui-contract.md?raw";
import { PROCESS_IDS } from "../../core/events";
import { BADGE_WORDS } from "../../ui/strings";
import { BLOCK_LABELS, GLOSSARY, L18, L28, L29 } from "./strings";

const glossary: string[] = glossaryMd.split(/\r?\n/);
const uiContract: string[] = uiContractMd.split(/\r?\n/);
const cells = (line: string) => line.split("|").map((c) => c.trim());

describe("on-screen labels", () => {
  for (const [id, text] of [
    ["L18", L18],
    ["L28", L28],
    ["L29", L29],
  ] as const) {
    it(`${id} matches the glossary in both languages`, () => {
      const row = glossary.find((l) => l.startsWith(`| ${id} |`));
      expect(row).toBeDefined();
      const [, , en, zh] = cells(row!);
      expect(text).toEqual({ en, zh });
    });
  }
});

describe("glossary words", () => {
  // The domain table's rows: word, code name, English label, Chinese label, meaning.
  const pairs = new Set(
    glossary
      .filter((l) => l.startsWith("| ") && !l.startsWith("| L") && cells(l).length >= 6)
      .map((l) => {
        const c = cells(l);
        return `${c[3]}|${c[4]}`;
      }),
  );

  for (const [name, text] of Object.entries(GLOSSARY)) {
    it(`${name} is a glossary label, word for word`, () => {
      if (name === "simulated") expect(text).toEqual(BADGE_WORDS.simulated);
      else expect(pairs.has(`${text.en}|${text.zh}`), `${text.en} / ${text.zh}`).toBe(true);
    });
  }
});

describe("block labels", () => {
  it("match the process table in ui-contract.md, in the bar's order", () => {
    const rows = uiContract.filter((l) => /^\| `[a-z]+` \| [^|]+, [^|]+ \| /.test(l));
    const table = Object.fromEntries(
      rows.map((l) => {
        const c = cells(l);
        const id = c[1].replace(/`/g, "");
        const i = c[2].lastIndexOf(", ");
        return [id, { en: c[2].slice(0, i), zh: c[2].slice(i + 2) }];
      }),
    );
    for (const id of PROCESS_IDS) expect(BLOCK_LABELS[id]).toEqual(table[id]);
  });
});
