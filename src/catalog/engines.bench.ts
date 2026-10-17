// Benchmarks on the real 202609 term file. Run with `nub run bench`.
import { readFileSync } from "node:fs";
import { bench, describe } from "vitest";
import { conflictChecker, findConflicts } from "./conflicts";
import { dayNumber } from "./dates";
import { weekDays } from "./layout";
import type { TermFile } from "./model";
import { indexCourses, searchCourses } from "./search";
import { defaultSectionSet } from "./sections";

const raw = readFileSync("public/data/terms/202609.json", "utf8");
const file = JSON.parse(raw) as TermFile;
const index = indexCourses(file.courses);
const byCode = new Map(file.courses.map((course) => [course.code, course]));
const course = (code: string) => {
  const found = byCode.get(code);
  if (!found) throw new Error(`No ${code} in 202609`);
  return found;
};

// A first-year engineering-style week: 7 courses, 13 sections.
const schedule = [
  "CSC110",
  "MATH100",
  "MATH122",
  "ENGR110",
  "PHYS110",
  "CHEM101",
  "ANTH240",
].flatMap((code) => defaultSectionSet(course(code)));

describe("loading a term", () => {
  bench("JSON.parse the term file", () => {
    JSON.parse(raw);
  });
  bench("index courses for search", () => {
    indexCourses(file.courses);
  });
});

describe("search, per keystroke", () => {
  bench("one letter: 'c'", () => {
    searchCourses(index, "c");
  });
  bench("a code: 'csc 1'", () => {
    searchCourses(index, "csc 1");
  });
  bench("a title: 'statistics'", () => {
    searchCourses(index, "statistics");
  });
});

describe("schedule", () => {
  bench("findConflicts, whole term", () => {
    findConflicts(schedule);
  });
  bench("weekDays, one week laid out", () => {
    weekDays(schedule, dayNumber("2026-09-14"));
  });
  bench("picker: check all 43 CSC110 sections", () => {
    const conflictsWith = conflictChecker(schedule);
    for (const section of course("CSC110").sections) conflictsWith(section);
  });
  bench("add a course: defaultSectionSet(CSC110, schedule)", () => {
    defaultSectionSet(course("CSC110"), schedule);
  });
});
