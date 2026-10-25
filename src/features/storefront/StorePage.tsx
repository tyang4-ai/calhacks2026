// The public page at /store/:slug (T3), store-page inside the shell's frame-store.
// - It reads SlotProps.slug, finds the Storefront in the mock, and renders pageView's blocks through
//   StoreBlocks: the newest storefront.published's blocks for it, otherwise the mock's, with
//   store-draft-note at the top when the rule says so.
// - The page renders no keyed events, so it shows the kit's Demo data badge (no Simulated badge).
// - store-footer reads "Made with Cindia's storefront builder (preview)", then L13.
// - An unknown slug shows store-missing with a kit Link back to /shop.
import { shopRoute } from "../../core/nav";
import { useCindia } from "../../core/store";
import type { SlotProps } from "../../core/featureTypes";
import { storefronts } from "../../mock";
import { Badge, Link } from "../../ui";
import { GLOSSARY, L13, UI, t } from "./strings";
import { StoreBlocks } from "./StoreBlocks";
import styles from "./storefront.module.css";
import { pageView, storefrontBySlug } from "./pageView";
import { layoutOf } from "./workingCopy";

export function StorePage({ slug, lang }: SlotProps) {
  const storefront = storefrontBySlug(storefronts, slug);
  const published = useCindia((s) => (storefront ? (s.storefront.published[storefront.id] ?? null) : null));

  if (!storefront) {
    return (
      <div className={styles.missing} data-testid="store-missing" lang={lang}>
        <h1 className={styles.missingTitle}>{t(UI.missingTitle, lang)}</h1>
        <Link to={shopRoute()}>{t(UI.backToShop, lang)}</Link>
      </div>
    );
  }

  const view = pageView(storefront, published);
  const theme = { accent: storefront.theme.accent, layout: layoutOf(view.blocks, storefront.theme.layout) };
  return (
    <div className={styles.page} data-testid="store-page" data-storefront-id={storefront.id} data-from={view.from} lang={lang}>
      <div className={styles.pageTop}>
        <span className={styles.pageWord}>{t(GLOSSARY.storefront, lang)}</span>
        <span className={styles.pageSlug} lang="en">
          {`/store/${storefront.slug}`}
        </span>
        <Badge variant="demo" />
      </div>
      {view.draftNote && (
        <p className={styles.draftNote} data-testid="store-draft-note">
          {t(UI.draftNote, lang)}
        </p>
      )}
      <StoreBlocks blocks={view.blocks} theme={theme} communityId={storefront.communityId} lang={lang} density="page" />
      <footer className={styles.footer} data-testid="store-footer">
        <span data-role="preview-line">{t(UI.footerLine, lang)}</span>
        <span data-role="l13">{t(L13, lang)}</span>
      </footer>
    </div>
  );
}
