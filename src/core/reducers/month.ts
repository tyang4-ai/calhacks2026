import type { MonthState } from "../state";
import { addId, addIds, areaReducer, put, same } from "./util";

export const monthReducer = areaReducer<MonthState>({
  "month.started": (s, e) => same(s, { ...s, monthId: e.payload.monthId }),
  "record.arrived": (s, e) => {
    const prev = s.records[e.payload.recordId];
    const records = put(s.records, e.payload.recordId, { ...e.payload, at: prev ? prev.at : e.at });
    const recordIds = addId(s.recordIds, e.payload.recordId);
    return records === s.records && recordIds === s.recordIds ? s : { ...s, records, recordIds };
  },
  "match.made": (s, e) => {
    const prev = s.matches[e.payload.matchId];
    const next = { ...e.payload, recordIds: [...e.payload.recordIds], at: prev ? prev.at : e.at };
    const matches = put(s.matches, e.payload.matchId, next);
    const matchIds = addId(s.matchIds, e.payload.matchId);
    return matches === s.matches && matchIds === s.matchIds ? s : { ...s, matches, matchIds };
  },
  "flag.raised": (s, e) => {
    const prev = s.flags[e.payload.flagId];
    const pending = s.pendingExplanations[e.payload.flagId];
    const next = {
      ...e.payload,
      recordIds: [...e.payload.recordIds],
      at: prev ? prev.at : e.at,
      trustRecordId: prev?.trustRecordId ?? pending?.trustRecordId,
      explanation: prev?.explanation ?? pending?.explanation,
    };
    const flags = put(s.flags, e.payload.flagId, next);
    const flagIds = addId(s.flagIds, e.payload.flagId);
    if (flags === s.flags && flagIds === s.flagIds) return s;
    const pendingExplanations = { ...s.pendingExplanations };
    delete pendingExplanations[e.payload.flagId];
    return { ...s, flags, flagIds, pendingExplanations };
  },
  "flag.explained": (s, e) => {
    const { flagId, trustRecordId, explanation } = e.payload;
    const flag = s.flags[flagId];
    if (!flag) {
      return same(s, {
        ...s,
        pendingExplanations: put(s.pendingExplanations, flagId, { trustRecordId, explanation: { ...explanation } }),
      });
    }
    const flags = put(s.flags, flagId, { ...flag, trustRecordId, explanation: { ...explanation } });
    return flags === s.flags ? s : { ...s, flags };
  },
  "ledger.posted": (s, e) => {
    const ledgerEntryIds = addIds(s.ledgerEntryIds, e.payload.entryIds);
    return ledgerEntryIds === s.ledgerEntryIds ? s : { ...s, ledgerEntryIds };
  },
  "month.closed": (s, e) => same(s, { ...s, closed: { ...e.payload } }),
});
