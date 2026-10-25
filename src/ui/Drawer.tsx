import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { player } from "../core/player";
import type { Lang, Text } from "../core/types";
import { DRAWER_WIDTH, drawerOffset, isDrawerCloseKey } from "./frames";
import { usePlayerTime, useReducedMotion } from "./motion";
import { CLOSE_WORD, pickText } from "./strings";

export interface DrawerProps {
  testId?: string;
  open: boolean;
  onClose: () => void;
  title: Text;
  lang: Lang;
  children?: ReactNode;
  /** Default 440. */
  width?: number;
  /** On the close button. */
  closeTestId?: string;
}

/**
 * A drawer over the page, anchored to the right edge of its PageFrame (it is positioned against
 * the nearest positioned ancestor, never the window, so each frame on the stage has its own).
 * Esc and its close button call onClose. Focus moves into it when it opens. It slides in over
 * 160 ms on the player clock while the player plays, and appears at rest otherwise.
 * It sits above the process overlay (z-index 40).
 */
export function Drawer({ open, ...rest }: DrawerProps) {
  if (!open) return null;
  return <DrawerPanel {...rest} />;
}

function DrawerPanel({ testId, onClose, title, lang, children, width = DRAWER_WIDTH, closeTestId }: Omit<DrawerProps, "open">) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  // The moment it opened, on the player clock. Mounting is opening: the drawer renders nothing while closed.
  const [openedAt] = useState(() => player.now());
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!isDrawerCloseKey(e)) return;
      // A drawer in a frame the stage doesn't show is inert and leaves the key alone.
      if (ref.current?.closest("[inert]")) return;
      e.preventDefault();
      close.current();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <aside
      ref={ref}
      className="c-drawer"
      data-testid={testId}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      lang={lang}
      style={{ width }}
    >
      <Slide openedAt={openedAt} width={width}>
        <header className="c-drawer__head">
          <h2 className="c-drawer__title" id={titleId}>
            {pickText(title, lang)}
          </h2>
          <button type="button" className="c-drawer__close" data-testid={closeTestId} onClick={() => close.current()}>
            <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
              <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <span>{pickText(CLOSE_WORD, lang)}</span>
          </button>
        </header>
        <div className="c-drawer__body">{children}</div>
      </Slide>
    </aside>
  );
}

/** The drawer's face, offset to the right while it slides in on the player clock. */
function Slide({ openedAt, width, children }: { openedAt: number; width: number; children: ReactNode }) {
  const now = usePlayerTime();
  const reduced = useReducedMotion();
  const offset = drawerOffset(now, openedAt, width, player.isPlaying(), reduced);
  return (
    <div className="c-drawer__face" style={offset ? { transform: `translateX(${offset}px)` } : undefined}>
      {children}
    </div>
  );
}
