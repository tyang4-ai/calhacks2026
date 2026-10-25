// The editor (T4): the kit BlockEditor over the working copy, the theme accent and the layout.
// - Each block row is storefront-block-<blockId>, with the kit's move up, move down and edit. The
//   selected block's row holds its editable text fields, each a textarea with data-prop.
// - storefront-accent picks from the kit's accent tokens, and storefront-layout switches the two
//   layouts. Each carries data-value, and each option its data-accent or data-layout.
// - Every change is a new working copy through workingCopy.ts, handed up with onChange, so editing
//   stays in component state and emits nothing.
import { useLayoutEffect, useRef, useState } from "react";
import type { Lang, StorefrontBlock, Text } from "../../core/types";
import { BlockEditor, type EditorBlock } from "../../ui";
import { ACCENT_NAMES, BLOCK_NAMES, LAYOUT_NAMES, PROP_LABELS, UI, t, tf } from "./strings";
import styles from "./storefront.module.css";
import { ACCENTS, LAYOUTS, listProp, moveBlock, setAccent, setLayout, setText, textProp, textPropsOf, type WorkingCopy } from "./workingCopy";

export interface BuilderEditorProps {
  copy: WorkingCopy;
  onChange: (next: WorkingCopy) => void;
  lang: Lang;
}

/** The same English string in both languages: block text props are English only. */
function asText(s: string): Text {
  return { en: s, zh: s };
}

function countText(n: number, one: Text, many: Text, lang: Lang): string {
  return n === 1 ? t(one, lang) : tf(many, lang, { n });
}

/** The line under a block's name in its row. */
function summaryOf(block: StorefrontBlock, lang: Lang): Text {
  switch (block.kind) {
    case "hero":
      return textProp(block, "tagline").trim() ? asText(textProp(block, "tagline")) : UI.emptyProp;
    case "story":
    case "process":
      return textProp(block, "title").trim() ? asText(textProp(block, "title")) : UI.emptyProp;
    case "visit":
      return textProp(block, "address").trim() ? asText(textProp(block, "address")) : UI.emptyProp;
    case "pieces":
      return asText(countText(listProp(block, "pieceIds").length, UI.piecesOne, UI.piecesCount, lang));
    case "projects":
      return asText(countText(listProp(block, "projectIds").length, UI.projectsOne, UI.projectsCount, lang));
    default:
      return UI.emptyProp;
  }
}

/** A textarea that grows with its text, so nothing in it is ever cut off. */
function GrowingField({ value, onChange, prop, label, autoFocusKey }: { value: string; onChange: (v: string) => void; prop: string; label: string; autoFocusKey: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // After every render: the box takes its text's height (lessons, F-buyer), with no transition.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  });
  useLayoutEffect(() => {
    if (autoFocusKey > 0) ref.current?.focus();
  }, [autoFocusKey]);
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <textarea
        ref={ref}
        className={styles.fieldInput}
        data-prop={prop}
        lang="en"
        rows={1}
        value={value}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
      />
    </label>
  );
}

function BlockFields({ block, copy, onChange, lang, focusKey }: { block: StorefrontBlock; copy: WorkingCopy; onChange: (c: WorkingCopy) => void; lang: Lang; focusKey: number }) {
  const props = textPropsOf(block.kind);
  const note = block.kind === "story" ? UI.storyNote : block.kind === "process" ? UI.processNote : props.length === 0 ? UI.fromRecords : null;
  return (
    <div className={styles.fields}>
      {props.map((prop, i) => (
        <GrowingField
          key={prop}
          prop={prop}
          label={t(PROP_LABELS[prop] ?? asText(prop), lang)}
          value={textProp(block, prop)}
          onChange={(v) => onChange(setText(copy, block.blockId, prop, v))}
          autoFocusKey={i === 0 ? focusKey : 0}
        />
      ))}
      {note && <p className={styles.fieldNote}>{t(note, lang)}</p>}
    </div>
  );
}

/** The theme: storefront-accent (the kit's accent tokens) and storefront-layout (the two layouts), in one row. */
export function ThemeControls({ copy, onChange, lang }: BuilderEditorProps) {
  return (
    <div className={styles.theme} lang={lang}>
      <section className={styles.themeRow}>
        <div className={styles.choiceRow}>
          <span className={styles.choiceLabel}>{t(UI.accent, lang)}</span>
          <div className={styles.choices} role="radiogroup" aria-label={t(UI.accent, lang)} data-testid="storefront-accent" data-value={copy.accent}>
            {ACCENTS.map((a) => {
              const on = copy.accent === a;
              return (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  data-accent={a}
                  className={on ? styles.choiceOn : styles.choice}
                  onClick={() => onChange(setAccent(copy, a))}
                >
                  <span className={styles.swatch} style={{ background: `var(--c-color-${a})` }} aria-hidden="true" />
                  <span>{t(ACCENT_NAMES[a], lang)}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className={styles.choiceRow}>
          <span className={styles.choiceLabel}>{t(UI.layout, lang)}</span>
          <div className={styles.choices} role="radiogroup" aria-label={t(UI.layout, lang)} data-testid="storefront-layout" data-value={copy.layout}>
            {LAYOUTS.map((l) => {
              const on = copy.layout === l;
              return (
                <button key={l} type="button" role="radio" aria-checked={on} data-layout={l} className={on ? styles.choiceOn : styles.choice} onClick={() => onChange(setLayout(copy, l))}>
                  <span>{t(LAYOUT_NAMES[l], lang)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
      <p className={styles.fieldNote}>{t(UI.accentNote, lang)}</p>
    </div>
  );
}

/** The blocks: the kit BlockEditor over the working copy, the selected row holding its text fields. */
export function BuilderEditor({ copy, onChange, lang }: BuilderEditorProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const selectedId = picked && copy.blocks.some((b) => b.blockId === picked) ? picked : (copy.blocks[0]?.blockId ?? undefined);
  const editorBlocks: EditorBlock[] = copy.blocks.map((b) => ({
    blockId: b.blockId,
    kind: b.kind,
    title: BLOCK_NAMES[b.kind] ?? asText(String(b.kind)),
    summary: summaryOf(b, lang),
  }));

  return (
    <div className={styles.editor} lang={lang}>
      <section className={styles.editorSection}>
        <h3 className={styles.h3}>{t(UI.blocks, lang)}</h3>
        <BlockEditor
          testIdPrefix="storefront-block-"
          blocks={editorBlocks}
          selectedId={selectedId}
          onSelect={(id) => setPicked(id)}
          onMove={(id, direction) => onChange(moveBlock(copy, id, direction))}
          onEdit={(id) => {
            setPicked(id);
            setFocusKey((k) => k + 1);
          }}
          lang={lang}
          renderDetail={(id) => {
            if (id !== selectedId) return null;
            const block = copy.blocks.find((b) => b.blockId === id);
            return block ? <BlockFields block={block} copy={copy} onChange={onChange} lang={lang} focusKey={focusKey} /> : null;
          }}
        />
      </section>
    </div>
  );
}
