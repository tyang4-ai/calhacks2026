// The /demo stage (ui-contract.md, Camera states; demo-script.md): the kit's 1440 by 900 page scaled
// to the window, with the four frames (frame-buyer, frame-studio, frame-maker, frame-store) always
// mounted, the pitch card and the process panel. The stage reads the camera from beat.started:
// pitch shows the beat's pitch card alone; every other camera shows exactly one frame at scale 1,
// the others at opacity 0 and inert, and sell-catch zooms frame-studio 1.35 to the flag and its
// evidence. A beat with a process scales its frame to 0.66 in the left two thirds and slides the
// process panel, holding the process.view slot, into the right third. Camera moves and the split
// take 600 ms on the player clock and jump after a seek, a reset, while paused or under reduced
// motion. The modes: plain /demo ends on the end card, ?mode=present is presenter mode, ?start=
// seeks to a beat, and ?video=1 is video mode, which ignores the other two. The stage navigator's
// override opens the shown frame's drawer and process view until the next beat.started or seek.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import type { TourCameraId } from "../../core/featureTypes";
import { player } from "../../core/player";
import { store, useCindia } from "../../core/store";
import { useReducedMotion } from "../../ui/motion";
import { PAGE_WIDTH } from "../../ui/PageFrame";
import { featureSlugs, loadFeature } from "../featureLoader";
import { PUBLIC_SITE } from "../site";
import { SlotFor } from "../Slot";
import type { SlotContext } from "../slotProps";
import { STAGE_HEIGHT, useStageScale } from "../stageScale";
import { MakerSurface, SellSurface, ShopSurface, StoreSurface, type FrameStateProps } from "../surfaces";
import { BeatLabel } from "./BeatLabel";
import {
  CATCH_SCALE,
  INITIAL_PAGES,
  STAGE_FRAMES,
  STAGE_LAYERS,
  STAGE_MAKER_ID,
  STAGE_ORDER_ID,
  STAGE_STORE_SLUG,
  cameraFrame,
  cameraPose,
  createCameraMotion,
  nextPages,
  poseTransform,
  stageSearchParams,
  type Focus,
  type StageFrame,
  type StageLayer,
} from "./cameras";
import { ColdOpen } from "./ColdOpen";
import { EndCard } from "./EndCard";
import { PitchCard } from "./PitchCard";
import { pitchCardFor } from "./pitch";
import { atSpineEnd, presenterActive, startPresenter, stopPresenter, subscribePresenter } from "./presenter";
import { resolveStartBeat, startAtBeat } from "./startAt";
import { shownDrawer, shownProcess, useStageOverride } from "./stageOverride";
import styles from "./stage.module.css";
import { useDemoTimeline } from "./useDemoTimeline";
import { startVideo, stopVideo, subscribeVideoPhase, videoPhase } from "./videoMode";

/** The elements sell-catch zooms to: the flag and its evidence, inside frame-studio. */
const FOCUS_IDS = ["reconcile-flag", "reconcile-evidence-contract", "reconcile-evidence-statement", "reconcile-evidence-bank", "reconcile-explanation"];

/**
 * The point sell-catch centers on, in the studio frame's own pixels, measured as it shows on screen,
 * or null when the flag isn't there.
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
  // The view area's top left, for the zoom to align to.
  const c = frame.querySelector("main[data-view]")?.getBoundingClientRect();
  const corner = c && c.width > 0 ? { x: Math.round((c.left - f.left) / ratio), y: Math.round((c.top - f.top) / ratio) } : undefined;
  return { x: Math.round((box.left + box.right) / 2), y: Math.round(y), box, corner };
}

/**
 * Places the frames, the pitch card and the process panel for the camera, imperatively on every
 * player and store change, so the surfaces never re-render for a move.
 */
function CameraRig({ camera, process, layers }: { camera: TourCameraId; process: boolean; layers: Record<StageLayer, ReactNode> }) {
  const refs = useRef<Record<StageLayer, HTMLDivElement | null>>({ studio: null, buyer: null, maker: null, store: null, pitch: null, panel: null });
  const cameraRef = useRef(camera);
  const processRef = useRef(process);
  const reducedRef = useRef(false);
  const applyRef = useRef<() => void>(() => {});
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const motion = createCameraMotion();
    const apply = () => {
      const cam = cameraRef.current;
      const split = processRef.current;
      const focus = cam === "sell-catch" && !split ? measureFocus(refs.current.studio) : null;
      const pose = motion.update(cameraPose(cam, focus, split), player.now(), {
        epoch: player.epoch(),
        playing: player.isPlaying(),
        reduced: reducedRef.current,
      });
      for (const f of STAGE_LAYERS) {
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
    processRef.current = process;
    reducedRef.current = reduced;
    applyRef.current();
  }, [camera, process, reduced]);

  const ref = (f: StageLayer) => (el: HTMLDivElement | null) => {
    refs.current[f] = el;
  };
  return (
    <>
      {STAGE_FRAMES.map((f) => (
        <div key={f} ref={ref(f)} className={styles.frame} data-frame={f}>
          {layers[f]}
        </div>
      ))}
      <div ref={ref("pitch")} className={styles.pitchLayer} data-stage-layer="pitch">
        {layers.pitch}
      </div>
      <div ref={ref("panel")} className={styles.processPanel} data-stage-layer="process-panel">
        {layers.panel}
      </div>
    </>
  );
}

