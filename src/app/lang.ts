// Resolves the store's lang for each surface. With "auto", each surface uses its own starting
// language: English for Shop, Sell and store pages, and the maker's own lang on a maker page
// (English when the maker isn't found). owner.main uses the Sell site's resolved language.
import type { SurfaceId } from "../core/featureTypes";
import type { LangSetting } from "../core/state";
import { useCindia } from "../core/store";
import { makerLang } from "./studioInfo";

export const SURFACE_START_LANG: Record<SurfaceId, "en" | "zh"> = {
  buyer: "en",
  studio: "en",
  owner: "en",
  maker: "en",
  store: "en",
};

/** The language a surface shows for a setting. On a maker page, auto is the maker's own lang. */
export function resolveLang(setting: LangSetting, surface: SurfaceId, makerId?: string): "en" | "zh" {
  if (setting !== "auto") return setting;
  if (surface === "maker") return makerLang(makerId) ?? SURFACE_START_LANG.maker;
  // owner.main renders in the Sell site, so it follows the Sell site's start.
  return SURFACE_START_LANG[surface === "owner" ? "studio" : surface];
}

export function useSurfaceLang(surface: SurfaceId, makerId?: string): "en" | "zh" {
  return useCindia((s) => resolveLang(s.lang, surface, makerId));
}
