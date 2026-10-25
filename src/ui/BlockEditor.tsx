import type { ReactNode } from "react";
import type { Lang, Text } from "../core/types";
import { BLOCK_WORDS, pickText } from "./strings";
import { blockMoves } from "./views";

export interface EditorBlock {
  blockId: string;
  /** Such as hero or story. Kept as data-kind. */
  kind: string;
  title: Text;
  summary: Text;
}

export interface BlockEditorProps {
  /**
   * Block n's row gets `<testIdPrefix><blockId>`, and its controls `<testIdPrefix><blockId>-up`,
   * `-down` and `-edit`.
   */
  testIdPrefix: string;
  /** On the list's root. */
  testId?: string;
  blocks: EditorBlock[];
  selectedId?: string;
  onSelect: (blockId: string) => void;
  onMove: (blockId: string, direction: "up" | "down") => void;
  onEdit: (blockId: string) => void;
  lang: Lang;
  /** Drawn inside a block's row under its summary, such as its editable fields. */
  renderDetail?: (blockId: string) => ReactNode;
}

/**
 * A list of blocks in order, each with move up, move down and edit. The first can't move up and the
 * last can't move down. The selected block is marked by its rule and weight as well as its ground.
 */
export function BlockEditor({ testIdPrefix, testId, blocks, selectedId, onSelect, onMove, onEdit, lang, renderDetail }: BlockEditorProps) {
  return (
    <ol className="c-blocks" data-testid={testId} lang={lang}>
      {blocks.map((b, i) => {
        const moves = blockMoves(i, blocks.length);
        const on = b.blockId === selectedId;
        const id = `${testIdPrefix}${b.blockId}`;
        const detail = renderDetail?.(b.blockId);
        return (
          <li key={b.blockId} className={`c-block${on ? " c-block--selected" : ""}`} data-testid={id} data-kind={b.kind} data-selected={on || undefined}>
            <span className="c-block__n" aria-hidden="true">
              {i + 1}
            </span>
            <div className="c-block__main">
              <button type="button" className="c-block__title" aria-pressed={on} onClick={() => onSelect(b.blockId)}>
                {pickText(b.title, lang)}
              </button>
              <p className="c-block__summary">{pickText(b.summary, lang)}</p>
              {detail !== undefined && detail !== null && <div className="c-block__detail">{detail}</div>}
            </div>
            <div className="c-block__controls">
              <button type="button" className="c-block__ctl" data-testid={`${id}-up`} disabled={!moves.up} aria-label={pickText(BLOCK_WORDS.up, lang)} title={pickText(BLOCK_WORDS.up, lang)} onClick={() => onMove(b.blockId, "up")}>
                <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
                  <path d="M3 9 L7 5 L11 9" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
              <button type="button" className="c-block__ctl" data-testid={`${id}-down`} disabled={!moves.down} aria-label={pickText(BLOCK_WORDS.down, lang)} title={pickText(BLOCK_WORDS.down, lang)} onClick={() => onMove(b.blockId, "down")}>
                <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
                  <path d="M3 5 L7 9 L11 5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
              <button type="button" className="c-button c-button--quiet c-button--small" data-testid={`${id}-edit`} onClick={() => onEdit(b.blockId)}>
                {pickText(BLOCK_WORDS.edit, lang)}
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
