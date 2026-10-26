// Builds public/data from the files catalog/fetch.ts saves in data/raw:
// courses.json, courses/<code>.json and terms/<term>.json.
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { parseCourse, parseDetails } from "./courses.ts";
import { parseNote, parseSection } from "./sections.ts";
import {
  byCode,
  type Course,
  linkGroup,
  type Section,
  type Term,
} from "./types.ts";

const RAW = "data/raw";
const OUT = "public/data";

const raw: unknown[] = readJson("courses.json").courses;
const courses = raw
  .map(parseCourse)
  .sort((a: Course, b: Course) => byCode(a.code, b.code));
const catalog = new Set(courses.map((course) => course.code));

// Start empty, so a course or term that's gone doesn't leave a stale file.
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/courses`, { recursive: true });
mkdirSync(`${OUT}/terms`);
writeFileSync(`${OUT}/courses.json`, JSON.stringify(courses));
for (const entry of raw) {
  const details = parseDetails(entry, catalog);
  writeFileSync(`${OUT}/courses/${details.code}.json`, JSON.stringify(details));
}
console.log(`${courses.length} courses`);
for (const file of readdirSync(RAW)) {
  const code = file.match(/^sections-(\d{6})\.json$/)?.[1];
  if (code) {
    const term = buildTerm(code);
    writeFileSync(`${OUT}/terms/${code}.json`, JSON.stringify(term));
  }
}

function buildTerm(code: string): Term {
  const { totalCount, rows, descriptions } = readJson(`sections-${code}.json`);
  // A page that came back short would quietly drop sections.
  if (rows.length !== totalCount)
    throw new Error(`${code}: ${rows.length} of ${totalCount} sections`);

  const sections = new Map<string, Section[]>();
  const skipped = new Set<string>();
  for (const row of rows) {
    const { course, section } = parseSection(row);
    if (!catalog.has(course)) {
      skipped.add(course);
      continue;
    }
    // Notes link any course in the calendar, offered this term or not.
    const note = parseNote(descriptions[section.crn], catalog);
    const list = sections.get(course) ?? [];
    list.push({ ...section, note });
    sections.set(course, list);
  }
  for (const [course, list] of sections) {
    list.sort((a, b) => a.number.localeCompare(b.number));
    checkLinks(course, list);
  }

  const { startDate, endDate } = usualDates([...sections.values()].flat());
  console.log(`${code}: ${startDate} to ${endDate}, ${sections.size} courses`);
  if (skipped.size > 0)
    console.log(`  not in courses.json: ${[...skipped].join(", ")}`);
  const byCourse = [...sections].sort(([a], [b]) => byCode(a, b));
  return { code, startDate, endDate, sections: Object.fromEntries(byCourse) };
}

// The rules linkGroup relies on: a link ID's letter matches its section's,
// and every link group has at least two types to link together.
function checkLinks(course: string, sections: Section[]) {
  const types = new Map<string, Set<string>>();
  for (const section of sections) {
    const group = linkGroup(section);
    if (group === null) continue;
    if (section.linkId?.[0] !== section.number[0])
      throw new Error(`${course} ${section.number}: link ID ${section.linkId}`);
    types.set(group, (types.get(group) ?? new Set()).add(section.type));
  }
  for (const [group, inGroup] of types)
    if (inGroup.size < 2)
      throw new Error(
        `${course}: link group ${group} only has ${[...inGroup].join(", ")}`,
      );
}

// Most classes run the full term, so the most common date range is the term's.
function usualDates(sections: Section[]) {
  const counts = new Map<string, number>();
  for (const section of sections)
    for (const { time, startDate, endDate } of section.meetings)
      if (time) {
        const range = `${startDate}/${endDate}`;
        counts.set(range, (counts.get(range) ?? 0) + 1);
      }
  const [common] = [...counts].sort((a, b) => b[1] - a[1]);
  const [startDate, endDate] = common[0].split("/");
  return { startDate, endDate };
}

function readJson(file: string) {
  return JSON.parse(readFileSync(`${RAW}/${file}`, "utf8"));
}
