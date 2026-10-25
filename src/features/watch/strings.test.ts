// strings.ts copies its glossary words and L19 to L23 word for word: checked here against
// docs/common/glossary.md.
import { describe, expect, it } from "vitest";
import glossaryMd from "../../../docs/common/glossary.md?raw";
import { checkedWords, fill, foundWords, GLOSSARY, L19, L19_EXAMPLE_SCORE, L19_HINT, L19_LABEL, L20, L21, L22, L23 } from "./strings";

const glossary: string[] = glossaryMd.split(/\r?\n/);
const cells = (line: string) => line.split("|").map((c) => c.trim());

function labelRow(id: string): { en: string; zh: string } {
  const row = glossary.find((l) => l.startsWith(`| ${id} |`));
  expect(row, id).toBeDefined();
  const [, , en, zh] = cells(row!);
  return { en, zh };
}

describe("on-screen labels", () => {
  it("L19 with the glossary's number matches the glossary in both languages", () => {
    expect(fill(L19, { score: L19_EXAMPLE_SCORE })).toEqual(labelRow("L19"));
  });

  it("L19's label and hint are its first sentence and its last two", () => {
    const row = labelRow("L19");
    const label = fill(L19_LABEL, { score: L19_EXAMPLE_SCORE });
    expect(row.en.startsWith(label.en)).toBe(true);
    expect(row.zh.startsWith(label.zh)).toBe(true);
    expect(row.en.endsWith(L19_HINT.en)).toBe(true);
    expect(row.zh.endsWith(L19_HINT.zh)).toBe(true);
  });

  for (const [id, text] of [
    ["L20", L20],
    ["L21", L21],
    ["L22", L22],
    ["L23", L23],
  ] as const) {
    it(`${id} matches the glossary in both languages`, () => {
      expect(text).toEqual(labelRow(id));
    });
  }
});

describe("glossary words", () => {
  const pairs = new Set(
    glossary
      .filter((l) => l.startsWith("| ") && !/^\| L\d+ \|/.test(l) && cells(l).length >= 6)
      .map((l) => {
        const c = cells(l);
        return `${c[3]}|${c[4]}`;
      }),
  );
  for (const [name, text] of Object.entries(GLOSSARY)) {
    it(`${name} is a glossary label, word for word`, () => {
      expect(pairs.has(`${text.en}|${text.zh}`), `${text.en} / ${text.zh}`).toBe(true);
    });
  }
});

describe("counts in words", () => {
  it("says one and many plainly", () => {
    expect(checkedWords(1).en).toBe("1 result checked");
    expect(checkedWords(4).en).toBe("4 results checked");
    expect(foundWords(0).en).toBe("no possible copies found");
    expect(foundWords(1).en).toBe("1 possible copy found");
    expect(foundWords(2).zh).toBe("发现 2 件疑似仿冒");
  });
});
