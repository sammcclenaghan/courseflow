import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { paragraphs } from "./text.ts";

export type Course = {
  code: string;
  title: string;
  description: string[];
  units: string | null;
  hours: string | null;
};

type RawCourse = {
  __catalogCourseId: string;
  title: string;
  description?: string;
  credits?:
    | { chosen: "fixed"; value?: string }
    | { chosen: "multiple"; value: string[] }
    | { chosen: "range"; value: { min: string; max: string } };
  hoursCatalogText?: string;
};

const raw: { courses: RawCourse[] } = JSON.parse(
  readFileSync("data/raw/courses.json", "utf8"),
);
const courses: Course[] = raw.courses
  .map((course) => ({
    code: course.__catalogCourseId,
    title: course.title.trim(),
    description: paragraphs(course.description ?? ""),
    units: units(course.credits),
    hours: course.hoursCatalogText?.trim() || null,
  }))
  .sort((a, b) => a.code.localeCompare(b.code));

mkdirSync("public/data", { recursive: true });
writeFileSync("public/data/courses.json", JSON.stringify(courses));
console.log(`${courses.length} courses`);

function units(credits: RawCourse["credits"]): string | null {
  switch (credits?.chosen) {
    case "fixed":
      return credits.value ?? null;
    case "multiple":
      return credits.value.join(" or ");
    case "range":
      return `${credits.value.min}–${credits.value.max}`;
    default:
      return null;
  }
}
