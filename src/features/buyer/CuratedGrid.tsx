// The curated grid. Before Cindy answers, the catalog sits as a quiet grid of thumbnails. When
// concierge.answered arrives, the three curated pieces move into rows (a Motion layout transition,
// matched by layoutId) in payload order, each with its image, title, price and reason. Tapping a
// piece emits a user piece.opened.
import { motion } from "motion/react";
import { useState } from "react";
import { userEvent } from "../../core/events";
import { player } from "../../core/player";
import type { CindiaState } from "../../core/state";
import { emit, useCindia } from "../../core/store";
import type { Piece } from "../../core/types";
import { getById, pieces } from "../../mock";

// The v1 gift finder shows the co-op's twelve pieces; the catalog now holds all four communities.
const coopPieces = pieces.filter((p) => p.communityId === "com_dine");
import { Money } from "../../ui/Money";
import { UI_MS, useReducedMotion } from "../../ui/motion";
import { tr, ui, type Lang } from "./strings";

export interface CuratedGridProps {
  lang: Lang;
}

const selectAnswer = (s: CindiaState) => s.buyer.concierge;
const selectQuery = (s: CindiaState) => s.buyer.conciergeQuery;

const layoutKey = (pieceId: string) => `buyer-piece-${pieceId}`;

const captionStyle = { fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)", margin: 0 } as const;

export function CuratedGrid({ lang }: CuratedGridProps) {
  const answer = useCindia(selectAnswer);
  const query = useCindia(selectQuery);
  const reduced = useReducedMotion();
  // The player epoch when the browse grid last showed. seek() bumps the epoch and replays the store
  // at once, so an answer that appears in a different epoch came from a seek and shows without motion.
  const epoch = player.epoch();
  const [gridEpoch, setGridEpoch] = useState(epoch);
  if (answer === null && gridEpoch !== epoch) setGridEpoch(epoch);
  const animate = !reduced && (answer === null || gridEpoch === epoch);
  const transition = { duration: animate ? (UI_MS * 2) / 1000 : 0, ease: "easeOut" as const };

  // A request is waiting while the latest question has no answer for it yet.
  const working = query !== null && (answer === null || answer.query !== query);
  const headingFont = lang === "zh" ? "var(--c-font-heading-zh)" : "var(--c-font-heading-en)";

  const status = working ? (
    <p role="status" style={captionStyle}>
      {tr(ui.conciergeWorking, lang)}
    </p>
  ) : null;

  if (answer === null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-12)" }}>
        {status ?? <p style={captionStyle}>{tr(ui.conciergeEmpty, lang)}</p>}
        <div
          aria-hidden="true"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--c-space-8)" }}
        >
          {coopPieces.map((p) => (
            <motion.img
              key={p.id}
              layoutId={layoutKey(p.id)}
              transition={transition}
              src={p.image}
              alt=""
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                objectFit: "cover",
                borderRadius: "var(--c-radius-panel)",
                border: "1px solid var(--c-color-line)",
                background: "var(--c-color-mat)",
                display: "block",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}>
      <div>
        <h3 style={{ margin: 0, fontFamily: headingFont, fontSize: "var(--c-text-18)", lineHeight: "var(--c-leading-heading)" }}>
          {tr(ui.curatedHeading, lang)}
        </h3>
        <p style={captionStyle}>{tr(ui.tapToOpen, lang)}</p>
      </div>
      {status}
      <motion.ul
        data-testid="buyer-concierge-results"
        layout
        transition={transition}
        style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}
      >
        {answer.pieceIds.map((pieceId) => {
          const piece = getById<Piece>(pieceId);
          if (!piece) return null;
          const reason = answer.reasons[pieceId];
          return (
            <motion.li key={pieceId} layout transition={transition}>
              <button
                type="button"
                data-testid={`buyer-result-${pieceId}`}
                onClick={() => emit(userEvent("piece.opened", { pieceId }))}
                style={{
                  font: "inherit",
                  color: "var(--c-color-ink)",
                  background: "var(--c-color-paper)",
                  border: "1px solid var(--c-color-line)",
                  borderRadius: "var(--c-radius-control)",
                  padding: "var(--c-space-8)",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "grid",
                  gridTemplateColumns: "64px 1fr",
                  gap: "var(--c-space-12)",
                  alignItems: "start",
                }}
              >
                <motion.img
                  layoutId={layoutKey(pieceId)}
                  transition={transition}
                  src={piece.image}
                  alt=""
                  style={{
                    width: 64,
                    height: 64,
                    objectFit: "cover",
                    borderRadius: "var(--c-radius-panel)",
                    border: "1px solid var(--c-color-line)",
                    background: "var(--c-color-mat)",
                    display: "block",
                  }}
                />
                <span style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-4)", minWidth: 0 }}>
                  <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--c-space-8)" }}>
                    <span style={{ fontFamily: headingFont, fontSize: "var(--c-text-16)", fontWeight: 600, lineHeight: "var(--c-leading-heading)" }}>
                      {tr(piece.title, lang)}
                    </span>
                    <Money cents={piece.priceCents} style={{ fontWeight: 600, flexShrink: 0 }} />
                  </span>
                  {reason && (
                    <span style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)", lineHeight: "var(--c-leading-body)" }}>
                      <span className="sr-only">{tr(ui.whyThisPiece, lang)}: </span>
                      {tr(reason, lang)}
                    </span>
                  )}
                </span>
              </button>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}
