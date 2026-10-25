// Sell › Storefront (T6): the editor and the Designer (a third) beside storefront-preview (two
// thirds), which renders the working copy through StoreBlocks, laid out to fit its column at the
// kit's type sizes rather than scaled down, so no text drops under 14 px. It all sits in one kit
// Panel declaring b14-swarm, sized for the Sell frame at 1440 by 900; each column scrolls on its own.
// - The Sell site is the Diné co-op's, so the builder edits sto_01.
// - The working copy lives in component state. It starts from the newest storefront.published for
//   sto_01 when there is one, otherwise from the mock, and starts over when the player's epoch
//   changes (a seek or a reset drops what a person published).
import { useState } from "react";
import type { SlotProps } from "../../core/featureTypes";
import { useCindia } from "../../core/store";
import type { Storefront } from "../../core/types";
import { getById } from "../../mock";
import { Panel } from "../../ui";
import { BuilderEditor, ThemeControls } from "./BuilderEditor";
import { DesignerDraft } from "./DesignerDraft";
import { PublishBar } from "./PublishBar";
import { StoreBlocks } from "./StoreBlocks";
import { GLOSSARY, UI, t } from "./strings";
import styles from "./storefront.module.css";
import { usePlayerEpoch } from "./usePlayerEpoch";
import { applyDraft, sameBlocks, startCopy, type WorkingCopy } from "./workingCopy";

/** The Sell site's own storefront: the Diné co-op's. */
const SELL_STOREFRONT_ID = "sto_01";

export function StorefrontBuilder({ lang }: SlotProps) {
  const storefront = getById<Storefront>(SELL_STOREFRONT_ID);
  if (!storefront) return null;
  return <Builder storefront={storefront} lang={lang} />;
}

function Builder({ storefront, lang }: { storefront: Storefront; lang: SlotProps["lang"] }) {
  const published = useCindia((s) => s.storefront.published[storefront.id] ?? null);
  const draft = useCindia((s) => s.storefront.drafts[storefront.id] ?? null);
  const epoch = usePlayerEpoch();
  const [state, setState] = useState<{ epoch: number; copy: WorkingCopy }>(() => ({ epoch, copy: startCopy(storefront, published?.blocks) }));
  let copy = state.copy;
  if (state.epoch !== epoch) {
    // A seek or a reset: start over from what the store now holds.
    copy = startCopy(storefront, published?.blocks);
    setState({ epoch, copy });
  }
  const setCopy = (next: WorkingCopy) => setState({ epoch, copy: next });
  const inUse = draft !== null && sameBlocks(copy.blocks, draft.blocks);

  return (
    <Panel testId="storefront-builder" title={t(GLOSSARY.storefrontBuilder, lang)} sourceKeys={["b14-swarm"]} lang={lang} className={styles.builderPanel}>
      <div className={styles.builderGrid}>
        <div className={styles.leftCol}>
          <DesignerDraft storefrontId={storefront.id} lang={lang} inUse={inUse} onUseDraft={(blocks) => setCopy(applyDraft(copy, blocks))} />
          <BuilderEditor copy={copy} onChange={setCopy} lang={lang} />
        </div>
        <div className={styles.rightCol}>
          <PublishBar storefront={storefront} copy={copy} lang={lang} />
          <ThemeControls copy={copy} onChange={setCopy} lang={lang} />
          <div className={styles.previewFrame} data-testid="storefront-preview" aria-label={t(UI.preview, lang)}>
            <StoreBlocks blocks={copy.blocks} theme={{ accent: copy.accent, layout: copy.layout }} communityId={storefront.communityId} lang={lang} density="preview" />
          </div>
        </div>
      </div>
    </Panel>
  );
}
