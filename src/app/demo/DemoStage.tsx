// The /demo stage, Phase A: the kit's 1440 by 900 page scaled to the window, with the four frames
// (frame-buyer, frame-studio, frame-maker, frame-store) always mounted. The stage reads the camera
// from beat.started and maps it through toTourCamera(): each tour camera but pitch shows exactly one
// frame at scale 1, the others at opacity 0 and inert, and sell-catch zooms frame-studio 1.35 to the
// flag and its evidence. While the camera is a v1 one, v1's views sit in their legacy boxes. Camera
// moves take 600 ms on the player clock and jump after a seek, a reset, while paused or under
// reduced motion. Video mode (?video=1) adds the cold open and the end card and hides the beat label;
// the demo controls hide themselves. The stage navigator's override opens the shown frame's drawer
// and process view until the next beat.started or seek.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { toTourCamera, type CameraId, type TourCameraId } from "../../core/featureTypes";
import { player } from "../../core/player";
import { store, useCindia } from "../../core/store";
import { useReducedMotion } from "../../ui/motion";
import { PAGE_WIDTH } from "../../ui/PageFrame";
import { featureSlugs, loadFeature } from "../featureLoader";
import { STAGE_HEIGHT, useStageScale } from "../stageScale";
import { MakerSurface, SellSurface, ShopSurface, StoreSurface, type FrameStateProps } from "../surfaces";
import { BeatLabel } from "./BeatLabel";
import {
  CATCH_SCALE,
  INITIAL_PAGES,
  STAGE_FRAMES,
  STAGE_MAKER_ID,
  STAGE_ORDER_ID,
  STAGE_STORE_SLUG,
  cameraFrame,
  cameraPose,
  createCameraMotion,
  isLegacyCamera,
  nextPages,
  poseTransform,
  stageSearchParams,
  type Focus,
  type StageFrame,
} from "./cameras";
import { ColdOpen } from "./ColdOpen";
import { EndCard } from "./EndCard";
import { REWIND_LINE, catchPhase, subscribeCatchPhase } from "./startAtCatch";
import { shownDrawer, shownProcess, useStageOverride } from "./stageOverride";
import styles from "./stage.module.css";
import { useDemoTimeline } from "./useDemoTimeline";
import { startVideo, stopVideo, subscribeVideoPhase, videoPhase } from "./videoMode";

/** The elements sell-catch zooms to: the flag and its evidence, inside frame-studio. */
const FOCUS_IDS = ["reconcile-flag", "reconcile-evidence-contract", "reconcile-evidence-statement", "reconcile-evidence-bank", "reconcile-explanation"];

/**
 * The point sell-catch centers on, in the studio frame's own pixels, measured as it shows on screen
 * (inside the legacy box in Phase A), or null when the flag isn't there.
 */
function measureFocus(wrapper: HTMLElement | null): Focus | null {
  const frame = wrapper?.querySelector('[data-testid="frame-studio"]');
  if (!frame) return null;
  const flag = frame.querySelector('[data-testid="reconcile-flag"]');
  if (!flag) return null;
  const f = frame.getBoundingClientRect();
  const ratio = f.width / PAGE_WIDTH;
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
  // The view content's top left (the legacy box in Phase A, else the view area), for the zoom to align to.
  const c = (frame.querySelector("[data-legacy-box]") ?? frame.querySelector("main[data-view]"))?.getBoundingClientRect();
  const corner = c && c.width > 0 ? { x: Math.round((c.left - f.left) / ratio), y: Math.round((c.top - f.top) / ratio) } : undefined;
  return { x: Math.round((box.left + box.right) / 2), y: Math.round(y), box, corner };
}

/** Places the four frames for the camera, imperatively on every player and store change, so the surfaces never re-render for a move. */
function CameraRig({ camera, frames }: { camera: TourCameraId; frames: Record<StageFrame, ReactNode> }) {
  const refs = useRef<Record<StageFrame, HTMLDivElement | null>>({ studio: null, buyer: null, maker: null, store: null });
  const cameraRef = useRef(camera);
  const reducedRef = useRef(false);
  const applyRef = useRef<() => void>(() => {});
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const motion = createCameraMotion();
    const apply = () => {
      const cam = cameraRef.current;
      const focus = cam === "sell-catch" ? measureFocus(refs.current.studio) : null;
      const pose = motion.update(cameraPose(cam, focus), player.now(), {
        epoch: player.epoch(),
        playing: player.isPlaying(),
        reduced: reducedRef.current,
      });
      for (const f of STAGE_FRAMES) {
        const el = refs.current[f];
        if (!el) continue;
        const p = pose[f];
        el.style.transform = poseTransform(p);
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
    const observer =
      typeof MutationObserver === "function"
        ? new MutationObserver(() => {
            if (cameraRef.current === "sell-catch") apply();
          })
        : null;
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
      {STAGE_FRAMES.map((f) => (
        <div
          key={f}
          ref={(el) => {
            refs.current[f] = el;
          }}
          className={styles.frame}
          data-frame={f}
        >
          {frames[f]}
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
  const beatProcess = useCindia((s) => s.demo.process);
  const beatDrawer = useCindia((s) => s.demo.drawer);
  const openPieceId = useCindia((s) => s.buyer.openPieceId);
  const latestQuery = useCindia((s) => (s.search.latestQueryId ? (s.search.queries[s.search.latestQueryId] ?? null) : null));
  const { override, closeDrawer } = useStageOverride();

  // Load every feature up front, so a camera move to another page never waits on a lazy chunk.
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
  const tour = toTourCamera(shot);
  const legacy = isLegacyCamera(shot);
  const shownFrame = cameraFrame(tour);

  // Each frame keeps the page of the last camera that showed it.
  const [track, setTrack] = useState(() => ({ camera: tour, pages: nextPages(INITIAL_PAGES, tour) }));
  if (track.camera !== tour) setTrack({ camera: tour, pages: nextPages(track.pages, tour) });
  const pages = track.camera === tour ? track.pages : nextPages(track.pages, tour);

  const shownState: FrameStateProps = {
    drawer: shownDrawer(override, beatDrawer),
    refId: override.ref,
    processId: shownProcess(override, beatProcess),
    onCloseDrawer: closeDrawer,
  };
  const stateFor = (f: StageFrame): FrameStateProps => (f === shownFrame ? shownState : { drawer: null, processId: null });

  const frames: Record<StageFrame, ReactNode> = {
    buyer: (
      <ShopSurface
        page={pages.shop}
        pieceId={openPieceId ?? undefined}
        orderId={STAGE_ORDER_ID}
        searchParams={stageSearchParams(latestQuery)}
        {...stateFor("buyer")}
      />
    ),
    studio: <SellSurface view={pages.sell} legacy={legacy} {...stateFor("studio")} />,
    maker: <MakerSurface makerId={STAGE_MAKER_ID} legacy={legacy} {...stateFor("maker")} />,
    store: <StoreSurface slug={STAGE_STORE_SLUG} {...stateFor("store")} />,
  };

  return (
    <div className={styles.ground}>
      <div className={styles.stage} data-testid="demo-stage" data-camera={tour} data-beat={beatId ?? ""} style={{ transform: `scale(${scale})` }}>
        <CameraRig camera={tour} frames={frames} />
        {!video && <BeatLabel beatId={beatId} camera={tour} />}
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
