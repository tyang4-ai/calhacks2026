import type { ReactNode } from "react";

export interface LedgerColumn {
  key: string;
  label: ReactNode;
  /** Amount columns are right-aligned with tabular numbers. */
  numeric?: boolean;
}

export interface LedgerRow {
  id: string;
  cells: Record<string, ReactNode>;
  state?: "matched" | "flagged" | "pending" | "selected";
  testId?: string;
}

export interface LedgerTableProps {
  testId?: string;
  columns: LedgerColumn[];
  rows: LedgerRow[];
  caption?: ReactNode;
}

/** Dense table with right-aligned amounts, a mat header row and row states. */
export function LedgerTable({ testId, columns, rows, caption }: LedgerTableProps) {
  return (
    <table className="c-ledger" data-testid={testId}>
      {caption && <caption style={{ textAlign: "left", marginBottom: 8 }}>{caption}</caption>}
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} className={c.numeric ? "c-ledger__num" : undefined}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} data-testid={r.testId} data-state={r.state} className={r.state ? `c-ledger__row--${r.state}` : undefined}>
            {columns.map((c) => (
              <td key={c.key} className={c.numeric ? "c-ledger__num" : undefined}>
                {r.cells[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
