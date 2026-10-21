import { weekday } from "./time.ts";

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
 * A section's link group: "A2" → "2". A section with a link ID can only be
 * taken with linked sections of the same group, and needs one of each type
 * in it. CSC110's A16 (A2) goes with labs B24–B27 (B2), not B01 (B1).
 */
export const linkGroup = (section: Section) => section.linkId?.slice(1) ?? null;
