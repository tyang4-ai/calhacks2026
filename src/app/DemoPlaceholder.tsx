// The S1 placeholder for /demo: the four frames side by side, scaled to fit, inside demo-stage.
// The integrator replaces it with the real stage (src/app/demo/DemoStage.tsx) in I1.
import { useState } from "react";
import { STAGE_HEIGHT, STAGE_WIDTH, useStageScale } from "./stageScale";
import type { StudioView } from "../core/featureTypes";
import { CONSOLE_WIDTH } from "../ui/ConsoleFrame";
import { PHONE_HEIGHT, PHONE_WIDTH } from "../ui/PhoneFrame";
import { BuyerSurface, MakerSurface, OwnerSurface, StudioSurface } from "./surfaces";
import { useDrawerParams } from "./useDrawer";

const GAP = 40;
const ROW_WIDTH = PHONE_WIDTH * 3 + CONSOLE_WIDTH + GAP * 3;
const ROW_SCALE = Math.min((STAGE_WIDTH - 80) / ROW_WIDTH, (STAGE_HEIGHT - 80) / PHONE_HEIGHT);

export function DemoPlaceholder() {
  const scale = useStageScale();
  const [view, setView] = useState<StudioView>("map");
  const { drawer, refId, open, close } = useDrawerParams();
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--c-color-paper)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        data-testid="demo-stage"
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          flexShrink: 0,
          transform: `scale(${scale})`,
          transformOrigin: "center",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: GAP,
            transform: `scale(${ROW_SCALE})`,
            transformOrigin: "center",
            flexShrink: 0,
          }}
        >
          <BuyerSurface />
          <StudioSurface view={view} drawer={drawer} refId={refId} onViewChange={setView} onOpenDrawer={open} onCloseDrawer={close} />
          <OwnerSurface />
          <MakerSurface makerId="mkr_01" />
        </div>
      </div>
    </div>
  );
}
