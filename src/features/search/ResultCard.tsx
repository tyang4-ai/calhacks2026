// One result (T2): a kit PieceCard (search-result-<pieceId>) with demo={community.demo}, so its
// verification line starts with L3. Under it, search-reason-<pieceId>: the payload's reason, and the
// payload's matched keywords as small chips, each naming the part of the listing it came from
// (search-source-<pieceId>-<n>, A1-17). Closeness shows only when the payload carries it.
// The reason and the matched words come from the payload. The index is read only for the
// provenance labels, and the piece, maker and community through getById().
import type { SearchResult } from "../../core/events";
import { navigate, pieceRoute } from "../../core/nav";
import type { Community, IndexEntry, Person, Piece, ProvenanceSource } from "../../core/types";
import { getById, searchIndex } from "../../mock";
import { Chip, PieceCard, ScoreBar, VERIFICATION_METHOD_WORDS } from "../../ui";
import { GLOSSARY, RESULTS, SOURCE_MARKERS, t, type Lang } from "./strings";

export interface ResultCardProps {
  result: SearchResult;
  lang: Lang;
}

type Group = "facts" | "vibe" | "culture";

const lower = (w: string) => w.trim().toLowerCase();

/** The words of a text, as the keyword rule splits them. */
function words(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Whether `phrase`'s words appear in `text` in a row. */
function hasPhrase(text: string, phrase: string): boolean {
  const hay = words(text);
  const need = words(phrase);
  if (need.length === 0) return false;
  for (let i = 0; i + need.length <= hay.length; i += 1) {
    if (need.every((w, j) => hay[i + j] === w)) return true;
  }
  return false;
}

/** Which field group a matched keyword came from: the facets, the vibe, or the community's craft. */
function groupOf(word: string, piece: Piece, community: Community | undefined): Group | null {
  const w = lower(word);
  const f = piece.facets;
  const facts = [f.object.en, ...f.materials, ...f.techniques, ...f.motifs, ...f.colors].map(lower);
  if (facts.includes(w)) return "facts";
  const v = piece.vibe;
  const vibe = [...v.moods, ...v.occasions, ...v.recipients].map(lower);
  if (vibe.includes(w)) return "vibe";
  if (community && hasPhrase(community.craft.en, w)) return "culture";
  return null;
}

/** The source marker's label for a group, from the piece's index entry, or null. */
function markerFor(group: Group | null, entry: IndexEntry | undefined): ProvenanceSource | null {
  if (!group || !entry) return null;
  const source = entry.provenance[group];
  return source && source in SOURCE_MARKERS ? source : null;
}

export function ResultCard({ result, lang }: ResultCardProps) {
  const piece = getById<Piece>(result.pieceId);
  if (!piece) return null;
  const maker = getById<Person>(piece.makerId);
  const community = getById<Community>(piece.communityId);
  const entry = searchIndex.find((e) => e.pieceId === piece.id);
  const id = piece.id;

  const footer = (
    <div
      data-testid={`search-reason-${id}`}
      role="group"
      aria-label={t(GLOSSARY.whyItMatched, lang)}
      style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-4)" }}
    >
      <p style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>{t(result.reason, lang)}</p>
      {result.matched.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
          {result.matched.map((word, i) => {
            const source = markerFor(groupOf(word, piece, community), entry);
            return (
              <li key={`${i}:${word}`} style={{ display: "flex", alignItems: "center", gap: "var(--c-space-8)", minWidth: 0 }}>
                <Chip label={word} lang={lang} />
                {source && (
                  <span
                    data-testid={`search-source-${id}-${i + 1}`}
                    style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {t(SOURCE_MARKERS[source], lang)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {typeof result.closeness === "number" && (
        <ScoreBar testId={`search-closeness-${id}`} value={result.closeness} label={t(RESULTS.closeness, lang)} width={96} />
      )}
    </div>
  );

  return (
    <PieceCard
      testId={`search-result-${id}`}
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
      onClick={() => navigate(pieceRoute(id))}
      footer={footer}
    />
  );
}
