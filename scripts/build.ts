// Turns data/raw/ into public/data/, offline. Throws on anything it hasn't
// seen before, and writes nothing unless every term passes.
//
//   nub run catalog:build

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { parseSection } from "../src/catalog/banner.ts";
import { parseCourse } from "../src/catalog/kuali.ts";
import type { Course, Meeting, TermCourse, TermFile } from "../src/catalog/model.ts";

const RAW = "data/raw";
const OUT = "public/data";

const kuali = z
  .object({ courses: z.array(z.unknown()) })
  .parse(readJson(`${RAW}/kuali.json`));
const courses = new Map<string, Course>();
for (const raw of kuali.courses) {
  const course = parse(parseCourse, raw, `Kuali course ${field(raw, "__catalogCourseId")}`);
  if (courses.has(course.code)) throw new Error(`Duplicate course ${course.code}`);
  courses.set(course.code, course);
}

const terms = readdirSync(RAW)
  .map((file) => file.match(/^banner-(\d{6})\.json$/)?.[1])
  .filter((term) => term !== undefined)
  .sort();
if (terms.length === 0) throw new Error(`No banner-<term>.json in ${RAW}`);

const termFiles = terms.map(buildTerm);
const offered = new Set(
  termFiles.flatMap((file) => file.courses.map((course) => course.code)),
);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/terms`, { recursive: true });
mkdirSync(`${OUT}/courses`, { recursive: true });
writeJson(`${OUT}/terms.json`, terms);
for (const file of termFiles) writeJson(`${OUT}/terms/${file.term}.json`, file);
for (const code of offered) {
  const course = courses.get(code);
  if (course) writeJson(`${OUT}/courses/${code}.json`, course);
}

function buildTerm(term: string): TermFile {
  const banner = z
    .object({
      fetchedAt: z.string(),
      totalCount: z.number(),
      rows: z.array(z.unknown()),
    })
    .parse(readJson(`${RAW}/banner-${term}.json`));
  const sections = banner.rows.map((row) =>
    parse(parseSection, row, `${term} CRN ${field(row, "courseReferenceNumber")}`),
  );

  if (sections.length === 0) throw new Error(`${term}: no sections`);
  if (sections.length !== banner.totalCount) {
    throw new Error(`${term}: ${sections.length} of ${banner.totalCount} sections`);
  }
  const crns = new Set<string>();
  for (const section of sections) {
    if (section.term !== term) throw new Error(`${term}: CRN ${section.crn} is in ${section.term}`);
    if (crns.has(section.crn)) throw new Error(`${term}: duplicate CRN ${section.crn}`);
    crns.add(section.crn);
    // A meeting that never happens would be invisible on the calendar.
    for (const meeting of section.meetings) {
      if (meeting.start !== null && !occursOnce(meeting)) {
        throw new Error(`${term}: CRN ${section.crn} has a meeting that never occurs`);
      }
    }
  }

  // A term that shrinks by more than a tenth is almost certainly a bad fetch.
  // To accept a real drop, delete the old term file and build again.
  const previousFile = `${OUT}/terms/${term}.json`;
  const previous = existsSync(previousFile)
    ? new Set(
        (readJson(previousFile) as TermFile).courses.flatMap((course) =>
          course.sections.map((section) => section.crn),
        ),
      )
    : new Set<string>();
  if (crns.size < previous.size * 0.9) {
    throw new Error(`${term}: ${crns.size} sections, down from ${previous.size}`);
  }
  const added = [...crns].filter((crn) => !previous.has(crn)).length;
  const removed = [...previous].filter((crn) => !crns.has(crn)).length;

  const byCode = Map.groupBy(sections, (section) => section.subject + section.courseNumber);
  const termCourses: TermCourse[] = [...byCode]
    .map(([code, sections]) => ({
      code,
      title: courses.get(code)?.title ?? sections[0].title,
      sections: sections.sort((a, b) => a.section.localeCompare(b.section)),
    }))
    .sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));

  console.log(
    `${term}: ${termCourses.length} courses, ${sections.length} sections (+${added} -${removed})`,
  );
  return { term, importedAt: banner.fetchedAt, courses: termCourses };
}

function parse<T>(parser: (raw: unknown) => T, raw: unknown, what: string): T {
  try {
    return parser(raw);
  } catch (error) {
    throw new Error(`Can't parse ${what}`, { cause: error });
  }
}

// Whether any of the meeting's weekdays falls within its date range.
function occursOnce({ days, startDate, endDate }: Meeting): boolean {
  const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
  const first = day(startDate);
  const span = day(endDate) - first;
  // Day 0 of the epoch was a Thursday.
  return days.some((weekday) => (weekday - ((first + 4) % 7) + 7) % 7 <= span);
}

function field(raw: unknown, key: string): string {
  return String((raw as Record<string, unknown>)?.[key]);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
