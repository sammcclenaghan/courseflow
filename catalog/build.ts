// Builds public/data/terms/<term>.json from the raw snapshots catalog/fetch.ts
// saves in data/raw, failing loudly on anything that would make a wrong
// schedule possible.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { z } from "zod";
import { byCode, type Course } from "#domain/course.ts";
import { linkGroup, meetsOn, type Section } from "#domain/section.ts";
import type { Term } from "#domain/term.ts";
import { datesBetween } from "#domain/time.ts";
import { parseSection } from "./banner.ts";
import { parseCourse } from "./kuali.ts";
import { noteFor, parseNotes } from "./notes.ts";

const RAW = "data/raw";
const NOTES = "data/notes";
const OUT = "public/data/terms";

const kuali = z
  .object({ courses: z.array(z.unknown()) })
  .parse(readJson(`${RAW}/kuali.json`));
const titles = new Map<string, string>();
for (const raw of kuali.courses) {
  const { code, title } = parse(parseCourse, raw, "Kuali course");
  if (titles.has(code)) throw new Error(`Duplicate Kuali course ${code}`);
  titles.set(code, title);
}

const terms = readdirSync(RAW)
  .map((file) => file.match(/^banner-(\d{6})\.json$/)?.[1])
  .filter((term) => term !== undefined)
  .sort();
if (terms.length === 0) throw new Error(`No banner-<term>.json in ${RAW}`);

mkdirSync(OUT, { recursive: true });
for (const code of terms) {
  const term = buildTerm(code);
  writeFileSync(`${OUT}/${code}.json`, JSON.stringify(term));
}

function buildTerm(code: string): Term {
  const banner = z
    .object({ totalCount: z.number(), rows: z.array(z.unknown()) })
    .parse(readJson(`${RAW}/banner-${code}.json`));
  const rows = banner.rows.map((row) =>
    parse(parseSection, row, `${code} row`),
  );
  if (rows.length === 0) throw new Error(`${code}: no sections`);
  if (rows.length !== banner.totalCount)
    throw new Error(`${code}: ${rows.length} of ${banner.totalCount} sections`);

  // Only some terms have a notes snapshot.
  const notesPath = `${NOTES}/${code}.json`;
  const notes = existsSync(notesPath)
    ? parse(parseNotes, readJson(notesPath), notesPath)
    : null;

  const crns = new Set<string>();
  const byCourse = new Map<string, { title: string; sections: Section[] }>();
  for (const row of rows) {
    const { crn } = row.section;
    if (row.term !== code)
      throw new Error(`${code}: CRN ${crn} is in ${row.term}`);
    if (crns.has(crn)) throw new Error(`${code}: duplicate CRN ${crn}`);
    crns.add(crn);
    for (const meeting of row.section.meetings) {
      const dates = datesBetween(meeting.startDate, meeting.endDate);
      if (meeting.time && !dates.some((date) => meetsOn(meeting, date)))
        throw new Error(`${code}: CRN ${crn} has a meeting that never happens`);
    }
    const section = {
      ...row.section,
      note: notes && noteFor(notes, row.course, row.section),
    };
    const course = byCourse.get(row.course);
    if (course) course.sections.push(section);
    else byCourse.set(row.course, { title: row.title, sections: [section] });
  }

  // A term that shrinks by more than a tenth is almost certainly a bad fetch.
  // To accept a real drop, delete the old term file and build again.
  const previousPath = `${OUT}/${code}.json`;
  const previous = existsSync(previousPath)
    ? (readJson(previousPath) as Term).courses.flatMap((c) => c.sections).length
    : 0;
  if (crns.size < previous * 0.9)
    throw new Error(`${code}: ${crns.size} sections, down from ${previous}`);

  const courses: Course[] = [...byCourse]
    .map(([course, { title, sections }]) => ({
      code: course,
      // Banner's title is the fallback for the few courses Kuali lacks.
      title: titles.get(course) ?? title,
      sections: sections.sort((a, b) => a.number.localeCompare(b.number)),
    }))
    .sort(byCode);
  for (const course of courses) checkLinks(course);

  const { startDate, endDate } = usualDates(courses);
  const noted = courses.flatMap((c) => c.sections).filter((s) => s.note).length;
  console.log(
    `${code}: ${startDate} to ${endDate}, ${courses.length} courses, ${crns.size} sections (was ${previous}), ${noted} with notes`,
  );
  return { code, startDate, endDate, courses };
}

// The rules linkGroup relies on: a link ID's letter matches its section's,
// and every link group has at least two types to link together.
function checkLinks(course: Course) {
  const types = new Map<string, Set<string>>();
  for (const section of course.sections) {
    const group = linkGroup(section);
    if (group === null) continue;
    if (section.linkId?.[0] !== section.number[0])
      throw new Error(
        `${course.code} ${section.number}: link ID ${section.linkId}`,
      );
    types.set(group, (types.get(group) ?? new Set()).add(section.type));
  }
  for (const [group, inGroup] of types)
    if (inGroup.size < 2)
      throw new Error(
        `${course.code}: link group ${group} only has ${[...inGroup].join(", ")}`,
      );
}

// Most classes run the full term, so the most common date range is the term's.
function usualDates(courses: Course[]) {
  const counts = new Map<string, number>();
  for (const course of courses)
    for (const section of course.sections)
      for (const { time, startDate, endDate } of section.meetings)
        if (time) {
          const range = `${startDate}/${endDate}`;
          counts.set(range, (counts.get(range) ?? 0) + 1);
        }
  const [common] = [...counts].sort((a, b) => b[1] - a[1]);
  if (!common) throw new Error("No timed meetings");
  const [startDate, endDate] = common[0].split("/");
  return { startDate, endDate };
}

function parse<T>(parser: (raw: unknown) => T, raw: unknown, what: string): T {
  try {
    return parser(raw);
  } catch (error) {
    throw new Error(
      `Can't parse ${what}: ${JSON.stringify(raw).slice(0, 200)}`,
      {
        cause: error,
      },
    );
  }
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}