/** The player's state the stage's end card and modes follow, as one string so React re-renders only on a change. */
function usePlayerPhase(): { finished: boolean; spineEnd: boolean } {
  const key = useSyncExternalStore(
    player.subscribe,
    () => {
      const d = player.durationMs();
      const finished = d > 0 && !player.isPlaying() && player.now() >= d;
      return `${finished ? 1 : 0}|${atSpineEnd() ? 1 : 0}`;
    },
    () => "0|0",
  );
  return { finished: key[0] === "1", spineEnd: key[2] === "1" };
}

export function DemoStage() {
  const scale = useStageScale();
  const [search] = useSearchParams();
  const video = search.get("video") === "1";
  const present = !video && search.get("mode") === "present";
  const startParam = video ? null : search.get("start");
  const { beatId, camera } = useDemoTimeline();
  const vPhase = useSyncExternalStore(subscribeVideoPhase, videoPhase, videoPhase);
  const presenting = useSyncExternalStore(subscribePresenter, presenterActive, presenterActive);
  const { finished, spineEnd } = usePlayerPhase();
  const beatProcess = useCindia((s) => s.demo.process);
  const beatDrawer = useCindia((s) => s.demo.drawer);
  const openPieceId = useCindia((s) => s.buyer.openPieceId);
  const latestQuery = useCindia((s) => (s.search.latestQueryId ? (s.search.queries[s.search.latestQueryId] ?? null) : null));
  const { override, closeDrawer } = useStageOverride();

  // Load every feature up front, so a camera move to another page never waits on a lazy chunk.
  useEffect(() => {
    for (const slug of featureSlugs()) void loadFeature(slug);
  }, []);

  // The modes, once the timeline is loaded (useDemoTimeline loads it in the same commit, first).
  useEffect(() => {
    if (video) {
      startVideo();
      return () => stopVideo();
    }
    const startBeat = resolveStartBeat(startParam);
    if (present) {
      startPresenter(startBeat);
      return () => stopPresenter();
    }
    if (startBeat) startAtBeat(startBeat);
    return undefined;
  }, [video, present, startParam]);

  // The cold open's camera is the beat's own: the player waits on the last millisecond of d08-catch.
  const tour: TourCameraId = camera;
  const shownFrame = cameraFrame(tour);
  const processId = shownFrame ? shownProcess(override, beatProcess) : null;

  // Each frame keeps the page of the last camera that showed it.
  const [track, setTrack] = useState(() => ({ camera: tour, pages: nextPages(INITIAL_PAGES, tour) }));
  if (track.camera !== tour) setTrack({ camera: tour, pages: nextPages(track.pages, tour) });
  const pages = track.camera === tour ? track.pages : nextPages(track.pages, tour);

  // The pitch card keeps the last pitch beat's card while the stage moves off it.
  const [card, setCard] = useState(() => pitchCardFor(beatId));
  const want = tour === "pitch" ? pitchCardFor(beatId) : card;
  if (want !== card) setCard(want);

  const shownState: FrameStateProps = {
    drawer: shownDrawer(override, beatDrawer),
    refId: override.ref,
    processId,
    onCloseDrawer: closeDrawer,
    processOverlay: false,
  };
  const stateFor = (f: StageFrame): FrameStateProps => (f === shownFrame ? shownState : { drawer: null, processId: null, processOverlay: false });

  const panelCtx: SlotContext = {
    surface: shownFrame === "studio" ? "studio" : (shownFrame ?? "buyer"),
    lang: "en",
    publicSite: PUBLIC_SITE,
    processId,
  };

  const layers: Record<StageLayer, ReactNode> = {
    buyer: (
      <ShopSurface
        page={pages.shop}
        pieceId={openPieceId ?? undefined}
        orderId={STAGE_ORDER_ID}
        searchParams={stageSearchParams(latestQuery)}
        {...stateFor("buyer")}
      />
    ),
    studio: <SellSurface view={pages.sell} {...stateFor("studio")} />,
    maker: <MakerSurface makerId={STAGE_MAKER_ID} {...stateFor("maker")} />,
    store: <StoreSurface slug={STAGE_STORE_SLUG} {...stateFor("store")} />,
    pitch: <PitchCard card={want} />,
    panel: processId ? <SlotFor slot="process.view" ctx={panelCtx} /> : null,
  };

  const endCard = video ? vPhase === "end-card" : presenting ? spineEnd : finished;

  return (
    <div className={styles.ground}>
      <div className={styles.stage} data-testid="demo-stage" data-camera={tour} data-beat={beatId ?? ""} style={{ transform: `scale(${scale})` }}>
        <CameraRig camera={tour} process={processId !== null} layers={layers} />
        {!video && <BeatLabel beatId={beatId} camera={tour} />}
        {video && vPhase === "cold-open" && <ColdOpen />}
        {endCard && <EndCard />}
      </div>
    </div>
  );
}
