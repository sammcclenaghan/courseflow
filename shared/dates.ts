const MS_PER_DAY = 86_400_000;

/** "2026-09-09" → 20705 */
export const dayNumber = (iso: string) =>
  Date.parse(`${iso}T00:00:00Z`) / MS_PER_DAY;

export const weekday = (day: number) => (day + 4) % 7;

export const mondayOf = (day: number) => day - ((weekday(day) + 6) % 7);

/**
 * Visits matching weekdays within an inclusive day-number range.
 * Visits one weekday at a time, so dates aren't necessarily chronological.
 * Uses a callback to avoid allocating an intermediate array of dates.
 */
export function forEachDate(
  first: number,
  last: number,
  weekdays: readonly number[],
  visit: (day: number) => void,
): void {
  const firstWeekday = weekday(first);
  for (const target of weekdays) {
    const offset = (target - firstWeekday + 7) % 7;
    for (let date = first + offset; date <= last; date += 7) visit(date);
  }
}
