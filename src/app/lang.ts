// Resolves the store's lang for each surface. With "auto", each surface uses its own starting language.
import type { SurfaceId } from "../core/featureTypes";
import type { LangSetting } from "../core/state";
import { useCindia } from "../core/store";

export const SURFACE_START_LANG: Record<SurfaceId, "en" | "zh"> = {
  buyer: "en",
  studio: "en",
  owner: "en",
  maker: "en",
};

export function resolveLang(setting: LangSetting, surface: SurfaceId): "en" | "zh" {
  return setting === "auto" ? SURFACE_START_LANG[surface] : setting;
}

export function useSurfaceLang(surface: SurfaceId): "en" | "zh" {
  return useCindia((s) => resolveLang(s.lang, surface));
}
