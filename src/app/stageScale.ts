// The /demo stage is a 1600 by 900 canvas scaled to fit the window, letterboxed on the paper ground.
import { useEffect, useState } from "react";

export const STAGE_WIDTH = 1600;
export const STAGE_HEIGHT = 900;

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
