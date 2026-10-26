// The shapes of the files build.ts writes to public/data, and the few rules it
// checks the data against. Dates are "YYYY-MM-DD" strings: they
// compare correctly with < and can't shift with time zones. Times are minutes
// after midnight: 570 is 9:30 AM.

/**
 * One course in public/data/courses.json, which lists every course in the
 * calendar so search and links work whether or not a course is offered.
 */
export type Course = {
  code: string;
  title: string;
};

/**
 * public/data/courses/<code>.json: what a course's page shows. Each course has
 * its own file so opening one loads a couple of KB, not the whole calendar.
 */
export type CourseDetails = Course & {
  description: RichText | null;
  /** Kuali's supplemental notes, like "Credit will be granted for only one of…". */
  notes: RichText | null;
  /** Prerequisites and corequisites, as a tree of lists. */
  requisites: RichText | null;
};

/**
 * public/data/terms/<code>.json: what's offered in one term, for scheduling.
 * Courses are only referred to by code; their titles are in courses.json.
 */
export type Term = {
  code: string;
  startDate: string;
  endDate: string;
  /** Each offered course's sections, by course code, in byCode order. */
  sections: Record<string, Section[]>;
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
  note: RichText | null;
  /** In date order, then time order. */
  meetings: Meeting[];
};

/**
 * Text from UVic, like a section's note, in pieces rather than HTML, so the
 * frontend builds the links itself: course codes link to that course in the
 * app, and UVic's HTML never reaches the page. Any course in the calendar is
 * linked, offered this term or not.
 */
export type RichText = (
  | string
  | { course: string; text: string }
  | { url: string; text: string }
  /** A list. Items can hold lists of their own, which is how requisites nest. */
  | { items: RichText[] }
)[];

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
export const byCode = (a: string, b: string) =>
  a.localeCompare(b, "en", { numeric: true });

/**
 * A section's link group: "A2" → "2". A section with a link ID can only be
 * taken with linked sections of the same group, and needs one of each type
 * in it. CSC110's A16 (A2) goes with labs B24–B27 (B2), not B01 (B1).
 */
export const linkGroup = (section: Section) => section.linkId?.slice(1) ?? null;
