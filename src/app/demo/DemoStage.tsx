// The /demo stage (I1): the 1600 by 900 canvas scaled to the window, with the four surface frames
// placed by the camera from beat.started. Camera moves take 600 ms on the player clock and jump
// after a seek, a reset, while paused or under reduced motion. Video mode (?video=1) adds the cold
// open and the end card and hides the beat label; the demo controls hide themselves.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import type { CameraId, StudioView, SurfaceId } from "../../core/featureTypes";
import { player } from "../../core/player";
import { store } from "../../core/store";
import { CONSOLE_WIDTH } from "../../ui/ConsoleFrame";
import { useReducedMotion } from "../../ui/motion";
import { featureSlugs, loadFeature } from "../featureLoader";
import { STAGE_HEIGHT, useStageScale } from "../stageScale";
import { BuyerSurface, MakerSurface, OwnerSurface, StudioSurface } from "../surfaces";
import { useDrawerParams } from "../useDrawer";
import { BeatLabel } from "./BeatLabel";
import { CATCH_SCALE, SURFACES, cameraPose, cameraView, createCameraMotion, poseTransform, type Focus } from "./cameras";
import { ColdOpen } from "./ColdOpen";
import { EndCard } from "./EndCard";
import { REWIND_LINE, catchPhase, subscribeCatchPhase } from "./startAtCatch";
import styles from "./stage.module.css";
import { useDemoTimeline } from "./useDemoTimeline";
import { startVideo, stopVideo, subscribeVideoPhase, videoPhase } from "./videoMode";

/** The elements studio-catch zooms to: the flag and its evidence, inside frame-studio. */
const FOCUS_IDS = ["reconcile-flag", "reconcile-evidence-contract", "reconcile-evidence-statement", "reconcile-evidence-bank", "reconcile-explanation"];
const Z: Record<SurfaceId, number> = { studio: 1, buyer: 2, owner: 2, maker: 3 };

/** The point studio-catch centers on, in the studio frame's own pixels, or null when the flag isn't there. */
function measureFocus(frame: HTMLElement | null): Focus | null {
  if (!frame) return null;
  const flag = frame.querySelector('[data-testid="reconcile-flag"]');
  if (!flag) return null;
  const f = frame.getBoundingClientRect();
  const ratio = f.width / CONSOLE_WIDTH;
  if (!(ratio > 0)) return null;
  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const id of FOCUS_IDS) {
    const el = frame.querySelector(`[data-testid="${id}"]`);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    top = Math.min(top, r.top);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  if (!Number.isFinite(top)) return null;
  const box = { top: (top - f.top) / ratio, left: (left - f.left) / ratio, bottom: (bottom - f.top) / ratio, right: (right - f.left) / ratio };
  // When the flag and its evidence are taller than the zoomed view, keep the flag's top in view.
  const viewH = STAGE_HEIGHT / CATCH_SCALE;
  const y = box.bottom - box.top > viewH - 48 ? box.top - 24 + viewH / 2 : (box.top + box.bottom) / 2;
  return { x: Math.round((box.left + box.right) / 2), y: Math.round(y) };
}

