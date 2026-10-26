import { z } from "zod";
import { htmlBody, richText } from "./richtext.ts";
import type { Meeting, RichText } from "./types.ts";

const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

// One meeting of a section, from a row's meetingsFaculty[].meetingTime.
const meeting = z
  .object({
    beginTime: z.string().nullable(),
    endTime: z.string().nullable(),
    startDate: z.string(),
    endDate: z.string(),
    sunday: z.boolean(),
    monday: z.boolean(),
    tuesday: z.boolean(),
    wednesday: z.boolean(),
    thursday: z.boolean(),
    friday: z.boolean(),
    saturday: z.boolean(),
  })
  .transform(
    (raw): Meeting => ({
      days: DAYS.flatMap((day, index) => (raw[day] ? [index] : [])),
      time:
        raw.beginTime && raw.endTime
          ? { start: minutes(raw.beginTime), end: minutes(raw.endTime) }
          : null,
      startDate: isoDate(raw.startDate),
      endDate: isoDate(raw.endDate),
    }),
  );

const row = z
  .object({
    subjectCourse: z.string(),
    courseReferenceNumber: z.string(),
    sequenceNumber: z.string(),
    scheduleTypeDescription: z.string(),
    linkIdentifier: z.string().nullable(),
    enrollment: z.number(),
    maximumEnrollment: z.number(),
    waitCount: z.number(),
    waitCapacity: z.number(),
    meetingsFaculty: z.array(z.object({ meetingTime: meeting })),
  })
  .transform((raw) => ({
    course: raw.subjectCourse,
    section: {
      crn: raw.courseReferenceNumber,
      number: raw.sequenceNumber,
      type: raw.scheduleTypeDescription,
      linkId: raw.linkIdentifier,
      seats: { enrolled: raw.enrollment, capacity: raw.maximumEnrollment },
      waitlist: { enrolled: raw.waitCount, capacity: raw.waitCapacity },
      meetings: uniqueMeetings(
        raw.meetingsFaculty.map((m) => m.meetingTime),
      ).sort(byDateThenTime),
    },
  }));

export function parseSection(raw: unknown) {
  return row.parse(raw);
}

/**
 * A section's note, from the HTML Banner returns for its description, or null
 * when it has none. `courses` are the codes of every course in the calendar.
 */
export function parseNote(html: string, courses: Set<string>): RichText | null {
  const label = [...htmlBody(html).querySelectorAll("b")].find(
    (b) => b.textContent === "Section information text:",
  );
  if (!label) return null;
  const note: Node[] = [];
  for (let node = label.nextSibling; node; node = node.nextSibling)
    note.push(node);
  return richText(note, courses);
}

// Banner sometimes lists the same class time more than once, differing only in
// fields we drop (which entry carries the credit, the building), so the
// repeats would draw the same class twice on the calendar.
function uniqueMeetings(meetings: Meeting[]): Meeting[] {
  const byKey = new Map(meetings.map((m) => [JSON.stringify(m), m]));
  return [...byKey.values()];
}

// Banner lists meetings in no particular order; the frontend shows them in
// order, with a TBA meeting after the timed ones on the same date.
function byDateThenTime(a: Meeting, b: Meeting): number {
  const noTime = 24 * 60;
  return (
    a.startDate.localeCompare(b.startDate) ||
    (a.time?.start ?? noTime) - (b.time?.start ?? noTime)
  );
}

// Convert to minutes for frontend calendar arithmetic
function minutes(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(2));
}

// Convert to ISO date for date comparisons
function isoDate(date: string): string {
  const [month, day, year] = date.split("/");
  return `${year}-${month}-${day}`;
}
