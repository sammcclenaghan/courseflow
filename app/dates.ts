// Dates are "YYYY-MM-DD" strings, read as UTC so daylight saving never
// shifts a day.
const parse = (date: string) => new Date(`${date}T00:00:00Z`);

export function addDays(date: string, days: number): string {
  const next = parse(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday, like a meeting's days. */
export function weekday(date: string): number {
  return parse(date).getUTCDay();
}

/** The Monday of a date's week. */
export function monday(date: string): string {
  return addDays(date, -((weekday(date) + 6) % 7));
}

export function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "2027-03-22" → "Mon, Mar 22". */
export function formatDate(date: string): string {
  return parse(date).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