/** Places the four frames for the camera, imperatively on every player and store change, so the surfaces never re-render for a move. */
function CameraRig({ camera, surfaces }: { camera: CameraId; surfaces: Record<SurfaceId, ReactNode> }) {
  const refs = useRef<Record<SurfaceId, HTMLDivElement | null>>({ studio: null, buyer: null, owner: null, maker: null });
  const cameraRef = useRef(camera);
  const reducedRef = useRef(false);
  const applyRef = useRef<() => void>(() => {});
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const motion = createCameraMotion();
    const apply = () => {
      const cam = cameraRef.current;
      const focus = cam === "studio-catch" ? measureFocus(refs.current.studio) : null;
      const pose = motion.update(cameraPose(cam, focus), player.now(), {
        epoch: player.epoch(),
        playing: player.isPlaying(),
        reduced: reducedRef.current,
      });
      for (const s of SURFACES) {
        const el = refs.current[s];
        if (!el) continue;
        const p = pose[s];
        el.style.transform = poseTransform(s, p);
        el.style.opacity = p.opacity.toFixed(3);
        const shown = p.opacity > 0.01;
        if (el.dataset.shown !== String(shown)) {
          el.dataset.shown = String(shown);
          el.inert = !shown;
        }
      }
    };
    applyRef.current = apply;
    apply();
    const offPlayer = player.subscribe(apply);
    const offStore = store.subscribe(apply);
    // The flag can render after the store changes (a lazy panel loading), so watch the studio's DOM too.
    const studio = refs.current.studio;
    const observer = typeof MutationObserver === "function" ? new MutationObserver(() => {
      if (cameraRef.current === "studio-catch") apply();
    }) : null;
    if (studio && observer) observer.observe(studio, { childList: true, subtree: true });
    return () => {
      offPlayer();
      offStore();
      observer?.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    cameraRef.current = camera;
    reducedRef.current = reduced;
    applyRef.current();
  }, [camera, reduced]);

  return (
    <>
      {SURFACES.map((s) => (
        <div
          key={s}
          ref={(el) => {
            refs.current[s] = el;
          }}
          className={styles.frame}
          data-surface={s}
          style={{ zIndex: Z[s] }}
        >
          {surfaces[s]}
        </div>
      ))}
    </>
  );
}

export function DemoStage() {
  const scale = useStageScale();
  const [search] = useSearchParams();
  const video = search.get("video") === "1";
  const { beatId, camera } = useDemoTimeline();
  const vPhase = useSyncExternalStore(subscribeVideoPhase, videoPhase, videoPhase);
  const cPhase = useSyncExternalStore(subscribeCatchPhase, catchPhase, catchPhase);
  const { drawer, refId, open, close } = useDrawerParams();

  // Load every feature up front, so a camera move to another studio view never waits on a lazy chunk.
  useEffect(() => {
    for (const slug of featureSlugs()) void loadFeature(slug);
  }, []);

  useEffect(() => {
    if (!video) return;
    startVideo();
    return () => stopVideo();
  }, [video]);

  // The cold open shows the catch while the player waits at 38.0, where the beat's camera is studio-owner.
  const shot: CameraId = video && vPhase === "cold-open" ? "studio-catch" : camera;

  // The studio's view follows the camera. A camera that hides the studio keeps the last view, and a
  // person can switch views on the rail until the next camera change.
  const [track, setTrack] = useState<{ camera: CameraId; view: StudioView }>(() => ({ camera: shot, view: cameraView(shot) ?? "map" }));
  if (track.camera !== shot) setTrack({ camera: shot, view: cameraView(shot) ?? track.view });
  const view = track.camera === shot ? track.view : (cameraView(shot) ?? track.view);

  const surfaces: Record<SurfaceId, ReactNode> = {
    studio: (
      <StudioSurface
        view={view}
        drawer={drawer}
        refId={refId}
        onViewChange={(v) => setTrack({ camera: shot, view: v })}
        onOpenDrawer={open}
        onCloseDrawer={close}
      />
    ),
    buyer: <BuyerSurface />,
    owner: <OwnerSurface />,
    maker: <MakerSurface makerId="mkr_01" />,
  };

  return (
    <div className={styles.ground}>
      <div className={styles.stage} data-testid="demo-stage" data-camera={shot} data-beat={beatId ?? ""} style={{ transform: `scale(${scale})` }}>
        <CameraRig camera={shot} surfaces={surfaces} />
        {!video && <BeatLabel beatId={beatId} camera={shot} />}
        {video && vPhase === "cold-open" && <ColdOpen />}
        {video && vPhase === "end-card" && <EndCard />}
        {cPhase === "rewind" && (
          <div className={styles.overlay} data-catch-phase="rewind">
            <p className={styles.rewind}>{REWIND_LINE}</p>
          </div>
        )}
      </div>
    </div>
  );
}
