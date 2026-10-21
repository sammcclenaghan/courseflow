import { z } from "zod";
import type { Meeting, Section } from "#domain/section.ts";

const sectionType = z.enum([
  "Lecture",
  "Lab",
  "Lecture Topic",
  "Tutorial",
  "Seminar",
  "Practicum",
  "Gradable Lab",
  "Work Term",
  "Individually Supervised Study",
]);

const count = z.number().int().nonnegative();

const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

// "0000"–"2359"
const clock = z.string().regex(/^([01]\d|2[0-3])[0-5]\d$/);

// Banner formats dates by the request's Accept-Language; the client sends
// "*", which gives MM/DD/YYYY. Any other format fails here.
const date = z
  .string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/)
  .refine(isRealDate, { message: "not a real calendar date" });

const meetingTime = z
  .object({
    beginTime: clock.nullable(),
    endTime: clock.nullable(),
    startDate: date,
    endDate: date,
    sunday: z.boolean(),
    monday: z.boolean(),
    tuesday: z.boolean(),
    wednesday: z.boolean(),
    thursday: z.boolean(),
    friday: z.boolean(),
    saturday: z.boolean(),
  })
  .transform((m, ctx): Meeting => {
    if ((m.beginTime === null) !== (m.endTime === null))
      ctx.addIssue("a meeting needs both times or neither");
    if (m.beginTime !== null && m.endTime !== null && m.beginTime >= m.endTime)
      ctx.addIssue("a meeting must start before it ends");
    return {
      days: DAYS.flatMap((day, index) => (m[day] ? [index] : [])),
      time:
        m.beginTime === null || m.endTime === null
          ? null
          : { start: minutes(m.beginTime), end: minutes(m.endTime) },
      startDate: isoDate(m.startDate),
      endDate: isoDate(m.endDate),
    };
  })
  .refine((m) => m.startDate <= m.endDate, {
    message: "a meeting's start date must not be after its end date",
  });

// One section from Banner 9's searchResults. The formats are the ones seen
// across every section in Summer 2026, Fall 2026 and Spring 2027; anything
// else fails loudly instead of being imported wrong. Fields we don't use
// aren't checked, so a change to them can't break the build.
const bannerSection = z
  .object({
    term: z.string().regex(/^\d{6}$/),
    courseReferenceNumber: z.string().regex(/^\d{5}$/),
    subject: z.string().regex(/^[A-Z]{2,4}(-[A-Z])?$/),
    courseNumber: z.string().regex(/^\d{3}[A-Z]?$/),
    sequenceNumber: z.string().regex(/^[A-Z]\d{2}$/),
    courseTitle: z
      .string()
      .min(1)
      .transform(decodeHtmlEntities)
      .refine((title) => !/&[a-zA-Z]+;/.test(title), {
        message: "unknown HTML entity in title",
      }),
    scheduleTypeDescription: sectionType,
    linkIdentifier: z
      .string()
      .regex(/^[A-Z]\d$/)
      .nullable(),
    enrollment: count,
    maximumEnrollment: count,
    // Negative when a section is over-enrolled.
    seatsAvailable: z.number().int(),
    waitCount: count,
    waitCapacity: count,
    waitAvailable: count,
    meetingsFaculty: z.array(z.object({ meetingTime })),
  })
  // We don't store Banner's available counts; the app works them out.
  .refine(
    (raw) => raw.seatsAvailable === raw.maximumEnrollment - raw.enrollment,
    {
      message: "seatsAvailable isn't maximumEnrollment - enrollment",
    },
  )
  .refine((raw) => raw.waitAvailable === raw.waitCapacity - raw.waitCount, {
    message: "waitAvailable isn't waitCapacity - waitCount",
  })
  .transform((raw) => ({
    term: raw.term,
    /** "CSC110" */
    course: raw.subject + raw.courseNumber,
    /** Banner's title, which for topics courses names the section's topic. */
    title: raw.courseTitle,
    section: {
      crn: raw.courseReferenceNumber,
      number: raw.sequenceNumber,
      type: raw.scheduleTypeDescription,
      linkId: raw.linkIdentifier,
      seats: { enrolled: raw.enrollment, capacity: raw.maximumEnrollment },
      waitlist: { enrolled: raw.waitCount, capacity: raw.waitCapacity },
      note: null,
      // Banner lists meetings in no particular order, and repeats a meeting
      // once per room or instructor, which we don't keep.
      meetings: uniqueMeetings(
        raw.meetingsFaculty.map((m) => m.meetingTime),
      ).sort(byDateThenTime),
    },
  }));

/** One Banner row: a section and the course it's in. Notes are added later. */
export function parseSection(raw: unknown): {
  term: string;
  course: string;
  title: string;
  section: Section;
} {
  return bannerSection.parse(raw);
}

// Banner HTML-escapes titles. The named ones are every entity seen in
// titles, plus the XML basics; an unknown one fails the title check.
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  rsquo: "’",
  eacute: "é",
  Aacute: "Á",
  theta: "θ",
};

function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(#\d+|#x[0-9a-f]+|[a-zA-Z]+);/gi,
    (entity, name: string) => {
      if (name.startsWith("#x") || name.startsWith("#X")) {
        return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
      }
      if (name.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(name.slice(1), 10));
      }
      return NAMED_ENTITIES[name] ?? entity;
    },
  );
}

function isRealDate(value: string): boolean {
  const [month, day, year] = value.split("/").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// "09/09/2026" → "2026-09-09"
function isoDate(value: string): string {
  const [month, day, year] = value.split("/");
  return `${year}-${month}-${day}`;
}

// "1600" → 960
function minutes(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(2));
}

function uniqueMeetings(meetings: Meeting[]): Meeting[] {
  const seen = new Set<string>();
  return meetings.filter((meeting) => {
    const key = JSON.stringify(meeting);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Timed meetings sort before TBA ones on the same date.
function byDateThenTime(a: Meeting, b: Meeting): number {
  if (a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
  if (a.time === null || b.time === null)
    return (a.time === null ? 1 : 0) - (b.time === null ? 1 : 0);
  return a.time.start - b.time.start;
}
