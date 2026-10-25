// The public-build flag (fix-plan 1.8). VITE_PUBLIC_SITE=1 marks the scripted build Gordon uploads
// to Cloudflare Pages: every slot gets publicSite: true and the demo controls hide the Live switch.
// It's a plain flag, not a secret, and this is the only file that reads it.

/** True only for the value "1". */
export function isPublicSite(value: unknown): boolean {
  return value === "1";
}

/** True only when the build ran with VITE_PUBLIC_SITE=1. Localhost and every gate build without it. */
export const PUBLIC_SITE: boolean = isPublicSite(import.meta.env.VITE_PUBLIC_SITE);
