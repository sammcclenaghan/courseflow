// The shape of public/data/terms/<code>.json, which build.ts writes, and the
// few rules it checks the data against. Dates are "YYYY-MM-DD" strings: they
// compare correctly with < and can't shift with time zones. Times are minutes
// after midnight: 570 is 9:30 AM.

/** Everything offered in one term. */
export type Term = {
  /** "202609": the year, then 01 (Spring), 05 (Summer) or 09 (Fall). */
  code: string;
  /** The usual first and last day of classes. Some sections run outside them. */
  startDate: string;
  endDate: string;
  /** In byCode order. */
  courses: Course[];
};

/** A course as offered in one term. */
export type Course = {
  /** "CSC110" */
  code: string;
  title: string;
  /** In number order: A01, A02, B01… */
  sections: Section[];
};

/** One CRN: a lecture, lab, tutorial… of a course, in one term. */
export type Section = {
  crn: string;
  /** "A01", "B05", "T02": the letter is the type. */
  number: string;
  /** "Lecture", "Lab", "Tutorial"…: Banner's schedule type. */
  type: string;
  /** "A1": the letter matches the number's; see linkGroup. */
  linkId: string | null;
  seats: { enrolled: number; capacity: number };
  waitlist: { enrolled: number; capacity: number };
  note: string | null;
  /** In date order, then time order. */
  meetings: Meeting[];
};

/** When a section meets: on these weekdays, between these dates. */
export type Meeting = {
  /** 0 = Sunday … 6 = Saturday. */
  days: number[];
  /** Null when the time is TBA. */
  time: { start: number; end: number } | null;
  startDate: string;
  endDate: string;
};

/** The order courses are listed in: by code. */
export const byCode = (a: Course, b: Course) =>
  a.code.localeCompare(b.code, "en", { numeric: true });

/**
 * A section's link group: "A2" → "2". A section with a link ID can only be
 * taken with linked sections of the same group, and needs one of each type
 * in it. CSC110's A16 (A2) goes with labs B24–B27 (B2), not B01 (B1).
 */
export const linkGroup = (section: Section) => section.linkId?.slice(1) ?? null;

/** Whether a meeting happens on a date. TBA meetings happen on no date. */
export const meetsOn = (meeting: Meeting, date: string) =>
  meeting.time !== null &&
  meeting.startDate <= date &&
  date <= meeting.endDate &&
  meeting.days.includes(new Date(`${date}T00:00:00Z`).getUTCDay());

/** Every date from `from` to `to`, both included; empty if `from` is later. */
export function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  const day = new Date(`${from}T00:00:00Z`);
  for (let date = from; date <= to; date = day.toISOString().slice(0, 10)) {
    dates.push(date);
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return dates;
}
