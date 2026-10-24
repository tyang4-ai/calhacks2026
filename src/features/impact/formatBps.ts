// Basis points as a percent with one decimal, always: 7400 -> "74.0%", 7425 -> "74.3%".
// The kit's formatBps drops trailing zeros, and the impact numbers need the decimal kept.

export function formatBps(bps: number): string {
  const tenths = Math.round(bps / 10);
  const sign = tenths < 0 ? "-" : "";
  const abs = Math.abs(tenths);
  return `${sign}${Math.floor(abs / 10)}.${abs % 10}%`;
}
