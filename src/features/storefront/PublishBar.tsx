// Publishing (T5).
// - storefront-publish ("Publish") emits storefront.published through userEvent() with the
//   storefront's ID, its slug and the working copy's blocks, whatever the preview shows at that
//   moment. Publishing is the owner's own decision, so there's no approval (events.md).
// - storefront-status reads published (preview) when the page shows exactly the working copy's
//   blocks, and draft otherwise, with a kit Link to /store/<slug>. It carries data-status.
// - storefront-preview-note always shows the preview note.
import { storeRoute } from "../../core/nav";
import { userEvent } from "../../core/events";
import { emit, useCindia } from "../../core/store";
import type { Lang, Storefront } from "../../core/types";
import { Button, Link } from "../../ui";
import { pageView } from "./pageView";
import { UI, t } from "./strings";
import styles from "./storefront.module.css";
import { cloneBlocks, sameBlocks, type WorkingCopy } from "./workingCopy";

export interface PublishBarProps {
  storefront: Storefront;
  copy: WorkingCopy;
  lang: Lang;
}

export function PublishBar({ storefront, copy, lang }: PublishBarProps) {
  const published = useCindia((s) => s.storefront.published[storefront.id] ?? null);
  const view = pageView(storefront, published);
  const status = !view.draftNote && sameBlocks(view.blocks, copy.blocks) ? "published" : "draft";
  return (
    <div className={styles.publishBar} lang={lang}>
      <div className={styles.publishRow}>
        <p className={status === "published" ? styles.statusPublished : styles.statusDraft} data-testid="storefront-status" data-status={status}>
          <span>{t(status === "published" ? UI.statusPublished : UI.statusDraft, lang)}</span>
          <Link to={storeRoute(storefront.slug)}>{t(UI.viewPage, lang)}</Link>
        </p>
        <Button
          testId="storefront-publish"
          variant="primary"
          onClick={() => emit(userEvent("storefront.published", { storefrontId: storefront.id, slug: storefront.slug, blocks: cloneBlocks(copy.blocks) }))}
        >
          {t(UI.publish, lang)}
        </Button>
      </div>
      <p className={styles.previewNote} data-testid="storefront-preview-note">
        {t(UI.previewNote, lang)}
      </p>
    </div>
  );
}
