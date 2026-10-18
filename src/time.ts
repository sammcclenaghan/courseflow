// How times and weeks are written on screen. Times are minutes after
// midnight; days are dayNumbers (see catalog/dates.ts).

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

const hour12 = (minutes: number) => ((Math.floor(minutes / 60) + 11) % 12) + 1;
export const period = (minutes: number) => (minutes < 720 ? "AM" : "PM");

/** 570 → "9:30" */
export const formatTime = (minutes: number) =>
  `${hour12(minutes)}:${String(minutes % 60).padStart(2, "0")}`;

/** 540 → "9 AM" */
export const formatHour = (minutes: number) =>
  `${hour12(minutes)} ${period(minutes)}`;

/** "9:30–10:20 AM", or "11:30 AM–12:50 PM" when the period changes. */
export function formatTimeRange(start: number, end: number) {
  return period(start) === period(end)
    ? `${formatTime(start)}–${formatTime(end)} ${period(end)}`
    : `${formatTime(start)} ${period(start)}–${formatTime(end)} ${period(end)}`;
}

/** The Monday-to-Friday span: "Sep 14 – 18, 2026", or "Sep 14 – 18" without the year. */
export function formatWeek(monday: number, { year = true } = {}) {
  const from = new Date(monday * 86_400_000);
  const to = new Date((monday + 4) * 86_400_000);
  const day = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  if (from.getUTCFullYear() !== to.getUTCFullYear())
    return year
      ? `${day(from)}, ${from.getUTCFullYear()} – ${day(to)}, ${to.getUTCFullYear()}`
      : `${day(from)} – ${day(to)}`;
  const end =
    from.getUTCMonth() === to.getUTCMonth() ? String(to.getUTCDate()) : day(to);
  return year
    ? `${day(from)} – ${end}, ${to.getUTCFullYear()}`
    : `${day(from)} – ${end}`;
}
