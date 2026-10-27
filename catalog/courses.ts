import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { paragraphs } from "./text.ts";

export type Course = {
  code: string;
  title: string;
  /** Empty for the few hundred courses without one. */
  description: string[];
};

type RawCourse = {
  __catalogCourseId: string;
  title: string;
  description?: string;
};

const raw: { courses: RawCourse[] } = JSON.parse(
  readFileSync("data/raw/courses.json", "utf8"),
);
const courses: Course[] = raw.courses
  .map((course) => ({
    code: course.__catalogCourseId,
    title: course.title.trim(),
    description: paragraphs(course.description ?? ""),
  }))
  .sort((a, b) => a.code.localeCompare(b.code));

mkdirSync("public/data", { recursive: true });
writeFileSync("public/data/courses.json", JSON.stringify(courses));
console.log(`${courses.length} courses`);
