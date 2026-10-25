// The site is English only (Gordon, Oct 24, 11:35 PM and 11:55 PM; decisions.md). Every surface
// resolves to English whatever the store's lang holds, and nothing in the shell changes the
// setting any more: the language toggle and its L key are gone. The store keeps its lang field
// until step 2 of the English-only decision removes the Chinese text.
import type { SurfaceId } from "../core/featureTypes";
import type { LangSetting } from "../core/state";

export const SURFACE_START_LANG: Record<SurfaceId, "en"> = {
  buyer: "en",
  studio: "en",
  owner: "en",
  maker: "en",
  store: "en",
};

/** The language a surface shows: English, on every surface and for every setting. */
export function resolveLang(_setting: LangSetting, _surface: SurfaceId, _makerId?: string): "en" {
  return "en";
}

/** The surface's language for SlotProps.lang: always English. */
export function useSurfaceLang(_surface: SurfaceId, _makerId?: string): "en" {
  return "en";
}
