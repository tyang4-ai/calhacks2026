// Small components the process views share: the waiting line (process-empty), a section heading,
// quiet text and a small outlined tag.
import type { CSSProperties, ReactNode } from "react";
import type { Lang, Text } from "../../core/types";
import { t } from "./strings";

/** The waiting line a view shows before its first event. One per view. */
export function Empty({ text, lang }: { text: Text; lang: Lang }) {
  return (
    <p data-testid="process-empty" className="py-6" style={{ color: "var(--c-color-ink-soft)" }}>
      {t(text, lang)}
    </p>
  );
}

/** A small section heading inside a view, with optional things on its right. */
export function SectionHead({ title, lang, right }: { title: Text; lang: Lang; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h3 className="font-semibold" style={{ fontSize: "var(--c-text-16)" }}>
        {t(title, lang)}
      </h3>
      {right}
    </div>
  );
}

/**
 * A compact figure: its label over its value, in a hairline box. Both wrap rather than cut, so a
 * glossary label or a long model name always shows in full.
 */
export function Figure({ label, value, lang, attr, style }: { label: Text; value: ReactNode; lang: Lang; attr?: Record<string, string | number>; style?: CSSProperties }) {
  return (
    <div {...attr} className="flex min-w-0 flex-col px-3 py-1.5" style={{ border: "1px solid var(--c-color-line)", borderRadius: "var(--c-radius-panel)", ...style }}>
      <span style={{ color: "var(--c-color-ink-soft)", fontSize: "var(--c-text-14)", overflowWrap: "anywhere" }}>{t(label, lang)}</span>
      <span data-role="value" className="font-semibold tabular-nums" style={{ fontSize: "var(--c-text-21)", lineHeight: 1.25, overflowWrap: "anywhere" }}>
        {value}
      </span>
    </div>
  );
}

/** Quiet text, such as a note under a drawing. */
export function Quiet({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={className} style={{ color: "var(--c-color-ink-soft)", fontSize: "var(--c-text-14)" }}>
      {children}
    </span>
  );
}

/** A small outlined token, such as an ID or a keyword. */
export function Tag({ children, title, tone = "ink" }: { children: ReactNode; title?: string; tone?: "ink" | "jade" | "seal" | "soft" }) {
  const color = tone === "jade" ? "var(--c-color-jade)" : tone === "seal" ? "var(--c-color-seal)" : tone === "soft" ? "var(--c-color-ink-soft)" : "var(--c-color-ink)";
  return (
    <span
      className="inline-block px-1.5"
      title={title}
      style={{ maxWidth: "100%", overflowWrap: "anywhere", border: "1px solid var(--c-color-line)", borderRadius: "var(--c-radius-panel)", color, fontSize: "var(--c-text-14)", lineHeight: "20px" }}
    >
      {children}
    </span>
  );
}
