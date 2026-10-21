import { addDays, datesBetween, weekday } from "./time.ts";

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
  /** Minutes after midnight; null when the time is TBA. */
  time: { start: number; end: number } | null;
  startDate: string;
  endDate: string;
};

/** Whether a meeting happens on a date. TBA meetings happen on no date. */
export const meetsOn = (meeting: Meeting, date: string) =>
  meeting.time !== null &&
  meeting.startDate <= date &&
  date <= meeting.endDate &&
  meeting.days.includes(weekday(date));

/**
 * Whether two meetings are ever in progress at once, on even one date.
 * Back-to-back meetings (one ends at 10:20, the next starts at 10:20) aren't.
 */
export function meetingsOverlap(a: Meeting, b: Meeting) {
  if (!a.time || !b.time) return false;
  if (a.time.start >= b.time.end || b.time.start >= a.time.end) return false;
  const from = a.startDate > b.startDate ? a.startDate : b.startDate;
  const to = a.endDate < b.endDate ? a.endDate : b.endDate;
  // Seven days in a row hold every weekday, so the first week both run
  // decides it.
  const week = addDays(from, 6);
  return datesBetween(from, week < to ? week : to).some(
    (date) => meetsOn(a, date) && meetsOn(b, date),
  );
}

/** Whether two different sections ever meet at the same time. */
export const conflicts = (a: Section, b: Section) =>
  a.crn !== b.crn &&
  a.meetings.some((x) => b.meetings.some((y) => meetingsOverlap(x, y)));

/**
 * A section's link group: "A2" → "2". A section with a link ID can only be
 * taken with linked sections of the same group, and needs one of each type
 * in it. CSC110's A16 (A2) goes with labs B24–B27 (B2), not B01 (B1).
 */
export const linkGroup = (section: Section) => section.linkId?.slice(1) ?? null;
