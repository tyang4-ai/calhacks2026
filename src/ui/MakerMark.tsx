export interface MakerMarkProps {
  testId?: string;
  /** The maker's surname character, from Person.surnameChar. */
  char: string;
  size?: number;
  label?: string;
}

/** A small square ink seal with the maker's surname character, used instead of photo avatars. */
export function MakerMark({ testId, char, size = 36, label }: MakerMarkProps) {
  return (
    <span
      className="c-makermark"
      data-testid={testId}
      role="img"
      aria-label={label ?? char}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}
    >
      {char}
    </span>
  );
}
