// Surprise me's drawn piece and its rule (T4).
// SurpriseResult (search-surprise-result): the latest surprise.drawn as a kit PieceCard with
// demo={community.demo}, naming the method it used. The candidates' weights never show here: with
// real makers they would tell anyone who sold least this month (A2-17). The search process view
// shows them.
// SurpriseRule (search-surprise-rule): the rule for the latest draw's method, or for the picked mode
// before any draw, in one plain line (A1-16).
import type { SurpriseMethod } from "../../core/events";
import { navigate, pieceRoute } from "../../core/nav";
import { useCindia } from "../../core/store";
import type { Community, Person, Piece } from "../../core/types";
import { getById } from "../../mock";
import { PieceCard, VERIFICATION_METHOD_WORDS } from "../../ui";
import { SURPRISE, SURPRISE_METHOD_NAMES, SURPRISE_RULES, t, tf, type Lang } from "./strings";

export interface SurpriseResultProps {
  lang: Lang;
}

/** The latest draw's piece and method, whether the latest ask is still waiting, or null. */
function useLatestDraw() {
  return useCindia((s) => {
    const id = s.surprise.latestSurpriseId;
    if (!id || !s.surprise.asks[id]) return null;
    const d = s.surprise.draws[id];
    return d ? { waiting: false, pieceId: d.pieceId, method: d.method } : { waiting: true, pieceId: null, method: null };
  });
}

export function SurpriseResult({ lang }: SurpriseResultProps) {
  const draw = useLatestDraw();
  if (!draw) return null;
  if (draw.waiting || !draw.pieceId || !draw.method) {
    return (
      <p role="status" style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-amber)" }}>
        {t(SURPRISE.working, lang)}
      </p>
    );
  }
  const piece = getById<Piece>(draw.pieceId);
  if (!piece) return null;
  const maker = getById<Person>(piece.makerId);
  const community = getById<Community>(piece.communityId);
  const method = draw.method;
  const pieceId = piece.id;
  return (
    <PieceCard
      testId="search-surprise-result"
      image={piece.image}
      imageAlt={piece.imageAlt}
      title={piece.title}
      makerName={maker?.name ?? { en: "", zh: "" }}
      makerChar={maker?.surnameChar ?? ""}
      communityName={community?.name ?? { en: "", zh: "" }}
      priceCents={piece.priceCents}
      verification={community ? VERIFICATION_METHOD_WORDS[community.verification.method] : undefined}
      demo={community?.demo ?? false}
      lang={lang}
      compact
      onClick={() => navigate(pieceRoute(pieceId))}
      footer={
        <p style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>
          {tf(SURPRISE.drawnBy, lang, { method: t(SURPRISE_METHOD_NAMES[method], lang) })}
        </p>
      }
    />
  );
}

export interface SurpriseRuleProps {
  lang: Lang;
  /** The mode picked in search-surprise-mode, used before any draw. */
  picked: SurpriseMethod;
}

export function SurpriseRule({ lang, picked }: SurpriseRuleProps) {
  const drawn = useCindia((s) => {
    const id = s.surprise.latestSurpriseId;
    return id ? (s.surprise.draws[id]?.method ?? null) : null;
  });
  const method = drawn ?? picked;
  return (
    <p data-testid="search-surprise-rule" style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }} lang={lang}>
      {t(SURPRISE_RULES[method], lang)}
    </p>
  );
}
