// The listing composer (F-seller-hub T3): the maker picker (seller-listing-maker) over the co-op's
// makers, the notes box (seller-listing-notes) and "Draft with Cindy" (seller-listing-ask).
// - The picker starts at lst_01's maker and the box holds lst_01's notes, in lst_01's language.
// - When the store's newest listing.requested came from the timeline (not a person's lst_user_),
//   the picker and the box show that request's maker and notes, as if typed.
// - "Draft with Cindy" emits a person's listing.requested (lst_user_<n>, counted from the store).
//   The scripted responder answers it by its notes, never by its ID. The button is disabled while
//   the followed listing's run is still going: a request with no listing.drafted yet.
import { useId, useState } from "react";
import { userEvent } from "../../core/events";
import { emit, useCindia } from "../../core/store";
import type { CindiaState } from "../../core/state";
import type { Person } from "../../core/types";
import { getById, listings, studio } from "../../mock";
import { Button, MakerMark } from "../../ui";
import { LISTING_PREFIX, nextListingId, normalizeNotes, textLang } from "./model";
import { LISTING, t, tf, type Lang } from "./strings";
import styles from "./seller-hub.module.css";

const LST_01 = listings.find((l) => l.id === "lst_01");

const selectComposer = (s: CindiaState) => {
  const id = s.listings.latestListingId;
  const latest = id ? s.listings.requests[id] : undefined;
  return {
    requestIds: Object.keys(s.listings.requests),
    latest: latest ? { listingId: latest.listingId, makerId: latest.makerId, notes: latest.notes, at: latest.at } : null,
    running: Boolean(id && latest && !s.listings.drafts[id]),
    mode: s.mode,
  };
};

export function ListingComposer({ lang }: { lang: Lang }) {
  const { requestIds, latest, running, mode } = useCindia(selectComposer);
  const [makerId, setMakerId] = useState<string>(LST_01?.makerId ?? studio.makerIds[0]);
  const [notes, setNotes] = useState<string>(LST_01?.notes ?? "");
  const [synced, setSynced] = useState<string | null>(null);
  const makerFieldId = useId();
  const notesFieldId = useId();

  // A timeline request shows in the picker and the box, as if typed. A person's own request
  // leaves what they typed in place.
  const fromTimeline = latest && !latest.listingId.startsWith(LISTING_PREFIX) ? latest : null;
  const syncKey = fromTimeline ? `${fromTimeline.listingId}@${fromTimeline.at}` : null;
  if (syncKey !== synced) {
    setSynced(syncKey);
    if (fromTimeline) {
      setNotes(fromTimeline.notes);
      setMakerId(fromTimeline.makerId);
    }
  }

  const maker = getById<Person>(makerId);
  const makerName = maker ? t(maker.name, lang) : makerId;
  const sample = mode === "scripted" && LST_01 !== undefined && normalizeNotes(notes) !== normalizeNotes(LST_01.notes);
  const canAsk = !running && notes.trim().length > 0;

  const ask = () => {
    if (!canAsk) return;
    emit(
      userEvent("listing.requested", {
        listingId: nextListingId(requestIds),
        makerId,
        notes: notes.trim(),
        lang: textLang(notes),
      }),
    );
  };

  return (
    <div className={styles.composer} lang={lang}>
      <label className={styles.fieldLabel} htmlFor={makerFieldId}>
        {t(LISTING.maker, lang)}
      </label>
      <div className={styles.makerRow}>
        {maker && <MakerMark char={maker.surnameChar} size={32} label={makerName} />}
        <select
          id={makerFieldId}
          className={styles.select}
          data-testid="seller-listing-maker"
          value={makerId}
          onChange={(e) => setMakerId(e.target.value)}
        >
          {studio.makerIds.map((id) => {
            const p = getById<Person>(id);
            return (
              <option key={id} value={id}>
                {p ? t(p.name, lang) : id}
              </option>
            );
          })}
        </select>
      </div>
      <label className={styles.fieldLabel} htmlFor={notesFieldId}>
        {t(LISTING.notes, lang)}
      </label>
      <textarea
        id={notesFieldId}
        className={styles.notes}
        data-testid="seller-listing-notes"
        value={notes}
        lang={textLang(notes)}
        onChange={(e) => setNotes(e.target.value)}
        rows={10}
      />
      <Button testId="seller-listing-ask" variant="primary" onClick={ask} disabled={!canAsk} className={styles.askButton}>
        {running ? t(LISTING.running, lang) : t(LISTING.ask, lang)}
      </Button>
      <p className={styles.hint}>{tf(LISTING.notesHint, lang, { name: makerName })}</p>
      {sample && <p className={styles.hint}>{t(LISTING.sampleNote, lang)}</p>}
    </div>
  );
}
