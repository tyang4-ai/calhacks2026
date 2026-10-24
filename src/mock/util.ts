// Small pure helpers for the mock dataset. No wall clock, no randomness.

/** amount × rate in basis points, rounded half up once (data-model.md, Units and rules). */
export function bps(amountCents: number, rateBps: number): number {
  return Math.floor((amountCents * rateBps + 5000) / 10000);
}

/** The card network's fee: 290 bps of gross plus 30 cents. */
export function cardFee(grossCents: number): number {
  return bps(grossCents, 290) + 30;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/**
 * Dollars for the prose inside Cindy's answers and the follow-up email, which are text, not
 * figures the UI formats. Screens format amounts only through the UI kit.
 */
export function usd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${whole}.${String(abs % 100).padStart(2, "0")}`;
}

/** Days since 2026-09-01 for a September or early-October date, without the Date object. */
export function dayIndex(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  if (y !== 2026 || (m !== 9 && m !== 10)) throw new Error(`date outside the demo month: ${iso}`);
  return m === 9 ? d - 1 : 30 + d - 1;
}

/** "Sep 30" and "9月30日" for prose, from an ISO date. */
export function shortDate(iso: string): { en: string; zh: string } {
  const [, m, d] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return { en: `${months[m - 1]} ${d}`, zh: `${m}月${d}日` };
}

export function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}
