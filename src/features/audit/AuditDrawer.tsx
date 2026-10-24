// The audit drawer (F-audit T3): the start list of the month's traceable figures, and the trail of
// the one picked. When SlotProps.refId is set the drawer opens straight on that record's trail, and
// follows it when it changes.
import { useState, type CSSProperties } from "react";
import type { SlotProps } from "../../core/featureTypes";
import { Button, Panel } from "../../ui";
import { buildTrail } from "./buildTrail";
import { StartList } from "./StartList";
import { GLOSSARY, UI, t } from "./strings";
import { TrailView } from "./TrailView";

const headStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--c-space-12)",
  marginBottom: "var(--c-space-16)",
};

const quietStyle: CSSProperties = {
  margin: 0,
  color: "var(--c-color-ink-soft)",
  fontSize: "var(--c-text-14)",
};

export function AuditDrawer({ lang, refId }: SlotProps) {
  const [picked, setPicked] = useState<string | null>(refId ?? null);
  // Follow a new ref from the URL (React's "adjust state when a prop changes" pattern).
  const [lastRef, setLastRef] = useState<string | undefined>(refId);
  if (refId !== lastRef) {
    setLastRef(refId);
    setPicked(refId ?? null);
  }

  const trail = picked ? buildTrail(picked) : null;

  return (
    <Panel testId="audit-drawer" sourceKeys={["b10-derived"]} title={t(GLOSSARY.auditTrail, lang)} lang={lang}>
      {picked === null ? (
        <StartList lang={lang} onPick={setPicked} />
      ) : (
        <div>
          <div style={headStyle}>
            <p style={quietStyle}>
              {t(UI.tracing, lang)} <span style={{ color: "var(--c-color-ink)" }}>{picked}</span>
            </p>
            <Button variant="quiet" size="small" onClick={() => setPicked(null)}>
              {t(UI.allFigures, lang)}
            </Button>
          </div>
          {trail ? <TrailView key={trail.rootId} trail={trail} lang={lang} /> : <p style={quietStyle}>{t(UI.noTrail, lang)}</p>}
        </div>
      )}
    </Panel>
  );
}
