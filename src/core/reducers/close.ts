import type { CloseState } from "../state";
import { areaReducer, put, same } from "./util";

export const closeReducer = areaReducer<CloseState>({
  "workbook.ready": (s, e) => same(s, { ...s, workbook: { ...e.payload, sheets: [...e.payload.sheets] } }),
  "statement.issued": (s, e) => {
    const p = e.payload;
    const statements = put(s.statements, p.makerStatementId, { ...p, lines: p.lines.map((l) => ({ ...l })) });
    const statementByMaker = put(s.statementByMaker, p.makerId, p.makerStatementId);
    return statements === s.statements && statementByMaker === s.statementByMaker
      ? s
      : { ...s, statements, statementByMaker };
  },
});
