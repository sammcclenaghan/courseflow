import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { clean, htmlBody } from "./text.ts";

/** public/data/terms/<code>.json: each offered course's sections, by code. */
export type TermSections = Record<string, Section[]>;

export type Section = {
  crn: string;
  number: string;
  type: string;
  /**
   * The number in Banner's link ID, which pairs sections across types:
   * lecture A1 goes with tutorials T1, and lecture A2 with tutorials T2.
   */
  group: string | null;
  /** "Face-to-face", "Fully Online", "Blended"… as Banner writes it. */
  delivery: string | null;
  /** Where it's held, or null on the main campus, where most are. */
  campus: string | null;
  meetings: Meeting[];
};

export type Meeting = {
  /** 0 = Sunday … 6 = Saturday. */
  days: number[];
  /** Minutes after midnight, so times compare and subtract; null when TBA. */
  time: { start: number; end: number } | null;
  /** "YYYY-MM-DD", which compares correctly as a string. */
  startDate: string;
  endDate: string;
};

type RawMeeting = {
  beginTime: string | null;
  endTime: string | null;
  startDate: string;
  endDate: string;
} & Record<(typeof DAYS)[number], boolean>;

type RawSection = {
  subjectCourse: string;
  courseReferenceNumber: string;
  sequenceNumber: string;
  scheduleTypeDescription: string;
  linkIdentifier: string | null;
  instructionalMethodDescription: string | null;
  campusDescription: string;
  meetingsFaculty: { meetingTime: RawMeeting }[];
};

const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const terms = readdirSync("data/raw")
  .map((file) => file.match(/^sections-(\d{6})\.json$/)?.[1])
  .filter((code) => code !== undefined)
  .sort();

mkdirSync("public/data/terms", { recursive: true });
for (const code of terms) {
  const { totalCount, rows }: { totalCount: number; rows: RawSection[] } =
    JSON.parse(readFileSync(`data/raw/sections-${code}.json`, "utf8"));
  // A page that came back short would quietly drop sections.
  if (rows.length !== totalCount)
    throw new Error(`${code}: ${rows.length} of ${totalCount} sections`);

  const sections: TermSections = {};
  for (const row of rows) {
    const list = sections[row.subjectCourse] ?? [];
    list.push({
      crn: row.courseReferenceNumber,
      number: row.sequenceNumber,
      type: row.scheduleTypeDescription,
      group: row.linkIdentifier?.slice(1) ?? null,
      delivery: row.instructionalMethodDescription,
      campus: campus(row.campusDescription),
      meetings: meetings(row.meetingsFaculty.map((m) => m.meetingTime)),
    });
    sections[row.subjectCourse] = list;
  }
  for (const [course, list] of Object.entries(sections)) {
    list.sort((a, b) => a.number.localeCompare(b.number));
    // The lecture picks the group, so a group without one can't be chosen.
    const lead = list[0].type;
    for (const { group } of list)
      if (group && !list.some((s) => s.type === lead && s.group === group))
        throw new Error(`${code} ${course}: group ${group} has no ${lead}`);
  }

  writeFileSync(`public/data/terms/${code}.json`, JSON.stringify(sections));
  console.log(`${code}: ${Object.keys(sections).length} courses`);
}
writeFileSync("public/data/terms.json", JSON.stringify(terms));

function meetings(raw: RawMeeting[]): Meeting[] {
  const all = raw.map(
    (meeting): Meeting => ({
      days: DAYS.flatMap((day, index) => (meeting[day] ? [index] : [])),
      time:
        meeting.beginTime && meeting.endTime
          ? { start: minutes(meeting.beginTime), end: minutes(meeting.endTime) }
          : null,
      startDate: isoDate(meeting.startDate),
      endDate: isoDate(meeting.endDate),
    }),
  );
  // Banner repeats some meetings exactly, differing only in fields we drop,
  // which would draw the same class twice.
  const unique = new Map(
    all.map((meeting) => [JSON.stringify(meeting), meeting]),
  );
  return [...unique.values()];
}

// Banner escapes some names, like "W&#39;SANEC".
function campus(description: string): string | null {
  const name = clean(htmlBody(description).textContent);
  return name === "Main (Gordon Head)" ? null : name;
}

// "0930" → 570
function minutes(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(2));
}

// "09/09/2026" → "2026-09-09"
function isoDate(date: string): string {
  const [month, day, year] = date.split("/");
  return `${year}-${month}-${day}`;
}
