export interface MakerMarkProps {
  testId?: string;
  /** The maker's surname character, from Person.surnameChar. */
  char: string;
  size?: number;
  label?: string;
}

/** The smallest text the kit draws (design-system.md). A small mark's glyph stays at 14 px. */
const MIN_TEXT_PX = 14;

/** The glyph's size for a mark: 55% of the mark, never under 14 px. */
function makerMarkGlyphPx(size: number): number {
  return Math.max(MIN_TEXT_PX, Math.round(size * 0.55));
}

/**
 * A small square ink mark with the maker's initial, used instead of photo avatars: a 1 px ink border,
 * paper inside, the letter in the seal face (--c-font-seal). 24 px on cards, 48 px on the maker page.
 */
export function MakerMark({ testId, char, size = 36, label }: MakerMarkProps) {
  return (
    <span
      className="c-makermark"
      data-testid={testId}
      role="img"
      aria-label={label ?? char}
      style={{ width: size, height: size, fontSize: makerMarkGlyphPx(size) }}
    >
      {char}
    </span>
  );
}
