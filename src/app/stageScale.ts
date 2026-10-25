// The /demo stage is the kit's PAGE_WIDTH by PAGE_HEIGHT (1440 by 900), scaled to fit the window
// and letterboxed on the paper ground.
import { useEffect, useState } from "react";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../ui/PageFrame";

export const STAGE_WIDTH = PAGE_WIDTH;
export const STAGE_HEIGHT = PAGE_HEIGHT;

function fitScale(): number {
  if (typeof window === "undefined") return 1;
  return Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT);
}

/** The scale that fits the stage in the window, updated on resize. */
export function useStageScale(): number {
  const [scale, setScale] = useState(fitScale);
  useEffect(() => {
    const onResize = () => setScale(fitScale());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return scale;
}
