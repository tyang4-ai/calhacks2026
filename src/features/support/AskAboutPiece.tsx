// F-support T4: "Ask about this piece" (support-ask-piece), the right third of the piece page, for
// SlotProps.pieceId: the buyer's suggestions as support-piece-suggest-<n> (the tour's d04 question
// first), an "Open help" button, and the newest reply about this piece as a one-line preview.
// Asking here emits support.asked with contextIds [pieceId] and opens the drawer, because a person
// asked. Nothing here opens the drawer for an event from the timeline.
import { useMemo } from "react";
import type { SlotProps } from "../../core/featureTypes";
import { openDrawer } from "../../core/nav";
import { useCindia } from "../../core/store";
import { Button, Panel } from "../../ui";
import { askSupport } from "./ask";
import { STRINGS, t } from "./strings";
import { Suggestions } from "./Suggestions";
import { agentLabel } from "./records";
import { currentThreadId, isThreadBusy, latestReplyAbout } from "./threadModel";

const SOURCE_KEYS = ["b14-swarm", "b13-live"] as const;

export function AskAboutPiece({ lang, pieceId }: SlotProps) {
  const support = useCindia((s) => s.support);
  const swarm = useCindia((s) => s.swarm);
  const log = useCindia((s) => s.log);
  const current = useMemo(() => currentThreadId(support, "buyer"), [support]);
  const busy = useMemo(() => isThreadBusy({ support, swarm, log }, current), [support, swarm, log, current]);
  const preview = useMemo(() => (pieceId ? latestReplyAbout({ support, log }, "buyer", pieceId) : null), [support, log, pieceId]);

  const ask = (text: string) => {
    const threadId = askSupport({ text, side: "buyer", lang, contextIds: pieceId ? [pieceId] : [], currentThreadId: current });
    if (threadId) openDrawer("support");
  };

  return (
    <Panel testId="support-ask-piece" sourceKeys={[...SOURCE_KEYS]} title={t(STRINGS.askAboutPiece, lang)} lang={lang}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-16)" }}>
        <p style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>{t(STRINGS.askAboutPieceIntro, lang)}</p>
        <Suggestions side="buyer" lang={lang} testIdPrefix="support-piece-suggest" onAsk={ask} disabled={busy} />
        {preview && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-4)", fontSize: "var(--c-text-14)" }}>
            <p style={{ margin: 0, color: "var(--c-color-ink-soft)" }}>
              {t(STRINGS.latestReply, lang)} · <span style={{ fontWeight: 600, color: "var(--c-color-ink)" }}>{t(agentLabel(preview.message.agentId).name, lang)}</span>
            </p>
            <p
              title={t(preview.message.reply, lang)}
              style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {t(preview.message.reply, lang)}
            </p>
          </div>
        )}
        <div>
          <Button variant="quiet" onClick={() => openDrawer("support")}>
            {t(STRINGS.openHelp, lang)}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
