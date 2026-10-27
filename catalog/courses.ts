import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

export type Course = {
  code: string;
  title: string;
};

type RawCourse = { __catalogCourseId: string; title: string };

const raw: { courses: RawCourse[] } = JSON.parse(
  readFileSync("data/raw/courses.json", "utf8"),
);
const courses: Course[] = raw.courses
  .map((course) => ({
    code: course.__catalogCourseId,
    title: course.title.trim(),
  }))
  .sort((a, b) => a.code.localeCompare(b.code));

mkdirSync("public/data", { recursive: true });
writeFileSync("public/data/courses.json", JSON.stringify(courses));
console.log(`${courses.length} courses`);
