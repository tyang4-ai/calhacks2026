// Sell › Counterfeit watch (F-watch T5): the scan bar on top and the results below, in one kit
// Panel declaring b15-watch, so it shows the Simulated badge while the watch's events are scripted.
// Sized for the Sell frame at 1440 by 900: the scan bar stays put and the results scroll.
import type { SlotProps } from "../../core/featureTypes";
import { Badge, Panel } from "../../ui";
import { ScanBar } from "./ScanBar";
import { GLOSSARY, t, VIEW } from "./strings";
import { WatchResults } from "./WatchResults";
import styles from "./watch.module.css";

export function WatchView({ lang }: SlotProps) {
  return (
    <Panel
      title={
        <>
          <span>{t(GLOSSARY.counterfeitWatch, lang)}</span>
          <span className={styles.titleIntro}>{t(VIEW.intro, lang)}</span>
        </>
      }
      actions={<Badge variant="demo" />}
      sourceKeys={["b15-watch"]}
      lang={lang}
      className={styles.fillPanel}
    >
      <div className={styles.body}>
        <ScanBar lang={lang} />
        <div className={styles.scroll}>
          <WatchResults lang={lang} />
        </div>
      </div>
    </Panel>
  );
}
