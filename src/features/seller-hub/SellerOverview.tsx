// Sell › Overview (F-seller-hub T7): the five tiles and the approvals waiting, in one kit Panel
// declaring b10-derived, the key the overview's figures stand in for.
import type { SlotProps } from "../../core/featureTypes";
import { Panel } from "../../ui";
import { OverviewTiles } from "./OverviewTiles";
import { OVERVIEW, t } from "./strings";
import styles from "./seller-hub.module.css";

export function SellerOverview({ lang }: SlotProps) {
  return (
    <Panel testId="seller-overview" title={t(OVERVIEW.title, lang)} sourceKeys={["b10-derived"]} lang={lang} className={styles.fillPanel}>
      <OverviewTiles lang={lang} />
    </Panel>
  );
}
