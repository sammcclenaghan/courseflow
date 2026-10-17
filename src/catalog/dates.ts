// Dates as whole days since 1970-01-01 UTC, so weekday maths never meets a
// time zone: new Date("2026-09-09").getDay() can land on the wrong day in
// Victoria.

const MS_PER_DAY = 86_400_000;

/** "2026-09-09" → 20705 */
export const dayNumber = (iso: string) =>
  Date.parse(`${iso}T00:00:00Z`) / MS_PER_DAY;

/** 0 = Sunday … 6 = Saturday, like Date.getDay(). Day 0 was a Thursday. */
export const weekday = (day: number) => (day + 4) % 7;

/** The Monday on or before `day`. */
export const mondayOf = (day: number) => day - ((weekday(day) + 6) % 7);
