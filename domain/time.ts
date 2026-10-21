// Dates are "YYYY-MM-DD" strings everywhere: they compare correctly with <
// and can't shift with time zones. This is the only file that does date
// math, and it always works at UTC midnight. Times are minutes after
// midnight: 570 is 9:30 AM.

const toUtc = (date: string) => new Date(`${date}T00:00:00Z`);

/** 0 = Sunday … 6 = Saturday. */
export const weekday = (date: string) => toUtc(date).getUTCDay();

/** "2027-01-29" + 3 → "2027-02-01" */
export function addDays(date: string, days: number) {
  const day = toUtc(date);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

/** The Monday on or before a date. */
export const mondayOf = (date: string) =>
  addDays(date, -((weekday(date) + 6) % 7));

/** Every date from `from` to `to`, both included; empty if `from` is later. */
export function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

/** Today's date where the student is: the one use of local time. */
export function today() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2027-01-11" → "Mon" */
export const formatDayName = (date: string) => DAYS[weekday(date)];

/** The weekdays of a week: "January 11 – 15, 2027", "February 26 – March 2, 2027". */
export function formatWeek(monday: string) {
  const [from, to] = [toUtc(monday), toUtc(addDays(monday, 4))];
  const end =
    from.getUTCMonth() === to.getUTCMonth()
      ? to.getUTCDate()
      : `${MONTHS[to.getUTCMonth()]} ${to.getUTCDate()}`;
  return `${MONTHS[from.getUTCMonth()]} ${from.getUTCDate()} – ${end}, ${to.getUTCFullYear()}`;
}

/** 870 → "2:30", with "PM" when `period` is set. */
function formatTime(minutes: number, period: boolean) {
  const clock = `${((Math.floor(minutes / 60) + 11) % 12) + 1}:${String(minutes % 60).padStart(2, "0")}`;
  return period ? `${clock} ${minutes < 720 ? "AM" : "PM"}` : clock;
}

/** "9:30–10:20 AM", or "11:30 AM–12:20 PM" across noon. */
export function formatTimeRange(start: number, end: number) {
  const sameHalf = start < 720 === end < 720;
  return `${formatTime(start, !sameHalf)}–${formatTime(end, true)}`;
}

/** 780 → "1 PM": an hour line on the calendar. */
export const formatHour = (minutes: number) =>
  `${((Math.floor(minutes / 60) + 11) % 12) + 1} ${minutes < 720 ? "AM" : "PM"}`;
