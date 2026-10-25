// The demo controls (F18): a small bar fixed to the bottom right of every route. It collapses to
// one button and expands on hover or focus. Video mode (?video=1) hides it. The keys work on every
// route except while a text input has focus. The public build (PUBLIC_SITE) hides the Live switch
// and ignores its key, so the public site stays scripted. The site is English only, so there is no
// language switch and no L key. In presenter mode (/demo?mode=present) Space and the arrows step
// through the beats (presenter.ts).
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "react-router";
import { SOURCE_KEYS } from "../../core/events";
import { player, type Speed } from "../../core/player";
import { cycleSpeed, isTextInput, resetDemo, togglePlay } from "./playback";
import { presenterActive, presenterKey } from "../demo/presenter";
import { startAtCatch } from "../demo/startAtCatch";
import { useCindia } from "../../core/store";
import { toggleMode, useSourceHealth } from "../../sources/mode";
import { PUBLIC_SITE } from "../site";
import "./controls.css";

function usePlayerStatus(): { playing: boolean; speed: Speed } {
  const key = useSyncExternalStore(
    player.subscribe,
    () => `${player.isPlaying() ? 1 : 0}|${player.getSpeed()}`,
    () => "0|1",
  );
  const [p, s] = key.split("|");
  return { playing: p === "1", speed: Number(s) as Speed };
}

function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

export function DemoControls() {
  const [search] = useSearchParams();
  const video = search.get("video") === "1";
  const { playing, speed } = usePlayerStatus();
  const mode = useCindia((s) => s.mode);
  const health = useSourceHealth();
  const online = useOnline();
  const [open, setOpen] = useState(false);

  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (isTextInput(document.activeElement)) return;
    const k = e.key.toLowerCase();
    const space = e.key === " " || e.code === "Space";
    if (presenterActive() && (space || e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      e.preventDefault();
      presenterKey(space ? "space" : e.key === "ArrowRight" ? "right" : "left");
    } else if (space) {
      // Prevent the focused button's own click and the page scroll.
      e.preventDefault();
      togglePlay();
    } else if (k === "r") resetDemo();
    else if (k === "s") cycleSpeed();
    else if (k === "m" && !PUBLIC_SITE) toggleMode();
    else if (k === "c") startAtCatch();
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  if (video) return null;

  return (
    <div
      className={`c-demo-controls${open ? " c-demo-controls--open" : ""}`}
      data-testid="demo-controls"
      role="toolbar"
      aria-label="Demo controls"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className="c-demo-controls__row">
        {playing ? (
          <button type="button" data-testid="demo-pause" onClick={togglePlay} title="Pause (Space)">
            ❚❚ Pause
          </button>
        ) : (
          <button type="button" data-testid="demo-play" onClick={togglePlay} title="Play (Space)">
            ▶ Play
          </button>
        )}
        <button type="button" data-testid="demo-reset" onClick={resetDemo} title="Reset (R)">
          ↺ Reset
        </button>
        <button type="button" data-testid="demo-speed" onClick={cycleSpeed} title="Speed (S)">
          {speed}x
        </button>
        {!PUBLIC_SITE && (
        <button type="button" data-testid="demo-mode-toggle" data-mode={mode} onClick={() => toggleMode()} title="Scripted or live (M)">
          {mode === "live" ? "Live" : "Scripted"}
          {mode === "live" && (
            <span className="c-demo-controls__dots" aria-label="Live sources">
              {SOURCE_KEYS.map((k) => (
                <span
                  key={k}
                  className={`c-demo-controls__dot${health[k] ? " c-demo-controls__dot--on" : ""}`}
                  title={`${k}: ${health[k] ? "healthy" : "not available"}`}
                  data-source-key={k}
                  data-healthy={health[k] ? "true" : "false"}
                />
              ))}
            </span>
          )}
        </button>
        )}
        <button type="button" data-testid="demo-start-at-catch" onClick={() => startAtCatch()} title="Start at the catch (C)">
          Start at the catch
        </button>
        {!online && (
          <span className="c-demo-controls__offline" data-testid="demo-offline">
            Offline
          </span>
        )}
      </div>
      <button type="button" className="c-demo-controls__handle" aria-label="Demo controls" aria-expanded={open} tabIndex={-1}>
        Demo
      </button>
    </div>
  );
}
