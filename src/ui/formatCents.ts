// formatCents(): the only money formatter. Amounts are US dollars on every surface, Chinese included.

function groupThousands(n: number): string {
  const s = String(n);
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ",";
    out += s[i];
  }
  return out;
}

/** 18000 to "$180.00", 340000 to "$3,400.00", -34000 to "-$340.00". */
export function formatCents(cents: number): string {
  const c = Math.round(cents);
  const neg = c < 0;
  const abs = Math.abs(c);
  const dollars = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, "0");
  return `${neg ? "-" : ""}$${groupThousands(dollars)}.${rest}`;
}

/** Basis points to a percent string: 4000 to "40%", 7470 to "74.7%". */
export function formatBps(bps: number): string {
  return `${parseFloat((Math.round(bps) / 100).toFixed(2))}%`;
}
