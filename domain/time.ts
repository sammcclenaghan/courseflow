// Dates are "YYYY-MM-DD" strings everywhere: they compare correctly with <
// and can't shift with time zones. This is the only file that does date
// math, and it always works at UTC midnight.

const toUtc = (date: string) => new Date(`${date}T00:00:00Z`);

/** 0 = Sunday … 6 = Saturday. */
export const weekday = (date: string) => toUtc(date).getUTCDay();

/** Every date from `from` to `to`, both included; empty if `from` is later. */
export function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  const end = toUtc(to);
  for (
    const day = toUtc(from);
    day <= end;
    day.setUTCDate(day.getUTCDate() + 1)
  )
    dates.push(day.toISOString().slice(0, 10));
  return dates;
}
