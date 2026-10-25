// Sell › Listings (F-seller-hub T7): the composer, the run's steps and the draft side by side, in one
// kit Panel declaring b14-swarm and b12-search. It all fits the Sell frame at 1440 by 900.
// The screen follows the newest listing.requested in the store: the tour's lst_01, or the owner's
// own lst_user_<n>.
import type { SlotProps } from "../../core/featureTypes";
import { useCindia } from "../../core/store";
import type { CindiaState } from "../../core/state";
import { Panel } from "../../ui";
import { ListingComposer } from "./ListingComposer";
import { ListingDraftCard } from "./ListingDraftCard";
import { ListingSteps } from "./ListingSteps";
import { LISTING, t } from "./strings";
import styles from "./seller-hub.module.css";

const selectLatest = (s: CindiaState) => s.listings.latestListingId;

export function ListingsView({ lang }: SlotProps) {
  const listingId = useCindia(selectLatest);
  return (
    <Panel
      title={
        <>
          <span>{t(LISTING.title, lang)}</span>
          <span className={styles.titleIntro}>{t(LISTING.intro, lang)}</span>
        </>
      }
      sourceKeys={["b14-swarm", "b12-search"]}
      lang={lang}
      className={styles.fillPanel}
    >
      <div className={styles.listingGrid}>
        <ListingComposer lang={lang} />
        <ListingSteps listingId={listingId} lang={lang} />
        <ListingDraftCard listingId={listingId} lang={lang} />
      </div>
    </Panel>
  );
}
