// formatDate(iso, lang): "2026-10-02" to "Oct 2, 2026" or "2026年10月2日". Read as a UTC calendar
// date from the string itself, never from the wall clock.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso: string, lang: "en" | "zh"): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return iso;
  return lang === "zh" ? `${year}年${month}月${day}日` : `${MONTHS[month - 1]} ${day}, ${year}`;
}

/** "2026-09" to "September 2026" or "2026年9月". */
export function formatMonth(monthId: string, lang: "en" | "zh"): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthId);
  if (!m) return monthId;
  const full = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const month = Number(m[2]);
  return lang === "zh" ? `${m[1]}年${month}月` : `${full[month - 1]} ${m[1]}`;
}
